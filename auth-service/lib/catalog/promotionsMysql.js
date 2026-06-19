const { getMysqlPool } = require('../mysqlPool');
const { ensurePromotionSchema } = require('../sellerPromotionsMysql');

async function ensurePromotionTables(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS codes_promotion (
      identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      code VARCHAR(32) NOT NULL,
      libelle VARCHAR(255) NOT NULL,
      type_promo ENUM('pourcentage','montant','livraison') NOT NULL,
      valeur DECIMAL(10,2) NOT NULL,
      montant_min DECIMAL(10,2) NOT NULL DEFAULT 0,
      categorie_cible VARCHAR(64) NULL,
      actif TINYINT(1) NOT NULL DEFAULT 1,
      date_expiration DATETIME(6) NULL,
      PRIMARY KEY (identifiant),
      UNIQUE KEY uk_codes_promo_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS bons_vendeur (
      identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      identifiant_boutique BIGINT UNSIGNED NULL,
      titre VARCHAR(255) NOT NULL,
      type_promo ENUM('pourcentage','montant') NOT NULL,
      valeur DECIMAL(10,2) NOT NULL,
      categorie VARCHAR(64) NULL,
      validite_jours INT NOT NULL DEFAULT 14,
      actif TINYINT(1) NOT NULL DEFAULT 1,
      PRIMARY KEY (identifiant),
      KEY idx_bons_boutique (identifiant_boutique)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

const MARKETPLACE_CODES = [
  { code: 'HELIX15', libelle: '15% sur votre première commande', type: 'pourcentage', valeur: 15, min: 49, cat: null },
  { code: 'TECH25', libelle: "25% sur l'électronique", type: 'pourcentage', valeur: 25, min: 199, cat: 'Électronique' },
  { code: 'MODE30', libelle: '30% sur la mode premium', type: 'pourcentage', valeur: 30, min: 89, cat: 'Mode & Accessoires' },
  { code: 'HOME10', libelle: '10€ offerts sur Maison & Déco', type: 'montant', valeur: 10, min: 60, cat: 'Maison & Décoration' },
  { code: 'BEAUTY20', libelle: '20% sur Beauté & Santé', type: 'pourcentage', valeur: 20, min: 0, cat: 'Beauté & Santé' },
  { code: 'SPORT50', libelle: '50€ sur les équipements sportifs', type: 'montant', valeur: 50, min: 250, cat: 'Sport & Fitness' },
  { code: 'FREESHIP', libelle: 'Livraison offerte', type: 'livraison', valeur: 0, min: 49, cat: null },
  { code: 'HELI20', libelle: '20€ offerts', type: 'montant', valeur: 20, min: 150, cat: null }
];

const VENDOR_VOUCHERS = [
  { slug: 'techstore-pro', titre: 'Bon -20€ Apple', type: 'montant', valeur: 20, cat: 'Électronique', jours: 14 },
  { slug: 'nike-flagship', titre: 'Bon -15% Nike', type: 'pourcentage', valeur: 15, cat: 'Sport & Fitness', jours: 30 },
  { slug: 'home-essentials', titre: 'Bon -10% Dyson', type: 'pourcentage', valeur: 10, cat: 'Maison & Décoration', jours: 21 },
  { slug: 'samsung-premium', titre: 'Bon -25€ Samsung', type: 'montant', valeur: 25, cat: 'Électronique', jours: 10 },
  { slug: 'beaute-paris-select', titre: 'Bon -30% Sephora', type: 'pourcentage', valeur: 30, cat: 'Beauté & Santé', jours: 7 },
  { slug: 'beaute-paris-select', titre: "Bon -40€ L'Occitane", type: 'montant', valeur: 40, cat: 'Beauté & Santé', jours: 20 }
];

function formatDiscount(type, value) {
  if (type === 'pourcentage') return `-${Number(value)}%`;
  if (type === 'montant') return `-${Number(value)}€`;
  return 'Livraison offerte';
}

function formatExpires(dateVal) {
  if (!dateVal) return 'Offre limitée';
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return 'Offre limitée';
  return `Expire le ${d.toLocaleDateString('fr-FR')}`;
}

async function seedPromotions(conn) {
  await ensurePromotionTables(conn);
  for (const c of MARKETPLACE_CODES) {
    await conn.query(
      `INSERT INTO codes_promotion (code, libelle, type_promo, valeur, montant_min, categorie_cible, actif, date_expiration)
       VALUES (?, ?, ?, ?, ?, ?, 1, DATE_ADD(NOW(6), INTERVAL 30 DAY))
       ON DUPLICATE KEY UPDATE libelle = VALUES(libelle), type_promo = VALUES(type_promo),
         valeur = VALUES(valeur), montant_min = VALUES(montant_min), categorie_cible = VALUES(categorie_cible), actif = 1`,
      [c.code, c.libelle, c.type, c.valeur, c.min, c.cat]
    );
  }
  for (const v of VENDOR_VOUCHERS) {
    const [boutique] = await conn.query(`SELECT identifiant FROM boutiques WHERE slug = ? LIMIT 1`, [v.slug]);
    const boutiqueId = boutique[0]?.identifiant || null;
    const [existing] = await conn.query(
      `SELECT identifiant FROM bons_vendeur WHERE titre = ? AND identifiant_boutique <=> ? LIMIT 1`,
      [v.titre, boutiqueId]
    );
    if (!existing.length) {
      await conn.query(
        `INSERT INTO bons_vendeur (identifiant_boutique, titre, type_promo, valeur, categorie, validite_jours, actif)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [boutiqueId, v.titre, v.type, v.valeur, v.cat, v.jours]
      );
    }
  }
}

/** Promotions produit approuvées par l'admin (indexées par identifiant produit). */
async function listApprovedProductPromosMap() {
  const pool = getMysqlPool();
  await ensurePromotionSchema(pool);
  const [rows] = await pool.execute(
    `SELECT pp.identifiant_produit AS productId, pp.prix_promo, pp.prix_barre, pp.type_promo,
            pp.libelle, pp.date_fin
     FROM promotions_produit_boutique pp
     JOIN produits p ON p.identifiant = pp.identifiant_produit
     JOIN boutiques b ON b.identifiant = p.identifiant_boutique
     WHERE pp.statut_moderation = 'approuve'
       AND p.statut_moderation = 'publie'
       AND b.statut = 'active'
       AND (pp.date_debut IS NULL OR pp.date_debut <= NOW(6))
       AND (pp.date_fin IS NULL OR pp.date_fin >= NOW(6))`
  );
  const map = new Map();
  for (const r of rows) {
    map.set(Number(r.productId), r);
  }
  return map;
}

async function listMarketplacePromoCodes() {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT code, libelle, type_promo AS type, valeur, montant_min AS minAmount, categorie_cible AS category,
            date_expiration AS expiresAt, 'marketplace' AS source
     FROM codes_promotion
     WHERE actif = 1 AND (date_expiration IS NULL OR date_expiration >= NOW(6))
     ORDER BY code`
  );
  return rows.map((r) => ({
    code: r.code,
    label: r.libelle,
    type: r.type,
    value: Number(r.valeur),
    minAmount: Number(r.minAmount),
    category: r.category || 'Toutes catégories',
    discount: formatDiscount(r.type, r.valeur),
    expiresAt: r.expiresAt,
    expiresLabel: formatExpires(r.expiresAt),
    source: r.source,
    seller: null
  }));
}

async function listApprovedSellerCoupons() {
  const pool = getMysqlPool();
  await ensurePromotionSchema(pool);
  const [rows] = await pool.execute(
    `SELECT b.code, COALESCE(b.libelle, b.code) AS libelle, b.type_remise AS type, b.valeur,
            b.date_fin AS expiresAt,
            COALESCE(bt.nom_affichage, bt.raison_sociale, 'Partenaire') AS seller
     FROM bons_remise_boutique b
     JOIN boutiques bt ON bt.identifiant = b.identifiant_boutique
     WHERE b.statut_moderation = 'approuve'
       AND b.actif = 1
       AND bt.statut = 'active'
       AND (b.date_fin IS NULL OR b.date_fin >= NOW(6))
     ORDER BY b.identifiant DESC`
  );
  return rows.map((r) => ({
    code: r.code,
    label: r.libelle,
    type: r.type,
    value: Number(r.valeur),
    minAmount: 0,
    category: `Boutique ${r.seller}`,
    discount: formatDiscount(r.type, r.valeur),
    expiresAt: r.expiresAt,
    expiresLabel: formatExpires(r.expiresAt),
    source: 'seller',
    seller: r.seller
  }));
}

async function listPromoCodes() {
  const marketplace = await listMarketplacePromoCodes();
  const seller = await listApprovedSellerCoupons();
  const seen = new Set();
  const merged = [];
  for (const row of [...seller, ...marketplace]) {
    const key = String(row.code).toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }
  return merged;
}

async function listVendorVouchers() {
  const sellerCoupons = await listApprovedSellerCoupons();
  if (sellerCoupons.length) {
    return sellerCoupons.map((r) => ({
      title: r.label,
      discount: r.discount,
      category: r.category,
      seller: r.seller,
      validity: r.expiresLabel,
      code: r.code
    }));
  }

  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT b.titre, b.type_promo AS type, b.valeur, b.categorie, b.validite_jours,
            COALESCE(bt.nom_affichage, bt.raison_sociale, 'Partenaire') AS seller
     FROM bons_vendeur b
     LEFT JOIN boutiques bt ON bt.identifiant = b.identifiant_boutique
     WHERE b.actif = 1 ORDER BY b.identifiant`
  );
  return rows.map((r) => ({
    title: r.titre,
    discount: formatDiscount(r.type, r.valeur),
    category: r.categorie || '—',
    seller: r.seller,
    validity: `Valable ${r.validite_jours} jours`,
    code: null
  }));
}

module.exports = {
  ensurePromotionTables,
  seedPromotions,
  listPromoCodes,
  listVendorVouchers,
  listApprovedProductPromosMap,
  listApprovedSellerCoupons,
  MARKETPLACE_CODES
};
