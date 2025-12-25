/**
 * LAIKA Boost Calculator v2.7
 *
 * Implements the LAIKA boost mechanism with platform PREMIUM valuation
 *
 * Key Rules:
 * 1. LAIKA market value = laikaAmount × laikaPrice (USDT) - fetched from DexScreener
 * 2. Platform values LAIKA 50% HIGHER: boost value = market value × 1.50
 *    Example: $100 worth of LAIKA at market = $150 boost value
 * 3. Max boost value = USDT investment × 0.50 (max 50% of investment)
 * 4. Max APY depends on vault baseAPY and tier boost range
 * 5. LAIKA is returned to NFT owner at end of term
 *
 * This means users need 50% LESS LAIKA to achieve the same boost!
 * Example: $100 worth of LAIKA at market price = $150 boost value
 *
 * Note: This calculator is used for estimations. Actual max APY comes from vault config.
 */

import { VaultTier } from '../config/vaults.config';

// Platform values LAIKA 50% higher than market for boost (bonus for users!)
export const LAIKA_PREMIUM_PERCENT = 50;

export interface LaikaBoostInput {
  baseAPY: number; // Base APY from vault
  maxAPY?: number; // Max APY from vault (if not provided, calculated from tier)
  tier: VaultTier; // Vault tier
  usdtInvested: number; // USDT investment amount
  laikaMarketValueUSD: number; // Market USD value of LAIKA deposited (before premium)
}

export interface LaikaBoostResult {
  laikaMarketValueUSD: number; // Market value of LAIKA (from DexScreener)
  laikaPremiumPercent: number; // Platform premium percent (50% more LAIKA required)
  laikaBoostValueUSD: number; // Boost value after platform rate (market / 1.5)
  maxLaikaValueUSD: number; // Maximum boost value allowed (50% of USDT)
  effectiveLaikaValueUSD: number; // Actual boost value used (min of boost and max)
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
 * Updated Formula (v2.7 - platform values LAIKA 50% higher):
 * 1. laika_boost_value = laika_market_value × 1.50 (50% bonus!)
 * 2. max_boost_value = usdt_invested × 0.50 (max 50% of investment)
 * 3. effective_laika = min(laika_boost_value, max_boost_value)
 * 4. boost_fill_percent = (effective_laika / max_boost_value) × 100
 * 5. boost_range = max_apy - base_apy
 * 6. additional_apy = (boost_range × boost_fill_percent) / 100
 * 7. final_apy = base_apy + additional_apy
 * 8. final_apy = min(final_apy, max_apy)
 */
export function calculateLaikaBoost(input: LaikaBoostInput): LaikaBoostResult {
  const { baseAPY, maxAPY: inputMaxAPY, tier, usdtInvested, laikaMarketValueUSD } = input;

  // Use provided maxAPY or calculate default boost ranges
  // Note: This should always come from vault config in production
  const maxAPY = inputMaxAPY || baseAPY + 2; // Fallback only

  // Platform values LAIKA 50% higher - boost value = market * 1.5 (bonus!)
  const laikaPremiumPercent = LAIKA_PREMIUM_PERCENT;
  const laikaBoostValueUSD = laikaMarketValueUSD * 1.50; // Boost value is MORE than market

  // Maximum boost value = 50% of USDT investment
  const maxLaikaValueUSD = usdtInvested * 0.50;

  // Effective boost value (cannot exceed maximum)
  const effectiveLaikaValueUSD = Math.min(laikaBoostValueUSD, maxLaikaValueUSD);

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
    laikaMarketValueUSD: Number(laikaMarketValueUSD.toFixed(6)),
    laikaPremiumPercent,
    laikaBoostValueUSD: Number(laikaBoostValueUSD.toFixed(6)),
    maxLaikaValueUSD: Number(maxLaikaValueUSD.toFixed(2)),
    effectiveLaikaValueUSD: Number(effectiveLaikaValueUSD.toFixed(6)),
    boostFillPercent: Number(boostFillPercent.toFixed(2)),
    maxAPY,
    boostRange: Number(boostRange.toFixed(2)),
    additionalAPY: Number(additionalAPY.toFixed(2)),
    finalAPY: Number(finalAPY.toFixed(2)),
    isFullBoost
  };
}

/**
 * Calculate required LAIKA (at market value) for desired APY
 * Platform values LAIKA 50% higher - users need LESS LAIKA!
 */
export function calculateRequiredLaikaForAPY(
  baseAPY: number,
  maxAPY: number,
  usdtInvested: number,
  desiredAPY: number
): number {
  const maxBoostValueUSD = usdtInvested * 0.50;

  // Cannot exceed max APY
  if (desiredAPY >= maxAPY) {
    // For full boost: boostValue = marketValue * 1.50 = maxBoostValueUSD
    // marketValue = maxBoostValueUSD / 1.50
    return Number((maxBoostValueUSD / 1.50).toFixed(2));
  }

  // Cannot be less than base APY
  if (desiredAPY <= baseAPY) {
    return 0;
  }

  // Calculate required boost percentage
  const boostRange = maxAPY - baseAPY;
  const requiredBoost = desiredAPY - baseAPY;
  const boostFillPercent = (requiredBoost / boostRange) * 100;

  // Calculate required boost value
  const requiredBoostValueUSD = (maxBoostValueUSD * boostFillPercent) / 100;

  // Convert boost value to market value (divide by 1.50 - need less!)
  const requiredMarketValueUSD = requiredBoostValueUSD / 1.50;

  return Number(requiredMarketValueUSD.toFixed(2));
}

/**
 * Validate LAIKA boost input
 */
export function validateLaikaBoost(input: LaikaBoostInput): {
  valid: boolean;
  error?: string;
  warning?: string;
} {
  const { baseAPY, maxAPY: inputMaxAPY, usdtInvested, laikaMarketValueUSD } = input;

  const maxAPY = inputMaxAPY || baseAPY + 2;

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

  // Validate LAIKA amount
  if (laikaMarketValueUSD < 0) {
    return {
      valid: false,
      error: 'LAIKA value cannot be negative'
    };
  }

  // Calculate boost value (market * 1.50) and check against maximum
  const laikaBoostValueUSD = laikaMarketValueUSD * 1.50; // 50% bonus!
  const maxBoostValueUSD = usdtInvested * 0.50;

  if (laikaBoostValueUSD > maxBoostValueUSD) {
    return {
      valid: true,
      warning: `LAIKA boost value ($${laikaBoostValueUSD.toFixed(2)}) exceeds maximum ($${maxBoostValueUSD.toFixed(2)}). Only $${maxBoostValueUSD.toFixed(2)} will be used for boost.`
    };
  }

  return { valid: true };
}

/**
 * Get boost recommendation for user
 * Shows how much LAIKA (at market value) is needed for different boost levels
 * Platform values LAIKA 50% higher - users need LESS LAIKA!
 */
export function getBoostRecommendation(
  baseAPY: number,
  maxAPY: number,
  usdtInvested: number
): {
  noBoost: { apy: number; laikaMarketValueRequired: number };
  partialBoost: { apy: number; laikaMarketValueRequired: number };
  fullBoost: { apy: number; laikaMarketValueRequired: number };
} {
  const maxBoostValueUSD = usdtInvested * 0.50;

  // For full boost: boostValue = marketValue * 1.50 = maxBoostValueUSD
  // marketValue = maxBoostValueUSD / 1.50 (need less LAIKA!)
  const fullBoostMarketValue = maxBoostValueUSD / 1.50;

  // Calculate mid-point boost (50%)
  const midAPY = baseAPY + ((maxAPY - baseAPY) / 2);
  const partialLaikaMarketValue = fullBoostMarketValue * 0.5;

  return {
    noBoost: {
      apy: baseAPY,
      laikaMarketValueRequired: 0
    },
    partialBoost: {
      apy: Number(midAPY.toFixed(2)),
      laikaMarketValueRequired: Number(partialLaikaMarketValue.toFixed(2))
    },
    fullBoost: {
      apy: maxAPY,
      laikaMarketValueRequired: Number(fullBoostMarketValue.toFixed(2))
    }
  };
}

/**
 * Format LAIKA boost result for display
 */
export function formatBoostResult(result: LaikaBoostResult): string {
  const lines = [
    `💎 LAIKA Market Value: $${result.laikaMarketValueUSD.toFixed(2)}`,
    `📊 Platform Rate: ${result.laikaPremiumPercent}% more LAIKA required`,
    `💰 Boost Value: $${result.laikaBoostValueUSD.toFixed(2)}`,
    ``,
    `📊 APY Boost:`,
    `   Base APY: ${result.finalAPY - result.additionalAPY}%`,
    `   LAIKA Boost: +${result.additionalAPY}%`,
    `   Final APY: ${result.finalAPY}%`,
    ``,
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
  formatBoostResult
};
