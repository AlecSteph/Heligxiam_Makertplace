const { query } = require('../config/database');
const { users } = require('./memoryUsers');

function toIso(d) {
  if (!d) return new Date().toISOString();
  if (d instanceof Date) return d.toISOString();
  return new Date(d).toISOString();
}

function rowToMemoryUser(row) {
  return {
    id_user: String(row.id_user),
    nom: row.nom,
    prenom: row.prenom,
    email: row.email,
    password: row.password_hash,
    role: row.role || 'client',
    kind: 'memory',
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at)
  };
}

async function ensureClientAuthColumns() {
  await query(`
    ALTER TABLE "UTILISATEUR"
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
  `);
  await query(`
    ALTER TABLE "UTILISATEUR"
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()
  `);
  await query(`
    ALTER TABLE "UTILISATEUR"
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
  `);
}

async function loadClientsIntoMemory() {
  const { rows } = await query(
    `SELECT id_user, nom, prenom, role, email, password_hash, created_at, updated_at
     FROM "UTILISATEUR"
     WHERE role = 'client' AND password_hash IS NOT NULL`
  );
  for (const row of rows) {
    users.set(String(row.id_user), rowToMemoryUser(row));
  }
  console.log(`[auth] ${rows.length} compte(s) client chargé(s) depuis PostgreSQL`);
}

async function clientEmailTaken(email) {
  const { rows } = await query(
    `SELECT 1 FROM "UTILISATEUR" WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [String(email).trim()]
  );
  return rows.length > 0;
}

async function createClientInPg({ id_user, nom, prenom, email, password_hash }) {
  await query(
    `INSERT INTO "UTILISATEUR" (id_user, nom, prenom, role, email, password_hash, created_at, updated_at)
     VALUES ($1, $2, $3, 'client', $4, $5, NOW(), NOW())`,
    [id_user, nom, prenom, String(email).trim().toLowerCase(), password_hash]
  );
}

async function updateClientPasswordInPg(id_user, password_hash) {
  await query(
    `UPDATE "UTILISATEUR" SET password_hash = $1, updated_at = NOW() WHERE id_user = $2`,
    [password_hash, id_user]
  );
}

module.exports = {
  ensureClientAuthColumns,
  loadClientsIntoMemory,
  clientEmailTaken,
  createClientInPg,
  updateClientPasswordInPg
};
