/**
 * LAIKA Boost Calculator Tests
 */

import {
  calculateLaikaBoost,
  calculateRequiredLaikaForAPY,
  validateLaikaBoost,
  getBoostRecommendation,
  MAX_APY_BY_TIER,
  LaikaBoostInput
} from '../../utils/laika.calculator';
import { VaultTier } from '../../config/vaults.config';

describe('LAIKA Boost Calculator', () => {
  describe('calculateLaikaBoost', () => {
    it('should calculate boost for Starter vault with full LAIKA', () => {
      const result = calculateLaikaBoost({
        baseAPY: 4,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaValueUSD: 900 // 90% of USDT
      });

      expect(result.maxLaikaValueUSD).toBe(900); // 1000 * 0.9
      expect(result.effectiveLaikaValueUSD).toBe(900);
      expect(result.boostFillPercent).toBe(100);
      expect(result.maxAPY).toBe(8);
      expect(result.boostRange).toBe(4); // 8 - 4
      expect(result.additionalAPY).toBe(4); // Full boost
      expect(result.finalAPY).toBe(8);
      expect(result.isFullBoost).toBe(true);
    });

    it('should calculate boost for Pro vault with partial LAIKA', () => {
      const result = calculateLaikaBoost({
        baseAPY: 5.5,
        tier: VaultTier.PRO,
        usdtInvested: 10000,
        laikaValueUSD: 4500 // 50% of max LAIKA
      });

      expect(result.maxLaikaValueUSD).toBe(9000); // 10000 * 0.9
      expect(result.effectiveLaikaValueUSD).toBe(4500);
      expect(result.boostFillPercent).toBe(50);
      expect(result.maxAPY).toBe(10);
      expect(result.boostRange).toBe(4.5); // 10 - 5.5
      expect(result.additionalAPY).toBe(2.25); // 4.5 * 0.5
      expect(result.finalAPY).toBe(7.75); // 5.5 + 2.25
      expect(result.isFullBoost).toBe(false);
    });

    it('should calculate boost for Elite vault with zero LAIKA', () => {
      const result = calculateLaikaBoost({
        baseAPY: 8,
        tier: VaultTier.ELITE,
        usdtInvested: 50000,
        laikaValueUSD: 0 // No LAIKA
      });

      expect(result.maxLaikaValueUSD).toBe(45000); // 50000 * 0.9
      expect(result.effectiveLaikaValueUSD).toBe(0);
      expect(result.boostFillPercent).toBe(0);
      expect(result.maxAPY).toBe(12);
      expect(result.boostRange).toBe(4); // 12 - 8
      expect(result.additionalAPY).toBe(0); // No boost
      expect(result.finalAPY).toBe(8);
      expect(result.isFullBoost).toBe(false);
    });

    it('should cap LAIKA at maximum (90% of USDT)', () => {
      const result = calculateLaikaBoost({
        baseAPY: 4,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaValueUSD: 1000 // Exceeds 90%
      });

      expect(result.maxLaikaValueUSD).toBe(900);
      expect(result.effectiveLaikaValueUSD).toBe(900); // Capped
      expect(result.boostFillPercent).toBe(100);
      expect(result.finalAPY).toBe(8); // Max APY
    });

    it('should calculate 25% boost fill correctly', () => {
      const result = calculateLaikaBoost({
        baseAPY: 4,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaValueUSD: 225 // 25% of max (900 * 0.25)
      });

      expect(result.boostFillPercent).toBe(25);
      expect(result.additionalAPY).toBe(1); // 4 * 0.25
      expect(result.finalAPY).toBe(5); // 4 + 1
    });

    it('should calculate 75% boost fill correctly', () => {
      const result = calculateLaikaBoost({
        baseAPY: 5.5,
        tier: VaultTier.PRO,
        usdtInvested: 10000,
        laikaValueUSD: 6750 // 75% of max (9000 * 0.75)
      });

      expect(result.boostFillPercent).toBe(75);
      expect(result.additionalAPY).toBe(3.38); // 4.5 * 0.75
      expect(result.finalAPY).toBe(8.88); // 5.5 + 3.38
    });
  });

  describe('calculateRequiredLaikaForAPY', () => {
    it('should calculate LAIKA needed for max APY', () => {
      const required = calculateRequiredLaikaForAPY(
        4, // base APY
        VaultTier.STARTER,
        1000, // USDT invested
        8 // desired APY (max)
      );

      expect(required).toBe(900); // Full max LAIKA
    });

    it('should calculate LAIKA needed for mid-range APY', () => {
      const required = calculateRequiredLaikaForAPY(
        4,
        VaultTier.STARTER,
        1000,
        6 // mid-range (halfway to 8%)
      );

      expect(required).toBe(450); // 50% of max LAIKA
    });

    it('should return 0 for base APY', () => {
      const required = calculateRequiredLaikaForAPY(
        4,
        VaultTier.STARTER,
        1000,
        4 // base APY
      );

      expect(required).toBe(0);
    });

    it('should return max LAIKA for APY above max', () => {
      const required = calculateRequiredLaikaForAPY(
        4,
        VaultTier.STARTER,
        1000,
        10 // above max (8%)
      );

      expect(required).toBe(900); // Max LAIKA
    });

    it('should calculate for Pro vault', () => {
      const required = calculateRequiredLaikaForAPY(
        5.5,
        VaultTier.PRO,
        10000,
        7.75 // 50% boost
      );

      expect(required).toBe(4500); // 50% of max LAIKA (9000)
    });

    it('should calculate for Elite vault', () => {
      const required = calculateRequiredLaikaForAPY(
        8,
        VaultTier.ELITE,
        50000,
        10 // halfway to 12%
      );

      expect(required).toBe(22500); // 50% of max LAIKA (45000)
    });
  });

  describe('validateLaikaBoost', () => {
    it('should validate correct input', () => {
      const validation = validateLaikaBoost({
        baseAPY: 4,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaValueUSD: 900
      });

      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
      expect(validation.warning).toBeUndefined();
    });

    it('should reject base APY >= max APY', () => {
      const validation = validateLaikaBoost({
        baseAPY: 8,
        tier: VaultTier.STARTER, // max APY is 8%
        usdtInvested: 1000,
        laikaValueUSD: 900
      });

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Base APY');
    });

    it('should reject negative USDT investment', () => {
      const validation = validateLaikaBoost({
        baseAPY: 4,
        tier: VaultTier.STARTER,
        usdtInvested: -1000,
        laikaValueUSD: 0
      });

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('USDT investment');
    });

    it('should reject zero USDT investment', () => {
      const validation = validateLaikaBoost({
        baseAPY: 4,
        tier: VaultTier.STARTER,
        usdtInvested: 0,
        laikaValueUSD: 0
      });

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('USDT investment');
    });

    it('should reject negative LAIKA value', () => {
      const validation = validateLaikaBoost({
        baseAPY: 4,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaValueUSD: -100
      });

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('LAIKA value');
    });

    it('should warn when LAIKA exceeds maximum', () => {
      const validation = validateLaikaBoost({
        baseAPY: 4,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaValueUSD: 1000 // Exceeds 90%
      });

      expect(validation.valid).toBe(true);
      expect(validation.warning).toBeDefined();
      expect(validation.warning).toContain('exceeds maximum');
    });

    it('should accept zero LAIKA', () => {
      const validation = validateLaikaBoost({
        baseAPY: 4,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaValueUSD: 0
      });

      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
      expect(validation.warning).toBeUndefined();
    });
  });

  describe('getBoostRecommendation', () => {
    it('should provide three boost options for Starter vault', () => {
      const recommendation = getBoostRecommendation(
        4,
        VaultTier.STARTER,
        1000
      );

      expect(recommendation.noBoost.apy).toBe(4);
      expect(recommendation.noBoost.laikaRequired).toBe(0);

      expect(recommendation.partialBoost.apy).toBe(6); // Midpoint: 4 + (8-4)/2
      expect(recommendation.partialBoost.laikaRequired).toBe(450); // 50% of 900

      expect(recommendation.fullBoost.apy).toBe(8);
      expect(recommendation.fullBoost.laikaRequired).toBe(900);
    });

    it('should provide boost options for Pro vault', () => {
      const recommendation = getBoostRecommendation(
        5.5,
        VaultTier.PRO,
        10000
      );

      expect(recommendation.noBoost.apy).toBe(5.5);
      expect(recommendation.noBoost.laikaRequired).toBe(0);

      expect(recommendation.partialBoost.apy).toBe(7.75); // 5.5 + (10-5.5)/2
      expect(recommendation.partialBoost.laikaRequired).toBe(4500); // 50% of 9000

      expect(recommendation.fullBoost.apy).toBe(10);
      expect(recommendation.fullBoost.laikaRequired).toBe(9000);
    });

    it('should provide boost options for Elite vault', () => {
      const recommendation = getBoostRecommendation(
        8,
        VaultTier.ELITE,
        50000
      );

      expect(recommendation.noBoost.apy).toBe(8);
      expect(recommendation.fullBoost.apy).toBe(12);
      expect(recommendation.fullBoost.laikaRequired).toBe(45000);
    });
  });

  describe('MAX_APY_BY_TIER constants', () => {
    it('should have correct max APY for Starter', () => {
      expect(MAX_APY_BY_TIER[VaultTier.STARTER]).toBe(8.0);
    });

    it('should have correct max APY for Pro', () => {
      expect(MAX_APY_BY_TIER[VaultTier.PRO]).toBe(10.0);
    });

    it('should have correct max APY for Elite', () => {
      expect(MAX_APY_BY_TIER[VaultTier.ELITE]).toBe(12.0);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle $1,000 Starter investment with full boost', () => {
      const result = calculateLaikaBoost({
        baseAPY: 4,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaValueUSD: 900
      });

      // At 8% APY for 12 months: $80 earnings
      // Without boost (4%): $40 earnings
      // Boost adds: $40 extra earnings
      expect(result.finalAPY).toBe(8);
      expect(result.additionalAPY).toBe(4);
    });

    it('should handle $10,000 Pro investment with partial boost', () => {
      const result = calculateLaikaBoost({
        baseAPY: 5.5,
        tier: VaultTier.PRO,
        usdtInvested: 10000,
        laikaValueUSD: 3000 // ~33% of max
      });

      expect(result.boostFillPercent).toBeCloseTo(33.33, 1);
      expect(result.additionalAPY).toBeCloseTo(1.5, 1); // 4.5 * 0.333
      expect(result.finalAPY).toBeCloseTo(7, 1);
    });

    it('should handle $50,000 Elite investment with no boost', () => {
      const result = calculateLaikaBoost({
        baseAPY: 8,
        tier: VaultTier.ELITE,
        usdtInvested: 50000,
        laikaValueUSD: 0
      });

      // At 8% APY for 36 months: $12,000 earnings
      // With full boost (12%): $18,000 earnings
      // Missing out on: $6,000 potential earnings
      expect(result.finalAPY).toBe(8);
      expect(result.additionalAPY).toBe(0);
      expect(result.maxAPY).toBe(12);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small investments', () => {
      const result = calculateLaikaBoost({
        baseAPY: 4,
        tier: VaultTier.STARTER,
        usdtInvested: 100,
        laikaValueUSD: 90
      });

      expect(result.maxLaikaValueUSD).toBe(90);
      expect(result.finalAPY).toBe(8);
    });

    it('should handle very large investments', () => {
      const result = calculateLaikaBoost({
        baseAPY: 8,
        tier: VaultTier.ELITE,
        usdtInvested: 100000,
        laikaValueUSD: 90000
      });

      expect(result.maxLaikaValueUSD).toBe(90000);
      expect(result.finalAPY).toBe(12);
    });

    it('should handle fractional LAIKA values', () => {
      const result = calculateLaikaBoost({
        baseAPY: 4,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaValueUSD: 337.50 // Random fraction
      });

      expect(result.boostFillPercent).toBeCloseTo(37.5, 1);
      expect(result.finalAPY).toBeGreaterThan(4);
      expect(result.finalAPY).toBeLessThan(8);
    });

    it('should handle minimum boost (1% of max)', () => {
      const result = calculateLaikaBoost({
        baseAPY: 4,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaValueUSD: 9 // 1% of max (900)
      });

      expect(result.boostFillPercent).toBe(1);
      expect(result.additionalAPY).toBe(0.04); // 4 * 0.01
      expect(result.finalAPY).toBe(4.04);
    });

    it('should handle maximum boost exactly', () => {
      const result = calculateLaikaBoost({
        baseAPY: 4,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaValueUSD: 900
      });

      expect(result.boostFillPercent).toBe(100);
      expect(result.finalAPY).toBe(8);
      expect(result.isFullBoost).toBe(true);
    });
  });

  describe('Boost Progression', () => {
    it('should show linear progression from 0% to 100%', () => {
      const increments = [0, 25, 50, 75, 100];
      const results = increments.map(percent => {
        return calculateLaikaBoost({
          baseAPY: 4,
          tier: VaultTier.STARTER,
          usdtInvested: 1000,
          laikaValueUSD: (900 * percent) / 100
        });
      });

      expect(results[0].finalAPY).toBe(4); // 0%
      expect(results[1].finalAPY).toBe(5); // 25%
      expect(results[2].finalAPY).toBe(6); // 50%
      expect(results[3].finalAPY).toBe(7); // 75%
      expect(results[4].finalAPY).toBe(8); // 100%

      // Verify linear progression
      results.forEach((result, index) => {
        expect(result.boostFillPercent).toBe(increments[index]);
      });
    });
  });

  describe('Cross-tier Comparisons', () => {
    it('should show higher max APY for higher tiers', () => {
      const starter = calculateLaikaBoost({
        baseAPY: 4,
        tier: VaultTier.STARTER,
        usdtInvested: 10000,
        laikaValueUSD: 9000
      });

      const pro = calculateLaikaBoost({
        baseAPY: 5.5,
        tier: VaultTier.PRO,
        usdtInvested: 10000,
        laikaValueUSD: 9000
      });

      const elite = calculateLaikaBoost({
        baseAPY: 8,
        tier: VaultTier.ELITE,
        usdtInvested: 10000,
        laikaValueUSD: 9000
      });

      expect(starter.finalAPY).toBeLessThan(pro.finalAPY);
      expect(pro.finalAPY).toBeLessThan(elite.finalAPY);
      expect(starter.maxAPY).toBe(8);
      expect(pro.maxAPY).toBe(10);
      expect(elite.maxAPY).toBe(12);
    });

    it('should show different boost ranges per tier', () => {
      const tiers = [
        { tier: VaultTier.STARTER, base: 4, expected: 4 }, // 8 - 4
        { tier: VaultTier.PRO, base: 5.5, expected: 4.5 }, // 10 - 5.5
        { tier: VaultTier.ELITE, base: 8, expected: 4 } // 12 - 8
      ];

      tiers.forEach(({ tier, base, expected }) => {
        const result = calculateLaikaBoost({
          baseAPY: base,
          tier,
          usdtInvested: 1000,
          laikaValueUSD: 0
        });

        expect(result.boostRange).toBe(expected);
      });
    });
  });
});
