import { Worker } from 'bullmq';
import redisConnection from '#config/redis.js';
import prisma from '#config/prisma.js';
import verificationStatus from '#constant/verification.js';
import sendEmail from '#utils/sendEmail.js';
import { EMAIL_QUEUE_NAME, emailJobNames } from '#jobs/email.queue.js';

const processEmailJob = async (job) => {
  const { to, subject, text, html } = job.data;
  await sendEmail({ to, subject, text, html });
};

const handleJobFailure = async (job) => {
  if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) {
    return;
  }

  if (job.name === emailJobNames.OTP && job.data.verificationId) {
    await prisma.verification.updateMany({
      where: {
        id: BigInt(job.data.verificationId),
        status: verificationStatus.PENDING,
      },
      data: {
        status: verificationStatus.EXPIRED,
      },
    });
    return;
  }

  if (job.name === emailJobNames.PASSWORD_RESET && job.data.tokenHash) {
    await prisma.passwordResetToken.deleteMany({
      where: { token: job.data.tokenHash },
    });
  }
};

export const startEmailWorker = () => {
  const worker = new Worker(EMAIL_QUEUE_NAME, processEmailJob, {
    connection: redisConnection,
    concurrency: 5,
  });

  worker.on('failed', async (job, error) => {
    console.error(`Email job failed (${job?.name}):`, error.message);
    try {
      await handleJobFailure(job);
    } catch (cleanupError) {
      console.error('Email job cleanup failed:', cleanupError.message);
    }
  });

  worker.on('error', (error) => {
    console.error('Email worker error:', error.message);
  });

  return worker;
};
