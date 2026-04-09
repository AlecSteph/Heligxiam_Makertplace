const { body, validationResult } = require('express-validator');
const { secureLog, sanitizeInput, isValidUUID } = require('../utils/security');
const database = require('../config/database');

// Validation middleware
const validateCartItem = [
  body('id_produit')
    .isUUID()
    .withMessage('L\'ID du produit doit être un UUID valide'),
  body('quantite')
    .isInt({ min: 1, max: 999 })
    .withMessage('La quantité doit être entre 1 et 999')
];

// Récupérer le panier d'un utilisateur
const getCartByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidUUID(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID utilisateur invalide'
      });
    }

    const query = `
      SELECT 
        p.id_panier,
        a.id_article,
        a.quantite,
        a.prix_unitaire,
        pr.id_produit,
        pr.nom_produit,
        pr.image_produit,
        pr.attribut,
        s.quantite as stock_disponible,
        c.libelle as categorie,
        b.nom_boutique,
        (a.quantite * a.prix_unitaire) as sous_total
      FROM PANIER p
      LEFT JOIN ARTICLE a ON p.id_panier = a.id_panier
      LEFT JOIN PRODUIT pr ON a.id_produit = pr.id_produit
      LEFT JOIN STOCK s ON pr.id_stock = s.id_stock
      LEFT JOIN CATEGORIE c ON pr.id_categorie = c.id_categorie
      LEFT JOIN BOUTIQUE b ON pr.id_boutique = b.id_boutique
      WHERE p.id_user = $1 AND a.id_article IS NOT NULL
      ORDER BY pr.nom_produit
    `;

    const result = await database.query(query, [userId]);

    // Calculer le total
    const total = result.rows.reduce((sum, item) => sum + parseFloat(item.sous_total), 0);
    const itemCount = result.rows.reduce((sum, item) => sum + item.quantite, 0);

    secureLog('info', 'Cart retrieved successfully', {
      userId,
      itemCount,
      total
    });

    res.json({
      success: true,
      data: {
        items: result.rows,
        summary: {
          itemCount,
          total: parseFloat(total.toFixed(2)),
          currency: 'EUR'
        }
      }
    });

  } catch (error) {
    secureLog('error', 'Failed to get cart', { error: error.message, userId: req.params.userId });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du panier'
    });
  }
};

// Ajouter un article au panier
const addToCart = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const { id_produit, quantite } = req.body;

    if (!isValidUUID(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID utilisateur invalide'
      });
    }

    // Vérifier que le produit existe et récupérer son prix
    const productQuery = `
      SELECT 
        pr.id_produit, 
        pr.prix, 
        pr.nom_produit,
        s.quantite as stock_disponible
      FROM PRODUIT pr
      LEFT JOIN STOCK s ON pr.id_stock = s.id_stock
      WHERE pr.id_produit = $1
    `;

    const productResult = await database.query(productQuery, [id_produit]);

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    const product = productResult.rows[0];

    if (product.stock_disponible < quantite) {
      return res.status(400).json({
        success: false,
        message: 'Stock insuffisant',
        available: product.stock_disponible
      });
    }

    // Utiliser une transaction pour garantir la cohérence
    const result = await database.transaction(async (client) => {
      // Récupérer ou créer le panier
      let panierQuery = 'SELECT id_panier FROM PANIER WHERE id_user = $1';
      let panierResult = await client.query(panierQuery, [userId]);

      let id_panier;
      if (panierResult.rows.length === 0) {
        // Créer un nouveau panier
        const createPanierQuery = 'INSERT INTO PANIER (id_user) VALUES ($1) RETURNING id_panier';
        const createResult = await client.query(createPanierQuery, [userId]);
        id_panier = createResult.rows[0].id_panier;
      } else {
        id_panier = panierResult.rows[0].id_panier;
      }

      // Vérifier si l'article existe déjà dans le panier
      const existingArticleQuery = `
        SELECT id_article, quantite 
        FROM ARTICLE 
        WHERE id_panier = $1 AND id_produit = $2
      `;
      const existingResult = await client.query(existingArticleQuery, [id_panier, id_produit]);

      if (existingResult.rows.length > 0) {
        // Mettre à jour la quantité
        const newQuantite = existingResult.rows[0].quantite + quantite;
        
        if (product.stock_disponible < newQuantite) {
          throw new Error('Stock insuffisant pour cette quantité');
        }

        const updateQuery = `
          UPDATE ARTICLE 
          SET quantite = $1 
          WHERE id_article = $2 
          RETURNING *
        `;
        const updateResult = await client.query(updateQuery, [newQuantite, existingResult.rows[0].id_article]);
        return updateResult.rows[0];
      } else {
        // Ajouter un nouvel article
        const insertQuery = `
          INSERT INTO ARTICLE (id_article, quantite, prix_unitaire, id_produit, id_panier)
          VALUES (gen_random_uuid(), $1, $2, $3, $4)
          RETURNING *
        `;
        const insertResult = await client.query(insertQuery, [quantite, product.prix, id_produit, id_panier]);
        return insertResult.rows[0];
      }
    });

    secureLog('info', 'Item added to cart successfully', {
      userId,
      productId: id_produit,
      quantity: quantite,
      articleId: result.id_article
    });

    res.status(201).json({
      success: true,
      message: 'Article ajouté au panier',
      data: result
    });

  } catch (error) {
    secureLog('error', 'Failed to add item to cart', { 
      error: error.message, 
      userId: req.params.userId 
    });

    if (error.message.includes('Stock insuffisant')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout au panier'
    });
  }
};

// Mettre à jour la quantité d'un article
const updateCartItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { userId, articleId } = req.params;
    const { quantite } = req.body;

    if (!isValidUUID(userId) || !isValidUUID(articleId)) {
      return res.status(400).json({
        success: false,
        message: 'IDs invalides'
      });
    }

    // Vérifier le stock disponible
    const stockQuery = `
      SELECT s.quantite as stock_disponible
      FROM ARTICLE a
      LEFT JOIN PRODUIT pr ON a.id_produit = pr.id_produit
      LEFT JOIN STOCK s ON pr.id_stock = s.id_stock
      LEFT JOIN PANIER p ON a.id_panier = p.id_panier
      WHERE a.id_article = $1 AND p.id_user = $2
    `;

    const stockResult = await database.query(stockQuery, [articleId, userId]);

    if (stockResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Article non trouvé dans le panier'
      });
    }

    if (stockResult.rows[0].stock_disponible < quantite) {
      return res.status(400).json({
        success: false,
        message: 'Stock insuffisant',
        available: stockResult.rows[0].stock_disponible
      });
    }

    const query = `
      UPDATE ARTICLE 
      SET quantite = $1 
      WHERE id_article = $2 
      RETURNING *
    `;

    const result = await database.query(query, [quantite, articleId]);

    secureLog('info', 'Cart item updated successfully', {
      userId,
      articleId,
      newQuantity: quantite
    });

    res.json({
      success: true,
      message: 'Quantité mise à jour',
      data: result.rows[0]
    });

  } catch (error) {
    secureLog('error', 'Failed to update cart item', { 
      error: error.message, 
      userId: req.params.userId,
      articleId: req.params.articleId
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\'article'
    });
  }
};

// Supprimer un article du panier
const removeFromCart = async (req, res) => {
  try {
    const { userId, articleId } = req.params;

    if (!isValidUUID(userId) || !isValidUUID(articleId)) {
      return res.status(400).json({
        success: false,
        message: 'IDs invalides'
      });
    }

    const query = `
      DELETE FROM ARTICLE 
      USING PANIER 
      WHERE ARTICLE.id_article = $1 
        AND PANIER.id_panier = ARTICLE.id_panier 
        AND PANIER.id_user = $2
      RETURNING *
    `;

    const result = await database.query(query, [articleId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Article non trouvé dans le panier'
      });
    }

    secureLog('info', 'Item removed from cart successfully', {
      userId,
      articleId
    });

    res.json({
      success: true,
      message: 'Article supprimé du panier'
    });

  } catch (error) {
    secureLog('error', 'Failed to remove item from cart', { 
      error: error.message, 
      userId: req.params.userId,
      articleId: req.params.articleId
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'article'
    });
  }
};

// Vider le panier
const clearCart = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidUUID(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID utilisateur invalide'
      });
    }

    const query = `
      DELETE FROM ARTICLE 
      USING PANIER 
      WHERE PANIER.id_panier = ARTICLE.id_panier 
        AND PANIER.id_user = $1
    `;

    const result = await database.query(query, [userId]);

    secureLog('info', 'Cart cleared successfully', {
      userId,
      deletedItems: result.rowCount
    });

    res.json({
      success: true,
      message: 'Panier vidé avec succès',
      deletedItems: result.rowCount
    });

  } catch (error) {
    secureLog('error', 'Failed to clear cart', { 
      error: error.message, 
      userId: req.params.userId
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors du vidage du panier'
    });
  }
};

module.exports = {
  validateCartItem,
  getCartByUser,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};
