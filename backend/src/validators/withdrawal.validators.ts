/**
 * Withdrawal Input Validators
 *
 * Zod schemas for validating withdrawal-related requests
 */

import { z } from 'zod';

/**
 * Solana wallet address validation
 */
const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * POST /api/withdrawals
 * Request new withdrawal
 */
export const CreateWithdrawalSchema = z.object({
  asset: z.enum(['USDT', 'TAKARA'], {
    errorMap: () => ({ message: 'Asset must be either USDT or TAKARA' }),
  }),
  amount: z.number()
    .positive('Withdrawal amount must be positive')
    .refine(
      (val) => Number.isFinite(val),
      'Withdrawal amount must be a valid number'
    ),
  destinationWallet: z.string()
    .regex(solanaAddressRegex, 'Invalid Solana wallet address'),
});

/**
 * PUT /api/admin/withdrawals/:id/process
 * Process withdrawal (admin only)
 */
export const ProcessWithdrawalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], {
    errorMap: () => ({ message: 'Status must be either APPROVED or REJECTED' }),
  }),
  transactionSignature: z.string()
    .min(64, 'Invalid transaction signature')
    .max(128, 'Invalid transaction signature')
    .optional(), // Required for APPROVED, optional for REJECTED
  rejectionReason: z.string()
    .max(500, 'Rejection reason must not exceed 500 characters')
    .optional(), // Required for REJECTED, optional for APPROVED
}).refine(
  (data) => {
    // If APPROVED, must have transaction signature
    if (data.status === 'APPROVED' && !data.transactionSignature) {
      return false;
    }
    // If REJECTED, should have rejection reason
    if (data.status === 'REJECTED' && !data.rejectionReason) {
      return false;
    }
    return true;
  },
  {
    message: 'APPROVED withdrawals require transaction signature, REJECTED withdrawals require rejection reason',
  }
);

/**
 * GET /api/withdrawals (query parameters)
 */
export const GetWithdrawalsQuerySchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED'])
    .optional(),
  asset: z.enum(['USDT', 'TAKARA'])
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
  CreateWithdrawalSchema,
  ProcessWithdrawalSchema,
  GetWithdrawalsQuerySchema,
};
