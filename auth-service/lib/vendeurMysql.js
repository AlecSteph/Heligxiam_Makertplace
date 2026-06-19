const crypto = require('crypto');
const { getMysqlPool } = require('./mysqlPool');

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {string} email
 */
async function findVendeurByCourriel(pool, email) {
  const normalized = String(email).trim();
  const [rows] = await pool.execute(
    `SELECT identifiant, courriel, mot_de_passe_hache, prenom, nom, actif,
            date_creation, date_mise_a_jour
     FROM comptes_vendeur
     WHERE LOWER(courriel) = LOWER(?)
     LIMIT 1`,
    [normalized]
  );
  return rows[0] || null;
}

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {number|string} identifiant
 */
async function findVendeurById(pool, identifiant) {
  const id = parseInt(String(identifiant), 10);
  if (!Number.isFinite(id) || id < 1) return null;
  const [rows] = await pool.execute(
    `SELECT identifiant, courriel, mot_de_passe_hache, prenom, nom, actif,
            date_creation, date_mise_a_jour
     FROM comptes_vendeur WHERE identifiant = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Première boutique du vendeur (créée à l’inscription).
 * @param {import('mysql2/promise').Pool} pool
 * @param {number} vendeurId
 */
async function getPrimaryBoutiqueId(pool, vendeurId) {
  const [rows] = await pool.execute(
    `SELECT identifiant FROM boutiques WHERE identifiant_vendeur = ? ORDER BY identifiant ASC LIMIT 1`,
    [vendeurId]
  );
  return rows[0]?.identifiant ?? null;
}

function slugForNewBoutique(vendeurId) {
  const rand = crypto.randomBytes(5).toString('hex');
  return `hx-v${vendeurId}-${rand}`.slice(0, 128);
}

/**
 * Crée compte vendeur + profil + boutique brouillon + étapes onboarding (transaction).
 * @returns {{ vendeurId: number, boutiqueId: number }}
 */
async function createVendeurWithBoutique({ courriel, mot_de_passe_hache, prenom, nom }) {
  const pool = getMysqlPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [insCompte] = await conn.execute(
      `INSERT INTO comptes_vendeur (courriel, mot_de_passe_hache, prenom, nom) VALUES (?, ?, ?, ?)`,
      [String(courriel).trim(), mot_de_passe_hache, prenom || null, nom || null]
    );
    const vendeurId = insCompte.insertId;

    await conn.execute(`INSERT INTO profils_vendeur (identifiant_vendeur) VALUES (?)`, [vendeurId]);

    const raison = [prenom, nom].filter(Boolean).join(' ').trim() || courriel;
    const slug = slugForNewBoutique(vendeurId);
    const [insBoutique] = await conn.execute(
      `INSERT INTO boutiques (identifiant_vendeur, slug, raison_sociale, statut)
       VALUES (?, ?, ?, 'brouillon')`,
      [vendeurId, slug, raison.slice(0, 255)]
    );
    const boutiqueId = insBoutique.insertId;

    await conn.execute(
      `INSERT INTO etapes_onboarding_boutique (identifiant_boutique) VALUES (?)`,
      [boutiqueId]
    );

    await conn.commit();
    return { vendeurId, boutiqueId };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {string} email
 */
async function courrielVendeurPris(pool, email) {
  const row = await findVendeurByCourriel(pool, email);
  return !!row;
}

module.exports = {
  findVendeurByCourriel,
  findVendeurById,
  getPrimaryBoutiqueId,
  createVendeurWithBoutique,
  courrielVendeurPris
};
