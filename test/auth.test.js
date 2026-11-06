const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const auth = require('../server/auth');

beforeEach(() => {
  process.env.SESSION_SECRET = 'test-secret-that-is-long-enough';
  process.env.STUDENT_PIN_HASH = bcrypt.hashSync('1357', 4);
  process.env.TEACHER_PIN_HASH = bcrypt.hashSync('8642', 4);
});

test('sign and verify round-trip a valid session', () => {
  const token = auth.sign({ role: 'student', exp: Date.now() + 60_000 });
  assert.equal(auth.verify(token).role, 'student');
});

test('verify rejects a tampered payload', () => {
  const token = auth.sign({ role: 'student', exp: Date.now() + 60_000 });
  const [body, sig] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ role: 'teacher', exp: Date.now() + 60_000 })).toString('base64url');
  assert.equal(auth.verify(`${forged}.${sig}`), null);
  assert.ok(body);
});

test('verify rejects an expired session', () => {
  const token = auth.sign({ role: 'teacher', exp: Date.now() - 1 });
  assert.equal(auth.verify(token), null);
});

test('verify rejects garbage input', () => {
  assert.equal(auth.verify(undefined), null);
  assert.equal(auth.verify('no-dot-here'), null);
  assert.equal(auth.verify('a.b.c'), null);
});

test('verify rejects a token signed with another secret', () => {
  const token = auth.sign({ role: 'teacher', exp: Date.now() + 60_000 });
  process.env.SESSION_SECRET = 'a-different-secret-value-here';
  assert.equal(auth.verify(token), null);
});

test('roleForPin maps the student PIN to student', async () => {
  assert.equal(await auth.roleForPin('1357'), 'student');
});

test('roleForPin maps the teacher PIN to teacher', async () => {
  assert.equal(await auth.roleForPin('8642'), 'teacher');
});

test('roleForPin rejects wrong, malformed and non-string PINs', async () => {
  assert.equal(await auth.roleForPin('0000'), null);
  assert.equal(await auth.roleForPin('13571'), null); // valid format, wrong PIN
  assert.equal(await auth.roleForPin('abcd'), null);
  assert.equal(await auth.roleForPin(1357), null);
  assert.equal(await auth.roleForPin(undefined), null);
});

test('requireRole sends 401 with no session and 403 for a student on a teacher route', () => {
  const run = (role, cookies) => {
    let status = null;
    let nextCalled = false;
    const res = {
      status(code) { status = code; return this; },
      json() { return this; },
    };
    auth.requireRole(role)({ cookies }, res, () => { nextCalled = true; });
    return { status, nextCalled };
  };

  const studentToken = auth.sign({ role: 'student', exp: Date.now() + 60_000 });
  const teacherToken = auth.sign({ role: 'teacher', exp: Date.now() + 60_000 });

  assert.deepEqual(run('student', {}), { status: 401, nextCalled: false });
  assert.deepEqual(run('teacher', { pc_session: studentToken }), { status: 403, nextCalled: false });
  assert.deepEqual(run('teacher', { pc_session: teacherToken }), { status: null, nextCalled: true });
  assert.deepEqual(run('student', { pc_session: studentToken }), { status: null, nextCalled: true });
});
