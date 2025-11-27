/**
 * Application Constants
 */

export const APP_CONFIG = {
  NAME: 'Takara Gold',
  VERSION: '2.1.1',
  DESCRIPTION: 'Premium Investment Platform & NFT Marketplace on Solana',
  API_PREFIX: '/api',
  DEFAULT_PORT: 3000
} as const;

export const JWT_CONFIG = {
  ALGORITHM: 'HS256' as const,
  ISSUER: 'takara-gold',
  AUDIENCE: 'takara-users'
} as const;

export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
  SKIP_SUCCESSFUL_REQUESTS: false
} as const;

export const CORS_CONFIG = {
  CREDENTIALS: true,
  MAX_AGE: 86400 // 24 hours
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
} as const;

export const INVESTMENT_CONFIG = {
  ACTIVATION_DELAY_HOURS: 72, // 72 hour timer before activation
  MIN_USDT_AMOUNT: 100,
  MAX_USDT_AMOUNT: 1_000_000
} as const;

export const MARKETPLACE_CONFIG = {
  PLATFORM_FEE_PERCENT: 2.5, // 2.5% fee on sales
  MIN_LISTING_PRICE: 10,
  MAX_LISTING_DAYS: 90
} as const;

export const SOLANA_CONFIG = {
  COMMITMENT: 'confirmed' as const,
  PREFLIGHTED: true,
  SKIP_PREFLIGHT: false
} as const;

export const CRON_SCHEDULES = {
  DAILY_MINING: '0 0 * * *', // Every day at midnight
  PAYOUT_CHECK: '0 */6 * * *', // Every 6 hours
  LAIKA_RETURN: '0 1 * * *', // Daily at 1 AM
  VAULT_ACTIVATION: '0 */1 * * *' // Every hour
} as const;

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  BAD_REQUEST: 'Invalid request',
  INTERNAL_ERROR: 'Internal server error',
  INVALID_SIGNATURE: 'Invalid wallet signature',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  VAULT_NOT_FOUND: 'Vault not found',
  INVESTMENT_NOT_FOUND: 'Investment not found',
  INVALID_VAULT: 'Invalid vault configuration',
  INVESTMENT_ALREADY_ACTIVE: 'Investment already active',
  INVESTMENT_NOT_ACTIVE: 'Investment not active',
  LISTING_NOT_FOUND: 'Marketplace listing not found'
} as const;

export const SUCCESS_MESSAGES = {
  INVESTMENT_CREATED: 'Investment created successfully',
  LAIKA_BOOST_ADDED: 'LAIKA boost added successfully',
  YIELD_CLAIMED: 'Yield claimed successfully',
  TAKARA_CLAIMED: 'TAKARA claimed successfully',
  NFT_LISTED: 'NFT listed on marketplace',
  NFT_PURCHASED: 'NFT purchased successfully',
  WITHDRAWAL_REQUESTED: 'Withdrawal request submitted'
} as const;

export default {
  APP_CONFIG,
  JWT_CONFIG,
  RATE_LIMIT,
  CORS_CONFIG,
  PAGINATION,
  INVESTMENT_CONFIG,
  MARKETPLACE_CONFIG,
  SOLANA_CONFIG,
  CRON_SCHEDULES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};
