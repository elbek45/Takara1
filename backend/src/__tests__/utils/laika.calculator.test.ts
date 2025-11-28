/**
 * LAIKA Boost Calculator Tests
 */

import {
  calculateLaikaBoost,
  calculateRequiredLAIKA,
  getLaikaRecommendation,
  validateLaikaBoost,
  calculateMaxLaikaForVault,
} from '../../utils/laika.calculator';
import { VaultTier } from '../../types';

describe('LAIKA Boost Calculator', () => {
  describe('calculateLaikaBoost', () => {
    it('should calculate correct APY boost for Starter tier', () => {
      const result = calculateLaikaBoost({
        baseAPY: 4,
        maxAPY: 8,
        usdtAmount: 10000,
        laikaBoostUSD: 9000, // 90% (max)
      });

      expect(result.finalAPY).toBe(8); // Max APY reached
      expect(result.boostPercentage).toBe(100);
      expect(result.additionalAPY).toBe(4);
    });

    it('should calculate correct APY boost for Pro tier', () => {
      const result = calculateLaikaBoost({
        baseAPY: 5.5,
        maxAPY: 10,
        usdtAmount: 10000,
        laikaBoostUSD: 4500, // 45% boost
      });

      expect(result.finalAPY).toBe(7.75); // 5.5 + (10-5.5)*0.5
      expect(result.boostPercentage).toBe(50);
      expect(result.additionalAPY).toBe(2.25);
    });

    it('should calculate correct APY boost for Elite tier', () => {
      const result = calculateLaikaBoost({
        baseAPY: 8,
        maxAPY: 12,
        usdtAmount: 10000,
        laikaBoostUSD: 9000, // 90% boost
      });

      expect(result.finalAPY).toBe(12); // Max APY
      expect(result.boostPercentage).toBe(100);
      expect(result.additionalAPY).toBe(4);
    });

    it('should handle zero LAIKA boost', () => {
      const result = calculateLaikaBoost({
        baseAPY: 6,
        maxAPY: 10,
        usdtAmount: 10000,
        laikaBoostUSD: 0,
      });

      expect(result.finalAPY).toBe(6); // Base APY only
      expect(result.boostPercentage).toBe(0);
      expect(result.additionalAPY).toBe(0);
    });

    it('should cap boost at max APY', () => {
      const result = calculateLaikaBoost({
        baseAPY: 4,
        maxAPY: 8,
        usdtAmount: 10000,
        laikaBoostUSD: 10000, // More than 90%
      });

      expect(result.finalAPY).toBeLessThanOrEqual(8);
    });

    it('should handle fractional values correctly', () => {
      const result = calculateLaikaBoost({
        baseAPY: 5.5,
        maxAPY: 10,
        usdtAmount: 7534,
        laikaBoostUSD: 2345.67,
      });

      expect(result.finalAPY).toBeGreaterThan(5.5);
      expect(result.finalAPY).toBeLessThanOrEqual(10);
      expect(result.additionalAPY).toBeGreaterThan(0);
    });
  });

  describe('calculateRequiredLAIKA', () => {
    it('should calculate LAIKA needed for target APY', () => {
      const required = calculateRequiredLAIKA({
        baseAPY: 4,
        maxAPY: 8,
        targetAPY: 6, // Halfway
        usdtAmount: 10000,
      });

      expect(required).toBe(4500); // 50% boost = $4,500 LAIKA
    });

    it('should return 0 if target APY equals base APY', () => {
      const required = calculateRequiredLAIKA({
        baseAPY: 5,
        maxAPY: 10,
        targetAPY: 5,
        usdtAmount: 10000,
      });

      expect(required).toBe(0);
    });

    it('should cap at max LAIKA (90% of USDT)', () => {
      const required = calculateRequiredLAIKA({
        baseAPY: 4,
        maxAPY: 8,
        targetAPY: 8, // Max APY
        usdtAmount: 10000,
      });

      expect(required).toBe(9000); // 90% of $10,000
    });

    it('should return null if target APY exceeds max APY', () => {
      const required = calculateRequiredLAIKA({
        baseAPY: 4,
        maxAPY: 8,
        targetAPY: 10, // Impossible
        usdtAmount: 10000,
      });

      expect(required).toBeNull();
    });
  });

  describe('getLaikaRecommendation', () => {
    it('should recommend "none" for 0 boost', () => {
      const recommendation = getLaikaRecommendation({
        baseAPY: 4,
        maxAPY: 8,
        usdtAmount: 10000,
        laikaBoostUSD: 0,
      });

      expect(recommendation.level).toBe('none');
      expect(recommendation.boostFillPercentage).toBe(0);
    });

    it('should recommend "partial" for <90% boost', () => {
      const recommendation = getLaikaRecommendation({
        baseAPY: 4,
        maxAPY: 8,
        usdtAmount: 10000,
        laikaBoostUSD: 4000, // ~44%
      });

      expect(recommendation.level).toBe('partial');
      expect(recommendation.boostFillPercentage).toBeGreaterThan(40);
      expect(recommendation.boostFillPercentage).toBeLessThan(50);
    });

    it('should recommend "full" for 90%+ boost', () => {
      const recommendation = getLaikaRecommendation({
        baseAPY: 4,
        maxAPY: 8,
        usdtAmount: 10000,
        laikaBoostUSD: 9000, // 90%
      });

      expect(recommendation.level).toBe('full');
      expect(recommendation.boostFillPercentage).toBe(100);
    });
  });

  describe('validateLaikaBoost', () => {
    it('should accept valid LAIKA amounts', () => {
      const validation = validateLaikaBoost({
        usdtAmount: 10000,
        laikaBoostUSD: 5000,
      });

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should reject negative LAIKA amounts', () => {
      const validation = validateLaikaBoost({
        usdtAmount: 10000,
        laikaBoostUSD: -100,
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('LAIKA boost cannot be negative');
    });

    it('should reject LAIKA > 90% of USDT', () => {
      const validation = validateLaikaBoost({
        usdtAmount: 10000,
        laikaBoostUSD: 9500, // 95% (too much)
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('LAIKA boost cannot exceed 90% of USDT amount');
    });

    it('should warn about suboptimal boost', () => {
      const validation = validateLaikaBoost({
        usdtAmount: 10000,
        laikaBoostUSD: 1000, // Only 10%
      });

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Consider adding more LAIKA for higher APY');
    });
  });

  describe('calculateMaxLaikaForVault', () => {
    it('should calculate max LAIKA for Starter vault', () => {
      const maxLaika = calculateMaxLaikaForVault({
        tier: 'STARTER' as VaultTier,
        usdtAmount: 10000,
      });

      expect(maxLaika).toBe(9000); // 90% of $10,000
    });

    it('should calculate max LAIKA for Elite vault', () => {
      const maxLaika = calculateMaxLaikaForVault({
        tier: 'ELITE' as VaultTier,
        usdtAmount: 50000,
      });

      expect(maxLaika).toBe(45000); // 90% of $50,000
    });

    it('should handle fractional amounts', () => {
      const maxLaika = calculateMaxLaikaForVault({
        tier: 'PRO' as VaultTier,
        usdtAmount: 7534.25,
      });

      expect(maxLaika).toBeCloseTo(6780.825, 2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum investment amounts', () => {
      const result = calculateLaikaBoost({
        baseAPY: 4,
        maxAPY: 8,
        usdtAmount: 100, // Minimum
        laikaBoostUSD: 90,
      });

      expect(result.finalAPY).toBe(8);
      expect(result.boostPercentage).toBe(100);
    });

    it('should handle maximum investment amounts', () => {
      const result = calculateLaikaBoost({
        baseAPY: 8,
        maxAPY: 12,
        usdtAmount: 100000, // Large amount
        laikaBoostUSD: 90000,
      });

      expect(result.finalAPY).toBe(12);
      expect(result.boostPercentage).toBe(100);
    });

    it('should handle very small LAIKA amounts', () => {
      const result = calculateLaikaBoost({
        baseAPY: 6,
        maxAPY: 10,
        usdtAmount: 10000,
        laikaBoostUSD: 0.01, // Tiny amount
      });

      expect(result.finalAPY).toBeGreaterThan(6);
      expect(result.boostPercentage).toBeGreaterThan(0);
      expect(result.boostPercentage).toBeLessThan(0.01);
    });
  });
});
