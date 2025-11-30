/**
 * Logger Configuration
 *
 * Centralized Pino logger with:
 * - Daily log rotation
 * - Size-based rotation
 * - Different log levels per environment
 * - Structured logging
 */

import pino from 'pino';
import pinoms from 'pino-roll';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log level based on environment
const logLevel = process.env.LOG_LEVEL || (
  process.env.NODE_ENV === 'production' ? 'info' : 'debug'
);

// Base Pino configuration
const pinoConfig: pino.LoggerOptions = {
  level: logLevel,
  formatters: {
    level: (label) => {
      return { level: label };
    },
    bindings: (bindings) => {
      return {
        pid: bindings.pid,
        host: bindings.hostname,
        node_version: process.version
      };
    }
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`
};

/**
 * Create logger instance
 */
export function createLogger(name?: string) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';

  // Test: simple console logger
  if (isTest) {
    return pino({
      ...pinoConfig,
      name: name || 'takara-gold',
      level: 'silent' // Silent in tests
    });
  }

  // Development: pretty print to console
  if (isDevelopment) {
    return pino({
      ...pinoConfig,
      name: name || 'takara-gold',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname'
        }
      }
    });
  }

  // Production: write to rotating files
  const logFile = path.join(logsDir, 'app.log');
  const errorLogFile = path.join(logsDir, 'error.log');

  // Create rotating file stream
  const stream = pinoms({
    file: logFile,
    frequency: 'daily',      // Rotate daily
    size: '10M',             // Max 10MB per file
    dateFormat: 'yyyy-MM-dd' // Date format in filename
  });

  // Create error log stream
  const errorStream = pinoms({
    file: errorLogFile,
    frequency: 'daily',
    size: '10M',
    dateFormat: 'yyyy-MM-dd'
  });

  // Use single stream for simplicity (all logs go to app.log)
  return pino({
    ...pinoConfig,
    name: name || 'takara-gold'
  }, stream);
}

/**
 * Default logger instance
 */
export const logger = createLogger();

/**
 * Create child logger with additional context
 */
export function getLogger(context: string | object) {
  // In test environment with silent logger, return a simple logger
  if (process.env.NODE_ENV === 'test' || !logger.child) {
    return logger;
  }

  if (typeof context === 'string') {
    return logger.child({ module: context });
  }
  return logger.child(context);
}

/**
 * Express request logger middleware
 */
export function requestLogger() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();

    // Log request
    logger.info({
      type: 'request',
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // Log response on finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logData = {
        type: 'response',
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip
      };

      if (res.statusCode >= 500) {
        logger.error(logData);
      } else if (res.statusCode >= 400) {
        logger.warn(logData);
      } else {
        logger.info(logData);
      }
    });

    next();
  };
}

export default logger;
