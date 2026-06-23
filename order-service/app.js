const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { secureLog } = require('./utils/security');
const buyerRoutes = require('./routes/buyer');
const sellerRoutes = require('./routes/seller');

require('dotenv').config();

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:4200', 'http://127.0.0.1:4200'],
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false
}));

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Order service is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api/buyer', buyerRoutes);
app.use('/api/seller', sellerRoutes);

app.use('*', (_req, res) => {
  res.status(404).json({ success: false, message: 'Route non trouvée' });
});

app.use((err, _req, res, _next) => {
  secureLog('error', 'Unhandled error', { error: err.message });
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erreur interne du serveur'
  });
});

module.exports = app;
