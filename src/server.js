import app from './app.js';
import config from '#config/config.js';
import prisma from '#config/prisma.js';
import { emailQueue } from '#jobs/email.queue.js';
import { startEmailWorker } from '#jobs/email.worker.js';

async function startServer() {
  let emailWorker;

  try {
    await prisma.$connect();
    console.log('PostgreSQL connected');

    emailWorker = startEmailWorker();
    console.log('Email worker started');

    const server = app.listen(config.PORT, () => {
      console.log(`Server running on http://localhost:${config.PORT}`);
    });

    const shutdown = async () => {
      console.log('Shutting down...');
      server.close();
      await emailWorker?.close();
      await emailQueue.close();
      await prisma.$disconnect();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Unable to start server:', error);
    await emailWorker?.close();
    await emailQueue.close();
    process.exitCode = 1;
  }
}

startServer();
