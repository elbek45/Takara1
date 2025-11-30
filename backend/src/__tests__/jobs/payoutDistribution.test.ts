/**
 * Payout Distribution Job Tests
 *
 * Tests for USDT yield distribution and investment completion
 */

import {
  processPayoutDistribution,
  processInvestmentCompletion
} from '../../jobs/payoutDistribution';
import { prisma } from '../../config/database';
import { PayoutSchedule } from '../../config/vaults.config';

// Mock Prisma
jest.mock('../../config/database', () => ({
  prisma: {
    investment: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('pino', () => {
  return jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  });
});

describe('Payout Distribution Job', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processPayoutDistribution', () => {
    it('should process payouts for due investments', async () => {
      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const mockInvestments = [
        {
          id: 'inv-1',
          usdtAmount: 10000,
          finalAPY: 8,
          startDate: new Date('2024-01-01'),
          nextPayoutDate: now,
          endDate: nextMonth,
          lastClaimDate: null,
          pendingUSDT: 0,
          vault: {
            payoutSchedule: PayoutSchedule.MONTHLY,
          },
        },
      ];

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue(mockInvestments[0]);

      await processPayoutDistribution();

      expect(prisma.investment.findMany).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
          nextPayoutDate: {
            lte: expect.any(Date),
          },
        },
        include: {
          vault: true,
        },
      });

      expect(prisma.investment.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          pendingUSDT: {
            increment: expect.any(Number),
          },
          nextPayoutDate: expect.any(Date),
        },
      });
    });

    it('should skip if no payouts due', async () => {
      (prisma.investment.findMany as jest.Mock).mockResolvedValue([]);

      await processPayoutDistribution();

      expect(prisma.investment.update).not.toHaveBeenCalled();
    });

    it('should calculate next payout date for monthly schedule', async () => {
      const now = new Date('2024-06-01');
      const endDate = new Date('2025-06-01');

      const mockInvestments = [
        {
          id: 'inv-1',
          usdtAmount: 10000,
          finalAPY: 8,
          startDate: new Date('2024-01-01'),
          nextPayoutDate: now,
          endDate,
          lastClaimDate: null,
          vault: {
            payoutSchedule: PayoutSchedule.MONTHLY,
          },
        },
      ];

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue(mockInvestments[0]);

      await processPayoutDistribution();

      const updateCall = (prisma.investment.update as jest.Mock).mock.calls[0][0];
      const nextPayout = updateCall.data.nextPayoutDate;

      expect(nextPayout).toBeDefined();
      expect(nextPayout.getMonth()).toBe(6); // July (0-indexed)
    });

    it('should calculate next payout date for quarterly schedule', async () => {
      const now = new Date('2024-03-01');
      const endDate = new Date('2025-03-01');

      const mockInvestments = [
        {
          id: 'inv-1',
          usdtAmount: 10000,
          finalAPY: 7,
          startDate: new Date('2024-01-01'),
          nextPayoutDate: now,
          endDate,
          lastClaimDate: null,
          vault: {
            payoutSchedule: PayoutSchedule.QUARTERLY,
          },
        },
      ];

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue(mockInvestments[0]);

      await processPayoutDistribution();

      const updateCall = (prisma.investment.update as jest.Mock).mock.calls[0][0];
      const nextPayout = updateCall.data.nextPayoutDate;

      expect(nextPayout.getMonth()).toBe(5); // June (0-indexed, 3 months from March)
    });

    it('should handle end of term payout', async () => {
      const now = new Date('2024-12-31');
      const endDate = new Date('2024-12-31');

      const mockInvestments = [
        {
          id: 'inv-1',
          usdtAmount: 10000,
          finalAPY: 6,
          startDate: new Date('2024-01-01'),
          nextPayoutDate: now,
          endDate,
          lastClaimDate: null,
          vault: {
            payoutSchedule: PayoutSchedule.END_OF_TERM,
          },
        },
      ];

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue(mockInvestments[0]);

      await processPayoutDistribution();

      const updateCall = (prisma.investment.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.nextPayoutDate).toBeDefined();
    });

    it('should set nextPayoutDate to null if past endDate', async () => {
      const now = new Date('2024-12-01');
      const endDate = new Date('2024-12-15'); // End date is in the middle of the next payout period

      const mockInvestments = [
        {
          id: 'inv-1',
          usdtAmount: 10000,
          finalAPY: 8,
          startDate: new Date('2024-01-01'),
          nextPayoutDate: now,
          endDate,
          lastClaimDate: null,
          vault: {
            payoutSchedule: PayoutSchedule.MONTHLY,
          },
        },
      ];

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue(mockInvestments[0]);

      await processPayoutDistribution();

      const updateCall = (prisma.investment.update as jest.Mock).mock.calls[0][0];
      const nextPayout = updateCall.data.nextPayoutDate;

      // Next payout would be Jan 2025, which is after end date, so should be null
      expect(nextPayout).toBeNull();
    });

    it('should skip investments with no pending earnings', async () => {
      const now = new Date();

      const mockInvestments = [
        {
          id: 'inv-1',
          usdtAmount: 10000,
          finalAPY: 8,
          startDate: now, // Just started, no earnings yet
          nextPayoutDate: now,
          endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          lastClaimDate: now, // Just claimed
          vault: {
            payoutSchedule: PayoutSchedule.MONTHLY,
          },
        },
      ];

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);

      await processPayoutDistribution();

      expect(prisma.investment.update).not.toHaveBeenCalled();
    });

    it('should handle multiple investments', async () => {
      const now = new Date();
      const endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      const mockInvestments = [
        {
          id: 'inv-1',
          usdtAmount: 10000,
          finalAPY: 8,
          startDate: new Date('2024-01-01'),
          nextPayoutDate: now,
          endDate,
          lastClaimDate: null,
          vault: {
            payoutSchedule: PayoutSchedule.MONTHLY,
          },
        },
        {
          id: 'inv-2',
          usdtAmount: 5000,
          finalAPY: 6,
          startDate: new Date('2024-01-01'),
          nextPayoutDate: now,
          endDate,
          lastClaimDate: null,
          vault: {
            payoutSchedule: PayoutSchedule.QUARTERLY,
          },
        },
      ];

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue({});

      await processPayoutDistribution();

      expect(prisma.investment.update).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures gracefully', async () => {
      const now = new Date();
      const endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      const mockInvestments = [
        {
          id: 'inv-1',
          usdtAmount: 10000,
          finalAPY: 8,
          startDate: new Date('2024-01-01'),
          nextPayoutDate: now,
          endDate,
          lastClaimDate: null,
          vault: {
            payoutSchedule: PayoutSchedule.MONTHLY,
          },
        },
        {
          id: 'inv-2',
          usdtAmount: 5000,
          finalAPY: 6,
          startDate: new Date('2024-01-01'),
          nextPayoutDate: now,
          endDate,
          lastClaimDate: null,
          vault: {
            payoutSchedule: PayoutSchedule.MONTHLY,
          },
        },
      ];

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock)
        .mockResolvedValueOnce(mockInvestments[0])
        .mockRejectedValueOnce(new Error('DB Error'));

      await processPayoutDistribution();

      expect(prisma.investment.update).toHaveBeenCalledTimes(2);
    });

    it('should calculate correct pending earnings since last claim', async () => {
      const now = new Date('2024-06-01');
      const startDate = new Date('2024-01-01');
      const lastClaimDate = new Date('2024-05-01'); // Claimed 1 month ago

      const mockInvestments = [
        {
          id: 'inv-1',
          usdtAmount: 12000,
          finalAPY: 12, // 12% APY = 1% per month = 120 USDT per month
          startDate,
          nextPayoutDate: now,
          endDate: new Date('2025-01-01'),
          lastClaimDate,
          vault: {
            payoutSchedule: PayoutSchedule.MONTHLY,
          },
        },
      ];

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue({});

      await processPayoutDistribution();

      const updateCall = (prisma.investment.update as jest.Mock).mock.calls[0][0];
      const incrementedAmount = updateCall.data.pendingUSDT.increment;

      // Approximately 1 month of earnings
      expect(incrementedAmount).toBeGreaterThan(0);
      expect(incrementedAmount).toBeLessThan(200); // Should be around 120 USDT
    });
  });

  describe('processInvestmentCompletion', () => {
    it('should mark completed investments as COMPLETED', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday

      const mockInvestments = [
        {
          id: 'inv-1',
          status: 'ACTIVE',
          endDate: pastDate,
        },
        {
          id: 'inv-2',
          status: 'ACTIVE',
          endDate: pastDate,
        },
      ];

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      await processInvestmentCompletion();

      expect(prisma.investment.findMany).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
          endDate: {
            lte: expect.any(Date),
          },
        },
      });

      expect(prisma.investment.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['inv-1', 'inv-2'],
          },
        },
        data: {
          status: 'COMPLETED',
        },
      });
    });

    it('should skip if no completed investments', async () => {
      (prisma.investment.findMany as jest.Mock).mockResolvedValue([]);

      await processInvestmentCompletion();

      expect(prisma.investment.updateMany).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      (prisma.investment.findMany as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await expect(processInvestmentCompletion()).resolves.not.toThrow();
    });

    it('should not mark future investments as completed', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      const mockInvestments: any[] = [];

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);

      await processInvestmentCompletion();

      expect(prisma.investment.updateMany).not.toHaveBeenCalled();
    });

    it('should handle large batch of completed investments', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const mockInvestments = Array(100).fill(null).map((_, i) => ({
        id: `inv-${i}`,
        status: 'ACTIVE',
        endDate: pastDate,
      }));

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.updateMany as jest.Mock).mockResolvedValue({ count: 100 });

      await processInvestmentCompletion();

      expect(prisma.investment.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: mockInvestments.map(inv => inv.id),
          },
        },
        data: {
          status: 'COMPLETED',
        },
      });
    });
  });
});
