const { getMysqlPool } = require('../mysqlPool');
const { CATEGORIES, SLUG_TO_CATEGORY, enrichProduct } = require('./productMeta');
const { listApprovedProductPromosMap } = require('./promotionsMysql');

function parseCategoryFromDescription(desc) {
  const m = String(desc || '').match(/Catégorie\s*:\s*([^.]+)/);
  return m ? m[1].trim() : 'Électronique';
}

async function queryPublishedProducts(filters = {}) {
  const pool = getMysqlPool();
  const params = [];
  let sql = `
    SELECT p.identifiant AS id, p.reference_sku AS sku, p.titre AS title, p.description,
           p.prix_de_base AS price,
           COALESCE(i.quantite_disponible, 0) AS stock,
           img.url_image AS image,
           b.identifiant AS boutiqueId, b.slug AS sellerSlug,
           COALESCE(b.nom_affichage, b.raison_sociale) AS sellerName,
           c.identifiant AS vendeurId,
           JSON_UNQUOTE(JSON_EXTRACT(pr.preferences_json, '$.logoUrl')) AS sellerLogo
    FROM produits p
    JOIN boutiques b ON b.identifiant = p.identifiant_boutique
    JOIN comptes_vendeur c ON c.identifiant = b.identifiant_vendeur
    LEFT JOIN profils_vendeur pr ON pr.identifiant_vendeur = c.identifiant
    LEFT JOIN inventaire i ON i.identifiant_produit = p.identifiant AND i.identifiant_variante IS NULL
    LEFT JOIN images_produit img ON img.identifiant_produit = p.identifiant AND img.ordre_affichage = 0
    WHERE p.statut_moderation = 'publie' AND b.statut = 'active'
      AND c.courriel LIKE 'vendeur.%@heligxiam.com'`;

  if (filters.sellerSlug) {
    sql += ' AND b.slug = ?';
    params.push(filters.sellerSlug);
  }

  sql += ' ORDER BY p.reference_sku ASC';

  const [rows] = await pool.execute(sql, params);
  const promoMap = await listApprovedProductPromosMap();
  let items = rows.map((r) => ({
    ...r,
    category: parseCategoryFromDescription(r.description)
  }));

  if (filters.categorySlug) {
    const name = SLUG_TO_CATEGORY[filters.categorySlug];
    if (name) items = items.filter((p) => p.category === name);
  }

  if (filters.categoryName) {
    items = items.filter((p) => p.category === filters.categoryName);
  }

  const enriched = items.map((r) => enrichProduct(r, promoMap.get(Number(r.id)) || null));

  if (filters.flash === true || filters.flash === '1') {
    return enriched.filter((p) => p.isFlash);
  }
  if (filters.promo === true || filters.promo === '1') {
    return enriched.filter((p) => p.originalPrice != null);
  }

  return enriched;
}

async function getProductById(id) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT p.identifiant AS id, p.reference_sku AS sku, p.titre AS title, p.description,
            p.prix_de_base AS price,
            COALESCE(i.quantite_disponible, 0) AS stock,
            img.url_image AS image,
            b.identifiant AS boutiqueId, b.slug AS sellerSlug,
            COALESCE(b.nom_affichage, b.raison_sociale) AS sellerName,
            c.identifiant AS vendeurId,
            JSON_UNQUOTE(JSON_EXTRACT(pr.preferences_json, '$.logoUrl')) AS sellerLogo
     FROM produits p
     JOIN boutiques b ON b.identifiant = p.identifiant_boutique
     JOIN comptes_vendeur c ON c.identifiant = b.identifiant_vendeur
     LEFT JOIN profils_vendeur pr ON pr.identifiant_vendeur = c.identifiant
     LEFT JOIN inventaire i ON i.identifiant_produit = p.identifiant AND i.identifiant_variante IS NULL
     LEFT JOIN images_produit img ON img.identifiant_produit = p.identifiant AND img.ordre_affichage = 0
     WHERE p.identifiant = ? AND p.statut_moderation = 'publie'
     LIMIT 1`,
    [id]
  );
  if (!rows.length) return null;
  const promoMap = await listApprovedProductPromosMap();
  const row = { ...rows[0], category: parseCategoryFromDescription(rows[0].description) };
  return enrichProduct(row, promoMap.get(Number(row.id)) || null);
}

async function getSellerBySlug(slug) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT b.identifiant AS boutiqueId, b.slug, b.raison_sociale, b.nom_affichage, b.siret, b.statut,
            c.identifiant AS vendeurId, c.courriel,
            JSON_UNQUOTE(JSON_EXTRACT(p.preferences_json, '$.logoUrl')) AS logoUrl,
            p.biographie
     FROM boutiques b
     JOIN comptes_vendeur c ON c.identifiant = b.identifiant_vendeur
     LEFT JOIN profils_vendeur p ON p.identifiant_vendeur = c.identifiant
     WHERE b.slug = ? LIMIT 1`,
    [slug]
  );
  if (!rows.length) return null;
  const r = rows[0];
  const products = await queryPublishedProducts({ sellerSlug: slug });
  return {
    boutiqueId: r.boutiqueId,
    vendeurId: r.vendeurId,
    slug: r.slug,
    name: r.nom_affichage || r.raison_sociale,
    raisonSociale: r.raison_sociale,
    siret: r.siret,
    status: r.statut,
    email: r.courriel,
    logoUrl: r.logoUrl,
    bio: r.biographie,
    productCount: products.length,
    products
  };
}

async function listCategoriesWithCounts() {
  const products = await queryPublishedProducts();
  const counts = {};
  for (const p of products) {
    counts[p.category] = (counts[p.category] || 0) + 1;
  }
  return CATEGORIES.map((c) => ({
    slug: c.slug,
    name: c.name,
    productCount: counts[c.name] || 0
  }));
}

module.exports = {
  queryPublishedProducts,
  getProductById,
  getSellerBySlug,
  listCategoriesWithCounts,
  CATEGORIES
};
