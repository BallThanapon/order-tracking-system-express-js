require('dotenv').config();
const app = require('./app');
const prisma = require('./prisma');
const { startScheduler } = require('./scheduler');

const PORT = Number(process.env.PORT || 3001);

const server = app.listen(PORT, () => {
  console.log(`Order Tracking API running on port ${PORT}`);
  startScheduler();
});

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down...`);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
