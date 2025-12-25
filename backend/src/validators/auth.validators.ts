/**
 * Authentication Input Validators
 *
 * Zod schemas for validating authentication-related requests
 */

import { z } from 'zod';

/**
 * Solana wallet address validation
 */
const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const SolanaAddressSchema = z.string()
  .regex(solanaAddressRegex, 'Invalid Solana wallet address');

/**
 * TRON wallet address validation (base58, starts with T)
 */
const tronAddressRegex = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

export const TronAddressSchema = z.string()
  .regex(tronAddressRegex, 'Invalid TRON wallet address');

/**
 * GET /api/auth/nonce
 */
export const GetNonceSchema = z.object({
  walletAddress: SolanaAddressSchema,
});

/**
 * POST /api/auth/login (Wallet signature)
 */
export const WalletLoginSchema = z.object({
  walletAddress: SolanaAddressSchema,
  signature: z.string()
    .min(64, 'Invalid signature')
    .max(256, 'Invalid signature'),
});

/**
 * POST /api/auth/register (Username/Password)
 */
export const RegisterSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must not exceed 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must not exceed 128 characters'),
  email: z.string()
    .email('Invalid email address')
    .optional(),
});

/**
 * POST /api/auth/login-password
 * Accepts either username or email
 */
export const PasswordLoginSchema = z.object({
  username: z.string()
    .min(1, 'Username or email is required')
    .optional(),
  email: z.string()
    .email('Invalid email')
    .optional(),
  password: z.string()
    .min(1, 'Password is required'),
}).refine(
  (data) => data.username || data.email,
  {
    message: 'Either username or email is required',
    path: ['username'],
  }
);

/**
 * POST /api/admin/auth/login
 */
export const AdminLoginSchema = z.object({
  username: z.string()
    .min(1, 'Username is required'),
  password: z.string()
    .min(1, 'Password is required'),
});

/**
 * POST /api/auth/connect-solana
 */
export const ConnectSolanaSchema = z.object({
  walletAddress: SolanaAddressSchema,
});

/**
 * POST /api/auth/connect-tron
 */
export const ConnectTronSchema = z.object({
  tronAddress: TronAddressSchema,
});

export default {
  GetNonceSchema,
  WalletLoginSchema,
  RegisterSchema,
  PasswordLoginSchema,
  AdminLoginSchema,
  ConnectSolanaSchema,
  ConnectTronSchema,
};
