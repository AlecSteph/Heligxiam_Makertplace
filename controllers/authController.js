const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  generateToken,
  generateRefreshToken,
  authenticate,
  requireAdmin
} = require('../middleware/auth');
const {
  ProofOfWork,
  sanitizeInput,
  isValidEmail,
  validatePassword,
  getPasswordStrength,
  RateLimiter,
  sqlInjectionCheck,
  secureLog
} = require('../utils/security');

class AuthController {
  constructor() {
    this.pow = new ProofOfWork(parseInt(process.env.POW_DIFFICULTY) || 4);
    this.authLimiter = new RateLimiter(15 * 60 * 1000, 5); // 5 tentatives par 15 min
    this.generalLimiter = new RateLimiter(15 * 60 * 1000, 100); // 100 req par 15 min
  }

  // ========================================
  // MÉTHODES PUBLIQUES
  // ========================================

  // Obtenir un challenge Proof of Work
  getChallenge = (req, res) => {
    res.json({
      success: true,
      challenge: this.pow.generateChallenge(),
      difficulty: this.pow.difficulty
    });
  };

  // Inscription
  register = async (req, res) => {
    try {
      const { nom, prenom, email, password, role } = req.body;

      // Validation supplémentaire
      if (!isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Format d\'email invalide'
        });
      }

      if (!validatePassword(password)) {
        return res.status(400).json({
          success: false,
          message: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre'
        });
      }

      // Créer l'utilisateur
      const user = await User.create({
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.toLowerCase(),
        password,
        role: role || 'client'
      });

      // Générer le token
      const token = generateToken(user.id_user);
      const refreshToken = generateRefreshToken(user.id_user);

      secureLog('info', 'User registered successfully', {
        userId: user.id_user,
        email: user.email,
        role: user.role
      });

      res.status(201).json({
        success: true,
        message: 'Utilisateur créé avec succès',
        data: {
          user: user.toJSON(),
          token,
          refreshToken,
          passwordStrength: getPasswordStrength(password)
        }
      });

    } catch (error) {
      secureLog('error', 'Registration failed', { error: error.message, email: req.body.email });

      if (error.message === 'Email déjà utilisé') {
        return res.status(409).json({
          success: false,
          message: 'Cet email est déjà utilisé'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'inscription'
      });
    }
  };

  // Connexion
  login = async (req, res) => {
    try {
      const { email, password } = req.body;

      // Rate limiting spécifique pour les tentatives de connexion
      const loginKey = `login_${req.ip}_${email}`;
      if (!this.authLimiter.isAllowed(loginKey)) {
        secureLog('warn', 'Login rate limit exceeded', { ip: req.ip, email });
        return res.status(429).json({
          success: false,
          message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.'
        });
      }

      // Trouver l'utilisateur
      const user = await User.findByEmail(email.toLowerCase());
      if (!user) {
        secureLog('warn', 'Login attempt with non-existent email', { email, ip: req.ip });
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }

      // Vérifier le mot de passe
      const isValidPassword = await user.checkPassword(password);
      if (!isValidPassword) {
        secureLog('warn', 'Invalid password attempt', { userId: user.id_user, ip: req.ip });
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }

      // Générer les tokens
      const token = generateToken(user.id_user);
      const refreshToken = generateRefreshToken(user.id_user);

      // Reset le rate limiter en cas de succès
      this.authLimiter.reset(loginKey);

      secureLog('info', 'User logged in successfully', {
        userId: user.id_user,
        email: user.email,
        role: user.role,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Connexion réussie',
        data: {
          user: user.toJSON(),
          token,
          refreshToken
        }
      });

    } catch (error) {
      secureLog('error', 'Login failed', { error: error.message, email: req.body.email });
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la connexion'
      });
    }
  };

  // Rafraîchir le token
  refreshToken = async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token requis'
        });
      }

      // Vérifier le refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          message: 'Token de rafraîchissement invalide'
        });
      }

      // Vérifier que l'utilisateur existe toujours
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      // Générer de nouveaux tokens
      const newToken = generateToken(user.id_user);
      const newRefreshToken = generateRefreshToken(user.id_user);

      res.json({
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken
        }
      });

    } catch (error) {
      secureLog('error', 'Token refresh failed', { error: error.message });
      res.status(401).json({
        success: false,
        message: 'Token de rafraîchissement invalide'
      });
    }
  };

  // ========================================
  // MÉTHODES PROTÉGÉES
  // ========================================

  // Obtenir le profil utilisateur
  getProfile = async (req, res) => {
    try {
      const profile = await User.getProfile(req.user.id_user);

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profil non trouvé'
        });
      }

      res.json({
        success: true,
        data: profile
      });

    } catch (error) {
      secureLog('error', 'Profile fetch failed', { error: error.message, userId: req.user.id_user });
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du profil'
      });
    }
  };

  // Mettre à jour le profil
  updateProfile = async (req, res) => {
    try {
      const updatedUser = await User.updateProfile(req.user.id_user, req.body);

      secureLog('info', 'Profile updated', { userId: req.user.id_user });

      res.json({
        success: true,
        message: 'Profil mis à jour avec succès',
        data: updatedUser.toJSON()
      });

    } catch (error) {
      secureLog('error', 'Profile update failed', {
        error: error.message,
        userId: req.user.id_user
      });

      if (error.message === 'Email déjà utilisé') {
        return res.status(409).json({
          success: false,
          message: 'Cet email est déjà utilisé'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour du profil'
      });
    }
  };

  // Changer le mot de passe
  changePassword = async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Vérifier l'ancien mot de passe
      const isValidCurrentPassword = await req.user.checkPassword(currentPassword);
      if (!isValidCurrentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mot de passe actuel incorrect'
        });
      }

      // Valider le nouveau mot de passe
      if (!validatePassword(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'Le nouveau mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre'
        });
      }

      // Mettre à jour le mot de passe
      await User.updatePassword(req.user.id_user, newPassword);

      secureLog('info', 'Password changed', { userId: req.user.id_user });

      res.json({
        success: true,
        message: 'Mot de passe changé avec succès',
        data: {
          passwordStrength: getPasswordStrength(newPassword)
        }
      });

    } catch (error) {
      secureLog('error', 'Password change failed', {
        error: error.message,
        userId: req.user.id_user
      });
      res.status(500).json({
        success: false,
        message: 'Erreur lors du changement de mot de passe'
      });
    }
  };

  // ========================================
  // MÉTHODES ADMINISTRATEUR
  // ========================================

  // Lister tous les utilisateurs (admin)
  getUsers = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.findAll(limit, offset),
        User.count()
      ]);

      res.json({
        success: true,
        data: {
          users: users.map(user => user.toJSON()),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      secureLog('error', 'Users list failed', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des utilisateurs'
      });
    }
  };

  // Supprimer un utilisateur (admin)
  deleteUser = async (req, res) => {
    try {
      const { userId } = req.params;

      // Empêcher la suppression de soi-même
      if (userId === req.user.id_user) {
        return res.status(400).json({
          success: false,
          message: 'Vous ne pouvez pas vous supprimer vous-même'
        });
      }

      const deleted = await User.delete(userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      secureLog('info', 'User deleted by admin', {
        deletedUserId: userId,
        adminId: req.user.id_user
      });

      res.json({
        success: true,
        message: 'Utilisateur supprimé avec succès'
      });

    } catch (error) {
      secureLog('error', 'User deletion failed', {
        error: error.message,
        userId: req.params.userId
      });
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression de l\'utilisateur'
      });
    }
  };

  // Vérifier la santé du service
  healthCheck = (req, res) => {
    res.json({
      success: true,
      message: 'Auth service is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  };

  // ========================================
  // MIDDLEWARES
  // ========================================

  // Middleware de rate limiting
  rateLimit = (req, res, next) => {
    const key = req.ip + req.path;
    if (!this.generalLimiter.isAllowed(key)) {
      secureLog('warn', 'Rate limit exceeded', { ip: req.ip, path: req.path });
      return res.status(429).json({
        success: false,
        message: 'Trop de requêtes. Veuillez réessayer plus tard.'
      });
    }
    next();
  };

  // Middleware de validation des entrées
  validateInput = (req, res, next) => {
    // Vérifier les injections SQL
    for (const [key, value] of Object.entries(req.body)) {
      if (!sqlInjectionCheck(value)) {
        secureLog('error', 'SQL injection attempt detected', {
          ip: req.ip,
          field: key,
          value: value.substring(0, 100)
        });
        return res.status(400).json({
          success: false,
          message: 'Données invalides détectées'
        });
      }
    }

    // Sanitiser les entrées
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        req.body[key] = sanitizeInput(value);
      }
    }

    next();
  };

  // Proof of Work middleware
  proofOfWork = (req, res, next) => {
    const { challenge, nonce } = req.body;

    if (!challenge || !nonce) {
      return res.status(400).json({
        success: false,
        message: 'Preuve de travail requise',
        challenge: this.pow.generateChallenge()
      });
    }

    if (!this.pow.verifyProof(challenge, nonce)) {
      secureLog('warn', 'Invalid proof of work', { ip: req.ip });
      return res.status(400).json({
        success: false,
        message: 'Preuve de travail invalide',
        challenge: this.pow.generateChallenge()
      });
    }

    next();
  };
}

module.exports = new AuthController();