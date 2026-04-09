const app = require('./app');
const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log(`Cart service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
