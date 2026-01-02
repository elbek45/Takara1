/**
 * Frontend TypeScript Types
 * Matches backend API responses
 */

// ==================== ENUMS ====================

export enum VaultTier {
  STARTER = 'STARTER',
  PRO = 'PRO',
  ELITE = 'ELITE',
}

export enum PayoutSchedule {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  END_OF_TERM = 'END_OF_TERM',
}

export enum InvestmentStatus {
  PENDING = 'PENDING',
  PENDING_USDT = 'PENDING_USDT',     // Step 1: Waiting for USDT payment (MetaMask)
  PENDING_TOKENS = 'PENDING_TOKENS', // Step 2: USDT paid, waiting for LAIKA/TAKARA (Phantom)
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  WITHDRAWN = 'WITHDRAWN',
  SOLD = 'SOLD',
  CANCELLED = 'CANCELLED',
}

export enum TokenType {
  USDT = 'USDT',
  TAKARA = 'TAKARA',
  LAIKA = 'LAIKA',
}

// ==================== VAULT TYPES ====================

export interface Vault {
  id: string
  name: string
  tier: VaultTier
  duration: number // months
  payoutSchedule: PayoutSchedule
  minInvestment: number
  maxInvestment: number
  baseAPY: number
  maxAPY: number
  baseTakaraAPY: number // Base TAKARA mining APY
  maxTakaraAPY: number // Max TAKARA mining APY with boost
  requireTAKARA: boolean
  takaraRatio?: number
  currentFilled: number
  totalCapacity?: number
  miningThreshold?: number // Mining starts when currentFilled >= this (v2.3)
  isMining?: boolean // True when threshold reached (v2.3)
  acceptedPayments?: string // Comma-separated: USDT,TAKARA,TRX (v2.3)
  activeInvestments: number
}

export interface VaultWithStats extends Vault {
  stats?: {
    averageAPY: number
    totalTakaraMined: number
    recentInvestments: any[]
  }
}

// ==================== INVESTMENT TYPES ====================

export interface Investment {
  id: string
  vaultName: string
  vaultTier: VaultTier
  usdtAmount: number
  takaraLocked: number
  finalAPY: number
  startDate: string
  endDate: string
  status: InvestmentStatus
  totalEarnedUSDT: number
  totalMinedTAKARA: number
  pendingUSDT: number
  pendingTAKARA: number
  nftMintAddress?: string
  laikaBoost?: {
    laikaAmount: number
    additionalAPY: number
    isReturned: boolean
  }
  // v2.2: TAKARA boost support
  takaraBoost?: {
    takaraAmount: number
    takaraValueUSD: number
    maxAllowedUSD: number
    boostPercentage: number
    additionalAPY: number
    isReturned: boolean
  }
  // v2.2: Instant sale support
  instantSalePrice?: number
  isInstantSaleEnabled: boolean
  lastMiningDate?: string
}

export interface InvestmentCalculation {
  vault: {
    id: string
    name: string
    tier: VaultTier
    duration: number
  }
  investment: {
    usdtAmount: number
    requiredTAKARA: number
    laikaBoostUSD: number
    laikaToUsdtRate?: number
    laikaValueUSD?: number
    // v2.2 - LAIKA price and discount fields
    laikaAmount?: number
    laikaPrice?: number
    laikaMarketValueUSD?: number
    laikaDiscountPercent?: number
    laikaDiscountAmount?: number
    laikaDiscountedValueUSD?: number
  }
  laika?: {
    // LAIKA boost details
    maxBoostValue?: number
    currentBoostPercent?: number
  }
  earnings: {
    baseAPY: number
    laikaBoostAPY: number
    finalAPY: number
    totalUSDT: number
    monthlyUSDT: number
    payoutSchedule: PayoutSchedule
    numberOfPayouts: number
    payoutAmount: number
  }
  mining: {
    baseTakaraAPY: number // Base TAKARA mining APY
    maxTakaraAPY: number // Max TAKARA mining APY
    currentDifficulty: number
    dailyTAKARA: number
    monthlyTAKARA: number
    totalTAKARA: number
  }
  summary: {
    totalInvestment: number
    totalUSDTReturn: number
    totalTAKARAMined: number
    roi: string
  }
}

// ==================== MARKETPLACE TYPES ====================

export interface MarketplaceListing {
  id: string
  investmentId: string
  priceUSDT: number
  originalInvestment: number
  currentValue: number
  vault: {
    id: string
    name: string
    tier: VaultTier
    duration: number
  }
  finalAPY: number
  remainingMonths: number
  totalEarnedUSDT: number
  totalMinedTAKARA: number
  laikaBoost?: {
    laikaAmount: number
    additionalAPY: number
  }
  seller: {
    walletAddress: string
    username?: string
  }
  nftMintAddress?: string
  createdAt: string
  platformFee: number
}

// ==================== USER TYPES ====================

export interface User {
  id: string
  walletAddress?: string       // Solana (Phantom) - for TAKARA/LAIKA
  tronAddress?: string         // TRON (Trust Wallet) - for USDT
  ethereumAddress?: string     // Ethereum (MetaMask) - for USDT on ETH
  username?: string
  email?: string
  totalInvested: number
  totalEarnedUSDT: number
  totalMinedTAKARA: number
  createdAt: string
  lastLoginAt?: string
}

// ==================== CLAIM REQUEST TYPES (v2.2) ====================

export enum ClaimType {
  USDT = 'USDT',
  TAKARA = 'TAKARA',
}

export enum ClaimRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
}

export interface ClaimRequest {
  id: string
  claimType: ClaimType
  amount: number
  taxAmount: number
  amountAfterTax: number
  status: ClaimRequestStatus
  destinationWallet: string
  txSignature?: string
  rejectionReason?: string
  processedAt?: string
  createdAt: string
  user: {
    id: string
    username?: string
    walletAddress?: string
    tronAddress?: string
    email?: string
  }
  investment: {
    id: string
    usdtAmount: number
    status: InvestmentStatus
    vaultName: string
    vaultTier: VaultTier
  }
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ==================== AUTH TYPES ====================

export interface LoginResponse {
  success: boolean
  token: string
  user: User
}

export interface NonceResponse {
  success: boolean
  data: {
    nonce: string
    message: string
    expiresAt: string
  }
}

// ==================== DASHBOARD TYPES ====================

export interface DashboardStats {
  totalInvestments: number
  totalValueLocked: number
  totalEarnedUSDT: number
  totalMinedTAKARA: number
  activeInvestments: number
}

// ==================== FORM TYPES ====================

export type PaymentMethod = 'TAKARA' | 'USDT'

export interface CreateInvestmentInput {
  vaultId: string
  usdtAmount: number
  takaraAmount?: number
  laikaBoost?: {
    laikaAmount: number
    laikaValueUSD: number
  }
  txSignature: string
  paymentMethod?: PaymentMethod  // 'TAKARA' or 'USDT'
}

export interface CalculateInvestmentInput {
  usdtAmount: number
  laikaBoostUSD?: number
  laikaAmount?: number
}
