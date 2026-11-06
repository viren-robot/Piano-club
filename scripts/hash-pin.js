// Usage: npm run hash-pin -- <PIN>
// Prints a bcrypt hash to paste into STUDENT_PIN_HASH or TEACHER_PIN_HASH.
const bcrypt = require('bcryptjs');

const pin = process.argv[2];
if (!pin || !/^\d{4,8}$/.test(pin)) {
  console.error('Usage: npm run hash-pin -- <4 to 8 digit PIN>');
  process.exit(1);
}

console.log(bcrypt.hashSync(pin, 10));
