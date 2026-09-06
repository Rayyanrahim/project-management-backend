import dotenv from 'dotenv';
import { buildDatabaseUrl } from './database-url.js';

dotenv.config();

const config = {
  APP_ENV: process.env.APP_ENV || 'development',
  PORT: process.env.PORT || 3000,
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || 5432,
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'password',
  DB_NAME: process.env.DB_NAME || 'mydatabase',
  BCRYPT_SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS || 10,
  JWT_SECRET : process.env.JWT_SECRET,
  JWT_REFRESH_SECRET : process.env.JWT_REFRESH_SECRET,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  SMTP_FROM: process.env.SMTP_FROM,
  PASSWORD_RESET_URL: process.env.PASSWORD_RESET_URL,
}

config.DATABASE_URL = buildDatabaseUrl({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
});


let finalConfig;
if (process.env.NODE_ENV === 'testing') {
  finalConfig = config;
} else {
  finalConfig = Object.freeze(config);
}

export default finalConfig;
