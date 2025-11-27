/**
 * Environment Configuration
 * Validates required environment variables
 */

export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ CRITICAL: ${key} environment variable is required but not set`);
  }
  return value;
}

export function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

// Validate critical environment variables on startup
export function validateEnvironment(): void {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];

  const missing: string[] = [];
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('❌ CRITICAL: Missing required environment variables:');
    missing.forEach(key => console.error(`  - ${key}`));
    console.error('\nPlease check your .env file and set all required variables.');
    process.exit(1);
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET!;
  if (jwtSecret.length < 32) {
    console.error('❌ CRITICAL: JWT_SECRET must be at least 32 characters long');
    process.exit(1);
  }

  console.log('✅ Environment variables validated successfully');
}

// Export validated environment variables
export const env = {
  NODE_ENV: getOptionalEnv('NODE_ENV', 'development'),
  PORT: parseInt(getOptionalEnv('PORT', '3000')),
  DATABASE_URL: getRequiredEnv('DATABASE_URL'),
  JWT_SECRET: getRequiredEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: getOptionalEnv('JWT_EXPIRES_IN', '7d'),
  REDIS_URL: getOptionalEnv('REDIS_URL', 'redis://localhost:6379'),
  FRONTEND_URL: getOptionalEnv('FRONTEND_URL', 'http://localhost:5173'),
  SOLANA_RPC_URL: getOptionalEnv('SOLANA_RPC_URL', 'https://api.devnet.solana.com'),
  PLATFORM_WALLET: getOptionalEnv('PLATFORM_WALLET', ''),
};
