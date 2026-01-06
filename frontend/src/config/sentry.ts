/**
 * Sentry Error Monitoring Configuration
 *
 * Tracks errors and performance in production
 */

import * as Sentry from '@sentry/react'

const SENTRY_DSN = 'https://4466ed8c14a827b857ee17c865260337@o4510398409670656.ingest.us.sentry.io/4510599662665728'

export function initSentry() {
  // Only initialize in production
  if (import.meta.env.DEV) {
    console.log('[Sentry] Disabled in development')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE || 'production',

    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || '2.1.1',

    // Error filtering
    beforeSend(event, hint) {
      // Filter out certain errors
      const error = hint.originalException as Error

      // Don't send network errors (user's internet issue)
      if (error?.message?.includes('Network request failed')) {
        return null
      }

      // Don't send chunk loading errors (user refreshed during deploy)
      if (error?.message?.includes('Loading chunk')) {
        return null
      }

      return event
    },

    // Ignore common non-critical errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'ResizeObserver loop',

      // Network errors
      'Network request failed',
      'NetworkError',
      'Failed to fetch',
      'Load failed',

      // User actions
      'User denied',
      'User rejected',

      // Wallet errors (expected)
      'Wallet not connected',
      'WalletNotConnectedError',
    ],

    // Only track errors from our domain
    allowUrls: [
      /takarafi\.com/,
      /localhost/,
    ],
  })

  console.log('[Sentry] Initialized for production')
}

// Export Sentry for manual error capturing
export { Sentry }

// Helper to capture exceptions with context
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (context) {
    Sentry.setContext('additional', context)
  }
  Sentry.captureException(error)
}

// Helper to capture messages
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level)
}

// Set user context for better error tracking
export function setUser(user: { id: string; email?: string; username?: string } | null) {
  Sentry.setUser(user)
}

// Add breadcrumb for debugging
export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  })
}
