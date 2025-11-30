/**
 * Application Configuration and Environment Utilities
 *
 * Security-first configuration management with strict env validation
 */

/**
 * Get required environment variable
 *
 * @throws Error if environment variable is not set
 * @security Prevents application startup with missing critical config
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];

  if (!value || value.trim() === '') {
    throw new Error(
      `CRITICAL: ${key} environment variable is required but not set. ` +
      `Please set it in your .env file before starting the application.`
    );
  }

  return value.trim();
}

/**
 * Get optional environment variable with default
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value && value.trim() !== '' ? value.trim() : defaultValue;
}

/**
 * Get required numeric environment variable
 *
 * @throws Error if environment variable is not set or not a valid number
 */
export function getRequiredNumericEnv(key: string): number {
  const value = getRequiredEnv(key);
  const numValue = Number(value);

  if (isNaN(numValue)) {
    throw new Error(
      `CRITICAL: ${key} environment variable must be a valid number, got: ${value}`
    );
  }

  return numValue;
}

/**
 * Get optional numeric environment variable with default
 */
export function getOptionalNumericEnv(key: string, defaultValue: number): number {
  const value = process.env[key];

  if (!value || value.trim() === '') {
    return defaultValue;
  }

  const numValue = Number(value.trim());

  if (isNaN(numValue)) {
    console.warn(
      `WARNING: ${key} environment variable is not a valid number (${value}), using default: ${defaultValue}`
    );
    return defaultValue;
  }

  return numValue;
}

/**
 * Get boolean environment variable
 */
export function getBooleanEnv(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];

  if (!value || value.trim() === '') {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

/**
 * Validate required environment variables on startup
 *
 * @security Ensures all critical configuration is present
 */
export function validateRequiredEnv(): void {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'NODE_ENV',
  ];

  const missing: string[] = [];

  for (const key of required) {
    try {
      getRequiredEnv(key);
    } catch (error) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `CRITICAL: Missing required environment variables:\n` +
      missing.map(k => `  - ${k}`).join('\n') +
      `\n\nPlease set these in your .env file before starting the application.`
    );
  }
}

/**
 * Application configuration
 * Loaded from environment variables with validation
 */
export const config = {
  // Environment
  nodeEnv: getOptionalEnv('NODE_ENV', 'development'),
  port: getOptionalNumericEnv('PORT', 3000),

  // Security
  jwtSecret: getRequiredEnv('JWT_SECRET'),
  jwtExpiresIn: getOptionalEnv('JWT_EXPIRATION', '7d'),
  bcryptRounds: getOptionalNumericEnv('BCRYPT_ROUNDS', 12),

  // Database
  databaseUrl: getRequiredEnv('DATABASE_URL'),

  // CORS
  frontendUrl: getOptionalEnv('FRONTEND_URL', 'http://localhost:5173'),
  corsOrigins: process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || [],

  // Redis (optional, but recommended for production)
  redisUrl: process.env.REDIS_URL,
  redisEnabled: getBooleanEnv('REDIS_ENABLED', false),

  // Rate Limiting
  rateLimitWindowMs: getOptionalNumericEnv('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 min
  rateLimitMaxRequests: getOptionalNumericEnv('RATE_LIMIT_MAX_REQUESTS', 100),
  adminRateLimitMax: getOptionalNumericEnv('ADMIN_RATE_LIMIT_MAX', 5),

  // Blockchain (optional for testnet)
  ethereumRpcUrl: process.env.ETHEREUM_RPC_URL,
  solanaRpcUrl: process.env.SOLANA_RPC_URL,

  // Logging
  logLevel: getOptionalEnv('LOG_LEVEL', 'info'),

  // Development
  isDevelopment: getOptionalEnv('NODE_ENV', 'development') === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const;

/**
 * Export for backward compatibility
 */
export default config;
