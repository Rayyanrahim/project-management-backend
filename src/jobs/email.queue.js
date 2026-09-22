import { Queue } from 'bullmq';
import redisConnection from '#config/redis.js';

export const EMAIL_QUEUE_NAME = 'email';

export const emailJobNames = {
  OTP: 'otp',
  PASSWORD_RESET: 'password-reset',
};

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export const enqueueOtpEmail = (data) =>
  emailQueue.add(emailJobNames.OTP, data);

export const enqueuePasswordResetEmail = (data) =>
  emailQueue.add(emailJobNames.PASSWORD_RESET, data);
