const fs = require('fs');
const path = require('path');

// Créer le dossier logs s'il n'existe pas
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Fonction de logging sécurisé
const secureLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...meta
  };

  // Afficher dans la console
  const consoleMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  
  switch (level) {
    case 'error':
      console.error(consoleMessage, meta);
      break;
    case 'warn':
      console.warn(consoleMessage, meta);
      break;
    case 'info':
      console.log(consoleMessage, meta);
      break;
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.log(consoleMessage, meta);
      }
      break;
    default:
      console.log(consoleMessage, meta);
  }

  // Écrire dans le fichier de log
  const logFile = path.join(logsDir, `${level}.log`);
  const logLine = JSON.stringify(logEntry) + '\n';
  
  try {
    fs.appendFileSync(logFile, logLine);
  } catch (error) {
    console.error('Failed to write to log file:', error.message);
  }
};

// Validation et sanitisation des entrées
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS
    .replace(/['"]/g, '') // Remove quotes to prevent SQL injection
    .slice(0, 1000); // Limit length
};

// Validation d'email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validation de prix
const isValidPrice = (price) => {
  return typeof price === 'number' && price >= 0 && price <= 999999.99;
};

// Validation d'UUID
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Génération de slug pour les noms de produits
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
};

module.exports = {
  secureLog,
  sanitizeInput,
  isValidEmail,
  isValidPrice,
  isValidUUID,
  generateSlug
};
