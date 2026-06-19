const jwt = require('jsonwebtoken');
const { isMysqlEnabled } = require('../lib/mysqlPool');

/**
 * Routes vendeur : JWT obligatoire, rôle vendeur, claims boutique/vendeur (MySQL).
 */
function requireSellerAuth(req, res, next) {
  if (!isMysqlEnabled()) {
    return res.status(503).json({
      success: false,
      message: 'API vendeur indisponible : configurez MYSQL_HOST et la base HELIGXIAM.'
    });
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentification requise (Bearer token).'
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'vendeur' || payload.kind !== 'vendeur_mysql') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux comptes vendeur enregistrés sur la plateforme.'
      });
    }
    const vendeurId = Number(payload.vendeur_id);
    const boutiqueId = Number(payload.boutique_id);
    if (!Number.isFinite(vendeurId) || vendeurId < 1 || !Number.isFinite(boutiqueId) || boutiqueId < 1) {
      return res.status(403).json({
        success: false,
        message: 'Jeton vendeur invalide (identifiants manquants).'
      });
    }
    req.seller = { vendeurId, boutiqueId, email: payload.email };
    next();
  } catch (_e) {
    return res.status(401).json({
      success: false,
      message: 'Session invalide ou expirée. Reconnectez-vous.'
    });
  }
}

module.exports = { requireSellerAuth };
