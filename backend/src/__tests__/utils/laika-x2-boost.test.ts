/**
 * LAIKA x2 Boost Consistency Tests
 *
 * These tests verify that:
 * 1. The x2 multiplier is correctly applied (not x100)
 * 2. Constants match between files
 * 3. Text descriptions match the logic
 * 4. API responses are consistent
 */

import {
  calculateLaikaBoost,
  calculateRequiredLaikaForAPY,
  getBoostRecommendation,
  LAIKA_PREMIUM_PERCENT,
  formatBoostResult
} from '../../utils/laika.calculator';
import { calculateCombinedBoost } from '../../utils/takara.calculator';
import { VaultTier } from '../../config/vaults.config';

describe('LAIKA x2 Boost Consistency', () => {

  describe('LAIKA_PREMIUM_PERCENT constant', () => {
    it('should be 100 (representing x2 multiplier, not 9900 for x100)', () => {
      // x2 multiplier = 100% bonus = LAIKA_PREMIUM_PERCENT of 100
      // x100 multiplier would be 9900% bonus = LAIKA_PREMIUM_PERCENT of 9900
      expect(LAIKA_PREMIUM_PERCENT).toBe(100);
      expect(LAIKA_PREMIUM_PERCENT).not.toBe(9900);
    });
  });

  describe('x2 Multiplier Logic', () => {
    it('should multiply market value by 2 (not 100)', () => {
      const laikaMarketValueUSD = 100; // $100 worth of LAIKA at market
      const usdtInvested = 1000;

      const result = calculateLaikaBoost({
        baseAPY: 7.6,
        maxAPY: 9.6,
        tier: VaultTier.STARTER,
        usdtInvested,
        laikaMarketValueUSD
      });

      // With x2: boostValue = 100 * 2 = $200
      // Max boost value = 1000 * 0.50 = $500
      // Effective = min(200, 500) = 200
      // Boost fill = 200 / 500 = 40%
      expect(result.laikaBoostValueUSD).toBe(200); // x2 multiplier
      expect(result.laikaBoostValueUSD).not.toBe(10000); // Would be x100
      expect(result.effectiveLaikaValueUSD).toBe(200);
      expect(result.boostFillPercent).toBe(40);
    });

    it('should require $250 market value for full boost on $1000 investment', () => {
      // Max boost value = 1000 * 0.50 = $500
      // For full boost: boostValue = marketValue * 2 = $500
      // So marketValue = $500 / 2 = $250
      const requiredMarketValue = calculateRequiredLaikaForAPY(
        7.6, // base APY
        9.6, // max APY
        1000, // USDT invested
        9.6 // desired APY (max)
      );

      expect(requiredMarketValue).toBe(250); // $250 market value needed for full boost
      expect(requiredMarketValue).not.toBe(5); // Would be with x100 multiplier
    });

    it('should show correct recommendation for full boost', () => {
      const recommendation = getBoostRecommendation(
        7.6, // base APY
        9.6, // max APY
        1000 // USDT invested
      );

      // Full boost requires: maxBoostValue / 2 = (1000 * 0.50) / 2 = $250
      expect(recommendation.fullBoost.laikaMarketValueRequired).toBe(250);
      expect(recommendation.fullBoost.laikaMarketValueRequired).not.toBe(5); // x100 would give 5
    });
  });

  describe('Combined LAIKA + TAKARA boost', () => {
    it('should use x2 for LAIKA in combined calculation', () => {
      const result = calculateCombinedBoost({
        baseAPY: 7.6,
        maxAPY: 9.6,
        usdtInvested: 1000,
        laikaMarketValueUSD: 125, // $125 market value
        takaraMarketValueUSD: 0
      });

      // LAIKA boost value = 125 * 2 = $250
      // Max boost = 1000 * 0.50 = $500
      // Fill = 250 / 500 = 50%
      // Boost range = 9.6 - 7.6 = 2%
      // Additional APY = 2 * 0.5 = 1%
      expect(result.laikaBoost.additionalAPY).toBe(1);
      expect(result.laikaBoost.apyAfterLaika).toBe(8.6);
    });
  });

  describe('Text/Comment Consistency', () => {
    it('formatBoostResult should show x2 (not x100)', () => {
      const result = calculateLaikaBoost({
        baseAPY: 7.6,
        maxAPY: 9.6,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaMarketValueUSD: 250
      });

      const formatted = formatBoostResult(result);

      // Should contain x2 text
      expect(formatted).toContain('x2');
      expect(formatted).toContain('100%'); // 100% bonus = x2

      // Should NOT contain x100 text
      expect(formatted).not.toContain('x100');
      expect(formatted).not.toContain('9900%');
    });
  });

  describe('Real-world x2 Scenarios', () => {
    it('$1000 investment: $250 LAIKA = full boost', () => {
      const result = calculateLaikaBoost({
        baseAPY: 7.6,
        maxAPY: 9.6,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaMarketValueUSD: 250
      });

      expect(result.isFullBoost).toBe(true);
      expect(result.finalAPY).toBe(9.6);
      expect(result.boostFillPercent).toBe(100);
    });

    it('$10000 investment: $2500 LAIKA = full boost', () => {
      const result = calculateLaikaBoost({
        baseAPY: 15.2,
        maxAPY: 19.2,
        tier: VaultTier.ELITE,
        usdtInvested: 10000,
        laikaMarketValueUSD: 2500
      });

      expect(result.isFullBoost).toBe(true);
      expect(result.finalAPY).toBe(19.2);
    });

    it('$1000 investment: $125 LAIKA = 50% boost', () => {
      const result = calculateLaikaBoost({
        baseAPY: 7.6,
        maxAPY: 9.6,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaMarketValueUSD: 125
      });

      expect(result.boostFillPercent).toBe(50);
      expect(result.additionalAPY).toBe(1); // 2% range * 50% = 1%
      expect(result.finalAPY).toBe(8.6); // 7.6 + 1
    });

    it('should cap boost at max even with excess LAIKA', () => {
      const result = calculateLaikaBoost({
        baseAPY: 7.6,
        maxAPY: 9.6,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        laikaMarketValueUSD: 1000 // Way more than needed
      });

      // Boost value = 1000 * 2 = $2000
      // Max boost value = 1000 * 0.50 = $500
      // Effective = $500 (capped)
      expect(result.effectiveLaikaValueUSD).toBe(500);
      expect(result.boostFillPercent).toBe(100);
      expect(result.finalAPY).toBe(9.6);
    });
  });

  describe('Comparison: x2 vs x100 (regression test)', () => {
    it('should show x2 requires 50x more LAIKA than x100 would', () => {
      const usdtInvested = 1000;
      const maxBoostValue = usdtInvested * 0.50; // $500

      // With x2: need $250 market value for full boost
      const x2RequiredMarketValue = maxBoostValue / 2;

      // With x100: would need only $5 market value for full boost
      const x100RequiredMarketValue = maxBoostValue / 100;

      expect(x2RequiredMarketValue).toBe(250);
      expect(x100RequiredMarketValue).toBe(5);
      expect(x2RequiredMarketValue / x100RequiredMarketValue).toBe(50);

      // Verify our calculator uses x2
      const required = calculateRequiredLaikaForAPY(7.6, 9.6, 1000, 9.6);
      expect(required).toBe(x2RequiredMarketValue);
      expect(required).not.toBe(x100RequiredMarketValue);
    });
  });

  describe('Vault-specific x2 calculations', () => {
    const testCases = [
      { name: '18M Starter', baseAPY: 7.6, maxAPY: 9.6, tier: VaultTier.STARTER },
      { name: '20M Beginner', baseAPY: 8.08, maxAPY: 10.08, tier: VaultTier.STARTER },
      { name: '30M Pro', baseAPY: 15.6, maxAPY: 18.6, tier: VaultTier.PRO },
      { name: '36M Elite', baseAPY: 15.2, maxAPY: 19.2, tier: VaultTier.ELITE }
    ];

    testCases.forEach(({ name, baseAPY, maxAPY, tier }) => {
      it(`${name}: should use x2 multiplier`, () => {
        const usdtInvested = 10000;
        const laikaMarketValue = 100; // $100 at market

        const result = calculateLaikaBoost({
          baseAPY,
          maxAPY,
          tier,
          usdtInvested,
          laikaMarketValueUSD: laikaMarketValue
        });

        // Verify x2 multiplier is used
        expect(result.laikaBoostValueUSD).toBe(200); // $100 * 2 = $200

        // Max boost = $10000 * 0.50 = $5000
        // Boost fill = 200 / 5000 = 4%
        expect(result.maxLaikaValueUSD).toBe(5000);
        expect(result.boostFillPercent).toBe(4);
      });
    });
  });
});
