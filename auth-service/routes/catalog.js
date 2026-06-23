const express = require('express');
const { isMysqlEnabled } = require('../lib/mysqlPool');
const {
  queryPublishedProducts,
  getProductById,
  getSellerBySlug,
  listCategoriesWithCounts
} = require('../lib/catalog/catalogMysql');
const { listPromoCodes, listVendorVouchers } = require('../lib/catalog/promotionsMysql');

const router = express.Router();

function mysqlRequired(_req, res, next) {
  if (!isMysqlEnabled()) {
    return res.status(503).json({ success: false, message: 'Catalogue indisponible (MySQL requis).' });
  }
  next();
}

router.use(mysqlRequired);

/** GET /api/catalog/products?category=&seller=&flash=&promo= */
router.get('/products', async (req, res) => {
  try {
    const rows = await queryPublishedProducts({
      categorySlug: req.query.category || undefined,
      sellerSlug: req.query.seller || undefined,
      flash: req.query.flash,
      promo: req.query.promo
    });
    return res.json({ success: true, data: { rows, total: rows.length } });
  } catch (e) {
    console.error('catalog products:', e.message);
    return res.status(500).json({ success: false, message: 'Erreur catalogue produits.' });
  }
});

/** GET /api/catalog/products/:id */
router.get('/products/:id', async (req, res) => {
  try {
    const row = await getProductById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Produit introuvable.' });
    return res.json({ success: true, data: { row } });
  } catch (e) {
    console.error('catalog product:', e.message);
    return res.status(500).json({ success: false, message: 'Erreur fiche produit.' });
  }
});

/** GET /api/catalog/categories */
router.get('/categories', async (_req, res) => {
  try {
    const rows = await listCategoriesWithCounts();
    return res.json({ success: true, data: { rows } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Erreur catégories.' });
  }
});

/** GET /api/catalog/sellers/:slug */
router.get('/sellers/:slug', async (req, res) => {
  try {
    const row = await getSellerBySlug(req.params.slug);
    if (!row) return res.status(404).json({ success: false, message: 'Vendeur introuvable.' });
    return res.json({ success: true, data: { row } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Erreur fiche vendeur.' });
  }
});

/** GET /api/catalog/promotions/codes */
router.get('/promotions/codes', async (_req, res) => {
  try {
    const rows = await listPromoCodes();
    return res.json({ success: true, data: { rows } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Erreur codes promo.' });
  }
});

/** GET /api/catalog/promotions/vouchers */
router.get('/promotions/vouchers', async (_req, res) => {
  try {
    const rows = await listVendorVouchers();
    return res.json({ success: true, data: { rows } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Erreur bons vendeur.' });
  }
});

module.exports = { router };
