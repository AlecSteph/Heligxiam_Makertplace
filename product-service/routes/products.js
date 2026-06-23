const express = require('express');
const rateLimit = require('express-rate-limit');
const { secureLog } = require('../utils/security');
const { requireAuth, requireRoles } = require('../middlewares/auth');
const {
  validateProduct,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');

const router = express.Router();

// Rate limiting spécifique pour les produits
const productLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  message: {
    success: false,
    message: 'Trop de requêtes de produits, veuillez réessayer plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    secureLog('warn', 'Product rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    res.status(options.statusCode).json(options.message);
  }
});

// Rate limiting plus strict pour les écritures
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 write requests per windowMs
  message: {
    success: false,
    message: 'Trop de modifications, veuillez ralentir.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Appliquer les rate limits
router.use(productLimiter);

// GET /api/products - Récupérer tous les produits
router.get('/', getAllProducts);

// GET /api/products/:id - Récupérer un produit spécifique
router.get('/:id', getProductById);

// POST /api/products - Créer un nouveau produit
router.post('/', requireAuth, requireRoles('vendeur', 'admin'), writeLimiter, validateProduct, createProduct);

// PUT /api/products/:id - Mettre à jour un produit
router.put('/:id', requireAuth, requireRoles('vendeur', 'admin'), writeLimiter, validateProduct, updateProduct);

// DELETE /api/products/:id - Supprimer un produit
router.delete('/:id', requireAuth, requireRoles('vendeur', 'admin'), writeLimiter, deleteProduct);

module.exports = router;
