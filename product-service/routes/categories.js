const express = require('express');
const rateLimit = require('express-rate-limit');
const { secureLog, sanitizeInput } = require('../utils/security');
const database = require('../config/database');

const router = express.Router();

// Rate limiting pour les catégories
const categoryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: {
    success: false,
    message: 'Trop de requêtes de catégories, veuillez réessayer plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

router.use(categoryLimiter);

// GET /api/categories - Récupérer toutes les catégories
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id_categorie,
        c.libelle,
        COUNT(p.id_produit) as nombre_produits,
        COALESCE(AVG(p.prix), 0) as prix_moyen
      FROM CATEGORIE c
      LEFT JOIN PRODUIT p ON c.id_categorie = p.id_categorie
      GROUP BY c.id_categorie, c.libelle
      ORDER BY c.libelle
    `;

    const result = await database.query(query);

    secureLog('info', 'Categories retrieved successfully', {
      count: result.rows.length
    });

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    secureLog('error', 'Failed to get categories', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des catégories'
    });
  }
});

// GET /api/categories/:id/produits - Récupérer les produits d'une catégorie
router.get('/:id/produits', async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        p.id_produit,
        p.nom_produit,
        p.description,
        p.image_produit,
        p.prix,
        p.created_at,
        b.nom_boutique,
        s.quantite as stock_quantite,
        COALESCE(AVG(a.notes), 0) as moyenne_avis,
        COUNT(a.id_avis) as nombre_avis
      FROM PRODUIT p
      LEFT JOIN BOUTIQUE b ON p.id_boutique = b.id_boutique
      LEFT JOIN STOCK s ON p.id_stock = s.id_stock
      LEFT JOIN AVIS a ON p.id_produit = a.id_produit
      WHERE p.id_categorie = $1
      GROUP BY p.id_produit, b.nom_boutique, s.quantite
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = 'SELECT COUNT(*) as total FROM PRODUIT WHERE id_categorie = $1';

    const [productsResult, countResult] = await Promise.all([
      database.query(query, [id, limit, offset]),
      database.query(countQuery, [id])
    ]);

    const totalProducts = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalProducts / limit);

    secureLog('info', 'Category products retrieved successfully', {
      categoryId: id,
      count: productsResult.rows.length,
      page
    });

    res.json({
      success: true,
      data: {
        products: productsResult.rows,
        pagination: {
          currentPage: page,
          totalPages,
          totalProducts,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    secureLog('error', 'Failed to get category products', { 
      error: error.message, 
      categoryId: req.params.id 
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des produits de la catégorie'
    });
  }
});

// GET /api/categories/:id - Récupérer une catégorie spécifique
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        c.id_categorie,
        c.libelle,
        COUNT(p.id_produit) as nombre_produits,
        COALESCE(AVG(p.prix), 0) as prix_moyen,
        MIN(p.prix) as prix_min,
        MAX(p.prix) as prix_max
      FROM CATEGORIE c
      LEFT JOIN PRODUIT p ON c.id_categorie = p.id_categorie
      WHERE c.id_categorie = $1
      GROUP BY c.id_categorie, c.libelle
    `;

    const result = await database.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
      });
    }

    secureLog('info', 'Category retrieved successfully', { categoryId: id });

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    secureLog('error', 'Failed to get category', { 
      error: error.message, 
      categoryId: req.params.id 
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la catégorie'
    });
  }
});

module.exports = router;
