/**
 * Investment Input Validators
 *
 * Zod schemas for validating investment-related requests
 */

import { z } from 'zod';

/**
 * POST /api/investments
 * Create new investment
 */
export const CreateInvestmentSchema = z.object({
  vaultId: z.string()
    .uuid('Invalid vault ID'),
  usdtAmount: z.number()
    .positive('Investment amount must be positive')
    .min(100, 'Minimum investment is $100')
    .max(1000000, 'Maximum investment is $1,000,000')
    .refine(
      (val) => Number.isInteger(val) || Number.isFinite(val),
      'Investment amount must be a valid number'
    ),
  laikaBoostUSD: z.number()
    .nonnegative('LAIKA boost amount cannot be negative')
    .max(1000000, 'LAIKA boost amount is too large')
    .optional(),
  transactionSignature: z.string()
    .min(64, 'Invalid transaction signature')
    .max(128, 'Invalid transaction signature')
    .optional(), // Optional for testnet
});

/**
 * POST /api/investments/:id/claim-usdt
 * Claim USDT earnings
 */
export const ClaimUSDTSchema = z.object({
  investmentId: z.string()
    .uuid('Invalid investment ID'),
});

/**
 * POST /api/investments/:id/claim-takara
 * Claim TAKARA tokens
 */
export const ClaimTAKARASchema = z.object({
  investmentId: z.string()
    .uuid('Invalid investment ID'),
});

/**
 * POST /api/investments/:id/return-laika
 * Return LAIKA for boost
 */
export const ReturnLAIKASchema = z.object({
  investmentId: z.string()
    .uuid('Invalid investment ID'),
});

/**
 * GET /api/investments (query parameters)
 */
export const GetInvestmentsQuerySchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'])
    .optional(),
  page: z.string()
    .regex(/^\d+$/, 'Page must be a number')
    .transform(Number)
    .refine((n) => n >= 1, 'Page must be at least 1')
    .optional(),
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .refine((n) => n >= 1 && n <= 100, 'Limit must be between 1 and 100')
    .optional(),
});

export default {
  CreateInvestmentSchema,
  ClaimUSDTSchema,
  ClaimTAKARASchema,
  ReturnLAIKASchema,
  GetInvestmentsQuerySchema,
};
