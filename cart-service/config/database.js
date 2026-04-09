const { Pool } = require('pg');
const { secureLog } = require('../utils/security');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'marketplace',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const testConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    secureLog('info', 'Database connection test successful');
    return true;
  } catch (error) {
    secureLog('error', 'Database connection test failed', { error: error.message });
    throw error;
  }
};

const close = async () => {
  try {
    await pool.end();
    secureLog('info', 'Database pool closed successfully');
  } catch (error) {
    secureLog('error', 'Error closing database pool', { error: error.message });
    throw error;
  }
};

const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    secureLog('debug', 'Executed query', {
      query: text,
      duration: `${duration}ms`,
      rows: result.rowCount
    });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    secureLog('error', 'Query failed', {
      query: text,
      duration: `${duration}ms`,
      error: error.message
    });
    throw error;
  }
};

const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  testConnection,
  close,
  query,
  transaction
};
