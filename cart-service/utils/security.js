const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const secureLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...meta
  };

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

  const logFile = path.join(logsDir, `${level}.log`);
  const logLine = JSON.stringify(logEntry) + '\n';
  
  try {
    fs.appendFileSync(logFile, logLine);
  } catch (error) {
    console.error('Failed to write to log file:', error.message);
  }
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/['"]/g, '')
    .slice(0, 1000);
};

const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

module.exports = {
  secureLog,
  sanitizeInput,
  isValidUUID
};
