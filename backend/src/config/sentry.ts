/**
 * Sentry Error Monitoring Configuration
 *
 * Tracks errors and performance in production
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { Application } from 'express';
import { logger } from './logger';

/**
 * Initialize Sentry
 */
export function initializeSentry(app: Application): void {
  const sentryDsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';

  // Only initialize Sentry if DSN is configured
  if (!sentryDsn) {
    logger.info('Sentry DSN not configured, error monitoring disabled');
    return;
  }

  // Only enable in production or staging
  if (environment === 'development' || environment === 'test') {
    logger.info(`Sentry disabled in ${environment} environment`);
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment,

      // Performance Monitoring
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'), // 10% of transactions

      // Profiling
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'), // 10% of transactions
      integrations: [
        nodeProfilingIntegration(),
        Sentry.httpIntegration(),
        Sentry.expressIntegration(),
      ],

      // Release tracking
      release: process.env.APP_VERSION || 'unknown',

      // Error filtering
      beforeSend(event, hint) {
        // Filter out certain errors
        const error = hint.originalException as Error;

        // Don't send validation errors (4xx)
        if (event.request?.headers && event.request.headers['status-code']) {
          const statusCode = parseInt(event.request.headers['status-code'] as string);
          if (statusCode >= 400 && statusCode < 500) {
            return null; // Don't send to Sentry
          }
        }

        // Don't send rate limit errors
        if (error?.message?.includes('Too many requests')) {
          return null;
        }

        return event;
      },

      // Additional configuration
      ignoreErrors: [
        // Browser/client errors
        'Network request failed',
        'NetworkError',

        // Validation errors
        'ValidationError',
        'Invalid input',

        // Auth errors (not critical)
        'Unauthorized',
        'Invalid token',
        'Token expired',
      ],
    });

    logger.info({
      dsn: sentryDsn.substring(0, 30) + '...',
      environment,
      tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'
    }, 'Sentry initialized successfully');

  } catch (error) {
    logger.error({ error }, 'Failed to initialize Sentry');
  }
}

/**
 * Setup Sentry Express error handler
 * Should be called on the app instance after all routes
 */
export function setupSentryErrorHandler(app: Application): void {
  Sentry.setupExpressErrorHandler(app);
}

/**
 * Manually capture exception
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
}

/**
 * Manually capture message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
}): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

export default Sentry;
