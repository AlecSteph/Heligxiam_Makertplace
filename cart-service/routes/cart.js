const express = require('express');
const rateLimit = require('express-rate-limit');
const { secureLog } = require('../utils/security');
const {
  validateCartItem,
  getCartByUser,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');

const router = express.Router();

// Rate limiting pour le panier
const cartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: {
    success: false,
    message: 'Trop de requêtes de panier, veuillez réessayer plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting plus strict pour les écritures
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 write requests per windowMs
  message: {
    success: false,
    message: 'Trop de modifications de panier, veuillez ralentir.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

router.use(cartLimiter);

// GET /api/cart/:userId - Récupérer le panier d'un utilisateur
router.get('/:userId', getCartByUser);

// POST /api/cart/:userId/items - Ajouter un article au panier
router.post('/:userId/items', writeLimiter, validateCartItem, addToCart);

// PUT /api/cart/:userId/items/:articleId - Mettre à jour la quantité d'un article
router.put('/:userId/items/:articleId', writeLimiter, validateCartItem, updateCartItem);

// DELETE /api/cart/:userId/items/:articleId - Supprimer un article du panier
router.delete('/:userId/items/:articleId', writeLimiter, removeFromCart);

// DELETE /api/cart/:userId - Vider le panier
router.delete('/:userId', writeLimiter, clearCart);

module.exports = router;
