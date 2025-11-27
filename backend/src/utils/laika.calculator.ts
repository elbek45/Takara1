/**
 * LAIKA Boost Calculator
 *
 * Implements the LAIKA boost mechanism as per specification v2.1.1
 *
 * Key Rules:
 * 1. LAIKA cost = USDT investment × 0.90 (max 90% of investment)
 * 2. Max APY by tier:
 *    - Tier 1 (Starter): 8% APY
 *    - Tier 2 (Pro): 10% APY
 *    - Tier 3 (Elite): 12% APY
 * 3. LAIKA is returned to NFT owner at end of term
 */

import { VaultTier } from '../config/vaults.config';

// Maximum APY achievable with full LAIKA boost
export const MAX_APY_BY_TIER = {
  [VaultTier.STARTER]: 8.0,
  [VaultTier.PRO]: 10.0,
  [VaultTier.ELITE]: 12.0
} as const;

export interface LaikaBoostInput {
  baseAPY: number; // Base APY from vault
  tier: VaultTier; // Vault tier
  usdtInvested: number; // USDT investment amount
  laikaValueUSD: number; // USD value of LAIKA deposited
}

export interface LaikaBoostResult {
  maxLaikaValueUSD: number; // Maximum LAIKA allowed (90% of USDT)
  effectiveLaikaValueUSD: number; // Actual LAIKA used (min of deposited and max)
  boostFillPercent: number; // How much of max boost is filled (0-100%)
  maxAPY: number; // Maximum APY for this tier
  boostRange: number; // APY range available for boost
  additionalAPY: number; // APY added by boost
  finalAPY: number; // Final APY after boost
  isFullBoost: boolean; // Whether max boost is achieved
}

/**
 * Calculate the final APY with LAIKA boost
 *
 * Formula:
 * 1. max_laika_value = usdt_invested × 0.90
 * 2. effective_laika = min(laika_deposited, max_laika_value)
 * 3. boost_fill_percent = (effective_laika / max_laika_value) × 100
 * 4. boost_range = MAX_APY[tier] - base_apy
 * 5. additional_apy = (boost_range × boost_fill_percent) / 100
 * 6. final_apy = base_apy + additional_apy
 * 7. final_apy = min(final_apy, MAX_APY[tier])
 */
export function calculateLaikaBoost(input: LaikaBoostInput): LaikaBoostResult {
  const { baseAPY, tier, usdtInvested, laikaValueUSD } = input;

  // Get maximum APY for this tier
  const maxAPY = MAX_APY_BY_TIER[tier];

  // Maximum LAIKA value = 90% of USDT investment
  const maxLaikaValueUSD = usdtInvested * 0.90;

  // Effective LAIKA (cannot exceed maximum)
  const effectiveLaikaValueUSD = Math.min(laikaValueUSD, maxLaikaValueUSD);

  // Boost fill percentage (0-100%)
  const boostFillPercent = maxLaikaValueUSD > 0
    ? (effectiveLaikaValueUSD / maxLaikaValueUSD) * 100
    : 0;

  // Available boost range
  const boostRange = maxAPY - baseAPY;

  // Additional APY from boost
  const additionalAPY = (boostRange * boostFillPercent) / 100;

  // Final APY (capped at max)
  let finalAPY = baseAPY + additionalAPY;
  finalAPY = Math.min(finalAPY, maxAPY);

  // Check if full boost is achieved
  const isFullBoost = finalAPY >= maxAPY;

  return {
    maxLaikaValueUSD,
    effectiveLaikaValueUSD,
    boostFillPercent: Number(boostFillPercent.toFixed(2)),
    maxAPY,
    boostRange: Number(boostRange.toFixed(2)),
    additionalAPY: Number(additionalAPY.toFixed(2)),
    finalAPY: Number(finalAPY.toFixed(2)),
    isFullBoost
  };
}

/**
 * Calculate required LAIKA for desired APY
 */
export function calculateRequiredLaikaForAPY(
  baseAPY: number,
  tier: VaultTier,
  usdtInvested: number,
  desiredAPY: number
): number {
  const maxAPY = MAX_APY_BY_TIER[tier];
  const maxLaikaValueUSD = usdtInvested * 0.90;

  // Cannot exceed max APY
  if (desiredAPY >= maxAPY) {
    return maxLaikaValueUSD;
  }

  // Cannot be less than base APY
  if (desiredAPY <= baseAPY) {
    return 0;
  }

  // Calculate required boost percentage
  const boostRange = maxAPY - baseAPY;
  const requiredBoost = desiredAPY - baseAPY;
  const boostFillPercent = (requiredBoost / boostRange) * 100;

  // Calculate required LAIKA value
  const requiredLaikaValueUSD = (maxLaikaValueUSD * boostFillPercent) / 100;

  return Number(requiredLaikaValueUSD.toFixed(2));
}

/**
 * Validate LAIKA boost input
 */
export function validateLaikaBoost(input: LaikaBoostInput): {
  valid: boolean;
  error?: string;
  warning?: string;
} {
  const { baseAPY, tier, usdtInvested, laikaValueUSD } = input;

  // Validate base APY
  const maxAPY = MAX_APY_BY_TIER[tier];
  if (baseAPY >= maxAPY) {
    return {
      valid: false,
      error: `Base APY (${baseAPY}%) cannot be greater than or equal to max APY (${maxAPY}%)`
    };
  }

  // Validate USDT amount
  if (usdtInvested <= 0) {
    return {
      valid: false,
      error: 'USDT investment must be greater than 0'
    };
  }

  // Validate LAIKA amount
  if (laikaValueUSD < 0) {
    return {
      valid: false,
      error: 'LAIKA value cannot be negative'
    };
  }

  // Warning if LAIKA exceeds maximum
  const maxLaikaValueUSD = usdtInvested * 0.90;
  if (laikaValueUSD > maxLaikaValueUSD) {
    return {
      valid: true,
      warning: `LAIKA value ($${laikaValueUSD}) exceeds maximum ($${maxLaikaValueUSD.toFixed(2)}). Only $${maxLaikaValueUSD.toFixed(2)} will be used for boost.`
    };
  }

  return { valid: true };
}

/**
 * Get boost recommendation for user
 */
export function getBoostRecommendation(
  baseAPY: number,
  tier: VaultTier,
  usdtInvested: number
): {
  noBoost: { apy: number; laikaRequired: number };
  partialBoost: { apy: number; laikaRequired: number };
  fullBoost: { apy: number; laikaRequired: number };
} {
  const maxAPY = MAX_APY_BY_TIER[tier];
  const maxLaikaValueUSD = usdtInvested * 0.90;

  // Calculate mid-point boost (50%)
  const midAPY = baseAPY + ((maxAPY - baseAPY) / 2);
  const partialLaika = maxLaikaValueUSD * 0.5;

  return {
    noBoost: {
      apy: baseAPY,
      laikaRequired: 0
    },
    partialBoost: {
      apy: Number(midAPY.toFixed(2)),
      laikaRequired: Number(partialLaika.toFixed(2))
    },
    fullBoost: {
      apy: maxAPY,
      laikaRequired: Number(maxLaikaValueUSD.toFixed(2))
    }
  };
}

/**
 * Format LAIKA boost result for display
 */
export function formatBoostResult(result: LaikaBoostResult): string {
  const lines = [
    `Base APY: ${result.finalAPY - result.additionalAPY}%`,
    `LAIKA Boost: +${result.additionalAPY}%`,
    `Final APY: ${result.finalAPY}%`,
    `Boost Fill: ${result.boostFillPercent}%`,
    `Max APY: ${result.maxAPY}%`,
    result.isFullBoost ? '✅ FULL BOOST ACHIEVED!' : `⚡ ${(100 - result.boostFillPercent).toFixed(2)}% more boost available`
  ];
  return lines.join('\n');
}

export default {
  calculateLaikaBoost,
  calculateRequiredLaikaForAPY,
  validateLaikaBoost,
  getBoostRecommendation,
  formatBoostResult,
  MAX_APY_BY_TIER
};
