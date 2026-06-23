const secureLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  if (level === 'error') console.error(line, meta);
  else if (level === 'warn') console.warn(line, meta);
  else console.log(line, meta);
};

module.exports = { secureLog };
