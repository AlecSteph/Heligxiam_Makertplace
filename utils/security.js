const crypto = require('crypto');

// Proof of Work - Protection contre les attaques par déni de service
class ProofOfWork {
  constructor(difficulty = 4) {
    this.difficulty = difficulty;
  }

  // Générer un challenge
  generateChallenge() {
    return crypto.randomBytes(16).toString('hex');
  }

  // Vérifier la preuve de travail
  verifyProof(challenge, nonce, difficulty = this.difficulty) {
    const hash = crypto.createHash('sha256')
      .update(challenge + nonce)
      .digest('hex');

    // Vérifier que le hash commence par le nombre requis de zéros
    return hash.startsWith('0'.repeat(difficulty));
  }

  // Calculer une preuve de travail (pour les tests)
  calculateProof(challenge, difficulty = this.difficulty) {
    let nonce = 0;
    while (true) {
      if (this.verifyProof(challenge, nonce.toString(), difficulty)) {
        return nonce.toString();
      }
      nonce++;
      if (nonce > 1000000) { // Sécurité contre boucle infinie
        throw new Error('Preuve de travail impossible à calculer');
      }
    }
  }
}

// Sanitisation des entrées
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  // Supprimer les caractères dangereux
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
};

// Validation email renforcée
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Validation mot de passe
const validatePassword = (password) => {
  // Au moins 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Ajoute un "pepper" global à un mot de passe. Le pepper est une valeur
// secrète stockée dans l'environnement et non en base de données. Cela renforce
// la sécurité en plus du salt généré automatiquement par bcrypt.
const applyPepper = (password) => {
  const pepper = process.env.PEPPER || '';
  return password + pepper;
};

// Génération de tokens sécurisés
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Hash d'un token pour stockage
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Vérification de la force du mot de passe
const getPasswordStrength = (password) => {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[@$!%*?&]/.test(password)) score++;

  if (score < 3) return 'weak';
  if (score < 5) return 'medium';
  return 'strong';
};

// Rate limiting intelligent
class RateLimiter {
  constructor(windowMs = 15 * 60 * 1000, maxRequests = 100) { // 15 min, 100 req
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map();
  }

  isAllowed(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const userRequests = this.requests.get(key);

    // Filtrer les requêtes dans la fenêtre
    const validRequests = userRequests.filter(time => time > windowStart);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Ajouter la nouvelle requête
    validRequests.push(now);
    this.requests.set(key, validRequests);

    return true;
  }

  reset(key) {
    this.requests.delete(key);
  }
}

// Protection contre les attaques par injection
const sqlInjectionCheck = (input) => {
  if (typeof input !== 'string') return true;

  const dangerousPatterns = [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i,
    /('|(\\x27)|(\\x2D\\x2D)|(\\#)|(\%27)|(\%22)|(\%23))/i,
    /(<script|javascript:|vbscript:|onload=|onerror=)/i
  ];

  return !dangerousPatterns.some(pattern => pattern.test(input));
};

// Logging sécurisé (pas de données sensibles)
const secureLog = (level, message, data = {}) => {
  const sanitizedData = { ...data };

  // Supprimer les champs sensibles
  const sensitiveFields = ['password', 'password_hash', 'token', 'secret'];
  sensitiveFields.forEach(field => {
    if (sanitizedData[field]) {
      sanitizedData[field] = '[REDACTED]';
    }
  });

  console.log(`[${level.toUpperCase()}] ${new Date().toISOString()}: ${message}`, sanitizedData);
};

module.exports = {
  ProofOfWork,
  sanitizeInput,
  isValidEmail,
  validatePassword,
  applyPepper,
  generateSecureToken,
  hashToken,
  getPasswordStrength,
  RateLimiter,
  sqlInjectionCheck,
  secureLog
};