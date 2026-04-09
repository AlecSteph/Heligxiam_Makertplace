const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Base de données simulée (en production, utilisez PostgreSQL)
const users = new Map();

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

    // Vérifier si l'utilisateur existe déjà
    for (const [id, user] of users) {
      if (user.email === email) {
        return res.status(409).json({
          success: false,
          message: 'Cet email est déjà utilisé'
        });
      }
    }

    // Créer l'utilisateur
    const id_user = uuidv4();
    const hashedPassword = await hashPassword(password);
    
    const newUser = {
      id_user,
      nom,
      prenom,
      email,
      password: hashedPassword,
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    users.set(id_user, newUser);

    // Générer les tokens
    const { token, refreshToken } = generateTokens(newUser);

    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      data: {
        user: {
          id_user: newUser.id_user,
          nom: newUser.nom,
          prenom: newUser.prenom,
          email: newUser.email,
          role: newUser.role,
          created_at: newUser.created_at,
          updated_at: newUser.updated_at
        },
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

    // Trouver l'utilisateur
    let user = null;
    for (const [id, userData] of users) {
      if (userData.email === email) {
        user = userData;
        break;
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier le mot de passe
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Générer les tokens
    const { token, refreshToken } = generateTokens(user);

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: {
          id_user: user.id_user,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
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
], handleValidationErrors, (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Vérifier le refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Trouver l'utilisateur
    let user = null;
    for (const [id, userData] of users) {
      if (userData.id_user === decoded.id_user) {
        user = userData;
        break;
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token invalide'
      });
    }

    // Générer nouveaux tokens
    const { token, refreshToken: newRefreshToken } = generateTokens(user);

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

// Obtenir le profil utilisateur
router.get('/me', (req, res) => {
  // En production, vérifier le token JWT ici
  res.json({
    success: true,
    data: {
      id_user: 'demo-user',
      nom: 'Demo',
      prenom: 'User',
      email: 'demo@example.com',
      role: 'client',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  });
});

module.exports = router;
