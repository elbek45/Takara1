/**
 * Redis Service
 *
 * Handles Redis connections and operations for:
 * - Nonce storage (authentication)
 * - Session management
 * - Rate limiting
 * - Caching
 */

import Redis from 'ioredis';
import { getEnv } from '../config/env';
import { getLogger } from '../config/logger';

const logger = getLogger('redis-service');

// Redis client instance
let redisClient: Redis | null = null;

/**
 * Get Redis client instance (singleton)
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = getEnv().REDIS_URL;

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true;
        }
        return false;
      }
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (error) => {
      logger.error({ error }, 'Redis connection error');
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed gracefully');
  }
}

/**
 * Check if Redis is connected
 */
export async function isRedisConnected(): Promise<boolean> {
  try {
    const client = getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    logger.error({ error }, 'Redis health check failed');
    return false;
  }
}

/**
 * Health check alias for consistency
 */
export const getRedisHealth = isRedisConnected;

// ===================================
// Nonce Management (for authentication)
// ===================================

const NONCE_PREFIX = 'nonce:';
const NONCE_EXPIRY = 300; // 5 minutes in seconds

/**
 * Store nonce for wallet address
 */
export async function setNonce(walletAddress: string, nonce: string): Promise<void> {
  try {
    const client = getRedisClient();
    const key = `${NONCE_PREFIX}${walletAddress}`;
    await client.setex(key, NONCE_EXPIRY, nonce);
    logger.debug({ walletAddress }, 'Nonce stored');
  } catch (error) {
    logger.error({ error, walletAddress }, 'Failed to store nonce');
    throw new Error('Failed to store nonce');
  }
}

/**
 * Get nonce for wallet address
 */
export async function getNonce(walletAddress: string): Promise<string | null> {
  try {
    const client = getRedisClient();
    const key = `${NONCE_PREFIX}${walletAddress}`;
    const nonce = await client.get(key);
    return nonce;
  } catch (error) {
    logger.error({ error, walletAddress }, 'Failed to get nonce');
    return null;
  }
}

/**
 * Delete nonce for wallet address (after successful authentication)
 */
export async function deleteNonce(walletAddress: string): Promise<void> {
  try {
    const client = getRedisClient();
    const key = `${NONCE_PREFIX}${walletAddress}`;
    await client.del(key);
    logger.debug({ walletAddress }, 'Nonce deleted');
  } catch (error) {
    logger.error({ error, walletAddress }, 'Failed to delete nonce');
    // Don't throw - this is not critical
  }
}

// ===================================
// Generic Cache Operations
// ===================================

/**
 * Set cache with expiration
 */
export async function setCache(key: string, value: string, ttlSeconds: number): Promise<void> {
  try {
    const client = getRedisClient();
    await client.setex(key, ttlSeconds, value);
  } catch (error) {
    logger.error({ error, key }, 'Failed to set cache');
    throw new Error('Failed to set cache');
  }
}

/**
 * Get cache value
 */
export async function getCache(key: string): Promise<string | null> {
  try {
    const client = getRedisClient();
    return await client.get(key);
  } catch (error) {
    logger.error({ error, key }, 'Failed to get cache');
    return null;
  }
}

/**
 * Delete cache value
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (error) {
    logger.error({ error, key }, 'Failed to delete cache');
  }
}

/**
 * Set cache object (JSON serialized)
 */
export async function setCacheObject<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const serialized = JSON.stringify(value);
  await setCache(key, serialized, ttlSeconds);
}

/**
 * Get cache object (JSON deserialized)
 */
export async function getCacheObject<T>(key: string): Promise<T | null> {
  const value = await getCache(key);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    logger.error({ error, key }, 'Failed to parse cached object');
    return null;
  }
}

// ===================================
// Rate Limiting Support
// ===================================

/**
 * Increment rate limit counter
 * Returns current count
 */
export async function incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
  try {
    const client = getRedisClient();
    const count = await client.incr(key);

    // Set expiry only on first increment
    if (count === 1) {
      await client.expire(key, windowSeconds);
    }

    return count;
  } catch (error) {
    logger.error({ error, key }, 'Failed to increment rate limit');
    throw new Error('Failed to check rate limit');
  }
}

/**
 * Get current rate limit count
 */
export async function getRateLimitCount(key: string): Promise<number> {
  try {
    const client = getRedisClient();
    const count = await client.get(key);
    return count ? parseInt(count, 10) : 0;
  } catch (error) {
    logger.error({ error, key }, 'Failed to get rate limit count');
    return 0;
  }
}

export default {
  getRedisClient,
  closeRedis,
  isRedisConnected,
  setNonce,
  getNonce,
  deleteNonce,
  setCache,
  getCache,
  deleteCache,
  setCacheObject,
  getCacheObject,
  incrementRateLimit,
  getRateLimitCount
};
