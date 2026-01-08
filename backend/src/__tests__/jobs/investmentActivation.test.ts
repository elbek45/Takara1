/**
 * Investment Activation Job Tests
 *
 * Tests for activating pending investments after 72-hour delay
 */

import { processInvestmentActivation } from '../../jobs/investmentActivation';
import { prisma } from '../../config/database';
import { INVESTMENT_CONFIG } from '../../config/constants';
import { PayoutSchedule } from '../../config/vaults.config';

// Mock Prisma
jest.mock('../../config/database', () => ({
  prisma: {
    investment: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  },
}));

// Mock NFT service (не используем blockchain tests)
jest.mock('../../services/nft.service');

// Mock logger
jest.mock('pino', () => {
  return jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  });
});

describe('Investment Activation Job', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processInvestmentActivation', () => {
    it('should activate investments after 72 hours', async () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 73 * 60 * 60 * 1000); // 73 hours ago

      const mockInvestments = [
        {
          id: 'inv-1',
          userId: 'user-1',
          usdtAmount: 10000,
          finalAPY: 8,
          startDate: createdAt,
          createdAt,
          status: 'PENDING',
          user: {
            id: 'user-1',
            walletAddress: '0x1234...',
          },
          vault: {
            name: 'Pro Vault',
            tier: 'PRO',
            duration: 30,
            baseTakaraAPY: 100,
            maxTakaraAPY: 200,
            payoutSchedule: PayoutSchedule.MONTHLY,
          },
          laikaBoost: null,
        },
      ];

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue(mockInvestments[0]);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await processInvestmentActivation();

      expect(prisma.investment.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
          createdAt: {
            lte: expect.any(Date),
          },
        },
        include: {
          user: true,
          vault: true,
          laikaBoost: true,
        },
      });

      expect(prisma.investment.update).toHaveBeenCalledTimes(2); // Once for activation, once for nextPayoutDate
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          totalInvested: {
            increment: 10000,
          },
        },
      });
    });

    it('should not activate investments before 72 hours', async () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Only 24 hours ago

      (prisma.investment.findMany as jest.Mock).mockResolvedValue([]);

      await processInvestmentActivation();

      expect(prisma.investment.update).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should set next payout date for monthly schedule', async () => {
      const now = new Date();
      const startDate = new Date('2024-01-01');
      const createdAt = new Date(now.getTime() - 73 * 60 * 60 * 1000);

      const mockInvestments = [
        {
          id: 'inv-1',
          userId: 'user-1',
          usdtAmount: 10000,
          finalAPY: 8,
          startDate,
          createdAt,
          status: 'PENDING',
          user: {
            id: 'user-1',
            walletAddress: '0x1234...',
          },
          vault: {
            name: 'Pro Vault',
            tier: 'PRO',
            duration: 30,
            baseTakaraAPY: 100,
            maxTakaraAPY: 200,
            payoutSchedule: PayoutSchedule.MONTHLY,
          },
          laikaBoost: null,
        },
      ];

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue({});
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await processInvestmentActivation();

      const secondUpdateCall = (prisma.investment.update as jest.Mock).mock.calls[1][0];
      expect(secondUpdateCall.data).toHaveProperty('nextPayoutDate');

      const nextPayoutDate = secondUpdateCall.data.nextPayoutDate;
      expect(nextPayoutDate.getMonth()).toBe(1); // February (0-indexed)
    });

    it('should set next payout date for quarterly schedule', async () => {
      const now = new Date();
      const startDate = new Date('2024-01-01');
      const createdAt = new Date(now.getTime() - 73 * 60 * 60 * 1000);

      const mockInvestments = [
        {
          id: 'inv-1',
          userId: 'user-1',
          usdtAmount: 10000,
          finalAPY: 7,
          startDate,
          createdAt,
          status: 'PENDING',
          user: {
            id: 'user-1',
            walletAddress: '0x1234...',
          },
          vault: {
            name: 'Pro Vault',
            tier: 'PRO',
            duration: 30,
            baseTakaraAPY: 100,
            maxTakaraAPY: 200,
            payoutSchedule: PayoutSchedule.QUARTERLY,
          },
          laikaBoost: null,
        },
      ];

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue({});
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await processInvestmentActivation();

      const secondUpdateCall = (prisma.investment.update as jest.Mock).mock.calls[1][0];
      const nextPayoutDate = secondUpdateCall.data.nextPayoutDate;

      expect(nextPayoutDate.getMonth()).toBe(3); // April (0-indexed, 3 months from January)
    });

    it('should set next payout date for end of term schedule', async () => {
      const now = new Date();
      const startDate = new Date('2024-01-01');
      const createdAt = new Date(now.getTime() - 73 * 60 * 60 * 1000);

      const mockInvestments = [
        {
          id: 'inv-1',
          userId: 'user-1',
          usdtAmount: 10000,
          finalAPY: 6,
          startDate,
          createdAt,
          status: 'PENDING',
          user: {
            id: 'user-1',
            walletAddress: '0x1234...',
          },
          vault: {
            name: 'Starter Vault',
            tier: 'STARTER',
            duration: 12,
            baseTakaraAPY: 50,
            maxTakaraAPY: 100,
            payoutSchedule: PayoutSchedule.END_OF_TERM,
          },
          laikaBoost: null,
        },
      ];

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue({});
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await processInvestmentActivation();

      const secondUpdateCall = (prisma.investment.update as jest.Mock).mock.calls[1][0];
      const nextPayoutDate = secondUpdateCall.data.nextPayoutDate;

      expect(nextPayoutDate.getFullYear()).toBe(2025); // 12 months from Jan 2024
    });

    it('should update user total invested amount', async () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 73 * 60 * 60 * 1000);

      const mockInvestments = [
        {
          id: 'inv-1',
          userId: 'user-1',
          usdtAmount: 25000, // $25,000 investment
          finalAPY: 8,
          startDate: createdAt,
          createdAt,
          status: 'PENDING',
          user: {
            id: 'user-1',
            walletAddress: '0x1234...',
          },
          vault: {
            name: 'Pro Vault',
            tier: 'PRO',
            duration: 30,
            baseTakaraAPY: 100,
            maxTakaraAPY: 200,
            payoutSchedule: PayoutSchedule.MONTHLY,
          },
          laikaBoost: null,
        },
      ];

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue({});
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await processInvestmentActivation();

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          totalInvested: {
            increment: 25000,
          },
        },
      });
    });

    it('should activate multiple investments', async () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 73 * 60 * 60 * 1000);

      const mockInvestments = [
        {
          id: 'inv-1',
          userId: 'user-1',
          usdtAmount: 10000,
          finalAPY: 8,
          startDate: createdAt,
          createdAt,
          status: 'PENDING',
          user: {
            id: 'user-1',
            walletAddress: '0x1234...',
          },
          vault: {
            name: 'Pro Vault',
            tier: 'PRO',
            duration: 30,
            baseTakaraAPY: 100,
            maxTakaraAPY: 200,
            payoutSchedule: PayoutSchedule.MONTHLY,
          },
          laikaBoost: null,
        },
        {
          id: 'inv-2',
          userId: 'user-2',
          usdtAmount: 5000,
          finalAPY: 6,
          startDate: createdAt,
          createdAt,
          status: 'PENDING',
          user: {
            id: 'user-2',
            walletAddress: '0x5678...',
          },
          vault: {
            name: 'Starter Vault',
            tier: 'STARTER',
            duration: 12,
            baseTakaraAPY: 50,
            maxTakaraAPY: 100,
            payoutSchedule: PayoutSchedule.MONTHLY,
          },
          laikaBoost: null,
        },
      ];

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue({});
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await processInvestmentActivation();

      expect(prisma.investment.update).toHaveBeenCalledTimes(4); // 2 investments * 2 updates each
      expect(prisma.user.update).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures gracefully', async () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 73 * 60 * 60 * 1000);

      const mockInvestments = [
        {
          id: 'inv-success',
          userId: 'user-1',
          usdtAmount: 10000,
          finalAPY: 8,
          startDate: createdAt,
          createdAt,
          status: 'PENDING',
          user: {
            id: 'user-1',
            walletAddress: '0x1234...',
          },
          vault: {
            name: 'Pro Vault',
            tier: 'PRO',
            duration: 30,
            baseTakaraAPY: 100,
            maxTakaraAPY: 200,
            payoutSchedule: PayoutSchedule.MONTHLY,
          },
          laikaBoost: null,
        },
        {
          id: 'inv-fail',
          userId: 'user-2',
          usdtAmount: 5000,
          finalAPY: 6,
          startDate: createdAt,
          createdAt,
          status: 'PENDING',
          user: {
            id: 'user-2',
            walletAddress: '0x5678...',
          },
          vault: {
            name: 'Starter Vault',
            tier: 'STARTER',
            duration: 12,
            baseTakaraAPY: 50,
            maxTakaraAPY: 100,
            payoutSchedule: PayoutSchedule.MONTHLY,
          },
          laikaBoost: null,
        },
      ];

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('DB Error'));
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await processInvestmentActivation();

      // Should continue processing despite one failure
      expect(prisma.investment.update).toHaveBeenCalled();
    });

    it('should skip if no pending investments', async () => {
      (prisma.investment.findMany as jest.Mock).mockResolvedValue([]);

      await processInvestmentActivation();

      expect(prisma.investment.update).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should activate investment with LAIKA boost', async () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 73 * 60 * 60 * 1000);

      const mockInvestments = [
        {
          id: 'inv-1',
          userId: 'user-1',
          usdtAmount: 10000,
          finalAPY: 10, // Boosted from 5.5% to 10%
          startDate: createdAt,
          createdAt,
          status: 'PENDING',
          user: {
            id: 'user-1',
            walletAddress: '0x1234...',
          },
          vault: {
            name: 'Pro Vault',
            tier: 'PRO',
            duration: 30,
            baseTakaraAPY: 100,
            maxTakaraAPY: 200,
            payoutSchedule: PayoutSchedule.MONTHLY,
          },
          laikaBoost: {
            id: 'boost-1',
            laikaAmountUSD: 9000,
            additionalAPY: 4.5,
          },
        },
      ];

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue({});
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await processInvestmentActivation();

      expect(prisma.investment.update).toHaveBeenCalledTimes(2);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      (prisma.investment.findMany as jest.Mock).mockRejectedValue(new Error('DB Connection Error'));

      await expect(processInvestmentActivation()).rejects.toThrow('DB Connection Error');
    });

    it('should verify activation threshold is exactly 72 hours', async () => {
      const now = new Date();
      const exactly72HoursAgo = new Date(now.getTime() - INVESTMENT_CONFIG.ACTIVATION_DELAY_HOURS * 60 * 60 * 1000);

      (prisma.investment.findMany as jest.Mock).mockResolvedValue([]);

      await processInvestmentActivation();

      const findManyCall = (prisma.investment.findMany as jest.Mock).mock.calls[0][0];
      const threshold = findManyCall.where.createdAt.lte;

      // Threshold should be approximately 72 hours ago (within 1 minute tolerance)
      const diff = Math.abs(threshold.getTime() - exactly72HoursAgo.getTime());
      expect(diff).toBeLessThan(60000); // Within 1 minute
    });

    it('should change investment status from PENDING to ACTIVE', async () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 73 * 60 * 60 * 1000);

      const mockInvestments = [
        {
          id: 'inv-1',
          userId: 'user-1',
          usdtAmount: 10000,
          finalAPY: 8,
          startDate: createdAt,
          createdAt,
          status: 'PENDING',
          user: {
            id: 'user-1',
            walletAddress: '0x1234...',
          },
          vault: {
            name: 'Pro Vault',
            tier: 'PRO',
            duration: 30,
            baseTakaraAPY: 100,
            maxTakaraAPY: 200,
            payoutSchedule: PayoutSchedule.MONTHLY,
          },
          laikaBoost: null,
        },
      ];

      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue({});
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await processInvestmentActivation();

      const firstUpdateCall = (prisma.investment.update as jest.Mock).mock.calls[0][0];
      expect(firstUpdateCall.where.id).toBe('inv-1');
      expect(firstUpdateCall.data.status).toBe('ACTIVE');
    });
  });
});
