/**
 * Health Check Routes
 *
 * Comprehensive health checks for monitoring and orchestration
 */

import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../config/database';
import { getRedisHealth } from '../services/redis.service';
import { connection as solanaConnection } from '../services/solana.service';
import { APP_CONFIG } from '../config/constants';
import { logger } from '../config/logger';

const router = Router();

/**
 * GET /health
 * Basic health check (liveness probe)
 * Returns 200 if app is running
 */
router.get('/', async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: APP_CONFIG.VERSION,
    uptime: process.uptime()
  });
});

/**
 * GET /health/ready
 * Readiness probe - checks if all dependencies are ready
 * Returns 200 if app is ready to serve traffic
 */
router.get('/ready', async (req: Request, res: Response) => {
  const checks: any = {
    database: false,
    redis: false,
    solana: false
  };

  let isReady = true;

  try {
    // Check database
    checks.database = await checkDatabaseHealth();
    if (!checks.database) isReady = false;
  } catch (error) {
    checks.database = false;
    checks.databaseError = (error as Error).message;
    isReady = false;
  }

  try {
    // Check Redis
    checks.redis = await getRedisHealth();
    if (!checks.redis) isReady = false;
  } catch (error) {
    checks.redis = false;
    checks.redisError = (error as Error).message;
    isReady = false;
  }

  try {
    // Check Solana RPC
    const slot = await solanaConnection.getSlot();
    checks.solana = slot > 0;
    checks.solanaSlot = slot;
    if (!checks.solana) isReady = false;
  } catch (error) {
    checks.solana = false;
    checks.solanaError = (error as Error).message;
    isReady = false;
  }

  const statusCode = isReady ? 200 : 503;
  const status = isReady ? 'ready' : 'not_ready';

  if (!isReady) {
    logger.warn({ checks }, 'Readiness check failed');
  }

  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    version: APP_CONFIG.VERSION,
    checks
  });
});

/**
 * GET /health/live
 * Liveness probe - checks if app is alive
 * Returns 200 if app process is running
 */
router.get('/live', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

/**
 * GET /health/detailed
 * Detailed health check with all component statuses
 * Useful for monitoring dashboards
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now();

  const health: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: APP_CONFIG.VERSION,
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    checks: {}
  };

  // Database check
  try {
    const dbStart = Date.now();
    health.checks.database = {
      status: await checkDatabaseHealth() ? 'up' : 'down',
      responseTime: Date.now() - dbStart
    };
  } catch (error) {
    health.checks.database = {
      status: 'down',
      error: (error as Error).message
    };
    health.status = 'unhealthy';
  }

  // Redis check
  try {
    const redisStart = Date.now();
    health.checks.redis = {
      status: await getRedisHealth() ? 'up' : 'down',
      responseTime: Date.now() - redisStart
    };
  } catch (error) {
    health.checks.redis = {
      status: 'down',
      error: (error as Error).message
    };
    health.status = 'degraded';
  }

  // Solana RPC check
  try {
    const solanaStart = Date.now();
    const slot = await solanaConnection.getSlot();
    const version = await solanaConnection.getVersion();
    health.checks.solana = {
      status: 'up',
      responseTime: Date.now() - solanaStart,
      currentSlot: slot,
      version: version['solana-core']
    };
  } catch (error) {
    health.checks.solana = {
      status: 'down',
      error: (error as Error).message
    };
    health.status = 'degraded';
  }

  // Process metrics
  health.process = {
    pid: process.pid,
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
    },
    cpu: process.cpuUsage()
  };

  health.responseTime = Date.now() - startTime;

  const statusCode = health.status === 'healthy' ? 200 :
                     health.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(health);
});

export default router;
