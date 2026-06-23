const jwt = require('jsonwebtoken');

/** Routes acheteur : JWT client (mémoire ou futur MySQL). */
function requireBuyerAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentification requise (Bearer token).' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'client') {
      return res.status(403).json({ success: false, message: 'Accès réservé aux comptes acheteur.' });
    }
    req.buyer = { idUser: payload.id_user, email: payload.email };
    next();
  } catch (_e) {
    return res.status(401).json({ success: false, message: 'Session invalide ou expirée.' });
  }
}

module.exports = { requireBuyerAuth };
