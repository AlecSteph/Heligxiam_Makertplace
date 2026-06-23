require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const { router: sellerRoutes, uploadDir: sellerUploadDir } = require('./routes/seller');
const { router: adminRoutes } = require('./routes/admin');
const { router: catalogRoutes } = require('./routes/catalog');
const { router: buyerRoutes } = require('./routes/buyer');

const app = express();

// Middlewares de sécurité
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    try {
      const url = new URL(origin);
      const isLocalUi =
        ['localhost', '127.0.0.1'].includes(url.hostname) &&
        (!url.port || /^42\d{2,3}$/.test(url.port) || url.port === '4200' || url.port === '4201');
      if (isLocalUi) {
        return callback(null, true);
      }
    } catch (_e) {
      // Origine invalide : rejetée ci-dessous.
    }
    return callback(new Error(`Origine CORS non autorisée: ${origin}`));
  },
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Fichiers téléversés (KYC vendeur) — servis sous /api/seller/files/...
app.use('/api/seller/files', express.static(sellerUploadDir));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Trop de requêtes. Veuillez réessayer plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/buyer', buyerRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth service is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;