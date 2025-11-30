/**
 * Takara Gold Backend Application
 * Version 2.1.1
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { APP_CONFIG, RATE_LIMIT, CORS_CONFIG } from './config/constants';

// Load environment variables
dotenv.config();

// Validate critical environment variables
import { validateEnvironment } from './config/env';
validateEnvironment();

// Initialize logger
const logger = pino({
  name: APP_CONFIG.NAME,
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined
});

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || APP_CONFIG.DEFAULT_PORT;

// Trust proxy (required for rate limiting behind nginx)
// Use '127.0.0.1' to trust only local nginx proxy
app.set('trust proxy', '127.0.0.1');

// ==================== MIDDLEWARE ====================

// Security headers
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  ...(process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || []),
  // Development origins (only in non-production)
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:5173', 'http://localhost:3000']
    : []
  )
];

// Ensure at least one origin is configured in production
if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  logger.error('CRITICAL: No CORS origins configured in production. Set CORS_ORIGIN environment variable.');
  process.exit(1);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    // But only in development
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        logger.warn('Request without origin blocked in production');
        return callback(new Error('Not allowed by CORS'));
      }
      return callback(null, true);
    }

    // Check if origin is in whitelist
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn({ origin, allowedOrigins }, 'Origin not allowed by CORS');
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: CORS_CONFIG.CREDENTIALS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: CORS_CONFIG.MAX_AGE
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info({
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  next();
});

// ==================== ROUTES ====================

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    const dbHealthy = await import('./config/database').then(
      mod => mod.checkDatabaseHealth()
    );

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: APP_CONFIG.VERSION,
      database: dbHealthy ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed'
    });
  }
});

// API info
app.get('/api', (req: Request, res: Response) => {
  res.json({
    name: APP_CONFIG.NAME,
    version: APP_CONFIG.VERSION,
    description: APP_CONFIG.DESCRIPTION,
    endpoints: {
      auth: '/api/auth',
      vaults: '/api/vaults',
      investments: '/api/investments',
      marketplace: '/api/marketplace',
      admin: '/api/admin'
    }
  });
});

// API Routes
import apiRoutes from './routes';
app.use('/api', apiRoutes);

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================== SERVER STARTUP ====================

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('✅ Database connected');

    // Start background jobs
    const { startJobScheduler } = await import('./jobs/scheduler');
    startJobScheduler();

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 ${APP_CONFIG.NAME} v${APP_CONFIG.VERSION} running on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 CORS origins: ${allowedOrigins.join(', ')}`);
    });
  } catch (error) {
    logger.error({ error }, '❌ Failed to start server');
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  const { disconnectDatabase } = await import('./config/database');
  const { stopJobScheduler } = await import('./jobs/scheduler');
  stopJobScheduler();
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  const { disconnectDatabase } = await import('./config/database');
  const { stopJobScheduler } = await import('./jobs/scheduler');
  stopJobScheduler();
  await disconnectDatabase();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
