import config from '#config/config.js';

const redisConnection = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  ...(config.REDIS_PASSWORD && { password: config.REDIS_PASSWORD }),
  maxRetriesPerRequest: null,
  connectTimeout: 5000,
  enableOfflineQueue: false,
};

export default redisConnection;
