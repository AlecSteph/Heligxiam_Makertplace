const { body, validationResult } = require('express-validator');
const { secureLog, sanitizeInput, isValidUUID } = require('../utils/security');
const database = require('../config/database');
const productClient = require('../clients/productClient');

// Validation middleware
const validateCartItem = [
  body('id_produit')
    .isUUID()
    .withMessage('L\'ID du produit doit être un UUID valide'),
  body('quantite')
    .isInt({ min: 1, max: 999 })
    .withMessage('La quantité doit être entre 1 et 999')
];

const handleDbError = (res, error, fallbackMessage) => {
  if (error.code === '23503') {
    return res.status(400).json({ success: false, message: 'Référence invalide dans la base de données' });
  }
  return res.status(500).json({ success: false, message: fallbackMessage });
};

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
        a.id_produit,
        (a.quantite * a.prix_unitaire) as sous_total
      FROM PANIER p
      LEFT JOIN ARTICLE a ON p.id_panier = a.id_panier
      WHERE p.id_user = $1 AND a.id_article IS NOT NULL
      ORDER BY a.id_article
    `;

    const result = await database.query(query, [userId]);
    const enrichedItems = await Promise.all(
      result.rows.map(async (item) => {
        const product = await productClient.getProductById(item.id_produit, req.requestId);
        return {
          ...item,
          nom_produit: product?.nom_produit || 'Produit indisponible',
          image_produit: product?.image_produit || null,
          attribut: product?.attribut || null,
          stock_disponible: product?.stock_quantite ?? null,
          categorie: product?.categorie_nom || null,
          nom_boutique: product?.nom_boutique || null
        };
      })
    );

    // Calculer le total
    const total = enrichedItems.reduce((sum, item) => sum + parseFloat(item.sous_total), 0);
    const itemCount = enrichedItems.reduce((sum, item) => sum + item.quantite, 0);

    secureLog('info', 'Cart retrieved successfully', {
      userId,
      itemCount,
      total
    });

    res.json({
      success: true,
      data: {
        items: enrichedItems,
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

    const product = await productClient.getProductById(id_produit, req.requestId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }
    if ((product.stock_quantite ?? 0) < quantite) {
      return res.status(400).json({
        success: false,
        message: 'Stock insuffisant'
      });
    }

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
        
        if ((product.stock_quantite ?? 0) < newQuantite) {
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

    if (error.message === 'Produit non trouvé') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    if (error.message.includes('Stock insuffisant')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    return handleDbError(res, error, 'Erreur lors de l\'ajout au panier');
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

    const result = await database.transaction(async (client) => {
      const articleQuery = `
        SELECT a.id_article, a.id_produit
        FROM ARTICLE a
        LEFT JOIN PANIER p ON a.id_panier = p.id_panier
        WHERE a.id_article = $1 AND p.id_user = $2
      `;
      const articleResult = await client.query(articleQuery, [articleId, userId]);
      if (articleResult.rows.length === 0) {
        throw new Error('Article non trouvé dans le panier');
      }

      const product = await productClient.getProductById(articleResult.rows[0].id_produit, req.requestId);
      if (!product) {
        throw new Error('Produit non trouvé');
      }
      if ((product.stock_quantite ?? 0) < quantite) {
        throw new Error('Stock insuffisant');
      }

      const query = `
        UPDATE ARTICLE 
        SET quantite = $1 
        WHERE id_article = $2 
        RETURNING *
      `;

      const updateResult = await client.query(query, [quantite, articleId]);
      return updateResult.rows[0];
    });

    secureLog('info', 'Cart item updated successfully', {
      userId,
      articleId,
      newQuantity: quantite
    });

    res.json({
      success: true,
      message: 'Quantité mise à jour',
      data: result
    });

  } catch (error) {
    secureLog('error', 'Failed to update cart item', { 
      error: error.message, 
      userId: req.params.userId,
      articleId: req.params.articleId
    });
    if (error.message === 'Article non trouvé dans le panier') {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === 'Produit non trouvé') {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === 'Stock insuffisant') {
      return res.status(400).json({ success: false, message: error.message });
    }
    return handleDbError(res, error, 'Erreur lors de la mise à jour de l\'article');
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
    return handleDbError(res, error, 'Erreur lors de la suppression de l\'article');
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
    return handleDbError(res, error, 'Erreur lors du vidage du panier');
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
