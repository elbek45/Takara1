/**
 * APY Calculator Tests
 */

import {
  calculateEarnings,
  calculateNumberOfPayouts,
  calculateNextPayoutDate,
  calculateAllPayoutDates,
  calculatePendingEarnings,
  calculateROI,
  compareScenarios,
  calculateEffectiveAPY,
  calculateBreakEvenMonths,
  APYCalculationInput
} from '../../utils/apy.calculator';
import { PayoutSchedule } from '../../config/vaults.config';

describe('APY Calculator', () => {
  describe('calculateEarnings (simple interest)', () => {
    it('should calculate simple interest correctly', () => {
      const result = calculateEarnings({
        principal: 10000,
        apy: 10,
        durationMonths: 12,
        payoutSchedule: PayoutSchedule.MONTHLY,
        compounding: false
      });

      expect(result.totalEarnings).toBe(1000); // 10% of $10,000
      expect(result.totalValue).toBe(11000);
      expect(result.principal).toBe(10000);
      expect(result.apy).toBe(10);
    });

    it('should calculate pro-rated for partial year', () => {
      const result = calculateEarnings({
        principal: 10000,
        apy: 10,
        durationMonths: 6, // Half year
        payoutSchedule: PayoutSchedule.MONTHLY,
        compounding: false
      });

      expect(result.totalEarnings).toBe(500); // Half of 10%
    });

    it('should handle different APY rates', () => {
      const low = calculateEarnings({
        principal: 10000,
        apy: 4,
        durationMonths: 12,
        payoutSchedule: PayoutSchedule.MONTHLY,
        compounding: false
      });

      const high = calculateEarnings({
        principal: 10000,
        apy: 12,
        durationMonths: 12,
        payoutSchedule: PayoutSchedule.MONTHLY,
        compounding: false
      });

      expect(low.totalEarnings).toBe(400);
      expect(high.totalEarnings).toBe(1200);
    });

    it('should calculate monthly average correctly', () => {
      const result = calculateEarnings({
        principal: 10000,
        apy: 12,
        durationMonths: 12,
        payoutSchedule: PayoutSchedule.MONTHLY,
        compounding: false
      });

      expect(result.monthlyEarnings).toBe(100); // $1200 / 12 months
    });
  });

  describe('calculateEarnings (compound interest)', () => {
    it('should calculate compound interest', () => {
      const result = calculateEarnings({
        principal: 10000,
        apy: 10,
        durationMonths: 12,
        payoutSchedule: PayoutSchedule.MONTHLY,
        compounding: true
      });

      expect(result.totalEarnings).toBeGreaterThan(1000); // More than simple interest
      expect(result.totalEarnings).toBeCloseTo(1046.22, 1); // Compound effect
    });

    it('should show higher returns than simple interest', () => {
      const simple = calculateEarnings({
        principal: 10000,
        apy: 10,
        durationMonths: 36,
        payoutSchedule: PayoutSchedule.MONTHLY,
        compounding: false
      });

      const compound = calculateEarnings({
        principal: 10000,
        apy: 10,
        durationMonths: 36,
        payoutSchedule: PayoutSchedule.MONTHLY,
        compounding: true
      });

      expect(compound.totalEarnings).toBeGreaterThan(simple.totalEarnings);
    });
  });

  describe('calculateNumberOfPayouts', () => {
    it('should calculate monthly payouts correctly', () => {
      const payouts = calculateNumberOfPayouts(12, PayoutSchedule.MONTHLY);
      expect(payouts).toBe(12);
    });

    it('should calculate quarterly payouts correctly', () => {
      const payouts = calculateNumberOfPayouts(12, PayoutSchedule.QUARTERLY);
      expect(payouts).toBe(4);
    });

    it('should handle end of term payout', () => {
      const payouts = calculateNumberOfPayouts(36, PayoutSchedule.END_OF_TERM);
      expect(payouts).toBe(1);
    });

    it('should handle 30 month quarterly payouts', () => {
      const payouts = calculateNumberOfPayouts(30, PayoutSchedule.QUARTERLY);
      expect(payouts).toBe(10); // 30/3 = 10 quarters
    });

    it('should handle 36 month monthly payouts', () => {
      const payouts = calculateNumberOfPayouts(36, PayoutSchedule.MONTHLY);
      expect(payouts).toBe(36);
    });
  });

  describe('calculateNextPayoutDate', () => {
    it('should calculate next monthly payout', () => {
      const startDate = new Date('2024-01-01');
      const nextDate = calculateNextPayoutDate(startDate, PayoutSchedule.MONTHLY);

      expect(nextDate.getMonth()).toBe(1); // February (0-indexed)
      expect(nextDate.getDate()).toBe(1);
    });

    it('should calculate next quarterly payout', () => {
      const startDate = new Date('2024-01-01');
      const nextDate = calculateNextPayoutDate(startDate, PayoutSchedule.QUARTERLY);

      expect(nextDate.getMonth()).toBe(3); // April (0-indexed)
    });

    it('should use last claim date if provided', () => {
      const startDate = new Date('2024-01-01');
      const lastClaim = new Date('2024-06-01');
      const nextDate = calculateNextPayoutDate(
        startDate,
        PayoutSchedule.MONTHLY,
        lastClaim
      );

      expect(nextDate.getMonth()).toBe(6); // July (0-indexed)
    });
  });

  describe('calculateAllPayoutDates', () => {
    it('should generate all monthly payout dates', () => {
      const startDate = new Date('2024-01-01');
      const dates = calculateAllPayoutDates(startDate, 12, PayoutSchedule.MONTHLY);

      expect(dates).toHaveLength(12);
      expect(dates[0].getMonth()).toBe(1); // February
      expect(dates[11].getMonth()).toBe(0); // January next year
    });

    it('should generate quarterly payout dates', () => {
      const startDate = new Date('2024-01-01');
      const dates = calculateAllPayoutDates(startDate, 12, PayoutSchedule.QUARTERLY);

      expect(dates).toHaveLength(4);
      expect(dates[0].getMonth()).toBe(3); // April
      expect(dates[1].getMonth()).toBe(6); // July
      expect(dates[2].getMonth()).toBe(9); // October
      expect(dates[3].getMonth()).toBe(0); // January next year
    });

    it('should generate single date for end of term', () => {
      const startDate = new Date('2024-01-01');
      const dates = calculateAllPayoutDates(startDate, 12, PayoutSchedule.END_OF_TERM);

      expect(dates).toHaveLength(1);
      expect(dates[0].getMonth()).toBe(0); // January next year
      expect(dates[0].getFullYear()).toBe(2025);
    });
  });

  describe('calculatePendingEarnings', () => {
    it('should calculate correct pending earnings', () => {
      const startDate = new Date('2024-01-01');
      const currentDate = new Date('2024-01-31'); // 30 days

      const pending = calculatePendingEarnings(
        10000, // principal
        12, // apy
        startDate,
        currentDate
      );

      // 30 days of 12% APY
      const expected = (10000 * 0.12 * 30) / 365;
      expect(pending).toBeCloseTo(expected, 2);
    });

    it('should return 0 if no time has passed', () => {
      const date = new Date('2024-01-01');

      const pending = calculatePendingEarnings(
        10000,
        12,
        date,
        date
      );

      expect(pending).toBe(0);
    });

    it('should accumulate over time', () => {
      const startDate = new Date('2024-01-01');
      const oneMonth = new Date('2024-02-01');
      const twoMonths = new Date('2024-03-01');

      const pendingOneMonth = calculatePendingEarnings(10000, 12, startDate, oneMonth);
      const pendingTwoMonths = calculatePendingEarnings(10000, 12, startDate, twoMonths);

      expect(pendingTwoMonths).toBeGreaterThan(pendingOneMonth);
      expect(pendingTwoMonths).toBeCloseTo(pendingOneMonth * 2, 0);
    });

    it('should use last claim date if provided', () => {
      const startDate = new Date('2024-01-01');
      const lastClaim = new Date('2024-06-01');
      const currentDate = new Date('2024-07-01'); // 30 days after last claim

      const pending = calculatePendingEarnings(
        10000,
        12,
        startDate,
        currentDate,
        lastClaim
      );

      const expected = (10000 * 0.12 * 30) / 365;
      expect(pending).toBeCloseTo(expected, 2);
    });
  });

  describe('calculateROI', () => {
    it('should calculate ROI percentage correctly', () => {
      const roi = calculateROI(10000, 1200);
      expect(roi).toBe(12); // 12% ROI
    });

    it('should handle zero earnings', () => {
      const roi = calculateROI(10000, 0);
      expect(roi).toBe(0);
    });

    it('should handle fractional values', () => {
      const roi = calculateROI(7534.25, 456.78);
      expect(roi).toBeCloseTo(6.06, 2);
    });

    it('should handle zero principal', () => {
      const roi = calculateROI(0, 1000);
      expect(roi).toBe(0);
    });
  });

  describe('compareScenarios', () => {
    it('should compare different investment scenarios', () => {
      const scenarios = [
        { name: 'Starter', principal: 1000, apy: 4, durationMonths: 12 },
        { name: 'Pro', principal: 10000, apy: 5.5, durationMonths: 30 },
        { name: 'Elite', principal: 50000, apy: 8, durationMonths: 36 }
      ];

      const comparison = compareScenarios(scenarios);

      expect(comparison).toHaveLength(3);
      expect(comparison[0].name).toBe('Starter');
      expect(comparison[1].name).toBe('Pro');
      expect(comparison[2].name).toBe('Elite');

      // Elite should have highest total earnings
      expect(comparison[2].earnings).toBeGreaterThan(comparison[1].earnings);
      expect(comparison[1].earnings).toBeGreaterThan(comparison[0].earnings);
    });

    it('should calculate ROI for each scenario', () => {
      const scenarios = [
        { name: 'Test', principal: 10000, apy: 12, durationMonths: 12 }
      ];

      const comparison = compareScenarios(scenarios);

      expect(comparison[0].roi).toBe(12);
    });
  });

  describe('calculateEffectiveAPY', () => {
    it('should calculate effective APY with monthly compounding', () => {
      const effective = calculateEffectiveAPY(10, 12);

      expect(effective).toBeGreaterThan(10); // Effective > Nominal
      expect(effective).toBeCloseTo(10.47, 2);
    });

    it('should equal nominal for annual compounding', () => {
      const effective = calculateEffectiveAPY(10, 1);
      expect(effective).toBeCloseTo(10, 2);
    });

    it('should increase with more frequent compounding', () => {
      const quarterly = calculateEffectiveAPY(10, 4);
      const monthly = calculateEffectiveAPY(10, 12);
      const daily = calculateEffectiveAPY(10, 365);

      expect(monthly).toBeGreaterThan(quarterly);
      expect(daily).toBeGreaterThan(monthly);
    });
  });

  describe('calculateBreakEvenMonths', () => {
    it('should calculate break-even time without fees', () => {
      const months = calculateBreakEvenMonths(10000, 12, 0);
      expect(months).toBe(0); // No fees = immediate break-even
    });

    it('should calculate break-even time with fees', () => {
      const months = calculateBreakEvenMonths(10000, 12, 600);
      // Monthly return = 10000 * 0.12 / 12 = 100
      // Break-even = 600 / 100 = 6 months
      expect(months).toBe(6);
    });

    it('should return Infinity for zero APY', () => {
      const months = calculateBreakEvenMonths(10000, 0, 100);
      expect(months).toBe(Infinity);
    });

    it('should handle fractional months', () => {
      const months = calculateBreakEvenMonths(10000, 12, 350);
      expect(months).toBe(3.5); // 3.5 months to break even
    });
  });

  describe('Payout Schedule Integration', () => {
    it('should calculate correct payout amounts for monthly schedule', () => {
      const result = calculateEarnings({
        principal: 12000,
        apy: 12,
        durationMonths: 12,
        payoutSchedule: PayoutSchedule.MONTHLY,
        compounding: false
      });

      expect(result.numberOfPayouts).toBe(12);
      expect(result.payoutAmount).toBe(120); // $1440 / 12 = $120 per month
    });

    it('should calculate correct payout amounts for quarterly schedule', () => {
      const result = calculateEarnings({
        principal: 10000,
        apy: 8,
        durationMonths: 12,
        payoutSchedule: PayoutSchedule.QUARTERLY,
        compounding: false
      });

      expect(result.numberOfPayouts).toBe(4);
      expect(result.payoutAmount).toBe(200); // $800 / 4 = $200 per quarter
    });

    it('should calculate single payout for end of term', () => {
      const result = calculateEarnings({
        principal: 10000,
        apy: 8,
        durationMonths: 36,
        payoutSchedule: PayoutSchedule.END_OF_TERM,
        compounding: false
      });

      expect(result.numberOfPayouts).toBe(1);
      expect(result.payoutAmount).toBe(result.totalEarnings);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should match Starter vault example', () => {
      // Starter: $1,000, 4% base APY, 12 months
      const result = calculateEarnings({
        principal: 1000,
        apy: 4,
        durationMonths: 12,
        payoutSchedule: PayoutSchedule.MONTHLY,
        compounding: false
      });

      expect(result.totalEarnings).toBe(40);
      expect(result.monthlyEarnings).toBeCloseTo(3.33, 2);
    });

    it('should match Pro vault example', () => {
      // Pro: $10,000, 5.5% APY, 30 months
      const result = calculateEarnings({
        principal: 10000,
        apy: 5.5,
        durationMonths: 30,
        payoutSchedule: PayoutSchedule.QUARTERLY,
        compounding: false
      });

      expect(result.totalEarnings).toBe(1375); // 10000 * 0.055 * 2.5
    });

    it('should match Elite vault example', () => {
      // Elite: $50,000, 8% APY, 36 months
      const result = calculateEarnings({
        principal: 50000,
        apy: 8,
        durationMonths: 36,
        payoutSchedule: PayoutSchedule.END_OF_TERM,
        compounding: false
      });

      expect(result.totalEarnings).toBe(12000); // 50000 * 0.08 * 3
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum investment', () => {
      const result = calculateEarnings({
        principal: 100,
        apy: 4,
        durationMonths: 12,
        payoutSchedule: PayoutSchedule.MONTHLY,
        compounding: false
      });

      expect(result.totalEarnings).toBe(4);
    });

    it('should handle maximum investment', () => {
      const result = calculateEarnings({
        principal: 100000,
        apy: 12,
        durationMonths: 36,
        payoutSchedule: PayoutSchedule.MONTHLY,
        compounding: false
      });

      expect(result.totalEarnings).toBe(36000);
    });

    it('should handle fractional APY', () => {
      const result = calculateEarnings({
        principal: 10000,
        apy: 5.75,
        durationMonths: 12,
        payoutSchedule: PayoutSchedule.MONTHLY,
        compounding: false
      });

      expect(result.totalEarnings).toBe(575);
    });

    it('should handle very short duration', () => {
      const result = calculateEarnings({
        principal: 10000,
        apy: 12,
        durationMonths: 1,
        payoutSchedule: PayoutSchedule.MONTHLY,
        compounding: false
      });

      expect(result.totalEarnings).toBe(100); // 1 month of 12% APY
    });

    it('should handle very long duration', () => {
      const result = calculateEarnings({
        principal: 10000,
        apy: 10,
        durationMonths: 60, // 5 years
        payoutSchedule: PayoutSchedule.MONTHLY,
        compounding: false
      });

      expect(result.totalEarnings).toBe(5000); // 5 years * 10%
    });
  });
});
