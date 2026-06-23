const crypto = require('crypto');
const { query } = require('../config/database');
const { findMemoryUserByEmail, updateMemoryUserPassword } = require('./memoryUsers');
const { findVendeurByCourriel, updateVendeurPassword } = require('./vendeurMysql');
const { isMysqlEnabled, getMysqlPool } = require('./mysqlPool');
const { sendPasswordResetEmail } = require('./mailService');
const { updateClientPasswordInPg } = require('./clientUsersPg');

const TOKEN_TTL_MS = 60 * 60 * 1000;

async function ensurePasswordResetSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(191) NOT NULL,
      token_hash VARCHAR(128) NOT NULL UNIQUE,
      account_kind VARCHAR(32) NOT NULL,
      account_ref VARCHAR(64) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_email
    ON password_reset_tokens (LOWER(email))
  `);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function findAccountByEmail(email) {
  const normalized = String(email).trim().toLowerCase();

  const mem = findMemoryUserByEmail(normalized);
  if (mem) {
    return { kind: 'memory', ref: mem.id_user, email: mem.email, prenom: mem.prenom };
  }

  if (isMysqlEnabled()) {
    const pool = getMysqlPool();
    const row = await findVendeurByCourriel(pool, email);
    if (row && row.actif) {
      return {
        kind: 'vendeur_mysql',
        ref: String(row.identifiant),
        email: row.courriel,
        prenom: row.prenom
      };
    }
  }

  const pgResult = await query(
    `SELECT id_user, email, prenom FROM "UTILISATEUR" WHERE LOWER(email) = $1 LIMIT 1`,
    [normalized]
  );
  if (pgResult.rows[0]) {
    const r = pgResult.rows[0];
    return { kind: 'postgres', ref: r.id_user, email: r.email, prenom: r.prenom };
  }

  return null;
}

async function applyPasswordUpdate(accountKind, accountRef, hashedPassword) {
  if (accountKind === 'memory') {
    const updated = updateMemoryUserPassword(accountRef, hashedPassword);
    if (!updated) return false;
    try {
      await updateClientPasswordInPg(accountRef, hashedPassword);
    } catch (e) {
      console.error('Mise à jour mot de passe PostgreSQL:', e.message);
    }
    return true;
  }
  if (accountKind === 'vendeur_mysql') {
    const pool = getMysqlPool();
    await updateVendeurPassword(pool, accountRef, hashedPassword);
    return true;
  }
  if (accountKind === 'postgres') {
    const result = await query(
      `UPDATE "UTILISATEUR" SET password_hash = $1, updated_at = NOW() WHERE id_user = $2`,
      [hashedPassword, accountRef]
    );
    return result.rowCount > 0;
  }
  return false;
}

async function requestPasswordReset(email) {
  const account = await findAccountByEmail(email);
  if (!account) {
    return { sent: false };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await query(
    `UPDATE password_reset_tokens SET used_at = NOW()
     WHERE LOWER(email) = LOWER($1) AND used_at IS NULL`,
    [account.email]
  );

  await query(
    `INSERT INTO password_reset_tokens (email, token_hash, account_kind, account_ref, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [account.email, tokenHash, account.kind, account.ref, expiresAt]
  );

  await sendPasswordResetEmail({
    to: account.email,
    firstName: account.prenom,
    token: rawToken
  });

  return { sent: true };
}

async function resetPasswordWithToken(token, hashedPassword) {
  const tokenHash = hashToken(token);
  const result = await query(
    `SELECT email, account_kind, account_ref FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  const row = result.rows[0];
  if (!row) {
    return { ok: false, reason: 'INVALID_OR_EXPIRED' };
  }

  const updated = await applyPasswordUpdate(row.account_kind, row.account_ref, hashedPassword);
  if (!updated) {
    return { ok: false, reason: 'ACCOUNT_NOT_FOUND' };
  }

  await query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1`, [tokenHash]);
  return { ok: true };
}

module.exports = {
  ensurePasswordResetSchema,
  requestPasswordReset,
  resetPasswordWithToken,
  applyPasswordUpdate
};
