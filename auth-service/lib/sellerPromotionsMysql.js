const { getMysqlPool } = require('./mysqlPool');
const { META_BY_SKU } = require('./catalog/productMeta');
const { notifyAdminPromotionSubmitted } = require('./notificationsMysql');

/** Coupons boutique seed — aligné spec §4 (bons vendeur) */
const VENDOR_COUPON_SEEDS = [
  { slug: 'techstore-pro', code: 'TECHAPPLE20', type: 'montant', valeur: 20, plafond: 500, libelle: '-20€ sur Apple' },
  { slug: 'nike-flagship', code: 'NIKE15', type: 'pourcentage', valeur: 15, plafond: 1000, libelle: '-15% Nike' },
  { slug: 'home-essentials', code: 'DYSON10', type: 'pourcentage', valeur: 10, plafond: 300, libelle: '-10% Dyson' },
  { slug: 'beaute-paris-select', code: 'SEPHORA30', type: 'pourcentage', valeur: 30, plafond: 200, libelle: '-30% Sephora' },
  { slug: 'beaute-paris-select', code: 'OCCITANE40', type: 'montant', valeur: 40, plafond: 150, libelle: "-40€ L'Occitane" },
  { slug: 'samsung-premium', code: 'GALAXY25', type: 'montant', valeur: 25, plafond: 400, libelle: '-25€ Samsung' },
  { slug: 'fashion-hub', code: 'MODE10', type: 'pourcentage', valeur: 10, plafond: 250, libelle: '-10% Mode' },
  { slug: 'sport-performance', code: 'SPORT20', type: 'pourcentage', valeur: 20, plafond: 300, libelle: '-20% Sport' },
  { slug: 'electromarket', code: 'TECH5', type: 'pourcentage', valeur: 5, plafond: 500, libelle: '-5% High-tech' },
  { slug: 'auto-expert-france', code: 'AUTO15', type: 'pourcentage', valeur: 15, plafond: 200, libelle: '-15% Auto' }
];

let schemaEnsured = false;

async function ensurePromotionSchema(poolOrConn) {
  if (schemaEnsured) return;
  const conn = poolOrConn?.getConnection ? await poolOrConn.getConnection() : poolOrConn;
  const release = poolOrConn?.getConnection ? () => conn.release() : () => {};
  try {
    const [libelleCol] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bons_remise_boutique' AND COLUMN_NAME = 'libelle'`
    );
    if (!libelleCol.length) {
      await conn.query(`ALTER TABLE bons_remise_boutique ADD COLUMN libelle VARCHAR(255) NULL`);
    }
    const [modCol] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bons_remise_boutique' AND COLUMN_NAME = 'statut_moderation'`
    );
    if (!modCol.length) {
      await conn.query(
        `ALTER TABLE bons_remise_boutique ADD COLUMN statut_moderation VARCHAR(32) NOT NULL DEFAULT 'approuve'`
      );
      await conn.query(
        `ALTER TABLE bons_remise_boutique ADD COLUMN date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`
      );
    }
    await conn.query(`
      CREATE TABLE IF NOT EXISTS promotions_produit_boutique (
        identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        identifiant_boutique BIGINT UNSIGNED NOT NULL,
        identifiant_produit BIGINT UNSIGNED NOT NULL,
        prix_promo DECIMAL(12,2) NOT NULL,
        prix_barre DECIMAL(12,2) NULL,
        type_promo VARCHAR(16) NOT NULL DEFAULT 'promo',
        libelle VARCHAR(255) NULL,
        statut_moderation VARCHAR(32) NOT NULL DEFAULT 'en_attente',
        date_debut DATETIME(6) NULL,
        date_fin DATETIME(6) NULL,
        date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (identifiant),
        KEY idx_promo_boutique (identifiant_boutique),
        KEY idx_promo_statut (statut_moderation),
        CONSTRAINT fk_promo_boutique FOREIGN KEY (identifiant_boutique)
          REFERENCES boutiques (identifiant) ON DELETE CASCADE,
        CONSTRAINT fk_promo_produit FOREIGN KEY (identifiant_produit)
          REFERENCES produits (identifiant) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    schemaEnsured = true;
  } finally {
    release();
  }
}

function resolveCouponStatus(c) {
  const mod = c.statut_moderation || 'approuve';
  if (mod === 'en_attente') return 'pending';
  if (mod === 'refuse') return 'rejected';
  if (!Number(c.actif)) return 'expired';
  return 'active';
}

function mapCouponRow(c) {
  const status = resolveCouponStatus(c);
  const max = c.plafond_utilisation != null ? Number(c.plafond_utilisation) : null;
  return {
    id: `cp-${c.identifiant}`,
    dbId: Number(c.identifiant),
    code: c.code,
    label: c.libelle || c.code,
    discount:
      c.type_remise === 'pourcentage' ? `-${Number(c.valeur)}%` : `-${Number(c.valeur)}€`,
    type: c.type_remise,
    value: Number(c.valeur),
    scope: 'Boutique',
    used: Number(c.nombre_utilisations || 0),
    max: max || '∞',
    expires: c.date_fin ? new Date(c.date_fin).toLocaleDateString('fr-FR') : '—',
    status,
    moderationStatus: c.statut_moderation || 'approuve',
    editable: true
  };
}

function mapDbProductPromoRow(pp, product) {
  const price = Number(pp.prix_promo ?? product.prix_de_base);
  const originalPrice = pp.prix_barre != null ? Number(pp.prix_barre) : Number(product.prix_de_base);
  const discountPct =
    originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : null;
  const mod = pp.statut_moderation || 'en_attente';
  let status = 'active';
  if (mod === 'en_attente') status = 'pending';
  else if (mod === 'refuse') status = 'rejected';

  return {
    id: `pp-${pp.identifiant}`,
    dbId: Number(pp.identifiant),
    productId: Number(product.identifiant || product.id),
    sku: product.reference_sku || product.sku,
    name: product.titre || product.title || product.name,
    image: product.image || product.url_image || '',
    price,
    originalPrice: originalPrice > price ? originalPrice : undefined,
    discountPct,
    type: pp.type_promo === 'flash' ? 'flash' : 'promo',
    badge: pp.libelle || (pp.type_promo === 'flash' ? 'Flash' : 'Promotion'),
    status,
    moderationStatus: mod,
    editable: true,
    source: 'seller'
  };
}

async function listCouponsForBoutique(boutiqueId) {
  const pool = getMysqlPool();
  await ensurePromotionSchema(pool);
  const [rows] = await pool.execute(
    `SELECT identifiant, code, type_remise, valeur, nombre_utilisations, plafond_utilisation,
            date_fin, actif, libelle, statut_moderation
     FROM bons_remise_boutique
     WHERE identifiant_boutique = ?
     ORDER BY identifiant DESC`,
    [boutiqueId]
  );
  return rows.map(mapCouponRow);
}

async function listDbProductPromosForBoutique(boutiqueId) {
  const pool = getMysqlPool();
  await ensurePromotionSchema(pool);
  const [rows] = await pool.execute(
    `SELECT pp.identifiant, pp.identifiant_produit, pp.prix_promo, pp.prix_barre, pp.type_promo,
            pp.libelle, pp.statut_moderation,
            p.identifiant AS product_id, p.reference_sku, p.titre, p.prix_de_base,
            img.url_image AS image
     FROM promotions_produit_boutique pp
     JOIN produits p ON p.identifiant = pp.identifiant_produit
     LEFT JOIN images_produit img ON img.identifiant_produit = p.identifiant AND img.ordre_affichage = 0
     WHERE pp.identifiant_boutique = ?
     ORDER BY pp.identifiant DESC`,
    [boutiqueId]
  );
  return rows.map((r) =>
    mapDbProductPromoRow(r, {
      identifiant: r.product_id,
      reference_sku: r.reference_sku,
      titre: r.titre,
      prix_de_base: r.prix_de_base,
      image: r.image
    })
  );
}

async function listCatalogMetaPromosForBoutique(boutiqueId) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT p.identifiant AS id, p.reference_sku AS sku, p.titre AS title, p.prix_de_base AS price,
            img.url_image AS image
     FROM produits p
     LEFT JOIN images_produit img ON img.identifiant_produit = p.identifiant AND img.ordre_affichage = 0
     WHERE p.identifiant_boutique = ? AND p.statut_moderation = 'publie'
     ORDER BY p.reference_sku ASC`,
    [boutiqueId]
  );

  const promos = [];
  for (const r of rows) {
    const meta = META_BY_SKU[r.sku] || {};
    const price = Number(r.price);
    const originalPrice = meta.originalPrice != null ? Number(meta.originalPrice) : null;
    const isFlash = Boolean(meta.flash);
    if (!isFlash && !(originalPrice != null && originalPrice > price)) continue;

    const discountPct = originalPrice
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

    promos.push({
      id: `cat-${r.id}`,
      productId: Number(r.id),
      sku: r.sku,
      name: r.title,
      image: r.image || '',
      price,
      originalPrice: originalPrice || undefined,
      discountPct,
      type: isFlash ? 'flash' : 'promo',
      badge: meta.badge || (isFlash ? 'Flash' : 'Promotion'),
      status: 'active',
      moderationStatus: 'approuve',
      editable: false,
      source: 'catalog'
    });
  }
  return promos;
}

async function syncCatalogPromosToDb(boutiqueId) {
  const pool = getMysqlPool();
  await ensurePromotionSchema(pool);
  const [products] = await pool.execute(
    `SELECT p.identifiant, p.reference_sku, p.prix_de_base, p.titre
     FROM produits p
     WHERE p.identifiant_boutique = ? AND p.statut_moderation = 'publie'`,
    [boutiqueId]
  );

  for (const p of products) {
    const meta = META_BY_SKU[p.reference_sku] || {};
    const price = Number(p.prix_de_base);
    const originalPrice = meta.originalPrice != null ? Number(meta.originalPrice) : null;
    const isFlash = Boolean(meta.flash);
    if (!isFlash && !(originalPrice != null && originalPrice > price)) continue;

    const [existing] = await pool.execute(
      `SELECT identifiant FROM promotions_produit_boutique WHERE identifiant_produit = ? LIMIT 1`,
      [p.identifiant]
    );
    if (existing.length) continue;

    const typePromo = isFlash ? 'flash' : 'promo';
    const libelle = meta.badge || (isFlash ? 'Flash' : 'Promotion');
    const prixBarre = originalPrice != null && originalPrice > price ? originalPrice : price;

    await pool.execute(
      `INSERT INTO promotions_produit_boutique
         (identifiant_boutique, identifiant_produit, prix_promo, prix_barre, type_promo, libelle,
          statut_moderation, date_debut, date_fin)
       VALUES (?, ?, ?, ?, ?, ?, 'approuve', NOW(6), DATE_ADD(NOW(6), INTERVAL 60 DAY))`,
      [boutiqueId, p.identifiant, price, prixBarre, typePromo, libelle]
    );
  }
}

async function listProductPromotionsForBoutique(boutiqueId) {
  await syncCatalogPromosToDb(boutiqueId);
  return listDbProductPromosForBoutique(boutiqueId);
}

function buildPromotionsSummary(coupons, productPromos) {
  const activeCoupons = coupons.filter((c) => c.status === 'active').length;
  const pendingCoupons = coupons.filter((c) => c.status === 'pending').length;
  const uses30d = coupons.reduce((sum, c) => sum + (c.used || 0), 0);
  const activeProductPromos = productPromos.filter((p) => p.status === 'active');
  const flashCount = activeProductPromos.filter((p) => p.type === 'flash').length;
  const promoCount = activeProductPromos.filter((p) => p.type === 'promo').length;
  const avgDiscount =
    activeProductPromos.length && activeProductPromos.some((p) => p.discountPct)
      ? Math.round(
          activeProductPromos
            .filter((p) => p.discountPct)
            .reduce((s, p) => s + p.discountPct, 0) /
            activeProductPromos.filter((p) => p.discountPct).length
        )
      : 0;

  return {
    activeCoupons,
    pendingCoupons,
    uses30d,
    promoProductCount: activeProductPromos.length,
    flashProductCount: flashCount,
    standardPromoCount: promoCount,
    avgDiscountPct: avgDiscount
  };
}

async function getPromotionsPageData(boutiqueId) {
  const [coupons, productPromos] = await Promise.all([
    listCouponsForBoutique(boutiqueId),
    listProductPromotionsForBoutique(boutiqueId)
  ]);
  return {
    coupons,
    productPromos,
    summary: buildPromotionsSummary(coupons, productPromos)
  };
}

async function listEligibleProductsForPromo(boutiqueId) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT p.identifiant AS id, p.reference_sku AS sku, p.titre AS name, p.prix_de_base AS price
     FROM produits p
     WHERE p.identifiant_boutique = ? AND p.statut_moderation = 'publie'
     ORDER BY p.titre ASC`,
    [boutiqueId]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    sku: r.sku,
    name: r.name,
    price: Number(r.price)
  }));
}

function validateCouponPayload(payload, { partial = false } = {}) {
  const code = payload.code != null
    ? String(payload.code).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 64)
    : null;
  if (!partial && (!code || code.length < 3)) {
    const err = new Error('CODE_INVALID');
    err.code = 'CODE_INVALID';
    throw err;
  }

  const typeRemise =
    payload.typeRemise === 'montant' || payload.typeRemise === 'pourcentage'
      ? payload.typeRemise
      : partial
        ? null
        : 'pourcentage';

  const valeur = payload.valeur != null ? Number(payload.valeur) : null;
  if (!partial && (!Number.isFinite(valeur) || valeur <= 0)) {
    const err = new Error('VALUE_INVALID');
    err.code = 'VALUE_INVALID';
    throw err;
  }
  if (typeRemise === 'pourcentage' && valeur != null && valeur > 90) {
    const err = new Error('VALUE_TOO_HIGH');
    err.code = 'VALUE_TOO_HIGH';
    throw err;
  }

  return {
    code,
    typeRemise,
    valeur,
    plafond: payload.plafond != null && payload.plafond !== '' ? Number(payload.plafond) : null,
    libelle: payload.label != null ? String(payload.label).trim().slice(0, 255) || null : null,
    validDays: Number(payload.validDays) > 0 ? Number(payload.validDays) : 30
  };
}

async function createCouponForBoutique(boutiqueId, payload) {
  const pool = getMysqlPool();
  const conn = await pool.getConnection();
  try {
    await ensurePromotionSchema(conn);
    const v = validateCouponPayload(payload);

    const [existing] = await conn.execute(
      `SELECT identifiant FROM bons_remise_boutique WHERE identifiant_boutique = ? AND code = ? LIMIT 1`,
      [boutiqueId, v.code]
    );
    if (existing.length) {
      const err = new Error('CODE_EXISTS');
      err.code = 'CODE_EXISTS';
      throw err;
    }

    const [result] = await conn.execute(
      `INSERT INTO bons_remise_boutique
         (identifiant_boutique, code, type_remise, valeur, plafond_utilisation, libelle,
          date_debut, date_fin, actif, statut_moderation)
       VALUES (?, ?, ?, ?, ?, ?, NOW(6), DATE_ADD(NOW(6), INTERVAL ? DAY), 0, 'en_attente')`,
      [boutiqueId, v.code, v.typeRemise, v.valeur, v.plafond, v.libelle, v.validDays]
    );

    const couponId = result.insertId;
    await notifyAdminPromotionSubmitted(boutiqueId, 'coupon', couponId, v.libelle || v.code);

    const [rows] = await conn.execute(
      `SELECT identifiant, code, type_remise, valeur, nombre_utilisations, plafond_utilisation,
              date_fin, actif, libelle, statut_moderation
       FROM bons_remise_boutique WHERE identifiant = ? LIMIT 1`,
      [couponId]
    );
    return mapCouponRow(rows[0]);
  } finally {
    conn.release();
  }
}

async function updateCouponForBoutique(boutiqueId, couponId, payload) {
  const pool = getMysqlPool();
  await ensurePromotionSchema(pool);
  const v = validateCouponPayload(payload);

  const [existing] = await pool.execute(
    `SELECT identifiant, code FROM bons_remise_boutique
     WHERE identifiant = ? AND identifiant_boutique = ? LIMIT 1`,
    [couponId, boutiqueId]
  );
  if (!existing.length) {
    const err = new Error('NOT_FOUND');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const [dup] = await pool.execute(
    `SELECT identifiant FROM bons_remise_boutique
     WHERE identifiant_boutique = ? AND code = ? AND identifiant <> ? LIMIT 1`,
    [boutiqueId, v.code, couponId]
  );
  if (dup.length) {
    const err = new Error('CODE_EXISTS');
    err.code = 'CODE_EXISTS';
    throw err;
  }

  await pool.execute(
    `UPDATE bons_remise_boutique
     SET code = ?, type_remise = ?, valeur = ?, plafond_utilisation = ?, libelle = ?,
         date_fin = DATE_ADD(NOW(6), INTERVAL ? DAY), actif = 0, statut_moderation = 'en_attente'
     WHERE identifiant = ? AND identifiant_boutique = ?`,
    [v.code, v.typeRemise, v.valeur, v.plafond, v.libelle, v.validDays, couponId, boutiqueId]
  );

  await notifyAdminPromotionSubmitted(boutiqueId, 'coupon', couponId, v.libelle || v.code);

  const [rows] = await pool.execute(
    `SELECT identifiant, code, type_remise, valeur, nombre_utilisations, plafond_utilisation,
            date_fin, actif, libelle, statut_moderation
     FROM bons_remise_boutique WHERE identifiant = ? LIMIT 1`,
    [couponId]
  );
  return mapCouponRow(rows[0]);
}

async function deleteCouponForBoutique(boutiqueId, couponId) {
  const pool = getMysqlPool();
  const [result] = await pool.execute(
    `DELETE FROM bons_remise_boutique WHERE identifiant = ? AND identifiant_boutique = ?`,
    [couponId, boutiqueId]
  );
  if (!result.affectedRows) {
    const err = new Error('NOT_FOUND');
    err.code = 'NOT_FOUND';
    throw err;
  }
  return { deleted: true };
}

async function createProductPromoForBoutique(boutiqueId, payload) {
  const pool = getMysqlPool();
  await ensurePromotionSchema(pool);

  const productId = Number(payload.productId);
  const promoPrice = Number(payload.promoPrice);
  const originalPrice =
    payload.originalPrice != null && payload.originalPrice !== ''
      ? Number(payload.originalPrice)
      : null;
  const typePromo = payload.typePromo === 'flash' ? 'flash' : 'promo';
  const libelle = String(payload.label || '').trim().slice(0, 255) || null;
  const validDays = Number(payload.validDays) > 0 ? Number(payload.validDays) : 14;

  if (!Number.isFinite(productId) || productId < 1) {
    const err = new Error('PRODUCT_INVALID');
    err.code = 'PRODUCT_INVALID';
    throw err;
  }
  if (!Number.isFinite(promoPrice) || promoPrice <= 0) {
    const err = new Error('PRICE_INVALID');
    err.code = 'PRICE_INVALID';
    throw err;
  }

  const [product] = await pool.execute(
    `SELECT identifiant, titre, prix_de_base FROM produits
     WHERE identifiant = ? AND identifiant_boutique = ? AND statut_moderation = 'publie' LIMIT 1`,
    [productId, boutiqueId]
  );
  if (!product.length) {
    const err = new Error('PRODUCT_NOT_FOUND');
    err.code = 'PRODUCT_NOT_FOUND';
    throw err;
  }

  const basePrice = Number(product[0].prix_de_base);
  const crossed = originalPrice != null && originalPrice > promoPrice ? originalPrice : basePrice;

  const [result] = await pool.execute(
    `INSERT INTO promotions_produit_boutique
       (identifiant_boutique, identifiant_produit, prix_promo, prix_barre, type_promo, libelle,
        statut_moderation, date_debut, date_fin)
     VALUES (?, ?, ?, ?, ?, ?, 'en_attente', NOW(6), DATE_ADD(NOW(6), INTERVAL ? DAY))`,
    [boutiqueId, productId, promoPrice, crossed, typePromo, libelle, validDays]
  );

  const promoId = result.insertId;
  await notifyAdminPromotionSubmitted(
    boutiqueId,
    'product_promo',
    promoId,
    libelle || product[0].titre
  );

  const promos = await listDbProductPromosForBoutique(boutiqueId);
  return promos.find((p) => p.dbId === promoId);
}

async function updateProductPromoForBoutique(boutiqueId, promoId, payload) {
  const pool = getMysqlPool();
  await ensurePromotionSchema(pool);

  const promoPrice = Number(payload.promoPrice);
  const originalPrice =
    payload.originalPrice != null && payload.originalPrice !== ''
      ? Number(payload.originalPrice)
      : null;
  const typePromo = payload.typePromo === 'flash' ? 'flash' : 'promo';
  const libelle = String(payload.label || '').trim().slice(0, 255) || null;
  const validDays = Number(payload.validDays) > 0 ? Number(payload.validDays) : 14;

  if (!Number.isFinite(promoPrice) || promoPrice <= 0) {
    const err = new Error('PRICE_INVALID');
    err.code = 'PRICE_INVALID';
    throw err;
  }

  const [existing] = await pool.execute(
    `SELECT pp.identifiant, p.titre, p.prix_de_base
     FROM promotions_produit_boutique pp
     JOIN produits p ON p.identifiant = pp.identifiant_produit
     WHERE pp.identifiant = ? AND pp.identifiant_boutique = ? LIMIT 1`,
    [promoId, boutiqueId]
  );
  if (!existing.length) {
    const err = new Error('NOT_FOUND');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const basePrice = Number(existing[0].prix_de_base);
  const crossed = originalPrice != null && originalPrice > promoPrice ? originalPrice : basePrice;

  await pool.execute(
    `UPDATE promotions_produit_boutique
     SET prix_promo = ?, prix_barre = ?, type_promo = ?, libelle = ?,
         statut_moderation = 'en_attente', date_fin = DATE_ADD(NOW(6), INTERVAL ? DAY)
     WHERE identifiant = ? AND identifiant_boutique = ?`,
    [promoPrice, crossed, typePromo, libelle, validDays, promoId, boutiqueId]
  );

  await notifyAdminPromotionSubmitted(
    boutiqueId,
    'product_promo',
    promoId,
    libelle || existing[0].titre
  );

  const promos = await listDbProductPromosForBoutique(boutiqueId);
  return promos.find((p) => p.dbId === promoId);
}

async function deleteProductPromoForBoutique(boutiqueId, promoId) {
  const pool = getMysqlPool();
  const [result] = await pool.execute(
    `DELETE FROM promotions_produit_boutique WHERE identifiant = ? AND identifiant_boutique = ?`,
    [promoId, boutiqueId]
  );
  if (!result.affectedRows) {
    const err = new Error('NOT_FOUND');
    err.code = 'NOT_FOUND';
    throw err;
  }
  return { deleted: true };
}

async function seedVendorCoupons(conn) {
  await ensurePromotionSchema(conn);
  for (const seed of VENDOR_COUPON_SEEDS) {
    const [boutique] = await conn.query(`SELECT identifiant FROM boutiques WHERE slug = ? LIMIT 1`, [
      seed.slug
    ]);
    if (!boutique.length) continue;
    const boutiqueId = boutique[0].identifiant;

    const [existing] = await conn.query(
      `SELECT identifiant FROM bons_remise_boutique WHERE identifiant_boutique = ? AND code = ? LIMIT 1`,
      [boutiqueId, seed.code]
    );
    if (existing.length) {
      await conn.query(
        `UPDATE bons_remise_boutique SET type_remise = ?, valeur = ?, plafond_utilisation = ?,
         libelle = ?, actif = 1, statut_moderation = 'approuve', date_fin = DATE_ADD(NOW(6), INTERVAL 60 DAY)
         WHERE identifiant = ?`,
        [seed.type, seed.valeur, seed.plafond, seed.libelle, existing[0].identifiant]
      );
    } else {
      await conn.query(
        `INSERT INTO bons_remise_boutique
           (identifiant_boutique, code, type_remise, valeur, plafond_utilisation, libelle,
            date_debut, date_fin, actif, statut_moderation)
         VALUES (?, ?, ?, ?, ?, ?, NOW(6), DATE_ADD(NOW(6), INTERVAL 60 DAY), 1, 'approuve')`,
        [boutiqueId, seed.code, seed.type, seed.valeur, seed.plafond, seed.libelle]
      );
    }
  }
}

async function seedVendorProductPromos(conn) {
  await ensurePromotionSchema(conn);
  const [products] = await conn.query(
    `SELECT p.identifiant, p.identifiant_boutique, p.reference_sku, p.prix_de_base, p.titre
     FROM produits p
     JOIN boutiques b ON b.identifiant = p.identifiant_boutique
     JOIN comptes_vendeur c ON c.identifiant = b.identifiant_vendeur
     WHERE c.courriel LIKE 'vendeur.%@heligxiam.com' AND p.statut_moderation = 'publie'`
  );

  for (const p of products) {
    const meta = META_BY_SKU[p.reference_sku] || {};
    const price = Number(p.prix_de_base);
    const originalPrice = meta.originalPrice != null ? Number(meta.originalPrice) : null;
    const isFlash = Boolean(meta.flash);
    if (!isFlash && !(originalPrice != null && originalPrice > price)) continue;

    const typePromo = isFlash ? 'flash' : 'promo';
    const libelle = meta.badge || (isFlash ? 'Flash' : 'Promotion');
    const prixBarre = originalPrice != null && originalPrice > price ? originalPrice : price;

    const [existing] = await conn.query(
      `SELECT identifiant FROM promotions_produit_boutique WHERE identifiant_produit = ? LIMIT 1`,
      [p.identifiant]
    );
    if (existing.length) {
      await conn.query(
        `UPDATE promotions_produit_boutique
         SET prix_promo = ?, prix_barre = ?, type_promo = ?, libelle = ?,
             statut_moderation = 'approuve', date_fin = DATE_ADD(NOW(6), INTERVAL 60 DAY)
         WHERE identifiant = ?`,
        [price, prixBarre, typePromo, libelle, existing[0].identifiant]
      );
    } else {
      await conn.query(
        `INSERT INTO promotions_produit_boutique
           (identifiant_boutique, identifiant_produit, prix_promo, prix_barre, type_promo, libelle,
            statut_moderation, date_debut, date_fin)
         VALUES (?, ?, ?, ?, ?, ?, 'approuve', NOW(6), DATE_ADD(NOW(6), INTERVAL 60 DAY))`,
        [p.identifiant_boutique, p.identifiant, price, prixBarre, typePromo, libelle]
      );
    }
  }
}

module.exports = {
  VENDOR_COUPON_SEEDS,
  ensurePromotionSchema,
  listCouponsForBoutique,
  listProductPromotionsForBoutique,
  listEligibleProductsForPromo,
  getPromotionsPageData,
  createCouponForBoutique,
  updateCouponForBoutique,
  deleteCouponForBoutique,
  createProductPromoForBoutique,
  updateProductPromoForBoutique,
  deleteProductPromoForBoutique,
  seedVendorCoupons,
  seedVendorProductPromos,
  buildPromotionsSummary,
  mapCouponRow,
  mapDbProductPromoRow
};
