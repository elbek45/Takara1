/**
 * Mock Data for Testing
 * Fixtures and mock data generators
 */

import { UserRole, VaultTier, PayoutSchedule } from '@prisma/client';

/**
 * Mock User Data
 */
export const mockUsers = {
  validUser: {
    email: 'valid@example.com',
    username: 'validuser',
    password: 'SecurePassword123!',
  },

  adminUser: {
    email: 'admin@example.com',
    username: 'adminuser',
    password: 'AdminPassword123!',
    role: UserRole.ADMIN,
  },

  userWithWallets: {
    email: 'wallet@example.com',
    username: 'walletuser',
    password: 'WalletPassword123!',
    walletAddress: '7xKWvfqJQRnJGZJz3xKGGMqCJpqjhqjJzXqZ9vF9qYnJ', // Mock Solana
    ethereumAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1', // Mock Ethereum
  },

  weakPassword: {
    email: 'weak@example.com',
    username: 'weakuser',
    password: '123', // Too weak
  },

  invalidEmail: {
    email: 'invalid-email',
    username: 'invaliduser',
    password: 'ValidPassword123!',
  },
};

/**
 * Mock Vault Data
 */
export const mockVaults = {
  starter12M: {
    name: 'Starter Vault 12M',
    tier: VaultTier.STARTER,
    duration: 12,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 100,
    maxInvestment: 10000,
    requireTAKARA: false,
    baseAPY: 4.0,
    maxAPY: 8.0,
    takaraAPY: 50,
    isActive: true,
  },

  pro30M: {
    name: 'Pro Vault 30M',
    tier: VaultTier.PRO,
    duration: 30,
    payoutSchedule: PayoutSchedule.QUARTERLY,
    minInvestment: 5000,
    maxInvestment: 50000,
    requireTAKARA: true,
    takaraRatio: 30,
    baseAPY: 5.5,
    maxAPY: 11.0,
    takaraAPY: 100,
    isActive: true,
  },

  elite36M: {
    name: 'Elite Vault 36M',
    tier: VaultTier.ELITE,
    duration: 36,
    payoutSchedule: PayoutSchedule.END_OF_TERM,
    minInvestment: 20000,
    maxInvestment: 200000,
    requireTAKARA: true,
    takaraRatio: 50,
    baseAPY: 8.0,
    maxAPY: 16.0,
    takaraAPY: 350,
    isActive: true,
  },

  inactiveVault: {
    name: 'Inactive Vault',
    tier: VaultTier.STARTER,
    duration: 12,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 100,
    maxInvestment: 10000,
    requireTAKARA: false,
    baseAPY: 4.0,
    maxAPY: 8.0,
    takaraAPY: 50,
    isActive: false, // Inactive
  },
};

/**
 * Mock Investment Data
 */
export const mockInvestments = {
  validInvestment: {
    usdtAmount: 1000,
    takaraRequired: 0,
    takaraLocked: 0,
    finalAPY: 4.0,
  },

  proInvestmentWithTAKARA: {
    usdtAmount: 10000,
    takaraRequired: 3000, // 30 TAKARA per 100 USDT
    takaraLocked: 3000,
    finalAPY: 5.5,
  },

  eliteInvestmentWithBoost: {
    usdtAmount: 50000,
    takaraRequired: 25000, // 50 TAKARA per 100 USDT
    takaraLocked: 25000,
    finalAPY: 16.0, // Max APY with LAIKA boost
  },

  belowMinimum: {
    usdtAmount: 50, // Below 100 minimum
  },

  aboveMaximum: {
    usdtAmount: 15000, // Above 10000 maximum for starter
  },
};

/**
 * Mock Blockchain Transaction Data
 */
export const mockBlockchainData = {
  validEthereumTx: {
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
    to: '0x5B2De17a0aC667B08B501C92e6B271ed110665E1',
    value: '1000000000', // 1000 USDT (6 decimals)
    status: 1,
    blockNumber: 12345678,
  },

  validSolanaTx: {
    signature: '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW',
    slot: 123456789,
    confirmations: 32,
    err: null,
  },

  invalidTx: {
    hash: '0xinvalid',
    signature: 'invalid',
  },
};

/**
 * Mock NFT Metadata
 */
export const mockNFTMetadata = {
  name: 'Takara Gold Investment NFT #1',
  symbol: 'TAKARA-INV',
  description: 'Investment certificate for Takara Gold vault',
  image: 'https://ipfs.io/ipfs/QmXxx...',
  attributes: [
    { trait_type: 'Vault', value: 'Starter Vault 12M' },
    { trait_type: 'Amount', value: '1000 USDT' },
    { trait_type: 'APY', value: '4.0%' },
    { trait_type: 'Duration', value: '12 months' },
  ],
};

/**
 * Mock API Responses
 */
export const mockAPIResponses = {
  successfulRegistration: {
    message: 'User registered successfully',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    user: {
      id: 'user-uuid',
      email: 'test@example.com',
      username: 'testuser',
      role: 'USER',
    },
  },

  successfulLogin: {
    message: 'Login successful',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    user: {
      id: 'user-uuid',
      email: 'test@example.com',
      username: 'testuser',
    },
  },

  invalidCredentials: {
    error: 'Invalid credentials',
  },

  validationError: {
    error: 'Validation failed',
    details: ['Email is required', 'Password must be at least 8 characters'],
  },
};

/**
 * Mock Environment Variables
 */
export const mockEnv = {
  JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/takara_test',
  NODE_ENV: 'test',
  ETHEREUM_RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/test-key',
  SOLANA_RPC_URL: 'https://api.devnet.solana.com',
  NFT_STORAGE_API_KEY: 'test-nft-storage-key',
  ENABLE_REAL_ETH_TRANSFERS: 'false',
  ENABLE_REAL_TOKEN_TRANSFERS: 'false',
  ENABLE_REAL_NFT_MINTING: 'false',
  SKIP_TX_VERIFICATION: 'true',
};
