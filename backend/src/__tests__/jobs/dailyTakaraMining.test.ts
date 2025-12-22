/**
 * Daily TAKARA Mining Job Tests
 *
 * Tests for daily mining reward calculation and distribution
 */

import { processDailyMining } from '../../jobs/dailyTakaraMining';
import { prisma } from '../../config/database';
import { TAKARA_CONFIG } from '../../utils/mining.calculator';

// Mock Prisma
jest.mock('../../config/database', () => ({
  prisma: {
    miningStats: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    investment: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    takaraMining: {
      createMany: jest.fn(),
    },
  },
}));

// Mock logger to prevent console spam
jest.mock('pino', () => {
  return jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  });
});

describe('Daily TAKARA Mining Job', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processDailyMining', () => {
    it('should process mining for active investments', async () => {
      const mockStats = {
        id: '1',
        date: new Date(),
        totalMined: 100000,
        activeMiners: 5,
        currentDifficulty: 1.0,
      };

      const mockInvestments = [
        {
          id: 'inv-1',
          usdtAmount: 10000,
          pendingTAKARA: 0,
          status: 'ACTIVE',
          vault: {
            takaraAPY: 100,
            duration: 30,
          },
        },
        {
          id: 'inv-2',
          usdtAmount: 5000,
          pendingTAKARA: 0,
          status: 'ACTIVE',
          vault: {
            takaraAPY: 50,
            duration: 12,
          },
        },
      ];

      (prisma.miningStats.findFirst as jest.Mock).mockResolvedValue(mockStats);
      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockImplementation((args) =>
        Promise.resolve({ ...mockInvestments.find(i => i.id === args.where.id) })
      );
      (prisma.takaraMining.createMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.miningStats.create as jest.Mock).mockResolvedValue(mockStats);

      await processDailyMining();

      expect(prisma.miningStats.findFirst).toHaveBeenCalledWith({
        orderBy: { date: 'desc' },
      });

      expect(prisma.investment.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        include: { vault: true },
      });

      expect(prisma.investment.update).toHaveBeenCalledTimes(2);
      expect(prisma.takaraMining.createMany).toHaveBeenCalled();
      expect(prisma.miningStats.create).toHaveBeenCalled();
    });

    it('should handle no previous mining stats', async () => {
      const mockInvestments = [
        {
          id: 'inv-1',
          usdtAmount: 1000,
          pendingTAKARA: 0,
          status: 'ACTIVE',
          vault: {
            takaraAPY: 50,
            duration: 12,
          },
        },
      ];

      (prisma.miningStats.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue(mockInvestments[0]);
      (prisma.takaraMining.createMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.miningStats.create as jest.Mock).mockResolvedValue({});

      await processDailyMining();

      // Should use 0 as totalMinedSoFar
      expect(prisma.miningStats.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          totalMined: expect.any(Number),
          activeMiners: 1,
          currentDifficulty: expect.any(Number),
        }),
      });
    });

    it('should skip processing if no active investments', async () => {
      (prisma.miningStats.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.investment.findMany as jest.Mock).mockResolvedValue([]);

      await processDailyMining();

      expect(prisma.investment.update).not.toHaveBeenCalled();
      expect(prisma.takaraMining.createMany).not.toHaveBeenCalled();
      expect(prisma.miningStats.create).not.toHaveBeenCalled();
    });

    it('should calculate difficulty based on total mined and active miners', async () => {
      const mockStats = {
        totalMined: TAKARA_CONFIG.TOTAL_SUPPLY * 0.1, // 10% mined
        activeMiners: 1000,
      };

      const mockInvestments = Array(1000).fill(null).map((_, i) => ({
        id: `inv-${i}`,
        usdtAmount: 1000,
        pendingTAKARA: 0,
        status: 'ACTIVE',
        vault: {
          miningPower: 100,
          duration: 12,
        },
      }));

      (prisma.miningStats.findFirst as jest.Mock).mockResolvedValue(mockStats);
      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue({});
      (prisma.takaraMining.createMany as jest.Mock).mockResolvedValue({ count: 1000 });
      (prisma.miningStats.create as jest.Mock).mockResolvedValue({});

      await processDailyMining();

      // Difficulty should be higher with 10% mined and 1000 active miners
      const createCall = (prisma.miningStats.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.currentDifficulty).toBeGreaterThan(1.0);
    });

    it('should update pending TAKARA for each investment', async () => {
      const mockInvestments = [
        {
          id: 'inv-1',
          usdtAmount: 10000,
          pendingTAKARA: 50,
          status: 'ACTIVE',
          vault: {
            takaraAPY: 100,
            duration: 30,
          },
        },
      ];

      (prisma.miningStats.findFirst as jest.Mock).mockResolvedValue({
        totalMined: 0,
        activeMiners: 1,
      });
      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue(mockInvestments[0]);
      (prisma.takaraMining.createMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.miningStats.create as jest.Mock).mockResolvedValue({});

      await processDailyMining();

      expect(prisma.investment.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          pendingTAKARA: {
            increment: expect.any(Number),
          },
        },
      });
    });

    it('should create mining records for all investments', async () => {
      const mockInvestments = [
        {
          id: 'inv-1',
          usdtAmount: 10000,
          pendingTAKARA: 0,
          status: 'ACTIVE',
          vault: {
            takaraAPY: 100,
            duration: 30,
          },
        },
        {
          id: 'inv-2',
          usdtAmount: 5000,
          pendingTAKARA: 0,
          status: 'ACTIVE',
          vault: {
            takaraAPY: 50,
            duration: 12,
          },
        },
      ];

      (prisma.miningStats.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue({});
      (prisma.takaraMining.createMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.miningStats.create as jest.Mock).mockResolvedValue({});

      await processDailyMining();

      expect(prisma.takaraMining.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            investmentId: 'inv-1',
            miningPower: 100,
            difficulty: expect.any(Number),
            takaraMinedRaw: expect.any(Number),
            takaraMinedFinal: expect.any(Number),
          }),
          expect.objectContaining({
            investmentId: 'inv-2',
            miningPower: 50,
            difficulty: expect.any(Number),
            takaraMinedRaw: expect.any(Number),
            takaraMinedFinal: expect.any(Number),
          }),
        ]),
      });
    });

    it('should create daily mining stats', async () => {
      const mockInvestments = [
        {
          id: 'inv-1',
          usdtAmount: 1000,
          pendingTAKARA: 0,
          status: 'ACTIVE',
          vault: {
            takaraAPY: 50,
            duration: 12,
          },
        },
      ];

      (prisma.miningStats.findFirst as jest.Mock).mockResolvedValue({
        totalMined: 10000,
        activeMiners: 1,
      });
      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue({});
      (prisma.takaraMining.createMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.miningStats.create as jest.Mock).mockResolvedValue({});

      await processDailyMining();

      expect(prisma.miningStats.create).toHaveBeenCalledWith({
        data: {
          date: expect.any(Date),
          totalMined: expect.any(Number),
          activeMiners: 1,
          currentDifficulty: expect.any(Number),
        },
      });

      const createCall = (prisma.miningStats.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.totalMined).toBeGreaterThan(10000);
    });

    it('should handle partial investment processing failures', async () => {
      const mockInvestments = [
        {
          id: 'inv-1',
          usdtAmount: 10000,
          pendingTAKARA: 0,
          status: 'ACTIVE',
          vault: {
            takaraAPY: 100,
            duration: 30,
          },
        },
        {
          id: 'inv-2',
          usdtAmount: 5000,
          pendingTAKARA: 0,
          status: 'ACTIVE',
          vault: {
            takaraAPY: 50,
            duration: 12,
          },
        },
      ];

      (prisma.miningStats.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock)
        .mockResolvedValueOnce(mockInvestments[0])
        .mockRejectedValueOnce(new Error('DB Error'));
      (prisma.takaraMining.createMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.miningStats.create as jest.Mock).mockResolvedValue({});

      await processDailyMining();

      // Should still create mining record for successful investment
      expect(prisma.takaraMining.createMany).toHaveBeenCalled();
      const createCall = (prisma.takaraMining.createMany as jest.Mock).mock.calls[0][0];
      expect(createCall.data).toHaveLength(1);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.miningStats.findFirst as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await expect(processDailyMining()).rejects.toThrow('DB Error');
    });

    it('should correctly calculate mining with different mining powers', async () => {
      const mockInvestments = [
        {
          id: 'inv-starter',
          usdtAmount: 1000,
          pendingTAKARA: 0,
          status: 'ACTIVE',
          vault: {
            miningPower: 50, // Starter
            duration: 12,
          },
        },
        {
          id: 'inv-pro',
          usdtAmount: 10000,
          pendingTAKARA: 0,
          status: 'ACTIVE',
          vault: {
            miningPower: 100, // Pro
            duration: 30,
          },
        },
        {
          id: 'inv-elite',
          usdtAmount: 50000,
          pendingTAKARA: 0,
          status: 'ACTIVE',
          vault: {
            takaraAPY: 350, // Elite
            duration: 36,
          },
        },
      ];

      (prisma.miningStats.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue({});
      (prisma.takaraMining.createMany as jest.Mock).mockResolvedValue({ count: 3 });
      (prisma.miningStats.create as jest.Mock).mockResolvedValue({});

      await processDailyMining();

      // Verify mining records created with different mining powers
      const createCall = (prisma.takaraMining.createMany as jest.Mock).mock.calls[0][0];
      expect(createCall.data).toHaveLength(3);
      expect(createCall.data[0].miningPower).toBe(50);
      expect(createCall.data[1].miningPower).toBe(100);
      expect(createCall.data[2].miningPower).toBe(350);
    });

    it('should track total mined correctly over time', async () => {
      const previousTotal = 1000000;
      const mockInvestments = [
        {
          id: 'inv-1',
          usdtAmount: 10000,
          pendingTAKARA: 0,
          status: 'ACTIVE',
          vault: {
            takaraAPY: 100,
            duration: 30,
          },
        },
      ];

      (prisma.miningStats.findFirst as jest.Mock).mockResolvedValue({
        totalMined: previousTotal,
        activeMiners: 1,
      });
      (prisma.investment.findMany as jest.Mock).mockResolvedValue(mockInvestments);
      (prisma.investment.update as jest.Mock).mockResolvedValue({});
      (prisma.takaraMining.createMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.miningStats.create as jest.Mock).mockResolvedValue({});

      await processDailyMining();

      const statsCall = (prisma.miningStats.create as jest.Mock).mock.calls[0][0];
      expect(statsCall.data.totalMined).toBeGreaterThan(previousTotal);
      expect(statsCall.data.totalMined).toBeLessThan(TAKARA_CONFIG.TOTAL_SUPPLY);
    });
  });
});
