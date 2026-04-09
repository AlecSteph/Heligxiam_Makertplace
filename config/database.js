const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum de connexions
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test de connexion
pool.on('connect', () => {
  console.log(' Connexion à PostgreSQL établie');
});

pool.on('error', (err) => {
  console.error(' Erreur de connexion PostgreSQL:', err);
  process.exit(-1);
});

// Fonction utilitaire pour les queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
};

// Test de connexion à la base de données
const testConnection = async () => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (err) {
    throw new Error(`Database connection failed: ${err.message}`);
  }
};

// Fermeture propre de la connexion
const close = async () => {
  await pool.end();
};

module.exports = {
  pool,
  query,
  testConnection,
  close
};