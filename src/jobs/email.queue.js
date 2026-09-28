import { Queue } from 'bullmq';
import Redis from 'ioredis';
import redisConnection from '#config/redis.js';
import sendEmail from '#utils/sendEmail.js';

export const EMAIL_QUEUE_NAME = 'email';

export const emailJobNames = {
  OTP: 'otp',
  PASSWORD_RESET: 'password-reset',
};

let queueEnabled = false;

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

const parseRedisVersion = (info) => {
  const match = info.match(/redis_version:(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    raw: `${match[1]}.${match[2]}.${match[3]}`,
  };
};

export const isRedisReadyForBullMq = async () => {
  const client = new Redis({
    ...redisConnection,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  try {
    await client.connect();
    const version = parseRedisVersion(await client.info('server'));
    if (!version || version.major < 5) {
      console.warn(
        `Redis ${version?.raw ?? 'unknown'} is too old for BullMQ (need >= 5.0). Emails will send synchronously.`,
      );
      queueEnabled = false;
      return false;
    }
    queueEnabled = true;
    return true;
  } catch (error) {
    console.warn(`Redis unavailable (${error.message}). Emails will send synchronously.`);
    queueEnabled = false;
    return false;
  } finally {
    client.disconnect();
  }
};

const dispatchEmail = async (jobName, data) => {
  if (queueEnabled) {
    try {
      await emailQueue.add(jobName, data);
      return;
    } catch (error) {
      console.warn(`Email queue failed (${error.message}). Sending email synchronously.`);
    }
  }

  await sendEmail({
    to: data.to,
    subject: data.subject,
    text: data.text,
    html: data.html,
  });
};

export const enqueueOtpEmail = (data) =>
  dispatchEmail(emailJobNames.OTP, data);

export const enqueuePasswordResetEmail = (data) =>
  dispatchEmail(emailJobNames.PASSWORD_RESET, data);
