/**
 * Takara Gold v2.5 - Vault Configuration
 *
 * Total Returns (with MAX boost):
 * - 18 Months: 11.6% total (max APY 7.73%)
 * - 30 Months: 55% total (max APY 22%)
 * - 36 Months: 60% total (max APY 20%)
 *
 * Base APY increases: STARTER < PRO < ELITE
 * Max APY is the ceiling for all tiers per duration
 */

export enum VaultTier {
  STARTER = 'STARTER',
  PRO = 'PRO',
  ELITE = 'ELITE'
}

export enum PayoutSchedule {
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  END_OF_TERM = 'END_OF_TERM'
}

export interface VaultConfig {
  id: number;
  name: string;
  tier: VaultTier;
  duration: number;
  payoutSchedule: PayoutSchedule;
  minInvestment: number;
  maxInvestment: number;
  baseAPY: number;
  maxAPY: number;
  takaraAPY: number;
  miningPower: number;
  requireTAKARA: boolean;
  takaraRatio: number | null;
  description: string;
}

export const VAULTS: VaultConfig[] = [
  // ==================== 18 MONTHS (11.6% total, max 7.73% APY) ====================
  {
    id: 1,
    name: 'Starter Vault 18M',
    tier: VaultTier.STARTER,
    duration: 18,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 100,
    maxInvestment: 999999999,
    baseAPY: 6.00,
    maxAPY: 7.73,
    takaraAPY: 75,
    miningPower: 75,
    requireTAKARA: false,
    takaraRatio: null,
    description: '18M, base 9% return, up to 11.6% with boost'
  },
  {
    id: 4,
    name: 'Pro Vault 18M',
    tier: VaultTier.PRO,
    duration: 18,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 1000,
    maxInvestment: 999999999,
    baseAPY: 6.50,
    maxAPY: 7.73,
    takaraAPY: 150,
    miningPower: 120,
    requireTAKARA: false,
    takaraRatio: null,
    description: '18M Pro, base 9.75% return, up to 11.6% with boost'
  },
  {
    id: 7,
    name: 'Elite Vault 18M',
    tier: VaultTier.ELITE,
    duration: 18,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 5000,
    maxInvestment: 999999999,
    baseAPY: 7.00,
    maxAPY: 7.73,
    takaraAPY: 200,
    miningPower: 250,
    requireTAKARA: true,
    takaraRatio: 25,
    description: '18M Elite, base 10.5% return, up to 11.6% with boost'
  },

  // ==================== 30 MONTHS (55% total, max 22% APY) ====================
  {
    id: 2,
    name: 'Starter Vault 30M',
    tier: VaultTier.STARTER,
    duration: 30,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 100,
    maxInvestment: 999999999,
    baseAPY: 17.00,
    maxAPY: 22.00,
    takaraAPY: 100,
    miningPower: 100,
    requireTAKARA: true,
    takaraRatio: 20,
    description: '30M, base 42.5% return, up to 55% with boost'
  },
  {
    id: 5,
    name: 'Pro Vault 30M',
    tier: VaultTier.PRO,
    duration: 30,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 1000,
    maxInvestment: 999999999,
    baseAPY: 19.00,
    maxAPY: 22.00,
    takaraAPY: 250,
    miningPower: 170,
    requireTAKARA: true,
    takaraRatio: 30,
    description: '30M Pro, base 47.5% return, up to 55% with boost'
  },
  {
    id: 8,
    name: 'Elite Vault 30M',
    tier: VaultTier.ELITE,
    duration: 30,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 5000,
    maxInvestment: 999999999,
    baseAPY: 21.00,
    maxAPY: 22.00,
    takaraAPY: 300,
    miningPower: 300,
    requireTAKARA: true,
    takaraRatio: 40,
    description: '30M Elite, base 52.5% return, up to 55% with boost'
  },

  // ==================== 36 MONTHS (60% total, max 20% APY) ====================
  {
    id: 3,
    name: 'Starter Vault 36M',
    tier: VaultTier.STARTER,
    duration: 36,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 100,
    maxInvestment: 999999999,
    baseAPY: 15.00,
    maxAPY: 20.00,
    takaraAPY: 150,
    miningPower: 150,
    requireTAKARA: true,
    takaraRatio: 35,
    description: '36M, base 45% return, up to 60% with boost'
  },
  {
    id: 6,
    name: 'Pro Vault 36M',
    tier: VaultTier.PRO,
    duration: 36,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 1000,
    maxInvestment: 999999999,
    baseAPY: 17.00,
    maxAPY: 20.00,
    takaraAPY: 350,
    miningPower: 200,
    requireTAKARA: true,
    takaraRatio: 45,
    description: '36M Pro, base 51% return, up to 60% with boost'
  },
  {
    id: 9,
    name: 'Elite Vault 36M',
    tier: VaultTier.ELITE,
    duration: 36,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 5000,
    maxInvestment: 999999999,
    baseAPY: 19.00,
    maxAPY: 20.00,
    takaraAPY: 450,
    miningPower: 350,
    requireTAKARA: true,
    takaraRatio: 50,
    description: '36M Elite, base 57% return, up to 60% with boost'
  },

  // ==================== TEST VAULT ====================
  {
    id: 10,
    name: 'Test Vault (Dev)',
    tier: VaultTier.STARTER,
    duration: 1,
    payoutSchedule: PayoutSchedule.DAILY,
    minInvestment: 1,
    maxInvestment: 999999999,
    baseAPY: 100.0,
    maxAPY: 100.0,
    takaraAPY: 9999,
    miningPower: 9999,
    requireTAKARA: true,
    takaraRatio: 100,
    description: 'TEST: 1 USDC min, daily payout, x9999 mining'
  }
];

export function getVaultConfig(id: number): VaultConfig | undefined {
  return VAULTS.find(v => v.id === id);
}

export function getVaultsByTier(tier: VaultTier): VaultConfig[] {
  return VAULTS.filter(v => v.tier === tier);
}

export function getVaultsByDuration(duration: number): VaultConfig[] {
  return VAULTS.filter(v => v.duration === duration);
}

export function calculateRequiredTAKARA(vaultId: number, usdtAmount: number): number {
  const vault = getVaultConfig(vaultId);
  if (!vault || !vault.requireTAKARA || !vault.takaraRatio) {
    return 0;
  }
  return (usdtAmount / 100) * vault.takaraRatio;
}

export function validateInvestmentAmount(vaultId: number, usdtAmount: number): {
  valid: boolean;
  error?: string;
} {
  const vault = getVaultConfig(vaultId);
  if (!vault) {
    return { valid: false, error: 'Vault not found' };
  }
  if (usdtAmount < vault.minInvestment) {
    return { valid: false, error: `Minimum investment is $${vault.minInvestment} USDT` };
  }
  return { valid: true };
}

export default VAULTS;
