/**
 * Takara Gold v2.1.1 - Vault Configuration
 *
 * Defines all 9 Vault types across 3 tiers:
 * - 12M vaults: USDT only (no TAKARA required)
 * - 30M/36M PRO: USDT + 30 TAKARA per 100 USDT
 * - 30M/36M ELITE: USDT + 50 TAKARA per 100 USDT
 *
 * Max boost increases with tier and duration:
 * - STARTER: +2% to +2% (consistent across durations)
 * - PRO: +2.5% to +3% (increases with duration)
 * - ELITE: +3% to +4% (max boost for longest lock-up)
 */

export enum VaultTier {
  STARTER = 'STARTER',
  PRO = 'PRO',
  ELITE = 'ELITE'
}

export enum PayoutSchedule {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  END_OF_TERM = 'END_OF_TERM'
}

export interface VaultConfig {
  id: number;
  name: string;
  tier: VaultTier;
  duration: number; // months
  payoutSchedule: PayoutSchedule;
  minInvestment: number; // USDT
  maxInvestment: number; // USDT
  baseAPY: number; // percentage
  maxAPY: number; // max with LAIKA boost
  miningPower: number; // percentage (100 = baseline)
  requireTAKARA: boolean;
  takaraRatio: number | null; // TAKARA per 100 USDT (null if not required)
  description: string;
}

/**
 * All 9 Vault configurations as per specification v2.1.1
 */
export const VAULTS: VaultConfig[] = [
  // ==================== TIER 1: STARTER ====================
  {
    id: 1,
    name: 'Starter Vault 12M',
    tier: VaultTier.STARTER,
    duration: 12,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 100,
    maxInvestment: 10000,
    baseAPY: 4.0,
    maxAPY: 6.0, // +2% max LAIKA boost
    miningPower: 50,
    requireTAKARA: false,
    takaraRatio: null,
    description: 'Entry-level 12-month vault with monthly USDT payouts and base TAKARA mining'
  },
  {
    id: 2,
    name: 'Starter Vault 30M',
    tier: VaultTier.STARTER,
    duration: 30,
    payoutSchedule: PayoutSchedule.QUARTERLY,
    minInvestment: 100,
    maxInvestment: 30000,
    baseAPY: 5.0,
    maxAPY: 7.0, // +2% max LAIKA boost
    miningPower: 100, // Baseline
    requireTAKARA: false,
    takaraRatio: null,
    description: '30-month vault with quarterly payouts and standard TAKARA mining'
  },
  {
    id: 3,
    name: 'Starter Vault 36M',
    tier: VaultTier.STARTER,
    duration: 36,
    payoutSchedule: PayoutSchedule.END_OF_TERM,
    minInvestment: 100,
    maxInvestment: 50000,
    baseAPY: 6.0,
    maxAPY: 8.0, // +2% max LAIKA boost
    miningPower: 150,
    requireTAKARA: false,
    takaraRatio: null,
    description: 'Long-term 36-month vault with end-of-term payout and enhanced mining'
  },

  // ==================== TIER 2: PRO ====================
  {
    id: 4,
    name: 'Pro Vault 12M',
    tier: VaultTier.PRO,
    duration: 12,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 1000,
    maxInvestment: 50000,
    baseAPY: 4.5,
    maxAPY: 7.0, // +2.5% max LAIKA boost
    miningPower: 120,
    requireTAKARA: false, // 12M vaults don't require TAKARA
    takaraRatio: null,
    description: 'Pro 12-month vault with monthly payouts and boosted mining'
  },
  {
    id: 5,
    name: 'Pro Vault 30M',
    tier: VaultTier.PRO,
    duration: 30,
    payoutSchedule: PayoutSchedule.QUARTERLY,
    minInvestment: 1000,
    maxInvestment: 75000,
    baseAPY: 5.5,
    maxAPY: 8.5, // +3% max LAIKA boost
    miningPower: 170,
    requireTAKARA: true,
    takaraRatio: 30, // 30 TAKARA per 100 USDT
    description: 'Pro 30-month vault with superior mining power, requires TAKARA'
  },
  {
    id: 6,
    name: 'Pro Vault 36M',
    tier: VaultTier.PRO,
    duration: 36,
    payoutSchedule: PayoutSchedule.END_OF_TERM,
    minInvestment: 1000,
    maxInvestment: 100000,
    baseAPY: 7.0,
    maxAPY: 10.0, // +3% max LAIKA boost
    miningPower: 200,
    requireTAKARA: true,
    takaraRatio: 30, // 30 TAKARA per 100 USDT
    description: 'Long-term Pro vault with double mining power, requires TAKARA'
  },

  // ==================== TIER 3: ELITE ====================
  {
    id: 7,
    name: 'Elite Vault 12M',
    tier: VaultTier.ELITE,
    duration: 12,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 5000,
    maxInvestment: 500000,
    baseAPY: 5.0,
    maxAPY: 8.0, // +3% max LAIKA boost
    miningPower: 250,
    requireTAKARA: false, // 12M vaults don't require TAKARA
    takaraRatio: null,
    description: 'Elite 12-month vault for serious investors with premium mining'
  },
  {
    id: 8,
    name: 'Elite Vault 30M',
    tier: VaultTier.ELITE,
    duration: 30,
    payoutSchedule: PayoutSchedule.QUARTERLY,
    minInvestment: 5000,
    maxInvestment: 750000,
    baseAPY: 6.5,
    maxAPY: 10.0, // +3.5% max LAIKA boost
    miningPower: 300,
    requireTAKARA: true,
    takaraRatio: 50, // 50 TAKARA per 100 USDT
    description: 'Elite 30-month vault with triple mining power, requires TAKARA'
  },
  {
    id: 9,
    name: 'Elite Vault 36M',
    tier: VaultTier.ELITE,
    duration: 36,
    payoutSchedule: PayoutSchedule.END_OF_TERM,
    minInvestment: 5000,
    maxInvestment: 1000000,
    baseAPY: 8.0,
    maxAPY: 12.0, // +4% max LAIKA boost - MAXIMUM BOOST
    miningPower: 350, // MAXIMUM MINING POWER
    requireTAKARA: true,
    takaraRatio: 50, // 50 TAKARA per 100 USDT
    description: 'Ultimate Elite vault with maximum APY and mining power, requires TAKARA'
  }
];

/**
 * Get vault configuration by ID
 */
export function getVaultConfig(id: number): VaultConfig | undefined {
  return VAULTS.find(v => v.id === id);
}

/**
 * Get all vaults by tier
 */
export function getVaultsByTier(tier: VaultTier): VaultConfig[] {
  return VAULTS.filter(v => v.tier === tier);
}

/**
 * Get all vaults by duration
 */
export function getVaultsByDuration(duration: number): VaultConfig[] {
  return VAULTS.filter(v => v.duration === duration);
}

/**
 * Calculate required TAKARA for investment
 */
export function calculateRequiredTAKARA(vaultId: number, usdtAmount: number): number {
  const vault = getVaultConfig(vaultId);
  if (!vault || !vault.requireTAKARA || !vault.takaraRatio) {
    return 0;
  }
  // takaraRatio is per 100 USDT
  return (usdtAmount / 100) * vault.takaraRatio;
}

/**
 * Validate investment amount for vault
 */
export function validateInvestmentAmount(vaultId: number, usdtAmount: number): {
  valid: boolean;
  error?: string;
} {
  const vault = getVaultConfig(vaultId);

  if (!vault) {
    return { valid: false, error: 'Vault not found' };
  }

  if (usdtAmount < vault.minInvestment) {
    return {
      valid: false,
      error: `Minimum investment is $${vault.minInvestment} USDT`
    };
  }

  if (usdtAmount > vault.maxInvestment) {
    return {
      valid: false,
      error: `Maximum investment is $${vault.maxInvestment} USDT`
    };
  }

  return { valid: true };
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: VaultTier): string {
  const names = {
    [VaultTier.STARTER]: 'Starter',
    [VaultTier.PRO]: 'Pro',
    [VaultTier.ELITE]: 'Elite'
  };
  return names[tier];
}

/**
 * Get payout schedule display name
 */
export function getPayoutScheduleDisplayName(schedule: PayoutSchedule): string {
  const names = {
    [PayoutSchedule.MONTHLY]: 'Monthly',
    [PayoutSchedule.QUARTERLY]: 'Quarterly',
    [PayoutSchedule.END_OF_TERM]: 'End of Term'
  };
  return names[schedule];
}

export default VAULTS;
