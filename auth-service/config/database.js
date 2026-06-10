const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'marketplace',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000
});

// Evite un crash du process si PostgreSQL coupe une connexion idle.
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

const ensureSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "UTILISATEUR" (
      id_user UUID PRIMARY KEY,
      nom VARCHAR(100) NOT NULL,
      prenom VARCHAR(100) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'client',
      email VARCHAR(191) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    ALTER TABLE "UTILISATEUR"
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
  `);
  await pool.query(`
    ALTER TABLE "UTILISATEUR"
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()
  `);
  await pool.query(`
    ALTER TABLE "UTILISATEUR"
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
  `);
  await pool.query(`
    UPDATE "UTILISATEUR"
    SET created_at = NOW()
    WHERE created_at IS NULL
  `);
  await pool.query(`
    UPDATE "UTILISATEUR"
    SET updated_at = NOW()
    WHERE updated_at IS NULL
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES "UTILISATEUR"(id_user) ON DELETE CASCADE,
      token_hash VARCHAR(128) NOT NULL UNIQUE,
      revoked BOOLEAN NOT NULL DEFAULT FALSE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
};

const testConnection = async () => {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  testConnection,
  ensureSchema
};
