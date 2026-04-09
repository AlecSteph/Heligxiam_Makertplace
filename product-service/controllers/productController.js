const { body, validationResult } = require('express-validator');
const { secureLog, sanitizeInput, isValidPrice, isValidUUID } = require('../utils/security');
const database = require('../config/database');

// Validation middleware
const validateProduct = [
  body('nom_produit')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Le nom du produit doit contenir entre 1 et 255 caractères'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('La description doit contenir entre 10 et 2000 caractères'),
  body('prix')
    .isFloat({ min: 0, max: 999999.99 })
    .withMessage('Le prix doit être un nombre positif'),
  body('id_categorie')
    .isUUID()
    .withMessage('L\'ID de catégorie doit être un UUID valide'),
  body('id_boutique')
    .isUUID()
    .withMessage('L\'ID de boutique doit être un UUID valide'),
  body('attribut')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Les attributs ne doivent pas dépasser 500 caractères')
];

// Récupérer tous les produits (avec pagination et filtres)
const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const category = req.query.category;
    const boutique = req.query.boutique;
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || 999999.99;
    const search = req.query.search;

    let whereClause = 'WHERE p.prix >= $1 AND p.prix <= $2';
    let queryParams = [minPrice, maxPrice];
    let paramIndex = 3;

    if (category) {
      whereClause += ` AND c.id_categorie = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }

    if (boutique) {
      whereClause += ` AND b.id_boutique = $${paramIndex}`;
      queryParams.push(boutique);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (p.nom_produit ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      queryParams.push(`%${sanitizeInput(search)}%`);
      paramIndex++;
    }

    const query = `
      SELECT 
        p.id_produit,
        p.nom_produit,
        p.description,
        p.image_produit,
        p.attribut,
        p.prix,
        p.created_at,
        p.updated_at,
        c.libelle as categorie_nom,
        b.nom_boutique,
        s.quantite as stock_quantite,
        COALESCE(AVG(a.notes), 0) as moyenne_avis,
        COUNT(a.id_avis) as nombre_avis
      FROM PRODUIT p
      LEFT JOIN CATEGORIE c ON p.id_categorie = c.id_categorie
      LEFT JOIN BOUTIQUE b ON p.id_boutique = b.id_boutique
      LEFT JOIN STOCK s ON p.id_stock = s.id_stock
      LEFT JOIN AVIS a ON p.id_produit = a.id_produit
      ${whereClause}
      GROUP BY p.id_produit, c.libelle, b.nom_boutique, s.quantite
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const countQuery = `
      SELECT COUNT(DISTINCT p.id_produit) as total
      FROM PRODUIT p
      LEFT JOIN CATEGORIE c ON p.id_categorie = c.id_categorie
      LEFT JOIN BOUTIQUE b ON p.id_boutique = b.id_boutique
      ${whereClause}
    `;

    const [productsResult, countResult] = await Promise.all([
      database.query(query, queryParams),
      database.query(countQuery, queryParams.slice(0, -2))
    ]);

    const totalProducts = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalProducts / limit);

    secureLog('info', 'Products retrieved successfully', {
      count: productsResult.rows.length,
      page,
      totalProducts
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
    secureLog('error', 'Failed to get products', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des produits'
    });
  }
};

// Récupérer un produit par son ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de produit invalide'
      });
    }

    const query = `
      SELECT 
        p.id_produit,
        p.nom_produit,
        p.description,
        p.image_produit,
        p.attribut,
        p.prix,
        p.created_at,
        p.updated_at,
        c.id_categorie,
        c.libelle as categorie_nom,
        b.id_boutique,
        b.nom_boutique,
        b.description as boutique_description,
        s.quantite as stock_quantite,
        COALESCE(AVG(a.notes), 0) as moyenne_avis,
        COUNT(a.id_avis) as nombre_avis
      FROM PRODUIT p
      LEFT JOIN CATEGORIE c ON p.id_categorie = c.id_categorie
      LEFT JOIN BOUTIQUE b ON p.id_boutique = b.id_boutique
      LEFT JOIN STOCK s ON p.id_stock = s.id_stock
      LEFT JOIN AVIS a ON p.id_produit = a.id_produit
      WHERE p.id_produit = $1
      GROUP BY p.id_produit, c.id_categorie, c.libelle, b.id_boutique, b.nom_boutique, b.description, s.quantite
    `;

    const result = await database.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    // Récupérer les avis du produit
    const reviewsQuery = `
      SELECT 
        a.id_avis,
        a.notes,
        a.commentaire,
        a.date,
        u.nom,
        u.prenom
      FROM AVIS a
      LEFT JOIN UTILISATEUR u ON a.id_user = u.id_user
      WHERE a.id_produit = $1
      ORDER BY a.date DESC
      LIMIT 10
    `;

    const reviewsResult = await database.query(reviewsQuery, [id]);

    const product = {
      ...result.rows[0],
      avis: reviewsResult.rows
    };

    secureLog('info', 'Product retrieved successfully', { productId: id });

    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    secureLog('error', 'Failed to get product', { error: error.message, productId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du produit'
    });
  }
};

// Créer un nouveau produit
const createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const {
      nom_produit,
      description,
      prix,
      id_categorie,
      id_boutique,
      attribut,
      image_produit
    } = req.body;

    // Vérifier que la boutique existe
    const boutiqueQuery = 'SELECT id_boutique FROM BOUTIQUE WHERE id_boutique = $1';
    const boutiqueResult = await database.query(boutiqueQuery, [id_boutique]);

    if (boutiqueResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Boutique non trouvée'
      });
    }

    // Créer le produit dans une transaction
    const result = await database.transaction(async (client) => {
      // Créer le stock
      const stockQuery = 'INSERT INTO STOCK (quantite) VALUES (0) RETURNING id_stock';
      const stockResult = await client.query(stockQuery);
      const id_stock = stockResult.rows[0].id_stock;

      // Créer le produit
      const productQuery = `
        INSERT INTO PRODUIT (
          id_produit, nom_produit, description, image_produit, attribut, 
          prix, id_stock, id_categorie, id_boutique
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8
        ) RETURNING *
      `;

      const productResult = await client.query(productQuery, [
        sanitizeInput(nom_produit),
        sanitizeInput(description),
        image_produit || null,
        sanitizeInput(attribut) || null,
        prix,
        id_stock,
        id_categorie,
        id_boutique
      ]);

      return productResult.rows[0];
    });

    secureLog('info', 'Product created successfully', { 
      productId: result.id_produit,
      nom_produit: result.nom_produit
    });

    res.status(201).json({
      success: true,
      message: 'Produit créé avec succès',
      data: result
    });

  } catch (error) {
    secureLog('error', 'Failed to create product', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du produit'
    });
  }
};

// Mettre à jour un produit
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de produit invalide'
      });
    }

    const {
      nom_produit,
      description,
      prix,
      id_categorie,
      attribut,
      image_produit
    } = req.body;

    const query = `
      UPDATE PRODUIT 
      SET nom_produit = $1, description = $2, image_produit = $3, 
          attribut = $4, prix = $5, id_categorie = $6, updated_at = NOW()
      WHERE id_produit = $7
      RETURNING *
    `;

    const result = await database.query(query, [
      sanitizeInput(nom_produit),
      sanitizeInput(description),
      image_produit || null,
      sanitizeInput(attribut) || null,
      prix,
      id_categorie,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    secureLog('info', 'Product updated successfully', { productId: id });

    res.json({
      success: true,
      message: 'Produit mis à jour avec succès',
      data: result.rows[0]
    });

  } catch (error) {
    secureLog('error', 'Failed to update product', { error: error.message, productId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du produit'
    });
  }
};

// Supprimer un produit
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de produit invalide'
      });
    }

    const result = await database.transaction(async (client) => {
      // Récupérer l'ID du stock
      const stockQuery = 'SELECT id_stock FROM PRODUIT WHERE id_produit = $1';
      const stockResult = await client.query(stockQuery, [id]);

      if (stockResult.rows.length === 0) {
        throw new Error('Produit non trouvé');
      }

      const id_stock = stockResult.rows[0].id_stock;

      // Supprimer le produit
      const deleteProductQuery = 'DELETE FROM PRODUIT WHERE id_produit = $1';
      await client.query(deleteProductQuery, [id]);

      // Supprimer le stock
      const deleteStockQuery = 'DELETE FROM STOCK WHERE id_stock = $1';
      await client.query(deleteStockQuery, [id_stock]);

      return true;
    });

    secureLog('info', 'Product deleted successfully', { productId: id });

    res.json({
      success: true,
      message: 'Produit supprimé avec succès'
    });

  } catch (error) {
    secureLog('error', 'Failed to delete product', { error: error.message, productId: req.params.id });
    
    if (error.message === 'Produit non trouvé') {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du produit'
    });
  }
};

module.exports = {
  validateProduct,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
