/**
 * LAIKA Boost Calculator v2.4
 *
 * Implements the LAIKA boost mechanism with platform discount
 *
 * Key Rules:
 * 1. LAIKA market value = laikaAmount × laikaPrice (USDT)
 * 2. Platform applies 10% DISCOUNT: discounted value = market value × 0.90 (10% off)
 * 3. Max discounted value = USDT investment × 0.50 (max 50% of investment)
 * 4. Max APY depends on vault baseAPY and tier boost range
 * 5. LAIKA is returned to NFT owner at end of term
 *
 * Note: This calculator is used for estimations. Actual max APY comes from vault config.
 */

import { VaultTier } from '../config/vaults.config';

// Platform discount on LAIKA value
export const LAIKA_DISCOUNT_PERCENT = 10;

export interface LaikaBoostInput {
  baseAPY: number; // Base APY from vault
  maxAPY?: number; // Max APY from vault (if not provided, calculated from tier)
  tier: VaultTier; // Vault tier
  usdtInvested: number; // USDT investment amount
  laikaMarketValueUSD: number; // Market USD value of LAIKA deposited (before discount)
}

export interface LaikaBoostResult {
  laikaMarketValueUSD: number; // Market value of LAIKA (before discount)
  laikaDiscountPercent: number; // Platform discount percent (10%)
  laikaDiscountAmount: number; // Discount amount in USD
  laikaDiscountedValueUSD: number; // Value after 10% discount
  maxLaikaValueUSD: number; // Maximum LAIKA allowed (50% of USDT)
  effectiveLaikaValueUSD: number; // Actual LAIKA used for boost (min of discounted and max)
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
 * Updated Formula (v2.4 with 10% discount):
 * 1. laika_discount = laika_market_value × 0.10 (10% platform discount)
 * 2. laika_discounted_value = laika_market_value × 0.90 (after 10% discount)
 * 3. max_laika_value = usdt_invested × 0.50 (max 50% of investment)
 * 4. effective_laika = min(laika_discounted_value, max_laika_value)
 * 5. boost_fill_percent = (effective_laika / max_laika_value) × 100
 * 6. boost_range = max_apy - base_apy
 * 7. additional_apy = (boost_range × boost_fill_percent) / 100
 * 8. final_apy = base_apy + additional_apy
 * 9. final_apy = min(final_apy, max_apy)
 */
export function calculateLaikaBoost(input: LaikaBoostInput): LaikaBoostResult {
  const { baseAPY, maxAPY: inputMaxAPY, tier, usdtInvested, laikaMarketValueUSD } = input;

  // Use provided maxAPY or calculate default boost ranges
  // Note: This should always come from vault config in production
  const maxAPY = inputMaxAPY || baseAPY + 2; // Fallback only

  // Apply 10% platform discount to LAIKA value
  const laikaDiscountPercent = LAIKA_DISCOUNT_PERCENT;
  const laikaDiscountAmount = laikaMarketValueUSD * (laikaDiscountPercent / 100);
  const laikaDiscountedValueUSD = laikaMarketValueUSD - laikaDiscountAmount;

  // Maximum LAIKA value = 50% of USDT investment
  const maxLaikaValueUSD = usdtInvested * 0.50;

  // Effective LAIKA (discounted value cannot exceed maximum)
  const effectiveLaikaValueUSD = Math.min(laikaDiscountedValueUSD, maxLaikaValueUSD);

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
    laikaDiscountPercent,
    laikaDiscountAmount: Number(laikaDiscountAmount.toFixed(6)),
    laikaDiscountedValueUSD: Number(laikaDiscountedValueUSD.toFixed(6)),
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
 * Calculate required LAIKA for desired APY
 * @deprecated - Use calculateLaikaBoost with maxAPY parameter instead
 */
export function calculateRequiredLaikaForAPY(
  baseAPY: number,
  maxAPY: number,
  usdtInvested: number,
  desiredAPY: number
): number {
  const maxLaikaValueUSD = usdtInvested * 0.50;

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

  // Apply discount and check against maximum
  const laikaDiscountedValueUSD = laikaMarketValueUSD * 0.90; // After 10% discount
  const maxLaikaValueUSD = usdtInvested * 0.50;

  if (laikaDiscountedValueUSD > maxLaikaValueUSD) {
    return {
      valid: true,
      warning: `LAIKA discounted value ($${laikaDiscountedValueUSD.toFixed(2)}) exceeds maximum ($${maxLaikaValueUSD.toFixed(2)}). Only $${maxLaikaValueUSD.toFixed(2)} will be used for boost.`
    };
  }

  return { valid: true };
}

/**
 * Get boost recommendation for user
 * @deprecated - Use vault config maxAPY directly
 */
export function getBoostRecommendation(
  baseAPY: number,
  maxAPY: number,
  usdtInvested: number
): {
  noBoost: { apy: number; laikaRequired: number };
  partialBoost: { apy: number; laikaRequired: number };
  fullBoost: { apy: number; laikaRequired: number };
} {
  const maxLaikaValueUSD = usdtInvested * 0.50;

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
    `💎 LAIKA Market Value: $${result.laikaMarketValueUSD.toFixed(2)}`,
    `🎁 Platform Discount: -${result.laikaDiscountPercent}% ($${result.laikaDiscountAmount.toFixed(2)})`,
    `💰 Discounted Value: $${result.laikaDiscountedValueUSD.toFixed(2)}`,
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
