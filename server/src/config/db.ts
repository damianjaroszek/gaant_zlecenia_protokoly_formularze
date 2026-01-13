import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test połączenia przy starcie
pool.on('connect', () => {
  console.log('Połączono z bazą PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Błąd połączenia z bazą:', err);
});
