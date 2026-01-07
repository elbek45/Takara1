/**
 * Takara Gold v2.7 - Vault Configuration
 *
 * 4 ELITE Vaults by Duration (max APY with boost):
 * - 18M: 7.6% base / 9.6% max → 14.4% total return
 * - 20M: 8.08% base / 10.08% max → 16.8% total return
 * - 30M: 15.6% base / 18.6% max → 46.5% total return
 * - 36M: 15.2% base / 19.2% max → 57.6% total return
 *
 * Tier offsets from ELITE: PRO -1%, BASIC -2%, STARTER -3%
 * Mining Threshold: $25,000 per vault
 * Min Investment: $300
 * Payout: Monthly
 */

export enum VaultTier {
  STARTER = 'STARTER',
  BASIC = 'BASIC',
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
 * 4 Vault configurations - one per duration
 */
export const VAULTS: VaultConfig[] = [
  // ==================== STARTER (18 Months) ====================
  {
    id: 1,
    name: 'Starter Vault 18M',
    tier: VaultTier.STARTER,
    duration: 18,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 300,
    maxInvestment: 999999999,
    baseAPY: 7.6,
    maxAPY: 9.6, // +2% max LAIKA boost, 14.4% total return
    takaraAPY: 75,
    miningPower: 75,
    requireTAKARA: false,
    takaraRatio: null,
    description: 'Entry-level 18-month vault with 7.6% APY, no TAKARA required'
  },

  // ==================== BEGINNER (20 Months) ====================
  {
    id: 2,
    name: 'Beginner Vault 20M',
    tier: VaultTier.STARTER, // Using STARTER tier in DB
    duration: 20,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 300,
    maxInvestment: 999999999,
    baseAPY: 8.08,
    maxAPY: 10.08, // +2% max LAIKA boost, 16.8% total return
    takaraAPY: 100,
    miningPower: 100,
    requireTAKARA: true,
    takaraRatio: 15, // 15 TAKARA per 100 USDT
    description: '20-month vault with 8.08% APY, requires 15 TAKARA per 100 USDT'
  },

  // ==================== PRO (30 Months) ====================
  {
    id: 3,
    name: 'Pro Vault 30M',
    tier: VaultTier.PRO,
    duration: 30,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 300,
    maxInvestment: 999999999,
    baseAPY: 15.6,
    maxAPY: 18.6, // +3% max LAIKA boost, 46.5% total return
    takaraAPY: 200,
    miningPower: 200,
    requireTAKARA: true,
    takaraRatio: 25, // 25 TAKARA per 100 USDT
    description: 'Pro 30-month vault with 15.6% APY, requires 25 TAKARA per 100 USDT'
  },

  // ==================== ELITE (36 Months) ====================
  {
    id: 4,
    name: 'Elite Vault 36M',
    tier: VaultTier.ELITE,
    duration: 36,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 300,
    maxInvestment: 999999999,
    baseAPY: 15.2,
    maxAPY: 19.2, // +4% max LAIKA boost, 57.6% total return
    takaraAPY: 350,
    miningPower: 350,
    requireTAKARA: true,
    takaraRatio: 40, // 40 TAKARA per 100 USDT
    description: 'Elite 36-month vault with 15.2% APY, requires 40 TAKARA per 100 USDT'
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
    [VaultTier.BASIC]: 'Basic',
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
