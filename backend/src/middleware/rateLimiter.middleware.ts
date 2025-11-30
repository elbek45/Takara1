/**
 * Rate Limiting Middleware
 *
 * Protects endpoints from brute-force attacks and abuse
 */

import rateLimit from 'express-rate-limit';
import { getLogger } from '../config/logger';

const logger = getLogger('rate-limiter');

/**
 * Admin login rate limiter
 * Strict limiting to prevent brute-force attacks on admin accounts
 */
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn({
      ip: req.ip,
      url: req.url,
      userAgent: req.get('user-agent')
    }, 'Admin login rate limit exceeded');

    res.status(429).json({
      success: false,
      message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
    });
  },
  skip: (req) => {
    // Skip rate limiting in test environment
    return process.env.NODE_ENV === 'test';
  },
});

/**
 * General API rate limiter
 * For general API endpoints
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'test';
  },
});

/**
 * Strict rate limiter for sensitive operations
 * For operations like withdrawals, password changes, etc.
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    success: false,
    message: 'Too many attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      ip: req.ip,
      url: req.url,
      userId: (req as any).userId,
    }, 'Strict rate limit exceeded');

    res.status(429).json({
      success: false,
      message: 'Too many sensitive operation attempts. Please try again after 1 hour.',
    });
  },
  skip: (req) => {
    return process.env.NODE_ENV === 'test';
  },
});

/**
 * Nonce generation rate limiter
 * Prevent nonce spam
 */
export const nonceLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 nonces per 5 minutes
  message: {
    success: false,
    message: 'Too many nonce requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'test';
  },
});

export default {
  adminLoginLimiter,
  apiLimiter,
  strictLimiter,
  nonceLimiter,
};
