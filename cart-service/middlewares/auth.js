const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentification requise' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
  }
};

const requireSameUserOrAdmin = (req, res, next) => {
  const requestedUserId = req.params.userId;
  const caller = req.user;
  if (!caller) {
    return res.status(401).json({ success: false, message: 'Authentification requise' });
  }

  const callerId = (caller.id_user || caller.userId || caller.sub || '').toString().toLowerCase();
  const targetId = (requestedUserId || '').toString().toLowerCase();
  if (caller.role === 'admin' || (callerId && callerId === targetId)) {
    return next();
  }

  return res.status(403).json({ success: false, message: 'Accès interdit à ce panier' });
};

module.exports = {
  requireAuth,
  requireSameUserOrAdmin
};
