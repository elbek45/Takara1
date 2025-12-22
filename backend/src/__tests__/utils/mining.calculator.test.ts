/**
 * TAKARA Mining Calculator Tests
 */

import {
  calculateMining,
  calculateDifficulty,
  calculateBaseMiningRate,
  calculateMiningEfficiency,
  compareMiningOptions,
  projectFutureDifficulty,
  getMiningStats,
  validateMiningInput,
  TAKARA_CONFIG,
  MiningInput,
  DifficultyFactors
} from '../../utils/mining.calculator';

describe('TAKARA Mining Calculator', () => {
  describe('calculateDifficulty', () => {
    it('should calculate base difficulty with no mining', () => {
      const difficulty = calculateDifficulty({
        totalMined: 0,
        activeMiners: 100
      });

      expect(difficulty).toBeGreaterThan(0);
      expect(difficulty).toBeCloseTo(1.0001, 4);
    });

    it('should increase difficulty as more TAKARA is mined', () => {
      const lowDifficulty = calculateDifficulty({
        totalMined: 0,
        activeMiners: 100
      });

      const highDifficulty = calculateDifficulty({
        totalMined: TAKARA_CONFIG.TOTAL_SUPPLY * 0.5, // 50% mined
        activeMiners: 100
      });

      expect(highDifficulty).toBeGreaterThan(lowDifficulty);
    });

    it('should increase difficulty with more active miners', () => {
      const fewMiners = calculateDifficulty({
        totalMined: 0,
        activeMiners: 100
      });

      const manyMiners = calculateDifficulty({
        totalMined: 0,
        activeMiners: 5000
      });

      expect(manyMiners).toBeGreaterThan(fewMiners);
    });

    it('should handle extreme mining progress', () => {
      const difficulty = calculateDifficulty({
        totalMined: TAKARA_CONFIG.TOTAL_SUPPLY * 0.9, // 90% mined
        activeMiners: 10000
      });

      expect(difficulty).toBeGreaterThan(1);
      expect(difficulty).toBeLessThan(100); // Should not be unreasonably high
    });
  });

  describe('calculateBaseMiningRate', () => {
    it('should calculate base mining rate correctly', () => {
      const rate = calculateBaseMiningRate(100, 1000);

      expect(rate).toBeGreaterThan(0);
      expect(rate).toBe(10); // 100/100 * 1000/1000 * 10
    });

    it('should scale with mining power', () => {
      const base = calculateBaseMiningRate(100, 1000);
      const double = calculateBaseMiningRate(200, 1000);

      expect(double).toBeCloseTo(base * 2, 4);
    });

    it('should scale with USDT invested', () => {
      const small = calculateBaseMiningRate(100, 1000);
      const large = calculateBaseMiningRate(100, 10000);

      expect(large).toBeCloseTo(small * 10, 4);
    });

    it('should handle starter vault (50 mining power)', () => {
      const rate = calculateBaseMiningRate(50, 1000);

      expect(rate).toBe(5); // 50/100 * 1000/1000 * 10
    });

    it('should handle elite vault (350 mining power)', () => {
      const rate = calculateBaseMiningRate(350, 50000);

      expect(rate).toBe(1750); // 350/100 * 50000/1000 * 10
    });
  });

  describe('calculateMining', () => {
    it('should calculate mining for starter vault', () => {
      const input: MiningInput = {
        miningPower: 50,
        usdtInvested: 1000,
        currentDifficulty: 1.0,
        durationMonths: 12
      };

      const result = calculateMining(input);

      expect(result).toHaveProperty('dailyTakaraRaw');
      expect(result).toHaveProperty('dailyTakaraFinal');
      expect(result).toHaveProperty('monthlyTakara');
      expect(result).toHaveProperty('totalTakaraExpected');
      expect(result.dailyTakaraRaw).toBe(5);
      expect(result.dailyTakaraFinal).toBe(5); // No difficulty
      expect(result.monthlyTakara).toBe(150); // 5 * 30
      expect(result.totalTakaraExpected).toBe(1800); // 5 * 30 * 12
    });

    it('should apply difficulty correctly', () => {
      const noDifficulty = calculateMining({
        miningPower: 100,
        usdtInvested: 1000,
        currentDifficulty: 1.0,
        durationMonths: 12
      });

      const withDifficulty = calculateMining({
        miningPower: 100,
        usdtInvested: 1000,
        currentDifficulty: 2.0,
        durationMonths: 12
      });

      expect(withDifficulty.dailyTakaraFinal).toBeCloseTo(
        noDifficulty.dailyTakaraFinal / 2,
        1
      );
    });

    it('should calculate for PRO vault', () => {
      const result = calculateMining({
        miningPower: 100,
        usdtInvested: 10000,
        currentDifficulty: 1.0,
        durationMonths: 30
      });

      expect(result.dailyTakaraRaw).toBe(100);
      expect(result.totalTakaraExpected).toBe(90000); // 100 * 30 * 30
    });

    it('should calculate for ELITE vault', () => {
      const result = calculateMining({
        miningPower: 350,
        usdtInvested: 50000,
        currentDifficulty: 1.0,
        durationMonths: 36
      });

      expect(result.dailyTakaraRaw).toBe(1750);
      expect(result.totalTakaraExpected).toBe(1890000); // 1750 * 30 * 36
    });
  });

  describe('compareMiningOptions', () => {
    it('should compare different vault options', () => {
      const comparison = compareMiningOptions(10000, 1.0, [
        { name: 'Starter', miningPower: 50, duration: 12 },
        { name: 'Pro', miningPower: 100, duration: 30 },
        { name: 'Elite', miningPower: 350, duration: 36 }
      ]);

      expect(comparison).toHaveLength(3);
      expect(comparison[0].name).toBe('Starter');
      expect(comparison[1].name).toBe('Pro');
      expect(comparison[2].name).toBe('Elite');

      // Elite should have highest total due to longer duration and higher power
      expect(comparison[2].totalTakara).toBeGreaterThan(comparison[1].totalTakara);
    });

    it('should show daily rates correctly', () => {
      const comparison = compareMiningOptions(1000, 1.0, [
        { name: 'Starter', miningPower: 50, duration: 12 }
      ]);

      expect(comparison[0].dailyTakara).toBe(5);
    });
  });

  describe('projectFutureDifficulty', () => {
    it('should project difficulty increase over time', () => {
      const currentFactors: DifficultyFactors = {
        totalMined: 10000000,
        activeMiners: 1000
      };

      const futurelyDifficulty = projectFutureDifficulty(
        currentFactors,
        12, // 12 months ahead
        1000000, // 1M TAKARA mined per month
        1.05 // 5% monthly miner growth
      );

      const currentDifficulty = calculateDifficulty(currentFactors);

      expect(futurelyDifficulty).toBeGreaterThan(currentDifficulty);
    });

    it('should handle zero growth rate', () => {
      const currentFactors: DifficultyFactors = {
        totalMined: 10000000,
        activeMiners: 1000
      };

      const futureDifficulty = projectFutureDifficulty(
        currentFactors,
        6,
        500000,
        1.0 // No growth
      );

      expect(futureDifficulty).toBeGreaterThan(0);
    });
  });

  describe('calculateMiningEfficiency', () => {
    it('should calculate TAKARA per USDT ratio', () => {
      const efficiency = calculateMiningEfficiency(
        100, // mining power
        1000, // USDT invested
        1.0, // difficulty
        12 // duration months
      );

      // Result should be total TAKARA / USDT
      // 10 daily * 30 * 12 / 1000 = 3.6
      expect(efficiency).toBe(3.6);
    });

    it('should show higher efficiency for elite vaults', () => {
      const starterEfficiency = calculateMiningEfficiency(50, 1000, 1.0, 12);
      const eliteEfficiency = calculateMiningEfficiency(350, 1000, 1.0, 36);

      expect(eliteEfficiency).toBeGreaterThan(starterEfficiency);
    });

    it('should decrease with higher difficulty', () => {
      const lowDifficulty = calculateMiningEfficiency(100, 1000, 1.0, 12);
      const highDifficulty = calculateMiningEfficiency(100, 1000, 2.0, 12);

      expect(highDifficulty).toBe(lowDifficulty / 2);
    });
  });

  describe('getMiningStats', () => {
    it('should return comprehensive mining statistics', () => {
      const stats = getMiningStats({
        totalMined: 2100000, // 10% of 21M total supply
        activeMiners: 5000
      });

      expect(stats).toHaveProperty('totalMined');
      expect(stats).toHaveProperty('totalSupply');
      expect(stats).toHaveProperty('percentMined');
      expect(stats).toHaveProperty('remaining');
      expect(stats).toHaveProperty('activeMiners');
      expect(stats).toHaveProperty('currentDifficulty');
      expect(stats).toHaveProperty('averageDifficultyIncrease');

      expect(stats.totalMined).toBe(2100000);
      expect(stats.totalSupply).toBe(TAKARA_CONFIG.TOTAL_SUPPLY);
      expect(stats.percentMined).toBeCloseTo(10, 2);
      expect(stats.remaining).toBe(TAKARA_CONFIG.TOTAL_SUPPLY - 2100000);
    });

    it('should calculate percent mined correctly', () => {
      const stats = getMiningStats({
        totalMined: TAKARA_CONFIG.TOTAL_SUPPLY * 0.5,
        activeMiners: 1000
      });

      expect(stats.percentMined).toBeCloseTo(50, 2);
    });

    it('should handle zero mined scenario', () => {
      const stats = getMiningStats({
        totalMined: 0,
        activeMiners: 100
      });

      expect(stats.percentMined).toBe(0);
      expect(stats.remaining).toBe(TAKARA_CONFIG.TOTAL_SUPPLY);
    });
  });

  describe('validateMiningInput', () => {
    it('should validate correct input', () => {
      const validation = validateMiningInput({
        miningPower: 100,
        usdtInvested: 1000,
        currentDifficulty: 1.0,
        durationMonths: 12
      });

      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('should reject zero mining power', () => {
      const validation = validateMiningInput({
        miningPower: 0,
        usdtInvested: 1000,
        currentDifficulty: 1.0,
        durationMonths: 12
      });

      expect(validation.valid).toBe(false);
      expect(validation.error?.toLowerCase()).toContain('mining power');
    });

    it('should reject negative USDT amount', () => {
      const validation = validateMiningInput({
        miningPower: 100,
        usdtInvested: -1000,
        currentDifficulty: 1.0,
        durationMonths: 12
      });

      expect(validation.valid).toBe(false);
      expect(validation.error?.toLowerCase()).toContain('investment amount');
    });

    it('should reject zero difficulty', () => {
      const validation = validateMiningInput({
        miningPower: 100,
        usdtInvested: 1000,
        currentDifficulty: 0,
        durationMonths: 12
      });

      expect(validation.valid).toBe(false);
      expect(validation.error?.toLowerCase()).toContain('difficulty');
    });

    it('should reject negative duration', () => {
      const validation = validateMiningInput({
        miningPower: 100,
        usdtInvested: 1000,
        currentDifficulty: 1.0,
        durationMonths: -12
      });

      expect(validation.valid).toBe(false);
      expect(validation.error?.toLowerCase()).toContain('duration');
    });
  });

  describe('TAKARA_CONFIG constants', () => {
    it('should have correct total supply', () => {
      expect(TAKARA_CONFIG.TOTAL_SUPPLY).toBe(21_000_000);
    });

    it('should have 5 year mining period', () => {
      expect(TAKARA_CONFIG.MINING_PERIOD_MONTHS).toBe(60);
    });

    it('should have reasonable difficulty factors', () => {
      expect(TAKARA_CONFIG.BASE_DIFFICULTY).toBe(1.0);
      expect(TAKARA_CONFIG.SUPPLY_FACTOR).toBe(0.5);
      expect(TAKARA_CONFIG.MINER_FACTOR).toBe(0.000001);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small investments', () => {
      const result = calculateMining({
        miningPower: 50,
        usdtInvested: 100, // Minimum investment
        currentDifficulty: 1.0,
        durationMonths: 12
      });

      expect(result.dailyTakaraRaw).toBeGreaterThan(0);
      expect(result.totalTakaraExpected).toBeGreaterThan(0);
    });

    it('should handle very large investments', () => {
      const result = calculateMining({
        miningPower: 350,
        usdtInvested: 100000, // Maximum investment
        currentDifficulty: 1.0,
        durationMonths: 36
      });

      expect(result.dailyTakaraRaw).toBeGreaterThan(0);
      expect(result.totalTakaraExpected).toBeGreaterThan(0);
    });

    it('should handle very high difficulty', () => {
      const result = calculateMining({
        miningPower: 100,
        usdtInvested: 1000,
        currentDifficulty: 10.0, // Very high difficulty
        durationMonths: 12
      });

      expect(result.dailyTakaraFinal).toBe(result.dailyTakaraRaw / 10);
    });
  });
});
