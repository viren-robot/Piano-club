const path = require('path');
const express = require('express');
const multer = require('multer');
const { ObjectId } = require('mongodb');
const { getDb, getBucket } = require('../db');
const { requireRole } = require('../auth');
const { str } = require('./crud');

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(Object.assign(new Error('Only PDF, PNG or JPEG files are allowed'), { status: 400 }));
  },
});

const router = express.Router();
const sheets = () => getDb().collection('practiceSheets');

const publicShape = (doc) => ({
  _id: doc._id,
  title: doc.title,
  description: doc.description,
  filename: doc.filename,
  contentType: doc.contentType,
  size: doc.size,
  uploadedAt: doc.uploadedAt,
});

// Students and teachers can list sheets.
router.get('/', requireRole('student'), async (req, res, next) => {
  try {
    const docs = await sheets().find({}).sort({ uploadedAt: -1 }).limit(200).toArray();
    res.json(docs.map(publicShape));
  } catch (err) {
    next(err);
  }
});

// Teacher uploads a sheet: multipart form with fields file, title, description.
router.post('/', requireRole('teacher'), (req, res, next) => {
  upload.single('file')(req, res, async (uploadErr) => {
    if (uploadErr) {
      const status = uploadErr.code === 'LIMIT_FILE_SIZE' ? 413 : uploadErr.status || 400;
      const message =
        uploadErr.code === 'LIMIT_FILE_SIZE' ? 'File must be 10 MB or smaller' : uploadErr.message;
      return res.status(status).json({ error: message });
    }
    try {
      if (!req.file) return res.status(400).json({ error: 'Choose a file to upload' });
      const title = str(req.body.title, { field: 'Title', max: 120, required: true });
      if (title.error) return res.status(400).json({ error: title.error });
      const description = str(req.body.description, { field: 'Description', max: 1000 });
      if (description.error) return res.status(400).json({ error: description.error });

      const filename = path.basename(req.file.originalname).replace(/[\r\n"]/g, '_').slice(0, 200);
      const gridfsId = await new Promise((resolve, reject) => {
        const stream = getBucket().openUploadStream(filename, {
          contentType: req.file.mimetype,
          metadata: { title: title.value },
        });
        stream.on('error', reject);
        stream.on('finish', () => resolve(stream.id));
        stream.end(req.file.buffer);
      });

      const doc = {
        title: title.value,
        description: description.value,
        gridfsId,
        filename,
        contentType: req.file.mimetype,
        size: req.file.size,
        uploadedAt: new Date(),
      };
      const result = await sheets().insertOne(doc);
      res.status(201).json(publicShape({ _id: result.insertedId, ...doc }));
    } catch (err) {
      next(err);
    }
  });
});

// Students and teachers can download a sheet.
router.get('/:id/file', requireRole('student'), async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const doc = await sheets().findOne({ _id: new ObjectId(req.params.id) });
    if (!doc) return res.status(404).json({ error: 'Not found' });

    const stream = getBucket().openDownloadStream(doc.gridfsId);
    stream.on('error', (err) => {
      if (!res.headersSent) res.status(404).json({ error: 'File missing' });
      else res.destroy(err);
    });
    const safeName = encodeURIComponent(doc.filename);
    res.set({
      'Content-Type': doc.contentType,
      'Content-Length': doc.size,
      'Content-Disposition': `attachment; filename*=UTF-8''${safeName}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-cache',
    });
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

// Teacher deletes a sheet and its stored file.
router.delete('/:id', requireRole('teacher'), async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const doc = await sheets().findOne({ _id: new ObjectId(req.params.id) });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    await getBucket().delete(doc.gridfsId).catch(() => {});
    await sheets().deleteOne({ _id: doc._id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
