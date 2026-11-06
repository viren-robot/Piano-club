const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const { requireRole } = require('../auth');

// Builds a router for a simple collection.
//   sanitize(body, { partial }) -> { value } | { error }
//   Public read; teacher-only create, update and delete.
function crudRouter({ collection, sanitize, sort = { createdAt: -1 }, limit = 200 }) {
  const router = express.Router();
  const col = () => getDb().collection(collection);

  router.get('/', async (req, res, next) => {
    try {
      const items = await col().find({}).sort(sort).limit(limit).toArray();
      res.json(items);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', requireRole('teacher'), async (req, res, next) => {
    try {
      const { value, error } = sanitize(req.body || {}, { partial: false });
      if (error) return res.status(400).json({ error });
      const doc = { ...value, createdAt: new Date() };
      const result = await col().insertOne(doc);
      res.status(201).json({ _id: result.insertedId, ...doc });
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', requireRole('teacher'), async (req, res, next) => {
    try {
      if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
      const { value, error } = sanitize(req.body || {}, { partial: true });
      if (error) return res.status(400).json({ error });
      if (Object.keys(value).length === 0) return res.status(400).json({ error: 'Nothing to update' });
      const result = await col().findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { $set: { ...value, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
      if (!result) return res.status(404).json({ error: 'Not found' });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', requireRole('teacher'), async (req, res, next) => {
    try {
      if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
      const result = await col().deleteOne({ _id: new ObjectId(req.params.id) });
      if (!result.deletedCount) return res.status(404).json({ error: 'Not found' });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

// Shared string helper: trims, requires non-empty when `required`, caps length.
function str(value, { field, max, required = false }) {
  if (value === undefined || value === null || value === '') {
    return required ? { error: `${field} is required` } : { value: '' };
  }
  if (typeof value !== 'string') return { error: `${field} must be text` };
  const trimmed = value.trim();
  if (required && !trimmed) return { error: `${field} is required` };
  if (trimmed.length > max) return { error: `${field} must be ${max} characters or fewer` };
  return { value: trimmed };
}

module.exports = { crudRouter, str };
