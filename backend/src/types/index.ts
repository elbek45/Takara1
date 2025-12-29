/**
 * Type definitions for Takara Gold
 */

import { Request } from 'express';
import { User, AdminUser } from '@prisma/client';

// ==================== REQUEST TYPES ====================

export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
}

export interface AdminRequest extends Request {
  admin?: AdminUser;
  adminId?: string;
}

// ==================== JWT PAYLOAD ====================

export interface JWTPayload {
  userId: string;
  walletAddress: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  iat?: number;
  exp?: number;
}

export interface AdminJWTPayload {
  adminId: string;
  username: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  iat?: number;
  exp?: number;
}

// ==================== AUTH TYPES ====================

export interface SignatureVerificationData {
  publicKey: string; // Solana wallet public key
  signature: string; // Base58 encoded signature
  message: string; // Message that was signed
  nonce: string; // Server-generated nonce
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    walletAddress?: string;
    username?: string;
    email?: string;
  };
}

export interface AdminLoginResponse {
  success: boolean;
  token: string;
  admin: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==================== INVESTMENT TYPES ====================

export type PaymentMethod = 'USDT' | 'TRX';

export interface CreateInvestmentInput {
  vaultId: string;
  usdtAmount: number;
  takaraAmount?: number;
  laikaBoost?: {
    laikaAmount: number;
    laikaValueUSD: number;
  };
  txSignature: string;
  paymentMethod?: PaymentMethod;  // 'USDT' or 'TRX' (default: 'USDT')
  trxAmount?: number;  // If paying with TRX, this is the TRX amount
}

export interface InvestmentWithDetails {
  id: string;
  vaultName: string;
  usdtAmount: number;
  takaraRequired: number;
  takaraLocked: number;
  finalAPY: number;
  startDate: Date;
  endDate: Date;
  status: string;
  totalEarnedUSDT: number;
  totalMinedTAKARA: number;
  pendingUSDT: number;
  pendingTAKARA: number;
  nftMintAddress?: string;
  laikaBoost?: {
    laikaAmount: number;
    laikaValueUSD: number;
    additionalAPY: number;
  };
}

// ==================== MARKETPLACE TYPES ====================

export interface CreateListingInput {
  investmentId: string;
  priceUSDT: number;
}

export interface MarketplaceListingWithDetails {
  id: string;
  investmentId: string;
  priceUSDT: number;
  originalInvestment: number;
  currentValue: number;
  vaultName: string;
  remainingMonths: number;
  finalAPY: number;
  totalMinedTAKARA: number;
  sellerAddress: string;
  createdAt: Date;
}

// ==================== VAULT TYPES ====================

export interface VaultWithStats {
  id: string;
  name: string;
  tier: string;
  duration: number;
  payoutSchedule: string;
  minInvestment: number;
  maxInvestment: number;
  baseAPY: number;
  maxAPY: number;
  baseTakaraAPY: number;
  maxTakaraAPY: number;
  requireTAKARA: boolean;
  takaraRatio?: number;
  currentFilled: number;
  totalCapacity?: number;
  activeInvestments: number;
}

// ==================== ADMIN TYPES ====================

export interface DashboardStats {
  totalUsers: number;
  totalInvestments: number;
  totalValueLocked: number;
  totalUSDTPaid: number;
  totalTAKARAMined: number;
  activeInvestments: number;
  pendingWithdrawals: number;
  marketplaceListings: number;
}

export interface ProcessWithdrawalInput {
  action: 'approve' | 'reject';
  txSignature?: string;
  rejectionReason?: string;
}

// ==================== MINING TYPES ====================

export interface MiningReward {
  investmentId: string;
  takaraAmount: number;
  difficulty: number;
  takaraAPY: number;
}

export interface DailyMiningResult {
  date: Date;
  totalMined: number;
  rewardsDistributed: number;
  newDifficulty: number;
  activeMiners: number;
}

// ==================== UTILITY TYPES ====================

export type SortOrder = 'asc' | 'desc';

export interface QueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  filter?: Record<string, any>;
}

export interface DateRange {
  from: Date;
  to: Date;
}
