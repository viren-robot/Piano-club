const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const COOKIE = 'pc_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const ROLES = ['student', 'teacher'];

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('SESSION_SECRET must be set to at least 16 characters');
  }
  return secret;
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

// Returns the payload if the token is genuine and unexpired, otherwise null.
function verify(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expected = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload || typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
  if (!ROLES.includes(payload.role)) return null;
  return payload;
}

// Checks a PIN against the configured hashes. Teacher is checked first so a
// shared value never downgrades a teacher to a student.
async function roleForPin(pin) {
  if (typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) return null;
  if (process.env.TEACHER_PIN_HASH && (await bcrypt.compare(pin, process.env.TEACHER_PIN_HASH))) {
    return 'teacher';
  }
  if (process.env.STUDENT_PIN_HASH && (await bcrypt.compare(pin, process.env.STUDENT_PIN_HASH))) {
    return 'student';
  }
  return null;
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}

function setSessionCookie(res, role) {
  const token = sign({ role, exp: Date.now() + SESSION_TTL_MS });
  res.cookie(COOKIE, token, cookieOptions());
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined });
}

function currentSession(req) {
  return verify(req.cookies && req.cookies[COOKIE]);
}

// requireRole('student') accepts students and teachers.
// requireRole('teacher') accepts teachers only.
function requireRole(role) {
  return (req, res, next) => {
    const session = currentSession(req);
    if (!session) return res.status(401).json({ error: 'Please sign in with your PIN.' });
    if (role === 'teacher' && session.role !== 'teacher') {
      return res.status(403).json({ error: 'Teacher access only.' });
    }
    req.session = session;
    next();
  };
}

module.exports = {
  COOKIE,
  sign,
  verify,
  roleForPin,
  setSessionCookie,
  clearSessionCookie,
  currentSession,
  requireRole,
};
