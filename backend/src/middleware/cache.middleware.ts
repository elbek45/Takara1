/**
 * Cache Middleware
 *
 * Redis-based response caching for GET requests
 */

import { Request, Response, NextFunction } from 'express';
import { getCache, setCache } from '../services/redis.service';
import { getLogger } from '../config/logger';

const logger = getLogger('cache-middleware');

/**
 * Cache middleware factory
 * Caches GET request responses in Redis
 *
 * @param ttlSeconds - Time to live in seconds
 * @param keyPrefix - Optional prefix for cache keys
 */
export function cacheMiddleware(ttlSeconds: number, keyPrefix: string = 'cache') {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if explicitly disabled
    if (req.headers['x-no-cache'] === 'true') {
      return next();
    }

    try {
      // Generate cache key from route and query params
      const cacheKey = generateCacheKey(req, keyPrefix);

      // Try to get cached response
      const cachedData = await getCache(cacheKey);

      if (cachedData) {
        logger.debug({ cacheKey }, 'Cache hit');

        // Parse and return cached response
        const parsed = JSON.parse(cachedData);
        res.set('X-Cache', 'HIT');
        return res.json(parsed);
      }

      logger.debug({ cacheKey }, 'Cache miss');

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache the response
      res.json = function (body: any): Response {
        // Set cache header
        res.set('X-Cache', 'MISS');

        // Cache the response asynchronously (don't wait)
        setCache(cacheKey, JSON.stringify(body), ttlSeconds).catch((error) => {
          logger.error({ error, cacheKey }, 'Failed to cache response');
        });

        // Call original json method
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error({ error }, 'Cache middleware error');
      // Don't break the request on cache errors
      next();
    }
  };
}

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request, prefix: string): string {
  const path = req.path;
  const query = JSON.stringify(req.query);
  const userId = (req as any).userId || 'anonymous';

  // Include user ID for personalized caches, or use 'public' for shared caches
  const userSegment = req.path.includes('/admin') || req.path.includes('/user')
    ? userId
    : 'public';

  return `${prefix}:${userSegment}:${path}:${query}`;
}

/**
 * Invalidate cache by pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const { getRedisClient } = await import('../services/redis.service');
    const client = getRedisClient();

    // Get all keys matching pattern
    const keys = await client.keys(pattern);

    if (keys.length > 0) {
      await client.del(...keys);
      logger.info({ pattern, count: keys.length }, 'Cache invalidated');
    }
  } catch (error) {
    logger.error({ error, pattern }, 'Failed to invalidate cache');
  }
}

/**
 * Invalidate cache by prefix
 */
export async function invalidateCacheByPrefix(prefix: string): Promise<void> {
  await invalidateCache(`${prefix}:*`);
}

/**
 * Pre-configured cache middleware for common use cases
 */

// Short cache (30 seconds) - for frequently changing data
export const cacheShort = cacheMiddleware(30, 'cache:short');

// Medium cache (5 minutes) - for moderately changing data
export const cacheMedium = cacheMiddleware(300, 'cache:medium');

// Long cache (1 hour) - for rarely changing data
export const cacheLong = cacheMiddleware(3600, 'cache:long');

// Very long cache (24 hours) - for static or very rarely changing data
export const cacheVeryLong = cacheMiddleware(86400, 'cache:static');

export default {
  cacheMiddleware,
  cacheShort,
  cacheMedium,
  cacheLong,
  cacheVeryLong,
  invalidateCache,
  invalidateCacheByPrefix
};
