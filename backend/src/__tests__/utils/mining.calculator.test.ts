/**
 * TAKARA Mining Calculator Tests
 */

import {
  calculateMiningReward,
  calculateDynamicDifficulty,
  estimateMonthlyMining,
  calculateMiningEfficiency,
} from '../../utils/mining.calculator';

describe('TAKARA Mining Calculator', () => {
  describe('calculateMiningReward', () => {
    it('should calculate daily TAKARA mining correctly', () => {
      const reward = calculateMiningReward({
        usdtAmount: 10000,
        miningPower: 100, // 100%
        difficulty: 1.0,
        daysActive: 1,
      });

      expect(reward).toBeGreaterThan(0);
      expect(reward).toBeLessThan(1000); // Reasonable daily amount
    });

    it('should scale with mining power', () => {
      const base = calculateMiningReward({
        usdtAmount: 10000,
        miningPower: 100,
        difficulty: 1.0,
        daysActive: 1,
      });

      const double = calculateMiningReward({
        usdtAmount: 10000,
        miningPower: 200,
        difficulty: 1.0,
        daysActive: 1,
      });

      expect(double).toBeCloseTo(base * 2, 1);
    });

    it('should scale with USDT amount', () => {
      const small = calculateMiningReward({
        usdtAmount: 1000,
        miningPower: 100,
        difficulty: 1.0,
        daysActive: 1,
      });

      const large = calculateMiningReward({
        usdtAmount: 10000,
        miningPower: 100,
        difficulty: 1.0,
        daysActive: 1,
      });

      expect(large).toBeCloseTo(small * 10, 1);
    });

    it('should decrease with higher difficulty', () => {
      const easy = calculateMiningReward({
        usdtAmount: 10000,
        miningPower: 100,
        difficulty: 1.0,
        daysActive: 1,
      });

      const hard = calculateMiningReward({
        usdtAmount: 10000,
        miningPower: 100,
        difficulty: 2.0,
        daysActive: 1,
      });

      expect(hard).toBeLessThan(easy);
      expect(hard).toBeCloseTo(easy / 2, 1);
    });

    it('should accumulate over multiple days', () => {
      const oneDay = calculateMiningReward({
        usdtAmount: 10000,
        miningPower: 100,
        difficulty: 1.0,
        daysActive: 1,
      });

      const tenDays = calculateMiningReward({
        usdtAmount: 10000,
        miningPower: 100,
        difficulty: 1.0,
        daysActive: 10,
      });

      expect(tenDays).toBeCloseTo(oneDay * 10, 1);
    });
  });

  describe('calculateDynamicDifficulty', () => {
    it('should start at difficulty 1.0', () => {
      const difficulty = calculateDynamicDifficulty({
        totalMinedSoFar: 0,
        totalSupply: 600000000,
        activeInvestors: 1,
      });

      expect(difficulty).toBe(1.0);
    });

    it('should increase with more investors', () => {
      const fewInvestors = calculateDynamicDifficulty({
        totalMinedSoFar: 1000000,
        totalSupply: 600000000,
        activeInvestors: 10,
      });

      const manyInvestors = calculateDynamicDifficulty({
        totalMinedSoFar: 1000000,
        totalSupply: 600000000,
        activeInvestors: 1000,
      });

      expect(manyInvestors).toBeGreaterThan(fewInvestors);
    });

    it('should increase as supply is depleted', () => {
      const earlyDifficulty = calculateDynamicDifficulty({
        totalMinedSoFar: 60000000, // 10% mined
        totalSupply: 600000000,
        activeInvestors: 100,
      });

      const lateDifficulty = calculateDynamicDifficulty({
        totalMinedSoFar: 540000000, // 90% mined
        totalSupply: 600000000,
        activeInvestors: 100,
      });

      expect(lateDifficulty).toBeGreaterThan(earlyDifficulty);
    });

    it('should never exceed reasonable bounds', () => {
      const maxDifficulty = calculateDynamicDifficulty({
        totalMinedSoFar: 599999999, // Almost all mined
        totalSupply: 600000000,
        activeInvestors: 1000000,
      });

      expect(maxDifficulty).toBeGreaterThan(1.0);
      expect(maxDifficulty).toBeLessThan(1000); // Reasonable cap
    });
  });

  describe('estimateMonthlyMining', () => {
    it('should estimate monthly TAKARA correctly', () => {
      const monthly = estimateMonthlyMining({
        usdtAmount: 10000,
        miningPower: 150,
        currentDifficulty: 1.0,
      });

      expect(monthly).toBeGreaterThan(0);
      expect(monthly).toBeLessThan(100000); // Reasonable monthly amount
    });

    it('should be approximately 30x daily mining', () => {
      const daily = calculateMiningReward({
        usdtAmount: 10000,
        miningPower: 150,
        difficulty: 1.0,
        daysActive: 1,
      });

      const monthly = estimateMonthlyMining({
        usdtAmount: 10000,
        miningPower: 150,
        currentDifficulty: 1.0,
      });

      expect(monthly).toBeCloseTo(daily * 30, 0);
    });
  });

  describe('calculateMiningEfficiency', () => {
    it('should calculate TAKARA per USDT invested', () => {
      const efficiency = calculateMiningEfficiency({
        totalMined: 10000,
        usdtInvested: 50000,
        durationDays: 365,
      });

      expect(efficiency.takaraPerUSDT).toBe(0.2); // 10000 / 50000
      expect(efficiency.takaraPerDay).toBeCloseTo(27.4, 1); // 10000 / 365
    });

    it('should handle zero cases', () => {
      const efficiency = calculateMiningEfficiency({
        totalMined: 0,
        usdtInvested: 10000,
        durationDays: 1,
      });

      expect(efficiency.takaraPerUSDT).toBe(0);
      expect(efficiency.takaraPerDay).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum mining power', () => {
      const reward = calculateMiningReward({
        usdtAmount: 100,
        miningPower: 50, // Minimum for Starter
        difficulty: 1.0,
        daysActive: 1,
      });

      expect(reward).toBeGreaterThan(0);
    });

    it('should handle maximum mining power', () => {
      const reward = calculateMiningReward({
        usdtAmount: 100000,
        miningPower: 350, // Maximum for Elite 36M
        difficulty: 1.0,
        daysActive: 1,
      });

      expect(reward).toBeGreaterThan(0);
      expect(reward).toBeLessThan(10000); // Sanity check
    });

    it('should handle fractional days', () => {
      const fullDay = calculateMiningReward({
        usdtAmount: 10000,
        miningPower: 100,
        difficulty: 1.0,
        daysActive: 1,
      });

      const halfDay = calculateMiningReward({
        usdtAmount: 10000,
        miningPower: 100,
        difficulty: 1.0,
        daysActive: 0.5,
      });

      expect(halfDay).toBeCloseTo(fullDay * 0.5, 1);
    });
  });

  describe('Supply Distribution', () => {
    it('should ensure 600M supply over 5 years', () => {
      const dailyRate = 600000000 / (5 * 365); // ~328,767 TAKARA/day

      // Test with theoretical network conditions
      const reward = calculateMiningReward({
        usdtAmount: 10000,
        miningPower: 100,
        difficulty: 1.0,
        daysActive: 1,
      });

      // Should be reasonable fraction of daily rate
      expect(reward).toBeLessThan(dailyRate);
    });
  });
});
