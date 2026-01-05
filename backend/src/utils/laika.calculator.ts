/**
 * LAIKA Boost Calculator v2.8
 *
 * Implements the LAIKA boost mechanism with platform x100 valuation
 * Specially for LAIKA the Cosmodog community!
 *
 * Key Rules:
 * 1. LAIKA market value = laikaAmount × laikaPrice (USDT) - fetched from DexScreener
 * 2. Platform values LAIKA x100 HIGHER: boost value = market value × 100
 *    Example: $1 worth of LAIKA at market = $100 boost value
 * 3. Max boost value = USDT investment × 0.50 (max 50% of investment)
 * 4. Max APY depends on vault baseAPY and tier boost range
 * 5. LAIKA is returned to NFT owner at end of term
 *
 * This means users need 100x LESS LAIKA to achieve the same boost!
 * Example: $1 worth of LAIKA at market price = $100 boost value
 */

import { VaultTier } from '../config/vaults.config';

// Platform values LAIKA x100 higher than market for boost (bonus for Cosmodog community!)
export const LAIKA_PREMIUM_PERCENT = 9900; // x100

export interface LaikaBoostInput {
  baseAPY: number;
  maxAPY?: number;
  tier: VaultTier;
  usdtInvested: number;
  laikaMarketValueUSD: number;
}

export interface LaikaBoostResult {
  laikaMarketValueUSD: number;
  laikaPremiumPercent: number;
  laikaBoostValueUSD: number;
  maxLaikaValueUSD: number;
  effectiveLaikaValueUSD: number;
  boostFillPercent: number;
  maxAPY: number;
  boostRange: number;
  additionalAPY: number;
  finalAPY: number;
  isFullBoost: boolean;
}

/**
 * Calculate the final APY with LAIKA boost
 * x100 multiplier for Cosmodog community!
 */
export function calculateLaikaBoost(input: LaikaBoostInput): LaikaBoostResult {
  const { baseAPY, maxAPY: inputMaxAPY, tier, usdtInvested, laikaMarketValueUSD } = input;

  const maxAPY = inputMaxAPY || baseAPY + 2;

  // Platform values LAIKA x100 higher - boost value = market * 100 (huge bonus!)
  const laikaPremiumPercent = LAIKA_PREMIUM_PERCENT;
  const laikaBoostValueUSD = laikaMarketValueUSD * 100; // x100 for Cosmodog community!

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
 * x100 multiplier - users need 100x LESS LAIKA!
 */
export function calculateRequiredLaikaForAPY(
  baseAPY: number,
  maxAPY: number,
  usdtInvested: number,
  desiredAPY: number
): number {
  const maxBoostValueUSD = usdtInvested * 0.50;

  if (desiredAPY >= maxAPY) {
    // For full boost: boostValue = marketValue * 100 = maxBoostValueUSD
    // marketValue = maxBoostValueUSD / 100
    return Number((maxBoostValueUSD / 100).toFixed(2));
  }

  if (desiredAPY <= baseAPY) {
    return 0;
  }

  const boostRange = maxAPY - baseAPY;
  const requiredBoost = desiredAPY - baseAPY;
  const boostFillPercent = (requiredBoost / boostRange) * 100;

  const requiredBoostValueUSD = (maxBoostValueUSD * boostFillPercent) / 100;

  // Convert boost value to market value (divide by 100 - need way less!)
  const requiredMarketValueUSD = requiredBoostValueUSD / 100;

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

  if (baseAPY >= maxAPY) {
    return {
      valid: false,
      error: `Base APY (${baseAPY}%) cannot be greater than or equal to max APY (${maxAPY}%)`
    };
  }

  if (usdtInvested <= 0) {
    return {
      valid: false,
      error: 'USDT investment must be greater than 0'
    };
  }

  if (laikaMarketValueUSD < 0) {
    return {
      valid: false,
      error: 'LAIKA value cannot be negative'
    };
  }

  // Calculate boost value (market * 100) and check against maximum
  const laikaBoostValueUSD = laikaMarketValueUSD * 100; // x100!
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
 * x100 multiplier - users need 100x LESS LAIKA!
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

  // For full boost: boostValue = marketValue * 100 = maxBoostValueUSD
  // marketValue = maxBoostValueUSD / 100 (need 100x less LAIKA!)
  const fullBoostMarketValue = maxBoostValueUSD / 100;

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
    `🐕 LAIKA Market Value: $${result.laikaMarketValueUSD.toFixed(2)}`,
    `📊 Platform Rate: x100 (9900% bonus for Cosmodog community!)`,
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
