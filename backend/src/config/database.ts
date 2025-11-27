/**
 * Database Configuration
 */

import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const logger = pino({ name: 'database' });

// Prisma Client Singleton
declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' }
    ]
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query' as never, (e: any) => {
    logger.debug({
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`
    });
  });
}

/**
 * Connect to database
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error({ error }, '❌ Failed to connect to database');
    throw error;
  }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting from database');
  }
}

/**
 * Health check
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return false;
  }
}

export default prisma;
