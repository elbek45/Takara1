/**
 * TAKARA Boost Calculator v2.3
 *
 * Implements the TAKARA boost mechanism (NO DISCOUNT - uses full market value)
 *
 * Key Rules:
 * 1. TAKARA market value = takaraAmount × takaraPrice (USDT)
 * 2. TAKARA uses FULL market value (NO discount)
 * 3. Max TAKARA value = USDT investment × 0.90 (max 90% of investment)
 * 4. Max APY from vault config (updated in v2.2):
 *    - Pro 12M: 24% APY
 *    - Pro 30M: 41% APY
 *    - Pro 36M: 50% APY
 *    - Elite 12M: 30% APY
 *    - Elite 30M: 34% APY
 *    - Elite 36M: 38% APY
 * 5. TAKARA is returned to NFT owner at end of term
 */

import { VaultTier } from '../config/vaults.config';

// Maximum APY achievable with full TAKARA boost (v2.2 values)
// Note: These are defaults, actual values come from vault.maxAPY
export const MAX_APY_BY_TIER_DEFAULT = {
  [VaultTier.STARTER]: 10.0,  // Starter not updated yet
  [VaultTier.PRO]: 50.0,       // Pro 36M max
  [VaultTier.ELITE]: 38.0      // Elite 36M max
} as const;

export interface TakaraBoostInput {
  baseAPY: number; // Base APY from vault
  maxAPY: number;  // Max APY from vault (v2.2 updated values)
  tier: VaultTier; // Vault tier
  usdtInvested: number; // USDT investment amount
  takaraMarketValueUSD: number; // Market USD value of TAKARA deposited (before discount)
}

export interface TakaraBoostResult {
  takaraMarketValueUSD: number; // Market value of TAKARA (full market value)
  maxTakaraValueUSD: number; // Maximum TAKARA allowed (90% of USDT)
  effectiveTakaraValueUSD: number; // Actual TAKARA used for boost (min of market value and max)
  boostFillPercent: number; // How much of max boost is filled (0-100%)
  maxAPY: number; // Maximum APY for this vault
  boostRange: number; // APY range available for boost
  additionalAPY: number; // APY added by boost
  finalAPY: number; // Final APY after boost
  isFullBoost: boolean; // Whether max boost is achieved
}

/**
 * Calculate the final APY with TAKARA boost
 *
 * Formula (v2.3 - NO DISCOUNT, uses full market value):
 * 1. max_takara_value = usdt_invested × 0.90 (max 90% of investment)
 * 2. effective_takara = min(takara_market_value, max_takara_value)
 * 3. boost_fill_percent = (effective_takara / max_takara_value) × 100
 * 4. boost_range = maxAPY - base_apy
 * 5. additional_apy = (boost_range × boost_fill_percent) / 100
 * 6. final_apy = base_apy + additional_apy
 * 7. final_apy = min(final_apy, maxAPY)
 */
export function calculateTakaraBoost(input: TakaraBoostInput): TakaraBoostResult {
  const { baseAPY, maxAPY, tier, usdtInvested, takaraMarketValueUSD } = input;

  // Maximum TAKARA value = 90% of USDT investment
  const maxTakaraValueUSD = usdtInvested * 0.90;

  // Effective TAKARA (market value cannot exceed maximum)
  const effectiveTakaraValueUSD = Math.min(takaraMarketValueUSD, maxTakaraValueUSD);

  // Boost fill percentage (0-100%)
  const boostFillPercent = maxTakaraValueUSD > 0
    ? (effectiveTakaraValueUSD / maxTakaraValueUSD) * 100
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
    takaraMarketValueUSD: Number(takaraMarketValueUSD.toFixed(6)),
    maxTakaraValueUSD: Number(maxTakaraValueUSD.toFixed(2)),
    effectiveTakaraValueUSD: Number(effectiveTakaraValueUSD.toFixed(6)),
    boostFillPercent: Number(boostFillPercent.toFixed(2)),
    maxAPY,
    boostRange: Number(boostRange.toFixed(2)),
    additionalAPY: Number(additionalAPY.toFixed(2)),
    finalAPY: Number(finalAPY.toFixed(2)),
    isFullBoost
  };
}

/**
 * Calculate required TAKARA for desired APY
 */
export function calculateRequiredTakaraForAPY(
  baseAPY: number,
  maxAPY: number,
  usdtInvested: number,
  desiredAPY: number
): number {
  const maxTakaraValueUSD = usdtInvested * 0.90;

  // Cannot exceed max APY
  if (desiredAPY >= maxAPY) {
    return maxTakaraValueUSD;
  }

  // Cannot be less than base APY
  if (desiredAPY <= baseAPY) {
    return 0;
  }

  // Calculate required boost percentage
  const boostRange = maxAPY - baseAPY;
  const requiredBoost = desiredAPY - baseAPY;
  const boostFillPercent = (requiredBoost / boostRange) * 100;

  // Calculate required TAKARA value
  const requiredTakaraValueUSD = (maxTakaraValueUSD * boostFillPercent) / 100;

  return Number(requiredTakaraValueUSD.toFixed(2));
}

/**
 * Validate TAKARA boost input
 */
export function validateTakaraBoost(input: TakaraBoostInput): {
  valid: boolean;
  error?: string;
  warning?: string;
} {
  const { baseAPY, maxAPY, usdtInvested, takaraMarketValueUSD } = input;

  // Validate base APY
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

  // Validate TAKARA amount
  if (takaraMarketValueUSD < 0) {
    return {
      valid: false,
      error: 'TAKARA value cannot be negative'
    };
  }

  // Check against maximum (no discount applied)
  const maxTakaraValueUSD = usdtInvested * 0.90;

  if (takaraMarketValueUSD > maxTakaraValueUSD) {
    return {
      valid: true,
      warning: `TAKARA market value ($${takaraMarketValueUSD.toFixed(2)}) exceeds maximum ($${maxTakaraValueUSD.toFixed(2)}). Only $${maxTakaraValueUSD.toFixed(2)} will be used for boost.`
    };
  }

  return { valid: true };
}

/**
 * Get boost recommendation for user
 */
export function getBoostRecommendation(
  baseAPY: number,
  maxAPY: number,
  usdtInvested: number
): {
  noBoost: { apy: number; takaraRequired: number };
  partialBoost: { apy: number; takaraRequired: number };
  fullBoost: { apy: number; takaraRequired: number };
} {
  const maxTakaraValueUSD = usdtInvested * 0.90;

  // Calculate mid-point boost (50%)
  const midAPY = baseAPY + ((maxAPY - baseAPY) / 2);
  const partialTakara = maxTakaraValueUSD * 0.5;

  return {
    noBoost: {
      apy: baseAPY,
      takaraRequired: 0
    },
    partialBoost: {
      apy: Number(midAPY.toFixed(2)),
      takaraRequired: Number(partialTakara.toFixed(2))
    },
    fullBoost: {
      apy: maxAPY,
      takaraRequired: Number(maxTakaraValueUSD.toFixed(2))
    }
  };
}

/**
 * Format TAKARA boost result for display
 */
export function formatBoostResult(result: TakaraBoostResult): string {
  const lines = [
    `💎 TAKARA Market Value: $${result.takaraMarketValueUSD.toFixed(2)}`,
    `💰 Effective Value: $${result.effectiveTakaraValueUSD.toFixed(2)}`,
    ``,
    `📊 APY Boost:`,
    `   Base APY: ${result.finalAPY - result.additionalAPY}%`,
    `   TAKARA Boost: +${result.additionalAPY}%`,
    `   Final APY: ${result.finalAPY}%`,
    ``,
    `Boost Fill: ${result.boostFillPercent}%`,
    `Max APY: ${result.maxAPY}%`,
    result.isFullBoost ? '✅ FULL BOOST ACHIEVED!' : `⚡ ${(100 - result.boostFillPercent).toFixed(2)}% more boost available`
  ];
  return lines.join('\n');
}

/**
 * Calculate combined boost (LAIKA + TAKARA)
 *
 * When both boosts are applied:
 * 1. Calculate LAIKA boost first (platform values at 10% below market = 90%)
 * 2. Use LAIKA-boosted APY as base for TAKARA
 * 3. TAKARA boost adds on top (uses full market value, no discount)
 * 4. Final APY capped at vault maxAPY
 */
export function calculateCombinedBoost(params: {
  baseAPY: number;
  maxAPY: number;
  usdtInvested: number;
  laikaMarketValueUSD: number;
  takaraMarketValueUSD: number;
}): {
  laikaBoost: { additionalAPY: number; apyAfterLaika: number };
  takaraBoost: { additionalAPY: number; apyAfterTakara: number };
  totalAdditionalAPY: number;
  finalAPY: number;
} {
  const { baseAPY, maxAPY, usdtInvested, laikaMarketValueUSD, takaraMarketValueUSD } = params;

  // Step 1: Calculate LAIKA boost (platform values LAIKA 10% below market = 90%)
  const laikaDiscountedValue = laikaMarketValueUSD * 0.90;
  const maxBoostValue = usdtInvested * 0.90;
  const effectiveLaikaValue = Math.min(laikaDiscountedValue, maxBoostValue);
  const laikaBoostFill = maxBoostValue > 0 ? (effectiveLaikaValue / maxBoostValue) * 100 : 0;

  const boostRange = maxAPY - baseAPY;
  const laikaAdditionalAPY = (boostRange * laikaBoostFill) / 100;
  const apyAfterLaika = Math.min(baseAPY + laikaAdditionalAPY, maxAPY);

  // Step 2: Calculate TAKARA boost (on top of LAIKA, uses full market value)
  const effectiveTakaraValue = Math.min(takaraMarketValueUSD, maxBoostValue);
  const takaraBoostFill = maxBoostValue > 0 ? (effectiveTakaraValue / maxBoostValue) * 100 : 0;

  const remainingBoostRange = maxAPY - apyAfterLaika;
  const takaraAdditionalAPY = (remainingBoostRange * takaraBoostFill) / 100;
  const apyAfterTakara = Math.min(apyAfterLaika + takaraAdditionalAPY, maxAPY);

  return {
    laikaBoost: {
      additionalAPY: Number(laikaAdditionalAPY.toFixed(2)),
      apyAfterLaika: Number(apyAfterLaika.toFixed(2))
    },
    takaraBoost: {
      additionalAPY: Number(takaraAdditionalAPY.toFixed(2)),
      apyAfterTakara: Number(apyAfterTakara.toFixed(2))
    },
    totalAdditionalAPY: Number((laikaAdditionalAPY + takaraAdditionalAPY).toFixed(2)),
    finalAPY: Number(apyAfterTakara.toFixed(2))
  };
}

export default {
  calculateTakaraBoost,
  calculateRequiredTakaraForAPY,
  validateTakaraBoost,
  getBoostRecommendation,
  formatBoostResult,
  calculateCombinedBoost,
  MAX_APY_BY_TIER_DEFAULT
};
