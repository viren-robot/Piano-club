const express = require('express');
const { roleForPin, setSessionCookie, clearSessionCookie, currentSession } = require('../auth');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const role = await roleForPin(req.body && req.body.pin);
    if (!role) return res.status(401).json({ error: 'That PIN is not correct.' });
    setSessionCookie(res, role);
    res.json({ role });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const session = currentSession(req);
  if (!session) return res.status(401).json({ error: 'Not signed in' });
  res.json({ role: session.role });
});

module.exports = router;
