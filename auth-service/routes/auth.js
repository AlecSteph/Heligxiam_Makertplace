const crypto = require('crypto');
const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const mongo = require('../config/mongo');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation',
      errors: errors.array()
    });
  }
  next();
};

// Générer un challenge Proof of Work
router.get('/challenge', (req, res) => {
  const challenge = uuidv4();
  const difficulty = 4; // Nombre de zéros requis
  
  res.json({
    success: true,
    challenge,
    difficulty
  });
});

// Validation email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Validation mot de passe
const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Hasher mot de passe
const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
};

// Vérifier mot de passe
const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

const toPublicUser = (user) => ({
  id_user: user.id_user,
  nom: user.nom,
  prenom: user.prenom,
  email: user.email,
  role: user.role,
  created_at: user.created_at,
  updated_at: user.updated_at
});

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const storeRefreshToken = async (userId, refreshToken) => {
  const tokenId = uuidv4();
  await db.query(
    `INSERT INTO auth_refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
    [tokenId, userId, hashToken(refreshToken)]
  );
};

const rotateRefreshToken = async (userId, oldToken, newToken) => {
  await db.query(
    `UPDATE auth_refresh_tokens
     SET revoked = TRUE
     WHERE user_id = $1 AND token_hash = $2 AND revoked = FALSE`,
    [userId, hashToken(oldToken)]
  );
  await storeRefreshToken(userId, newToken);
};

const safeLogAuthEvent = async (payload) => {
  try {
    await mongo.logAuthEvent(payload);
  } catch (error) {
    // Do not block auth flow if MongoDB is transiently unavailable.
    console.warn('Mongo auth event logging failed:', error.message);
  }
};

// Générer tokens JWT
const generateTokens = (user) => {
  const token = jwt.sign(
    { 
      id_user: user.id_user,
      email: user.email,
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { id_user: user.id_user },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { token, refreshToken };
};

// Inscription
router.post('/register', [
  body('nom').trim().isLength({ min: 2, max: 50 }).withMessage('Nom invalide'),
  body('prenom').trim().isLength({ min: 2, max: 50 }).withMessage('Prénom invalide'),
  body('email').isEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe trop court'),
  body('role').optional().isIn(['client', 'vendeur']).withMessage('Rôle invalide')
], handleValidationErrors, async (req, res) => {
  try {
    const { nom, prenom, email, password, role = 'client' } = req.body;

    // Validation email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format d\'email invalide'
      });
    }

    // Validation mot de passe
    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre'
      });
    }

    const existing = await db.query(
      `SELECT id_user FROM "UTILISATEUR" WHERE email = $1 LIMIT 1`,
      [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    const id_user = uuidv4();
    const hashedPassword = await hashPassword(password);

    const inserted = await db.query(
      `INSERT INTO "UTILISATEUR" (id_user, nom, prenom, role, email, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_user, nom, prenom, role, email, created_at, updated_at`,
      [id_user, nom, prenom, role, email.toLowerCase(), hashedPassword]
    );
    const newUser = inserted.rows[0];

    const { token, refreshToken } = generateTokens(newUser);
    await storeRefreshToken(newUser.id_user, refreshToken);
    await safeLogAuthEvent({
      type: 'register_success',
      userId: newUser.id_user,
      email: newUser.email,
      ip: req.ip,
      userAgent: req.get('User-Agent') || ''
    });

    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      data: {
        user: toPublicUser(newUser),
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription'
    });
  }
});

// Connexion
router.post('/login', [
  body('email').isEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis')
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format d\'email invalide'
      });
    }

    const result = await db.query(
      `SELECT id_user, nom, prenom, role, email, password_hash, created_at, updated_at
       FROM "UTILISATEUR"
       WHERE email = $1
       LIMIT 1`,
      [email.toLowerCase()]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier le mot de passe
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    const { token, refreshToken } = generateTokens(user);
    await storeRefreshToken(user.id_user, refreshToken);
    await safeLogAuthEvent({
      type: 'login_success',
      userId: user.id_user,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent') || ''
    });

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: toPublicUser(user),
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion'
    });
  }
});

// Rafraîchir le token
router.post('/refresh-token', [
  body('refreshToken').notEmpty().withMessage('Refresh token requis')
], handleValidationErrors, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const tokenRow = await db.query(
      `SELECT id FROM auth_refresh_tokens
       WHERE user_id = $1
         AND token_hash = $2
         AND revoked = FALSE
         AND expires_at > NOW()
       LIMIT 1`,
      [decoded.id_user, hashToken(refreshToken)]
    );

    if (tokenRow.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token invalide'
      });
    }

    const userResult = await db.query(
      `SELECT id_user, nom, prenom, role, email, created_at, updated_at
       FROM "UTILISATEUR"
       WHERE id_user = $1
       LIMIT 1`,
      [decoded.id_user]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token invalide'
      });
    }

    const { token, refreshToken: newRefreshToken } = generateTokens(user);
    await rotateRefreshToken(user.id_user, refreshToken, newRefreshToken);
    await safeLogAuthEvent({
      type: 'refresh_success',
      userId: user.id_user,
      ip: req.ip,
      userAgent: req.get('User-Agent') || ''
    });

    res.json({
      success: true,
      message: 'Token rafraîchi',
      data: {
        token,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Refresh token invalide ou expiré'
    });
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (refreshToken) {
      await db.query(
        `UPDATE auth_refresh_tokens
         SET revoked = TRUE
         WHERE user_id = $1 AND token_hash = $2 AND revoked = FALSE`,
        [req.user.id_user, hashToken(refreshToken)]
      );
    } else {
      await db.query(
        `UPDATE auth_refresh_tokens
         SET revoked = TRUE
         WHERE user_id = $1 AND revoked = FALSE`,
        [req.user.id_user]
      );
    }

    return res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion'
    });
  }
});

// Obtenir le profil utilisateur
router.get('/me', requireAuth, async (req, res) => {
  const result = await db.query(
    `SELECT id_user, nom, prenom, role, email, created_at, updated_at
     FROM "UTILISATEUR"
     WHERE id_user = $1
     LIMIT 1`,
    [req.user.id_user]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Utilisateur introuvable'
    });
  }

  res.json({
    success: true,
    data: toPublicUser(result.rows[0])
  });
});

router.put('/user/:id', requireAuth, [
  body('nom').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Nom invalide'),
  body('prenom').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Prénom invalide'),
  body('email').optional().isEmail().withMessage('Email invalide')
], handleValidationErrors, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (!targetId) {
      return res.status(400).json({ success: false, message: 'ID utilisateur requis' });
    }

    if (req.user.id_user !== targetId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Action non autorisée' });
    }

    const { nom, prenom, email } = req.body;
    const fields = [];
    const values = [];
    let idx = 1;

    if (nom !== undefined) {
      fields.push(`nom = $${idx++}`);
      values.push(nom);
    }
    if (prenom !== undefined) {
      fields.push(`prenom = $${idx++}`);
      values.push(prenom);
    }
    if (email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(email.toLowerCase());
    }
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucune donnée à mettre à jour' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(targetId);
    const updated = await db.query(
      `UPDATE "UTILISATEUR"
       SET ${fields.join(', ')}
       WHERE id_user = $${idx}
       RETURNING id_user, nom, prenom, role, email, created_at, updated_at`,
      values
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    }

    return res.json({
      success: true,
      message: 'Profil mis à jour',
      data: toPublicUser(updated.rows[0])
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil'
    });
  }
});

router.put('/change-password', requireAuth, [
  body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
  body('newPassword').isLength({ min: 8 }).withMessage('Nouveau mot de passe trop court')
], handleValidationErrors, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre'
      });
    }

    const userResult = await db.query(
      `SELECT id_user, password_hash
       FROM "UTILISATEUR"
       WHERE id_user = $1
       LIMIT 1`,
      [req.user.id_user]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    }

    const user = userResult.rows[0];
    const ok = await verifyPassword(currentPassword, user.password_hash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect' });
    }

    const newHash = await hashPassword(newPassword);
    await db.query(
      `UPDATE "UTILISATEUR" SET password_hash = $1, updated_at = NOW() WHERE id_user = $2`,
      [newHash, req.user.id_user]
    );
    await db.query(
      `UPDATE auth_refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE`,
      [req.user.id_user]
    );
    await safeLogAuthEvent({
      type: 'password_changed',
      userId: req.user.id_user,
      ip: req.ip,
      userAgent: req.get('User-Agent') || ''
    });

    return res.json({
      success: true,
      message: 'Mot de passe mis à jour'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de mot de passe'
    });
  }
});

module.exports = router;
