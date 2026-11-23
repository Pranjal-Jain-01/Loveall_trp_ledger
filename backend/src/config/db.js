import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX ?? '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS ?? '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS ?? '5000', 10),
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export function getPool() {
  return pool;
}

export async function closePool() {
  await pool.end();
}
