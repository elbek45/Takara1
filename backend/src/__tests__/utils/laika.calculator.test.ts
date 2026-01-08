/**
 * LAIKA Boost Calculator Tests v2.9
 * Updated for x2 platform valuation system
 */

import {
  calculateLaikaBoost,
  calculateRequiredLaikaForAPY,
  validateLaikaBoost,
  getBoostRecommendation,
  LAIKA_PREMIUM_PERCENT,
  LaikaBoostInput
} from '../../utils/laika.calculator';
import { VaultTier } from '../../config/vaults.config';

describe('LAIKA Boost Calculator v2.9', () => {
  describe('calculateLaikaBoost with x2 multiplier', () => {
    it('should calculate boost for Starter vault with full LAIKA (x2 platform value)', () => {
      // With x2: $250 market value = $500 boost value = 100% of max ($500 = 50% of $1000)
      const result = calculateLaikaBoost({
        baseAPY: 4,
        maxAPY: 8,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaMarketValueUSD: 250 // Market value, platform values at x2 = $500
      });

      expect(result.laikaMarketValueUSD).toBe(250);
      expect(result.laikaPremiumPercent).toBe(100); // x2
      expect(result.laikaBoostValueUSD).toBe(500); // 250 * 2
      expect(result.maxLaikaValueUSD).toBe(500); // 1000 * 0.5
      expect(result.effectiveLaikaValueUSD).toBe(500);
      expect(result.boostFillPercent).toBe(100);
      expect(result.finalAPY).toBe(8);
      expect(result.isFullBoost).toBe(true);
    });

    it('should calculate boost for Pro vault with partial LAIKA', () => {
      // $500 market = $1000 boost value, max boost = $5000 (50% of $10000)
      // Fill = 1000/5000 = 20%
      const result = calculateLaikaBoost({
        baseAPY: 5.5,
        maxAPY: 10,
        tier: VaultTier.PRO,
        usdtInvested: 10000,
        laikaMarketValueUSD: 500 // x2 = $1000 boost
      });

      expect(result.maxLaikaValueUSD).toBe(5000); // 10000 * 0.5
      expect(result.laikaBoostValueUSD).toBe(1000); // 500 * 2
      expect(result.effectiveLaikaValueUSD).toBe(1000);
      expect(result.boostFillPercent).toBe(20);
      expect(result.boostRange).toBe(4.5); // 10 - 5.5
      expect(result.additionalAPY).toBe(0.9); // 4.5 * 0.2
      expect(result.finalAPY).toBe(6.4); // 5.5 + 0.9
      expect(result.isFullBoost).toBe(false);
    });

    it('should calculate boost for Elite vault with zero LAIKA', () => {
      const result = calculateLaikaBoost({
        baseAPY: 8,
        maxAPY: 12,
        tier: VaultTier.ELITE,
        usdtInvested: 50000,
        laikaMarketValueUSD: 0
      });

      expect(result.maxLaikaValueUSD).toBe(25000); // 50000 * 0.5
      expect(result.effectiveLaikaValueUSD).toBe(0);
      expect(result.boostFillPercent).toBe(0);
      expect(result.additionalAPY).toBe(0);
      expect(result.finalAPY).toBe(8);
      expect(result.isFullBoost).toBe(false);
    });

    it('should cap LAIKA boost at maximum (50% of USDT)', () => {
      // $500 market = $1000 boost, max = $500 (50% of $1000)
      const result = calculateLaikaBoost({
        baseAPY: 4,
        maxAPY: 8,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaMarketValueUSD: 500 // x2 = $1000, but max is $500
      });

      expect(result.laikaBoostValueUSD).toBe(1000);
      expect(result.effectiveLaikaValueUSD).toBe(500); // Capped
      expect(result.boostFillPercent).toBe(100);
      expect(result.finalAPY).toBe(8);
    });

    it('should use default maxAPY when not provided', () => {
      const result = calculateLaikaBoost({
        baseAPY: 10,
        tier: VaultTier.ELITE,
        usdtInvested: 1000,
        laikaMarketValueUSD: 250 // x2 = $500 = 100% boost
      });

      expect(result.maxAPY).toBe(12); // 10 + 2 (default)
      expect(result.boostRange).toBe(2);
    });
  });

  describe('calculateRequiredLaikaForAPY with x2', () => {
    it('should calculate LAIKA market value needed for max APY', () => {
      // For full boost: need $500 boost value = $250 market value (x2)
      const required = calculateRequiredLaikaForAPY(
        4, // base APY
        8, // max APY
        1000, // USDT invested
        8 // desired APY (max)
      );

      expect(required).toBe(250); // Market value (platform values x2)
    });

    it('should calculate LAIKA needed for mid-range APY', () => {
      // 50% boost needs $250 boost = $125 market value
      const required = calculateRequiredLaikaForAPY(
        4,
        8,
        1000,
        6 // mid-range (halfway to 8%)
      );

      expect(required).toBe(125); // 50% of 250
    });

    it('should return 0 for base APY', () => {
      const required = calculateRequiredLaikaForAPY(
        4,
        8,
        1000,
        4 // base APY
      );

      expect(required).toBe(0);
    });

    it('should return max LAIKA for APY above max', () => {
      const required = calculateRequiredLaikaForAPY(
        4,
        8,
        1000,
        10 // above max (8%)
      );

      expect(required).toBe(250); // Max market value needed
    });
  });

  describe('validateLaikaBoost', () => {
    it('should validate correct input', () => {
      const validation = validateLaikaBoost({
        baseAPY: 4,
        maxAPY: 8,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaMarketValueUSD: 250
      });

      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('should reject base APY >= max APY', () => {
      const validation = validateLaikaBoost({
        baseAPY: 8,
        maxAPY: 8,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaMarketValueUSD: 250
      });

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Base APY');
    });

    it('should reject negative USDT investment', () => {
      const validation = validateLaikaBoost({
        baseAPY: 4,
        maxAPY: 8,
        tier: VaultTier.STARTER,
        usdtInvested: -1000,
        laikaMarketValueUSD: 0
      });

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('USDT investment');
    });

    it('should reject zero USDT investment', () => {
      const validation = validateLaikaBoost({
        baseAPY: 4,
        maxAPY: 8,
        tier: VaultTier.STARTER,
        usdtInvested: 0,
        laikaMarketValueUSD: 0
      });

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('USDT investment');
    });

    it('should reject negative LAIKA value', () => {
      const validation = validateLaikaBoost({
        baseAPY: 4,
        maxAPY: 8,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaMarketValueUSD: -100
      });

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('LAIKA value');
    });

    it('should warn when LAIKA boost exceeds maximum', () => {
      // $300 market = $600 boost, max = $500
      const validation = validateLaikaBoost({
        baseAPY: 4,
        maxAPY: 8,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaMarketValueUSD: 300
      });

      expect(validation.valid).toBe(true);
      expect(validation.warning).toBeDefined();
      expect(validation.warning).toContain('exceeds maximum');
    });

    it('should accept zero LAIKA', () => {
      const validation = validateLaikaBoost({
        baseAPY: 4,
        maxAPY: 8,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaMarketValueUSD: 0
      });

      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });
  });

  describe('getBoostRecommendation with x2', () => {
    it('should provide three boost options for Starter vault', () => {
      const recommendation = getBoostRecommendation(
        4, // base
        8, // max
        1000 // USDT
      );

      expect(recommendation.noBoost.apy).toBe(4);
      expect(recommendation.noBoost.laikaMarketValueRequired).toBe(0);

      expect(recommendation.partialBoost.apy).toBe(6); // Midpoint
      expect(recommendation.partialBoost.laikaMarketValueRequired).toBe(125); // 50% of 250

      expect(recommendation.fullBoost.apy).toBe(8);
      expect(recommendation.fullBoost.laikaMarketValueRequired).toBe(250); // $500/2
    });

    it('should provide boost options for Pro vault', () => {
      const recommendation = getBoostRecommendation(
        5.5,
        10,
        10000
      );

      expect(recommendation.noBoost.apy).toBe(5.5);
      expect(recommendation.noBoost.laikaMarketValueRequired).toBe(0);

      expect(recommendation.fullBoost.apy).toBe(10);
      expect(recommendation.fullBoost.laikaMarketValueRequired).toBe(2500); // $5000/2
    });

    it('should provide boost options for Elite vault', () => {
      const recommendation = getBoostRecommendation(
        8,
        12,
        50000
      );

      expect(recommendation.noBoost.apy).toBe(8);
      expect(recommendation.fullBoost.apy).toBe(12);
      expect(recommendation.fullBoost.laikaMarketValueRequired).toBe(12500); // $25000/2
    });
  });

  describe('LAIKA_PREMIUM_PERCENT constant', () => {
    it('should be 100% (x2 multiplier)', () => {
      expect(LAIKA_PREMIUM_PERCENT).toBe(100);
    });
  });

  describe('Real-world Scenarios with x2', () => {
    it('should handle $1,000 Starter investment with full boost', () => {
      // Need only $250 market value for full boost (x2 = $500)
      const result = calculateLaikaBoost({
        baseAPY: 4,
        maxAPY: 8,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaMarketValueUSD: 250
      });

      expect(result.finalAPY).toBe(8);
      expect(result.additionalAPY).toBe(4);
      expect(result.isFullBoost).toBe(true);
    });

    it('should handle $10,000 Pro investment with partial boost', () => {
      // $1000 market = $2000 boost, max = $5000, fill = 40%
      const result = calculateLaikaBoost({
        baseAPY: 5.5,
        maxAPY: 10,
        tier: VaultTier.PRO,
        usdtInvested: 10000,
        laikaMarketValueUSD: 1000
      });

      expect(result.boostFillPercent).toBe(40);
      expect(result.additionalAPY).toBe(1.8); // 4.5 * 0.4
      expect(result.finalAPY).toBe(7.3); // 5.5 + 1.8
    });

    it('should handle $50,000 Elite investment with no boost', () => {
      const result = calculateLaikaBoost({
        baseAPY: 8,
        maxAPY: 12,
        tier: VaultTier.ELITE,
        usdtInvested: 50000,
        laikaMarketValueUSD: 0
      });

      expect(result.finalAPY).toBe(8);
      expect(result.additionalAPY).toBe(0);
      expect(result.maxAPY).toBe(12);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small investments', () => {
      const result = calculateLaikaBoost({
        baseAPY: 4,
        maxAPY: 8,
        tier: VaultTier.STARTER,
        usdtInvested: 100,
        laikaMarketValueUSD: 25 // x2 = $50 = 100% of $50 max
      });

      expect(result.maxLaikaValueUSD).toBe(50);
      expect(result.finalAPY).toBe(8);
    });

    it('should handle very large investments', () => {
      const result = calculateLaikaBoost({
        baseAPY: 8,
        maxAPY: 12,
        tier: VaultTier.ELITE,
        usdtInvested: 100000,
        laikaMarketValueUSD: 25000 // x2 = $50000 = 100% of $50000 max
      });

      expect(result.maxLaikaValueUSD).toBe(50000);
      expect(result.finalAPY).toBe(12);
    });

    it('should handle fractional LAIKA values', () => {
      const result = calculateLaikaBoost({
        baseAPY: 4,
        maxAPY: 8,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaMarketValueUSD: 93.75 // x2 = $187.50, fill = 37.5%
      });

      expect(result.boostFillPercent).toBe(37.5);
      expect(result.finalAPY).toBeGreaterThan(4);
      expect(result.finalAPY).toBeLessThan(8);
    });
  });

  describe('Boost Progression with x2', () => {
    it('should show linear progression from 0% to 100%', () => {
      const increments = [0, 25, 50, 75, 100];
      const maxMarketValue = 250; // For $1000 USDT, max boost = $500, market = $250

      const results = increments.map(percent => {
        return calculateLaikaBoost({
          baseAPY: 4,
          maxAPY: 8,
          tier: VaultTier.STARTER,
          usdtInvested: 1000,
          laikaMarketValueUSD: (maxMarketValue * percent) / 100
        });
      });

      expect(results[0].finalAPY).toBe(4); // 0%
      expect(results[1].finalAPY).toBe(5); // 25%
      expect(results[2].finalAPY).toBe(6); // 50%
      expect(results[3].finalAPY).toBe(7); // 75%
      expect(results[4].finalAPY).toBe(8); // 100%
    });
  });

  describe('Cross-tier Comparisons', () => {
    it('should show higher max APY for higher tiers', () => {
      const starter = calculateLaikaBoost({
        baseAPY: 4,
        maxAPY: 8,
        tier: VaultTier.STARTER,
        usdtInvested: 10000,
        laikaMarketValueUSD: 2500 // x2 = $5000 = full boost
      });

      const pro = calculateLaikaBoost({
        baseAPY: 5.5,
        maxAPY: 10,
        tier: VaultTier.PRO,
        usdtInvested: 10000,
        laikaMarketValueUSD: 2500
      });

      const elite = calculateLaikaBoost({
        baseAPY: 8,
        maxAPY: 12,
        tier: VaultTier.ELITE,
        usdtInvested: 10000,
        laikaMarketValueUSD: 2500
      });

      expect(starter.finalAPY).toBeLessThan(pro.finalAPY);
      expect(pro.finalAPY).toBeLessThan(elite.finalAPY);
      expect(starter.maxAPY).toBe(8);
      expect(pro.maxAPY).toBe(10);
      expect(elite.maxAPY).toBe(12);
    });
  });
});
