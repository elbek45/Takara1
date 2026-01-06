/**
 * TAKARA Boost Calculator Tests
 * Tests for takara.calculator.ts
 */

import {
  calculateTakaraBoost,
  calculateRequiredTakaraForAPY,
  validateTakaraBoost,
  getBoostRecommendation,
  calculateCombinedBoost,
  TakaraBoostInput
} from '../../utils/takara.calculator';
import { VaultTier } from '../../config/vaults.config';

describe('TAKARA Boost Calculator', () => {
  describe('calculateTakaraBoost', () => {
    it('should calculate correct boost with full TAKARA value', () => {
      const input: TakaraBoostInput = {
        baseAPY: 10,
        maxAPY: 20,
        tier: VaultTier.PRO,
        usdtInvested: 1000,
        takaraMarketValueUSD: 500 // Full 50%
      };

      const result = calculateTakaraBoost(input);

      expect(result.finalAPY).toBe(20);
      expect(result.additionalAPY).toBe(10);
      expect(result.boostFillPercent).toBe(100);
      expect(result.isFullBoost).toBe(true);
    });

    it('should calculate correct boost with partial TAKARA value', () => {
      const input: TakaraBoostInput = {
        baseAPY: 10,
        maxAPY: 20,
        tier: VaultTier.PRO,
        usdtInvested: 1000,
        takaraMarketValueUSD: 250 // 50% of max (25% of USDT)
      };

      const result = calculateTakaraBoost(input);

      expect(result.boostFillPercent).toBe(50);
      expect(result.additionalAPY).toBe(5);
      expect(result.finalAPY).toBe(15);
      expect(result.isFullBoost).toBe(false);
    });

    it('should cap TAKARA at 50% of USDT investment', () => {
      const input: TakaraBoostInput = {
        baseAPY: 10,
        maxAPY: 20,
        tier: VaultTier.ELITE,
        usdtInvested: 1000,
        takaraMarketValueUSD: 1000 // Exceeds 50% limit
      };

      const result = calculateTakaraBoost(input);

      expect(result.effectiveTakaraValueUSD).toBe(500);
      expect(result.maxTakaraValueUSD).toBe(500);
      expect(result.boostFillPercent).toBe(100);
    });

    it('should handle zero TAKARA', () => {
      const input: TakaraBoostInput = {
        baseAPY: 10,
        maxAPY: 20,
        tier: VaultTier.STARTER,
        usdtInvested: 1000,
        takaraMarketValueUSD: 0
      };

      const result = calculateTakaraBoost(input);

      expect(result.finalAPY).toBe(10);
      expect(result.additionalAPY).toBe(0);
      expect(result.boostFillPercent).toBe(0);
    });

    it('should use v2.2 APY values correctly', () => {
      // Pro 36M: maxAPY = 50%
      const input: TakaraBoostInput = {
        baseAPY: 25,
        maxAPY: 50,
        tier: VaultTier.PRO,
        usdtInvested: 10000,
        takaraMarketValueUSD: 5000
      };

      const result = calculateTakaraBoost(input);

      expect(result.finalAPY).toBe(50);
      expect(result.boostRange).toBe(25);
    });
  });

  describe('calculateRequiredTakaraForAPY', () => {
    it('should calculate required TAKARA for desired APY', () => {
      const required = calculateRequiredTakaraForAPY(10, 20, 1000, 15);

      // 15% is 50% of the way from 10% to 20%
      // Max TAKARA = $500, so need $250
      expect(required).toBe(250);
    });

    it('should return max for APY at or above max', () => {
      const required = calculateRequiredTakaraForAPY(10, 20, 1000, 25);

      expect(required).toBe(500); // Max TAKARA value
    });

    it('should return 0 for APY at or below base', () => {
      const required = calculateRequiredTakaraForAPY(10, 20, 1000, 8);

      expect(required).toBe(0);
    });
  });

  describe('validateTakaraBoost', () => {
    it('should validate correct input', () => {
      const input: TakaraBoostInput = {
        baseAPY: 10,
        maxAPY: 20,
        tier: VaultTier.PRO,
        usdtInvested: 1000,
        takaraMarketValueUSD: 300
      };

      const result = validateTakaraBoost(input);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject baseAPY >= maxAPY', () => {
      const input: TakaraBoostInput = {
        baseAPY: 20,
        maxAPY: 20,
        tier: VaultTier.PRO,
        usdtInvested: 1000,
        takaraMarketValueUSD: 300
      };

      const result = validateTakaraBoost(input);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Base APY');
    });

    it('should reject zero USDT', () => {
      const input: TakaraBoostInput = {
        baseAPY: 10,
        maxAPY: 20,
        tier: VaultTier.PRO,
        usdtInvested: 0,
        takaraMarketValueUSD: 300
      };

      const result = validateTakaraBoost(input);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('USDT');
    });

    it('should warn when TAKARA exceeds limit', () => {
      const input: TakaraBoostInput = {
        baseAPY: 10,
        maxAPY: 20,
        tier: VaultTier.PRO,
        usdtInvested: 1000,
        takaraMarketValueUSD: 600 // Exceeds 50%
      };

      const result = validateTakaraBoost(input);

      expect(result.valid).toBe(true);
      expect(result.warning).toContain('exceeds maximum');
    });
  });

  describe('getBoostRecommendation', () => {
    it('should provide correct recommendations', () => {
      const recommendations = getBoostRecommendation(10, 20, 1000);

      expect(recommendations.noBoost.apy).toBe(10);
      expect(recommendations.noBoost.takaraRequired).toBe(0);

      expect(recommendations.partialBoost.apy).toBe(15);
      expect(recommendations.partialBoost.takaraRequired).toBe(250);

      expect(recommendations.fullBoost.apy).toBe(20);
      expect(recommendations.fullBoost.takaraRequired).toBe(500);
    });
  });

  describe('calculateCombinedBoost (LAIKA + TAKARA)', () => {
    it('should calculate combined LAIKA and TAKARA boost with x100 multiplier', () => {
      const result = calculateCombinedBoost({
        baseAPY: 10,
        maxAPY: 20,
        usdtInvested: 1000,
        laikaMarketValueUSD: 2.5, // 2.5 * 100 = 250 (50% of max 500)
        takaraMarketValueUSD: 250 // 250 (50% of remaining boost)
      });

      expect(result.laikaBoost.additionalAPY).toBe(5);
      expect(result.laikaBoost.apyAfterLaika).toBe(15);
      expect(result.takaraBoost.additionalAPY).toBe(2.5);
      expect(result.finalAPY).toBe(17.5);
    });

    it('should cap combined boost at maxAPY', () => {
      const result = calculateCombinedBoost({
        baseAPY: 10,
        maxAPY: 20,
        usdtInvested: 1000,
        laikaMarketValueUSD: 10, // 10 * 100 = 1000 (more than max 500)
        takaraMarketValueUSD: 500 // More than max
      });

      expect(result.finalAPY).toBe(20);
    });

    it('should work with only LAIKA boost (x100)', () => {
      const result = calculateCombinedBoost({
        baseAPY: 10,
        maxAPY: 20,
        usdtInvested: 1000,
        laikaMarketValueUSD: 5, // 5 * 100 = 500 = full boost
        takaraMarketValueUSD: 0
      });

      expect(result.laikaBoost.additionalAPY).toBe(10);
      expect(result.takaraBoost.additionalAPY).toBe(0);
      expect(result.finalAPY).toBe(20);
    });

    it('should work with only TAKARA boost', () => {
      const result = calculateCombinedBoost({
        baseAPY: 10,
        maxAPY: 20,
        usdtInvested: 1000,
        laikaMarketValueUSD: 0,
        takaraMarketValueUSD: 500
      });

      expect(result.laikaBoost.additionalAPY).toBe(0);
      expect(result.takaraBoost.additionalAPY).toBe(10);
      expect(result.finalAPY).toBe(20);
    });
  });
});
