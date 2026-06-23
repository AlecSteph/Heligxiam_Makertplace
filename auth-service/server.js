const app = require('./app');
const db = require('./config/database');
const mongo = require('./config/mongo');
const { ensurePasswordResetSchema } = require('./lib/passwordReset');
const { ensureClientAuthColumns, loadClientsIntoMemory } = require('./lib/clientUsersPg');
const PORT = process.env.PORT || 3001;

const startServer = async () => {
  await db.testConnection();
  await db.ensureSchema();
  await ensureClientAuthColumns();
  await loadClientsIntoMemory();
  await ensurePasswordResetSchema();
  await mongo.connectMongo();

  app.listen(PORT, () => {
    console.log(`Auth service running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start auth service:', error.message);
  process.exit(1);
});

module.exports = app;