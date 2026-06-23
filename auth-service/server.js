const app = require('./app');
const db = require('./config/database');
const mongo = require('./config/mongo');
const PORT = process.env.PORT || 3001;

const startServer = async () => {
  await db.testConnection();
  await db.ensureSchema();
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