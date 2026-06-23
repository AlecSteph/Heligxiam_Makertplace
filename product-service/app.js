const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { secureLog } = require('./utils/security');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const database = require('./config/database');

require('dotenv').config();

const app = express();

app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  res.setHeader('x-request-id', req.requestId);
  next();
});

// ========================================
// SÉCURITÉ ET MIDDLEWARES GLOBAUX
// ========================================

// Sécurité de base
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:4200'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression
app.use(compression());

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    secureLog('warn', 'Global rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    res.status(options.statusCode).json(options.message);
  }
});

app.use(globalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging des requêtes
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    secureLog('info', 'Request completed', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });

  next();
});

// ========================================
// ROUTES
// ========================================

// Route de santé (pas de rate limiting)
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Product service is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Routes des produits
app.use('/api/products', productRoutes);

// Routes des catégories
app.use('/api/categories', categoryRoutes);

// Route 404
app.use('*', (req, res) => {
  secureLog('warn', 'Route not found', {
    method: req.method,
    url: req.url,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    requestId: req.requestId,
    message: 'Route non trouvée'
  });
});

// ========================================
// GESTION DES ERREURS
// ========================================

// Middleware de gestion d'erreurs
app.use((error, req, res, next) => {
  secureLog('error', 'Unhandled error', {
    requestId: req.requestId,
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    ip: req.ip
  });

  // Ne pas exposer les détails d'erreur en production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(error.status || 500).json({
    success: false,
    code: error.code || 'INTERNAL_ERROR',
    requestId: req.requestId,
    message: isDevelopment ? error.message : 'Erreur interne du serveur',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  secureLog('error', 'Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  secureLog('error', 'Unhandled Rejection', {
    reason: reason,
    promise: promise
  });
  process.exit(1);
});

const startServer = async () => {
  const PORT = process.env.PORT || 3002;
  try {
    await database.testConnection();
    secureLog('info', 'Database connection established successfully');

    return app.listen(PORT, () => {
      secureLog('info', `Product service started successfully`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      });

      console.log(`Product service running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    secureLog('error', 'Failed to start server', {
      error: error.message,
      stack: error.stack
    });

    console.error('Failed to start product service:', error.message);
    process.exit(1);
  }
};

// Gestion gracieuse de l'arrêt
process.on('SIGTERM', async () => {
  secureLog('info', 'SIGTERM received, shutting down gracefully');

  try {
    await database.close();
    secureLog('info', 'Database connection closed');
    process.exit(0);
  } catch (error) {
    secureLog('error', 'Error during shutdown', { error: error.message });
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  secureLog('info', 'SIGINT received, shutting down gracefully');

  try {
    await database.close();
    secureLog('info', 'Database connection closed');
    process.exit(0);
  } catch (error) {
    secureLog('error', 'Error during shutdown', { error: error.message });
    process.exit(1);
  }
});

module.exports = {
  app,
  startServer
};
