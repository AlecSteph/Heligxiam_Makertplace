const { app, startServer } = require('./app');

startServer().catch((error) => {
  console.error('Failed to bootstrap cart service:', error.message);
  process.exit(1);
});

module.exports = app;
