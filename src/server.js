import app from './app.js';
import config from '#config/config.js';
import prisma from '#config/prisma.js';

async function startServer() {
  try {
    await prisma.$connect();
    console.log('PostgreSQL connected');


    app.listen(config.PORT, () => {
      console.log(`Server running on http://localhost:${config.PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to PostgreSQL:', error);
    process.exitCode = 1;
  }
}

startServer();
