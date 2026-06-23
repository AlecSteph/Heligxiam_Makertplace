const app = require('./app');
const db = require('./config/database');
const { ensureOrdersSchema } = require('./lib/ordersRepository');

const PORT = process.env.PORT || 3004;

const startServer = async () => {
  await db.testConnection();
  await ensureOrdersSchema();

  app.listen(PORT, () => {
    console.log(`Order service running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start order service:', error.message);
  process.exit(1);
});

module.exports = app;
