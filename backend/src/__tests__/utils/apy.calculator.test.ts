/**
 * APY Calculator Tests
 */

import {
  calculateSimpleInterest,
  calculateCompoundInterest,
  calculatePendingEarnings,
  calculateROI,
  calculateEffectiveAPY,
} from '../../utils/apy.calculator';
import { PayoutSchedule } from '../../types';

describe('APY Calculator', () => {
  describe('calculateSimpleInterest', () => {
    it('should calculate simple interest correctly', () => {
      const interest = calculateSimpleInterest({
        principal: 10000,
        apy: 10,
        durationDays: 365,
      });

      expect(interest).toBe(1000); // 10% of $10,000
    });

    it('should calculate pro-rated for partial year', () => {
      const halfYear = calculateSimpleInterest({
        principal: 10000,
        apy: 10,
        durationDays: 182.5, // Half year
      });

      expect(halfYear).toBeCloseTo(500, 0); // Half of 10%
    });

    it('should handle different APY rates', () => {
      const low = calculateSimpleInterest({
        principal: 10000,
        apy: 4,
        durationDays: 365,
      });

      const high = calculateSimpleInterest({
        principal: 10000,
        apy: 12,
        durationDays: 365,
      });

      expect(low).toBe(400);
      expect(high).toBe(1200);
    });
  });

  describe('calculateCompoundInterest', () => {
    it('should calculate compound interest for monthly compounding', () => {
      const result = calculateCompoundInterest({
        principal: 10000,
        apy: 10,
        durationDays: 365,
        payoutSchedule: 'MONTHLY' as PayoutSchedule,
      });

      expect(result.totalEarnings).toBeGreaterThan(1000); // More than simple interest
      expect(result.totalEarnings).toBeCloseTo(1047, 0); // Compound effect
    });

    it('should calculate compound interest for quarterly compounding', () => {
      const result = calculateCompoundInterest({
        principal: 10000,
        apy: 10,
        durationDays: 365,
        payoutSchedule: 'QUARTERLY' as PayoutSchedule,
      });

      expect(result.totalEarnings).toBeGreaterThan(1000);
      expect(result.totalEarnings).toBeLessThan(1047); // Less than monthly
    });

    it('should equal simple interest for end of term payout', () => {
      const compound = calculateCompoundInterest({
        principal: 10000,
        apy: 10,
        durationDays: 365,
        payoutSchedule: 'END_OF_TERM' as PayoutSchedule,
      });

      const simple = calculateSimpleInterest({
        principal: 10000,
        apy: 10,
        durationDays: 365,
      });

      expect(compound.totalEarnings).toBeCloseTo(simple, 1);
    });
  });

  describe('calculatePendingEarnings', () => {
    it('should calculate correct pending earnings', () => {
      const pending = calculatePendingEarnings({
        principal: 10000,
        apy: 12,
        startDate: new Date('2024-01-01'),
        currentDate: new Date('2024-01-31'), // 30 days
        lastPayoutDate: new Date('2024-01-01'),
      });

      // 30 days of 12% APY
      const expected = (10000 * 0.12 * 30) / 365;
      expect(pending).toBeCloseTo(expected, 1);
    });

    it('should return 0 if no time has passed', () => {
      const pending = calculatePendingEarnings({
        principal: 10000,
        apy: 12,
        startDate: new Date('2024-01-01'),
        currentDate: new Date('2024-01-01'),
        lastPayoutDate: new Date('2024-01-01'),
      });

      expect(pending).toBe(0);
    });

    it('should accumulate over time', () => {
      const oneMonth = calculatePendingEarnings({
        principal: 10000,
        apy: 12,
        startDate: new Date('2024-01-01'),
        currentDate: new Date('2024-02-01'),
        lastPayoutDate: new Date('2024-01-01'),
      });

      const twoMonths = calculatePendingEarnings({
        principal: 10000,
        apy: 12,
        startDate: new Date('2024-01-01'),
        currentDate: new Date('2024-03-01'),
        lastPayoutDate: new Date('2024-01-01'),
      });

      expect(twoMonths).toBeGreaterThan(oneMonth);
      expect(twoMonths).toBeCloseTo(oneMonth * 2, 0);
    });
  });

  describe('calculateROI', () => {
    it('should calculate ROI percentage correctly', () => {
      const roi = calculateROI({
        principal: 10000,
        totalEarnings: 1200,
      });

      expect(roi).toBe(12); // 12% ROI
    });

    it('should handle zero earnings', () => {
      const roi = calculateROI({
        principal: 10000,
        totalEarnings: 0,
      });

      expect(roi).toBe(0);
    });

    it('should handle fractional values', () => {
      const roi = calculateROI({
        principal: 7534.25,
        totalEarnings: 456.78,
      });

      expect(roi).toBeCloseTo(6.06, 2);
    });
  });

  describe('calculateEffectiveAPY', () => {
    it('should calculate effective APY with compounding', () => {
      const effective = calculateEffectiveAPY({
        nominalAPY: 10,
        compoundingFrequency: 12, // Monthly
      });

      expect(effective).toBeGreaterThan(10); // Effective > Nominal
      expect(effective).toBeCloseTo(10.47, 2);
    });

    it('should equal nominal for no compounding', () => {
      const effective = calculateEffectiveAPY({
        nominalAPY: 10,
        compoundingFrequency: 1, // Annual
      });

      expect(effective).toBeCloseTo(10, 2);
    });

    it('should increase with more frequent compounding', () => {
      const quarterly = calculateEffectiveAPY({
        nominalAPY: 10,
        compoundingFrequency: 4,
      });

      const monthly = calculateEffectiveAPY({
        nominalAPY: 10,
        compoundingFrequency: 12,
      });

      const daily = calculateEffectiveAPY({
        nominalAPY: 10,
        compoundingFrequency: 365,
      });

      expect(monthly).toBeGreaterThan(quarterly);
      expect(daily).toBeGreaterThan(monthly);
    });
  });

  describe('Payout Schedule Scenarios', () => {
    it('should match spec examples for 12% APY Elite vault', () => {
      // Elite 36M vault: $10,000 USDT, 12% APY, 36 months
      const result = calculateCompoundInterest({
        principal: 10000,
        apy: 12,
        durationDays: 36 * 30, // 36 months
        payoutSchedule: 'MONTHLY' as PayoutSchedule,
      });

      // After 3 years at 12% compounded monthly
      expect(result.totalEarnings).toBeGreaterThan(3600); // Simple interest baseline
      expect(result.totalEarnings).toBeLessThan(5000); // Reasonable upper bound
    });

    it('should handle monthly payouts for 12M vault', () => {
      const result = calculateCompoundInterest({
        principal: 5000,
        apy: 6,
        durationDays: 365,
        payoutSchedule: 'MONTHLY' as PayoutSchedule,
      });

      expect(result.totalEarnings).toBeGreaterThan(300); // 6% simple
      expect(result.payouts.length).toBe(12); // 12 monthly payouts
    });

    it('should handle quarterly payouts for 30M vault', () => {
      const result = calculateCompoundInterest({
        principal: 10000,
        apy: 7,
        durationDays: 30 * 30, // 30 months
        payoutSchedule: 'QUARTERLY' as PayoutSchedule,
      });

      expect(result.payouts.length).toBe(10); // 10 quarterly payouts in 30 months
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum investment', () => {
      const result = calculateSimpleInterest({
        principal: 100, // Minimum
        apy: 4,
        durationDays: 365,
      });

      expect(result).toBe(4); // $4 earnings
    });

    it('should handle maximum investment', () => {
      const result = calculateSimpleInterest({
        principal: 100000,
        apy: 12,
        durationDays: 36 * 30,
      });

      expect(result).toBeGreaterThan(30000); // Significant earnings
    });

    it('should handle fractional APY', () => {
      const result = calculateSimpleInterest({
        principal: 10000,
        apy: 5.75,
        durationDays: 365,
      });

      expect(result).toBe(575);
    });

    it('should handle leap years', () => {
      const result = calculateSimpleInterest({
        principal: 10000,
        apy: 10,
        durationDays: 366, // Leap year
      });

      expect(result).toBeGreaterThan(1000);
    });
  });
});
