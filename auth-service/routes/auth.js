const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const { getMysqlPool, isMysqlEnabled } = require('../lib/mysqlPool');
const {
  findVendeurByCourriel,
  findVendeurById,
  getPrimaryBoutiqueId,
  createVendeurWithBoutique,
  courrielVendeurPris
} = require('../lib/vendeurMysql');
const { users, findMemoryUserById } = require('../lib/memoryUsers');
const { requireAuth } = require('../middlewares/auth');
const {
  requestPasswordReset,
  resetPasswordWithToken,
  applyPasswordUpdate
} = require('../lib/passwordReset');
const {
  clientEmailTaken,
  createClientInPg
} = require('../lib/clientUsersPg');
const { verifyRecaptcha, getPublicConfig } = require('../lib/recaptcha');

const router = express.Router();

const GENERIC_RESET_MESSAGE =
  'Si un compte existe avec cette adresse, un e-mail de réinitialisation a été envoyé.';

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

router.get('/challenge', (req, res) => {
  const challenge = uuidv4();
  const difficulty = 4;
  res.json({
    success: true,
    challenge,
    difficulty
  });
});

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

const { validatePassword, PASSWORD_HINT } = require('../lib/passwordPolicy');

const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
  return bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

function toIso(d) {
  if (!d) return new Date().toISOString();
  if (d instanceof Date) return d.toISOString();
  return new Date(d).toISOString();
}

/** Objet utilisateur pour émission JWT (sans mot de passe). */
function mysqlRowToAuthUser(row, boutiqueId) {
  return {
    id_user: String(row.identifiant),
    email: row.courriel,
    nom: row.nom,
    prenom: row.prenom,
    role: 'vendeur',
    created_at: toIso(row.date_creation),
    updated_at: toIso(row.date_mise_a_jour),
    kind: 'vendeur_mysql',
    vendeur_id: row.identifiant,
    boutique_id: boutiqueId
  };
}

function publicUserPayload(user) {
  const u = {
    id_user: user.id_user,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
  if (user.kind === 'vendeur_mysql' && user.vendeur_id && user.boutique_id) {
    u.identifiant_vendeur = user.vendeur_id;
    u.identifiant_boutique = user.boutique_id;
  }
  return u;
}

const generateTokens = (user) => {
  const isMysqlVendeur = user.kind === 'vendeur_mysql' && user.vendeur_id && user.boutique_id;
  const payload = {
    id_user: user.id_user,
    email: user.email,
    role: user.role,
    kind: isMysqlVendeur ? 'vendeur_mysql' : 'memory'
  };
  if (isMysqlVendeur) {
    payload.vendeur_id = user.vendeur_id;
    payload.boutique_id = user.boutique_id;
  }

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

  const refreshPayload = {
    id_user: user.id_user,
    kind: payload.kind,
    ...(isMysqlVendeur ? { vendeur_id: user.vendeur_id, boutique_id: user.boutique_id } : {})
  };
  const refreshToken = jwt.sign(refreshPayload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

  return { token, refreshToken };
};

async function emailTakenInMemoryOrMysql(email) {
  const lower = email.toLowerCase();
  for (const [, u] of users) {
    if (String(u.email).toLowerCase() === lower) return true;
  }
  try {
    if (await clientEmailTaken(email)) return true;
  } catch (e) {
    console.error('Vérification email PostgreSQL:', e.message);
  }
  if (isMysqlEnabled()) {
    const pool = getMysqlPool();
    return courrielVendeurPris(pool, email);
  }
  return false;
}

async function verifyCurrentPasswordForUser(payload, currentPassword) {
  if (payload.kind === 'vendeur_mysql' && payload.vendeur_id && isMysqlEnabled()) {
    const pool = getMysqlPool();
    const row = await findVendeurById(pool, payload.vendeur_id);
    if (!row) return false;
    return verifyPassword(currentPassword, row.mot_de_passe_hache);
  }

  const mem = findMemoryUserById(payload.id_user);
  if (!mem) return false;
  return verifyPassword(currentPassword, mem.password);
}

async function assertRecaptcha(req, res) {
  const remoteIp = req.ip || req.headers['x-forwarded-for'] || '';
  const result = await verifyRecaptcha(req.body?.recaptchaToken, String(remoteIp).split(',')[0].trim());
  if (!result.ok) {
    res.status(400).json({
      success: false,
      message: result.message || 'Validation reCAPTCHA requise.'
    });
    return false;
  }
  return true;
}

router.get('/recaptcha-config', (_req, res) => {
  res.json({ success: true, data: getPublicConfig() });
});
router.post(
  '/register',
  [
    body('nom').trim().isLength({ min: 2, max: 50 }).withMessage('Nom invalide'),
    body('prenom').trim().isLength({ min: 2, max: 50 }).withMessage('Prénom invalide'),
    body('email').isEmail().withMessage('Email invalide'),
    body('password').isLength({ min: 8 }).withMessage('Mot de passe trop court'),
    body('role').optional().isIn(['client', 'vendeur']).withMessage('Rôle invalide')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      if (!(await assertRecaptcha(req, res))) return;

      const { nom, prenom, email, password, role = 'client' } = req.body;

      if (!isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: "Format d'email invalide"
        });
      }

      if (!validatePassword(password)) {
        return res.status(400).json({
          success: false,
          message:
            PASSWORD_HINT
        });
      }

      if (await emailTakenInMemoryOrMysql(email)) {
        return res.status(409).json({
          success: false,
          message: 'Cet email est déjà utilisé'
        });
      }

      const hashedPassword = await hashPassword(password);

      // Vendeur + MySQL : persistance réelle (compte, profil, boutique brouillon)
      if (role === 'vendeur' && isMysqlEnabled()) {
        try {
          const { vendeurId, boutiqueId } = await createVendeurWithBoutique({
            courriel: email.trim(),
            mot_de_passe_hache: hashedPassword,
            prenom,
            nom
          });
          const pool = getMysqlPool();
          const row = await findVendeurById(pool, vendeurId);
          const authUser = mysqlRowToAuthUser(row, boutiqueId);
          const { token, refreshToken } = generateTokens(authUser);

          return res.status(201).json({
            success: true,
            message: 'Inscription réussie',
            data: {
              user: publicUserPayload(authUser),
              token,
              refreshToken
            }
          });
        } catch (e) {
          if (e.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
              success: false,
              message: 'Cet email est déjà utilisé'
            });
          }
          console.error('Inscription vendeur MySQL:', e);
          return res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du compte vendeur en base.'
          });
        }
      }

      // Client ou vendeur sans MySQL : mémoire (démo)
      const id_user = uuidv4();
      const newUser = {
        id_user,
        nom,
        prenom,
        email: email.trim(),
        password: hashedPassword,
        role,
        kind: 'memory',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      users.set(id_user, newUser);

      try {
        await createClientInPg({
          id_user,
          nom,
          prenom,
          email: email.trim(),
          password_hash: hashedPassword
        });
      } catch (pgErr) {
        users.delete(id_user);
        if (pgErr.code === '23505') {
          return res.status(409).json({
            success: false,
            message: 'Cet email est déjà utilisé'
          });
        }
        console.error('Inscription client PostgreSQL:', pgErr);
        return res.status(500).json({
          success: false,
          message: "Erreur lors de la persistance du compte client."
        });
      }

      const { token, refreshToken } = generateTokens(newUser);

      return res.status(201).json({
        success: true,
        message: 'Inscription réussie',
        data: {
          user: publicUserPayload(newUser),
          token,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Erreur inscription:', error);
      return res.status(500).json({
        success: false,
        message: "Erreur lors de l'inscription"
      });
    }
  }
);

// Connexion
router.post(
  '/login',
  [body('email').isEmail().withMessage('Email invalide'), body('password').notEmpty().withMessage('Mot de passe requis')],
  handleValidationErrors,
  async (req, res) => {
    try {
      if (!(await assertRecaptcha(req, res))) return;

      const { email, password } = req.body;

      if (!isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: "Format d'email invalide"
        });
      }

      if (isMysqlEnabled()) {
        const pool = getMysqlPool();
        const row = await findVendeurByCourriel(pool, email);
        if (row) {
          if (!row.actif) {
            return res.status(403).json({
              success: false,
              message: 'Compte vendeur désactivé. Contactez le support.'
            });
          }
          const isValidPassword = await verifyPassword(password, row.mot_de_passe_hache);
          if (!isValidPassword) {
            return res.status(401).json({
              success: false,
              message: 'Email ou mot de passe incorrect'
            });
          }
          const boutiqueId = await getPrimaryBoutiqueId(pool, row.identifiant);
          if (!boutiqueId) {
            return res.status(500).json({
              success: false,
              message: 'Compte vendeur sans boutique — contactez le support.'
            });
          }
          const authUser = mysqlRowToAuthUser(row, boutiqueId);
          const { token, refreshToken } = generateTokens(authUser);
          return res.json({
            success: true,
            message: 'Connexion réussie',
            data: {
              user: publicUserPayload(authUser),
              token,
              refreshToken
            }
          });
        }
      }

      let user = null;
      for (const [, userData] of users) {
        if (String(userData.email).toLowerCase() === String(email).toLowerCase()) {
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

      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }

      const mem = { ...user, kind: 'memory' };
      const { token, refreshToken } = generateTokens(mem);

      return res.json({
        success: true,
        message: 'Connexion réussie',
        data: {
          user: publicUserPayload(mem),
          token,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Erreur connexion:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la connexion'
      });
    }
  }
);

router.post(
  '/refresh-token',
  [body('refreshToken').notEmpty().withMessage('Refresh token requis')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { refreshToken } = req.body;
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      let user = null;

      if (decoded.kind === 'vendeur_mysql' && decoded.vendeur_id && isMysqlEnabled()) {
        const pool = getMysqlPool();
        const row = await findVendeurById(pool, decoded.vendeur_id);
        if (row && row.actif) {
          const boutiqueId = await getPrimaryBoutiqueId(pool, row.identifiant);
          if (boutiqueId) {
            user = mysqlRowToAuthUser(row, boutiqueId);
          }
        }
      } else {
        for (const [, userData] of users) {
          if (userData.id_user === decoded.id_user) {
            user = { ...userData, kind: 'memory' };
            break;
          }
        }
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token invalide'
        });
      }

      const { token, refreshToken: newRefreshToken } = generateTokens(user);

      return res.json({
        success: true,
        message: 'Token rafraîchi',
        data: {
          token,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token invalide ou expiré'
      });
    }
  }
);

router.get('/me', async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentification requise.'
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.kind === 'vendeur_mysql' && isMysqlEnabled()) {
      const pool = getMysqlPool();
      const row = await findVendeurById(pool, payload.vendeur_id);
      if (!row || !row.actif) {
        return res.status(401).json({ success: false, message: 'Session invalide.' });
      }
      const boutiqueId = await getPrimaryBoutiqueId(pool, row.identifiant);
      if (!boutiqueId) {
        return res.status(401).json({ success: false, message: 'Session invalide.' });
      }
      const authUser = mysqlRowToAuthUser(row, boutiqueId);
      return res.json({
        success: true,
        data: publicUserPayload(authUser)
      });
    }

    const u = [...users.values()].find((x) => x.id_user === payload.id_user);
    if (!u) {
      return res.status(401).json({ success: false, message: 'Session invalide.' });
    }
    return res.json({
      success: true,
      data: publicUserPayload({ ...u, kind: 'memory' })
    });
  } catch (_e) {
    return res.status(401).json({
      success: false,
      message: 'Session invalide ou expirée.'
    });
  }
});

router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Email invalide')],
  handleValidationErrors,
  async (req, res) => {
    try {
      if (!(await assertRecaptcha(req, res))) return;

      const { email } = req.body;
      if (!isValidEmail(email)) {
        return res.status(400).json({ success: false, message: "Format d'email invalide" });
      }

      await requestPasswordReset(email.trim());

      return res.json({
        success: true,
        message: GENERIC_RESET_MESSAGE
      });
    } catch (error) {
      console.error('Erreur forgot-password:', error);
      return res.status(500).json({
        success: false,
        message: 'Impossible de traiter la demande pour le moment.'
      });
    }
  }
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token requis'),
    body('password').isLength({ min: 8 }).withMessage('Mot de passe trop court')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!validatePassword(password)) {
        return res.status(400).json({
          success: false,
          message:
            PASSWORD_HINT
        });
      }

      const hashedPassword = await hashPassword(password);
      const result = await resetPasswordWithToken(token, hashedPassword);

      if (!result.ok) {
        return res.status(400).json({
          success: false,
          message: 'Lien de réinitialisation invalide ou expiré. Demandez un nouvel e-mail.'
        });
      }

      return res.json({
        success: true,
        message: 'Mot de passe mis à jour. Vous pouvez vous connecter.'
      });
    } catch (error) {
      console.error('Erreur reset-password:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la réinitialisation du mot de passe.'
      });
    }
  }
);

router.put(
  '/change-password',
  requireAuth,
  [
    body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
    body('newPassword').isLength({ min: 8 }).withMessage('Nouveau mot de passe trop court')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!validatePassword(newPassword)) {
        return res.status(400).json({
          success: false,
          message:
            PASSWORD_HINT
        });
      }

      const valid = await verifyCurrentPasswordForUser(req.user, currentPassword);
      if (!valid) {
        return res.status(401).json({
          success: false,
          message: 'Mot de passe actuel incorrect.'
        });
      }

      const hashedPassword = await hashPassword(newPassword);
      const accountKind =
        req.user.kind === 'vendeur_mysql' && req.user.vendeur_id ? 'vendeur_mysql' : 'memory';
      const accountRef =
        accountKind === 'vendeur_mysql' ? String(req.user.vendeur_id) : req.user.id_user;

      const updated = await applyPasswordUpdate(accountKind, accountRef, hashedPassword);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Compte introuvable.'
        });
      }

      return res.json({
        success: true,
        message: 'Mot de passe mis à jour.'
      });
    } catch (error) {
      console.error('Erreur change-password:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du changement de mot de passe.'
      });
    }
  }
);

module.exports = router;
