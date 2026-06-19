const jwt = require('jsonwebtoken');

function requireAdminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentification administrateur requise.'
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès administrateur requis.'
      });
    }
    req.admin = { email: payload.email, sub: payload.sub };
    return next();
  } catch (_e) {
    return res.status(401).json({
      success: false,
      message: 'Token administrateur invalide ou expiré.'
    });
  }
}

module.exports = { requireAdminAuth };
