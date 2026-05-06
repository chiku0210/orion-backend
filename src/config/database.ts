import { Pool } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Check your .env file.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000, // Increased to 15s for Neon cold starts
});

pool.on('error', (err) => {
  logger.error('Database', 'Unexpected error on idle pg client', { error: err.message, stack: err.stack });
  process.exit(-1);
});

pool.on('connect', () => {
  logger.debug('Database', 'New pg client connected to pool');
});

export default pool;
