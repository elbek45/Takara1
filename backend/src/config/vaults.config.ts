/**
 * Takara Gold v2.3 - Vault Configuration (Updated)
 *
 * TAKARA Requirements:
 * - 18M vaults: STARTER & PRO = no TAKARA, ELITE = requires TAKARA
 * - 30M & 36M vaults: ALL require TAKARA
 * - TAKARA amount increases with Base APY (higher APY = more TAKARA)
 *
 * Max Boost (LAIKA):
 * - STARTER: +2% consistent
 * - PRO: +2.5% to +3%
 * - ELITE: +3% to +3.5% to +4%
 * - LAIKA Boost Limit: 50% of USDT investment value
 *
 * Max Investment: No limit (removed maxInvestment restriction)
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
  takaraAPY: number; // TAKARA mining APY percentage
  miningPower: number; // percentage (100 = baseline)
  requireTAKARA: boolean;
  takaraRatio: number | null; // TAKARA per 100 USDT (null if not required)
  description: string;
}

/**
 * All 9 Vault configurations as per specification v2.3
 */
export const VAULTS: VaultConfig[] = [
  // ==================== TIER 1: STARTER ====================
  {
    id: 1,
    name: 'Starter Vault 18M',
    tier: VaultTier.STARTER,
    duration: 18,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 100,
    maxInvestment: 999999999, // No limit
    baseAPY: 7.0,
    maxAPY: 9.0, // +2% max LAIKA boost
    takaraAPY: 75,
    miningPower: 75,
    requireTAKARA: false,
    takaraRatio: null,
    description: 'Entry-level 18-month vault with monthly USDT payouts, no TAKARA required'
  },
  {
    id: 2,
    name: 'Starter Vault 30M',
    tier: VaultTier.STARTER,
    duration: 30,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 100,
    maxInvestment: 999999999, // No limit
    baseAPY: 9.0,
    maxAPY: 11.0, // +2% max LAIKA boost
    takaraAPY: 100,
    miningPower: 100, // Baseline
    requireTAKARA: true,
    takaraRatio: 20, // 20 TAKARA per 100 USDT
    description: '30-month vault with monthly payouts, requires 20 TAKARA per 100 USDT'
  },
  {
    id: 3,
    name: 'Starter Vault 36M',
    tier: VaultTier.STARTER,
    duration: 36,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 100,
    maxInvestment: 999999999, // No limit
    baseAPY: 10.0,
    maxAPY: 12.0, // +2% max LAIKA boost
    takaraAPY: 150,
    miningPower: 150,
    requireTAKARA: true,
    takaraRatio: 35, // 35 TAKARA per 100 USDT
    description: 'Long-term 36-month vault with monthly payouts, requires 35 TAKARA per 100 USDT'
  },

  // ==================== TIER 2: PRO ====================
  {
    id: 4,
    name: 'Pro Vault 18M',
    tier: VaultTier.PRO,
    duration: 18,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 1000,
    maxInvestment: 999999999, // No limit
    baseAPY: 10.0,
    maxAPY: 12.5, // +2.5% max LAIKA boost
    takaraAPY: 150,
    miningPower: 120,
    requireTAKARA: false, // 18M Pro vault: no TAKARA required
    takaraRatio: null,
    description: 'Pro 18-month vault with monthly payouts, no TAKARA required'
  },
  {
    id: 5,
    name: 'Pro Vault 30M',
    tier: VaultTier.PRO,
    duration: 30,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 1000,
    maxInvestment: 999999999, // No limit
    baseAPY: 14.0,
    maxAPY: 17.0, // +3% max LAIKA boost
    takaraAPY: 250,
    miningPower: 170,
    requireTAKARA: true,
    takaraRatio: 30, // 30 TAKARA per 100 USDT
    description: 'Pro 30-month vault with superior mining power, requires 30 TAKARA per 100 USDT'
  },
  {
    id: 6,
    name: 'Pro Vault 36M',
    tier: VaultTier.PRO,
    duration: 36,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 1000,
    maxInvestment: 999999999, // No limit
    baseAPY: 16.0,
    maxAPY: 19.0, // +3% max LAIKA boost
    takaraAPY: 350,
    miningPower: 200,
    requireTAKARA: true,
    takaraRatio: 45, // 45 TAKARA per 100 USDT
    description: 'Long-term Pro vault with double mining power, requires 45 TAKARA per 100 USDT'
  },

  // ==================== TIER 3: ELITE ====================
  {
    id: 7,
    name: 'Elite Vault 18M',
    tier: VaultTier.ELITE,
    duration: 18,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 5000,
    maxInvestment: 999999999, // No limit
    baseAPY: 12.0,
    maxAPY: 15.0, // +3% max LAIKA boost
    takaraAPY: 200,
    miningPower: 250,
    requireTAKARA: true, // Elite 18M REQUIRES TAKARA (exception!)
    takaraRatio: 25, // 25 TAKARA per 100 USDT
    description: 'Elite 18-month vault for serious investors, requires 25 TAKARA per 100 USDT'
  },
  {
    id: 8,
    name: 'Elite Vault 30M',
    tier: VaultTier.ELITE,
    duration: 30,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 5000,
    maxInvestment: 999999999, // No limit
    baseAPY: 15.0,
    maxAPY: 18.5, // +3.5% max LAIKA boost
    takaraAPY: 300,
    miningPower: 300,
    requireTAKARA: true,
    takaraRatio: 40, // 40 TAKARA per 100 USDT
    description: 'Elite 30-month vault with triple mining power, requires 40 TAKARA per 100 USDT'
  },
  {
    id: 9,
    name: 'Elite Vault 36M',
    tier: VaultTier.ELITE,
    duration: 36,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 5000,
    maxInvestment: 999999999, // No limit
    baseAPY: 16.0,
    maxAPY: 20.0, // +4% max LAIKA boost - MAXIMUM BOOST (REDUCED TO 20%)
    takaraAPY: 450,
    miningPower: 350, // MAXIMUM MINING POWER
    requireTAKARA: true,
    takaraRatio: 50, // 50 TAKARA per 100 USDT
    description: 'Ultimate Elite vault with maximum APY and mining power, requires 50 TAKARA per 100 USDT'
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
