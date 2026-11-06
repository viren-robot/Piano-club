const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Render/Vercel sit behind a proxy; needed for per-IP rate limiting

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // Only failed PIN attempts count, so teachers and students aren't locked out after a correct entry.
  app.use(
    '/api/auth/login',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      skipSuccessfulRequests: true,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many attempts. Please wait 15 minutes and try again.' },
    })
  );

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/announcements', require('./routes/announcements'));
  app.use('/api/events', require('./routes/events'));
  app.use('/api/practice-sheets', require('./routes/practice'));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

  // Error handler: never leak internals on 5xx.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    if (res.headersSent) return;
    res.status(status).json({
      error: status >= 500 ? 'Something went wrong. Please try again.' : err.message,
    });
  });

  return app;
}

module.exports = { createApp };
