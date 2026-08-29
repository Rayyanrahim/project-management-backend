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
  JWT_SECRET : process.env.JWT_SECRET
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
