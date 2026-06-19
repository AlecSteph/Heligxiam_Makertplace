const { getMysqlPool } = require('./mysqlPool');
const {
  ensurePromotionSchema,
  mapCouponRow,
  mapDbProductPromoRow
} = require('./sellerPromotionsMysql');
const { notifySellerPromotionReviewed } = require('./notificationsMysql');

function formatFrDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

async function listPromotionsModeration() {
  const pool = getMysqlPool();
  await ensurePromotionSchema(pool);

  const [couponRows] = await pool.execute(
    `SELECT br.identifiant, br.code, br.type_remise, br.valeur, br.plafond_utilisation,
            br.nombre_utilisations, br.date_fin, br.actif, br.libelle, br.statut_moderation,
            br.date_creation,
            COALESCE(b.nom_affichage, b.raison_sociale) AS shop_name
     FROM bons_remise_boutique br
     JOIN boutiques b ON b.identifiant = br.identifiant_boutique
     WHERE br.statut_moderation = 'en_attente'
     ORDER BY br.date_creation DESC`
  );

  const [productRows] = await pool.execute(
    `SELECT pp.identifiant, pp.type_promo, pp.prix_promo, pp.prix_barre, pp.libelle,
            pp.statut_moderation, pp.date_creation,
            p.titre AS product_title, p.reference_sku,
            COALESCE(b.nom_affichage, b.raison_sociale) AS shop_name
     FROM promotions_produit_boutique pp
     JOIN produits p ON p.identifiant = pp.identifiant_produit
     JOIN boutiques b ON b.identifiant = pp.identifiant_boutique
     WHERE pp.statut_moderation = 'en_attente'
     ORDER BY pp.date_creation DESC`
  );

  const coupons = couponRows.map((r) => {
    const mapped = mapCouponRow(r);
    return {
      kind: 'coupon',
      id: `CP-${r.identifiant}`,
      refId: Number(r.identifiant),
      shopName: r.shop_name,
      label: mapped.label,
      code: mapped.code,
      discount: mapped.discount,
      submittedAt: formatFrDate(r.date_creation),
      status: 'pending'
    };
  });

  const productPromos = productRows.map((r) => {
    const mapped = mapDbProductPromoRow(r, {
      identifiant: r.identifiant,
      reference_sku: r.reference_sku,
      titre: r.product_title,
      prix_de_base: r.prix_promo,
      image: null
    });
    return {
      kind: 'product_promo',
      id: `PP-${r.identifiant}`,
      refId: Number(r.identifiant),
      shopName: r.shop_name,
      productTitle: r.product_title,
      sku: r.reference_sku,
      discount: mapped.discountPct != null ? `-${mapped.discountPct}%` : '—',
      promoPrice: mapped.price,
      type: mapped.type,
      submittedAt: formatFrDate(r.date_creation),
      status: 'pending'
    };
  });

  return [...coupons, ...productPromos];
}

async function approveCouponModeration(couponId) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT br.identifiant, br.identifiant_boutique, br.code, br.libelle
     FROM bons_remise_boutique br
     WHERE br.identifiant = ? AND br.statut_moderation = 'en_attente' LIMIT 1`,
    [couponId]
  );
  if (!rows.length) {
    const err = new Error('NOT_FOUND');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const row = rows[0];
  await pool.execute(
    `UPDATE bons_remise_boutique SET statut_moderation = 'approuve', actif = 1 WHERE identifiant = ?`,
    [couponId]
  );
  await notifySellerPromotionReviewed(
    row.identifiant_boutique,
    'coupon',
    couponId,
    row.libelle || row.code,
    true
  );
  return { couponId, code: row.code };
}

async function rejectCouponModeration(couponId, motif) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT br.identifiant, br.identifiant_boutique, br.code, br.libelle
     FROM bons_remise_boutique br
     WHERE br.identifiant = ? AND br.statut_moderation = 'en_attente' LIMIT 1`,
    [couponId]
  );
  if (!rows.length) {
    const err = new Error('NOT_FOUND');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const row = rows[0];
  await pool.execute(
    `UPDATE bons_remise_boutique SET statut_moderation = 'refuse', actif = 0 WHERE identifiant = ?`,
    [couponId]
  );
  await notifySellerPromotionReviewed(
    row.identifiant_boutique,
    'coupon',
    couponId,
    row.libelle || row.code,
    false,
    motif
  );
  return { couponId, code: row.code };
}

async function approveProductPromoModeration(promoId) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT pp.identifiant, pp.identifiant_boutique, pp.identifiant_produit, pp.prix_promo, pp.libelle,
            p.titre
     FROM promotions_produit_boutique pp
     JOIN produits p ON p.identifiant = pp.identifiant_produit
     WHERE pp.identifiant = ? AND pp.statut_moderation = 'en_attente' LIMIT 1`,
    [promoId]
  );
  if (!rows.length) {
    const err = new Error('NOT_FOUND');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const row = rows[0];
  await pool.execute(
    `UPDATE promotions_produit_boutique SET statut_moderation = 'approuve' WHERE identifiant = ?`,
    [promoId]
  );
  await pool.execute(`UPDATE produits SET prix_de_base = ? WHERE identifiant = ?`, [
    row.prix_promo,
    row.identifiant_produit
  ]);
  await notifySellerPromotionReviewed(
    row.identifiant_boutique,
    'product_promo',
    promoId,
    row.libelle || row.titre,
    true
  );
  return { promoId, productId: row.identifiant_produit };
}

async function rejectProductPromoModeration(promoId, motif) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT pp.identifiant, pp.identifiant_boutique, pp.libelle, p.titre
     FROM promotions_produit_boutique pp
     JOIN produits p ON p.identifiant = pp.identifiant_produit
     WHERE pp.identifiant = ? AND pp.statut_moderation = 'en_attente' LIMIT 1`,
    [promoId]
  );
  if (!rows.length) {
    const err = new Error('NOT_FOUND');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const row = rows[0];
  await pool.execute(
    `UPDATE promotions_produit_boutique SET statut_moderation = 'refuse' WHERE identifiant = ?`,
    [promoId]
  );
  await notifySellerPromotionReviewed(
    row.identifiant_boutique,
    'product_promo',
    promoId,
    row.libelle || row.titre,
    false,
    motif
  );
  return { promoId };
}

module.exports = {
  listPromotionsModeration,
  approveCouponModeration,
  rejectCouponModeration,
  approveProductPromoModeration,
  rejectProductPromoModeration
};
