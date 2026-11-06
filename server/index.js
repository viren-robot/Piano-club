const { createApp } = require('./app');
const { connect, close } = require('./db');

const PORT = Number(process.env.PORT) || 3000;

async function start() {
  if (!process.env.STUDENT_PIN_HASH || !process.env.TEACHER_PIN_HASH) {
    console.warn('Warning: STUDENT_PIN_HASH and TEACHER_PIN_HASH must be set before anyone can sign in.');
  }
  await connect();
  const server = createApp().listen(PORT, () => {
    console.log(`Piano Club site running on http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    server.close();
    await close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
}

module.exports = { start };
