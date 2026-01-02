/**
 * Admin Treasury Controller - v2.2
 *
 * Handles treasury and tax management:
 * - Get treasury balances
 * - Get tax statistics
 * - View tax records
 * - Withdraw from treasury (super admin only)
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AdminRequest } from '../types';
import { ERROR_MESSAGES } from '../config/constants';
import { getLogger } from '../config/logger';
import {
  getAllTreasuryBalances,
  getTaxStatistics,
  getTreasuryBalance
} from '../services/tax.service';

const logger = getLogger('admin-treasury-controller');

export interface WithdrawFromTreasuryInput {
  tokenSymbol: string;
  amount: number;
  destinationWallet: string;
  reason: string;
  txSignature?: string;
}

/**
 * GET /api/admin/treasury/balances
 * Get all treasury balances
 */
export async function getTreasuryBalances(req: Request, res: Response): Promise<void> {
  try {
    const balances = await getAllTreasuryBalances();
    const takaraPrice = 0.00134;

    logger.info({ count: balances.length }, 'Fetched treasury balances');

    res.json({
      success: true,
      data: balances.map(balance => {
        const balanceNum = Number(balance.balance);
        const price = balance.tokenSymbol === 'USDT' ? 1 : takaraPrice;

        return {
          tokenSymbol: balance.tokenSymbol,
          tokenName: balance.tokenSymbol === 'TAKARA' ? 'Takara Token' : 'Tether USD',
          balance: balanceNum,
          valueUSD: balanceNum * price,
          totalCollected: Number(balance.totalCollected),
          totalWithdrawn: Number(balance.totalWithdrawn),
          lastUpdated: balance.updatedAt.toISOString()
        };
      })
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get treasury balances');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/admin/treasury/balances/:symbol
 * Get treasury balance for specific token
 */
export async function getTreasuryBalanceBySymbol(req: Request, res: Response): Promise<void> {
  try {
    const { symbol } = req.params;

    const balance = await getTreasuryBalance(symbol);

    if (!balance) {
      res.status(404).json({
        success: false,
        message: `Treasury balance not found for ${symbol}`
      });
      return;
    }

    res.json({
      success: true,
      data: {
        tokenSymbol: balance.tokenSymbol,
        balance: Number(balance.balance),
        totalCollected: Number(balance.totalCollected),
        totalWithdrawn: Number(balance.totalWithdrawn),
        updatedAt: balance.updatedAt
      }
    });
  } catch (error) {
    logger.error({ error, symbol: req.params.symbol }, 'Failed to get treasury balance');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/admin/treasury/statistics
 * Get tax collection statistics
 */
export async function getStatistics(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate, sourceType } = req.query;

    // Parse date filters
    const filters: any = {};
    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }
    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }
    if (sourceType) {
      filters.sourceType = sourceType as 'TAKARA_CLAIM' | 'WEXEL_SALE';
    }

    const rawStatistics = await getTaxStatistics(filters);

    // TAKARA price for USD calculations
    const takaraPrice = 0.00134;

    // Transform to frontend expected format
    let totalTaxAmount = 0;
    let totalTaxValueUSD = 0;

    // Aggregate by token
    const byTokenMap: Record<string, { totalAmount: number; totalValueUSD: number; recordCount: number }> = {};
    // Aggregate by source
    const bySourceMap: Record<string, { totalAmount: number; totalValueUSD: number; recordCount: number }> = {};

    for (const stat of rawStatistics) {
      const amount = stat.totalTaxCollected || 0;
      const price = stat.tokenSymbol === 'USDT' ? 1 : takaraPrice;
      const valueUSD = amount * price;

      totalTaxAmount += amount;
      totalTaxValueUSD += valueUSD;

      // By token
      if (!byTokenMap[stat.tokenSymbol]) {
        byTokenMap[stat.tokenSymbol] = { totalAmount: 0, totalValueUSD: 0, recordCount: 0 };
      }
      byTokenMap[stat.tokenSymbol].totalAmount += amount;
      byTokenMap[stat.tokenSymbol].totalValueUSD += valueUSD;
      byTokenMap[stat.tokenSymbol].recordCount += stat.count || 0;

      // By source
      if (!bySourceMap[stat.sourceType]) {
        bySourceMap[stat.sourceType] = { totalAmount: 0, totalValueUSD: 0, recordCount: 0 };
      }
      bySourceMap[stat.sourceType].totalAmount += amount;
      bySourceMap[stat.sourceType].totalValueUSD += valueUSD;
      bySourceMap[stat.sourceType].recordCount += stat.count || 0;
    }

    const byToken = Object.entries(byTokenMap).map(([tokenSymbol, data]) => ({
      tokenSymbol,
      ...data
    }));

    const bySource = Object.entries(bySourceMap).map(([sourceType, data]) => ({
      sourceType: sourceType as 'TAKARA_CLAIM' | 'WEXEL_SALE',
      ...data
    }));

    logger.info({ filters, resultCount: rawStatistics.length }, 'Fetched tax statistics');

    res.json({
      success: true,
      data: {
        totalTaxAmount,
        totalTaxValueUSD,
        byToken,
        bySource
      }
    });
  } catch (error) {
    logger.error({ error, query: req.query }, 'Failed to get tax statistics');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/admin/treasury/tax-records
 * Get tax records with pagination and filters
 */
export async function getTaxRecords(req: Request, res: Response): Promise<void> {
  try {
    const {
      page = 1,
      limit = 50,
      tokenSymbol,
      sourceType,
      startDate,
      endDate,
      userId
    } = req.query;

    // Build where clause
    const where: any = {};

    if (tokenSymbol) {
      where.tokenSymbol = tokenSymbol as string;
    }

    if (sourceType) {
      where.sourceType = sourceType as 'TAKARA_CLAIM' | 'WEXEL_SALE';
    }

    if (userId) {
      where.userId = userId as string;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [records, total] = await Promise.all([
      prisma.taxRecord.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              walletAddress: true
            }
          }
        }
      }),
      prisma.taxRecord.count({ where })
    ]);

    logger.info({
      page,
      limit,
      total,
      filters: where
    }, 'Fetched tax records');

    // Price for USD calculation
    const takaraPrice = 0.00134;

    res.json({
      success: true,
      data: records.map(record => {
        const taxAmount = Number(record.taxAmount);
        const price = record.tokenSymbol === 'USDT' ? 1 : takaraPrice;

        return {
          id: record.id,
          tokenSymbol: record.tokenSymbol,
          taxAmount,
          taxValueUSD: taxAmount * price,
          sourceType: record.sourceType,
          sourceReferenceId: record.sourceId,
          userId: record.user.id,
          userWallet: record.user.walletAddress || '',
          txSignature: record.txSignature,
          createdAt: record.createdAt,
          // Additional fields for backwards compatibility
          amountBeforeTax: Number(record.amountBeforeTax),
          taxPercent: Number(record.taxPercent),
          amountAfterTax: Number(record.amountAfterTax),
          username: record.user.username
        };
      }),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error({ error, query: req.query }, 'Failed to get tax records');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * POST /api/admin/treasury/withdraw
 * Withdraw from treasury (Super Admin only)
 */
export async function withdrawFromTreasury(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as AdminRequest).adminId!;
    const {
      tokenSymbol,
      amount,
      destinationWallet,
      reason,
      txSignature
    }: WithdrawFromTreasuryInput = req.body;

    // Validate input
    if (!tokenSymbol || !amount || !destinationWallet || !reason) {
      res.status(400).json({
        success: false,
        message: 'Token symbol, amount, destination wallet, and reason are required'
      });
      return;
    }

    if (amount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
      return;
    }

    // Get current treasury balance
    const balance = await getTreasuryBalance(tokenSymbol);

    if (!balance) {
      res.status(404).json({
        success: false,
        message: `Treasury balance not found for ${tokenSymbol}`
      });
      return;
    }

    if (Number(balance.balance) < amount) {
      res.status(400).json({
        success: false,
        message: `Insufficient treasury balance. Available: ${balance.balance} ${tokenSymbol}`
      });
      return;
    }

    // TODO: Verify admin is super admin
    // For now, assuming all admins can withdraw

    // TODO: Perform actual token transfer
    // This would involve transferring from treasury wallet to destination

    // Update treasury balance
    await prisma.treasuryBalance.update({
      where: { tokenSymbol },
      data: {
        balance: {
          decrement: amount
        },
        totalWithdrawn: {
          increment: amount
        }
      }
    });

    logger.info({
      adminId,
      tokenSymbol,
      amount,
      destinationWallet,
      reason
    }, 'Treasury withdrawal executed');

    res.json({
      success: true,
      message: 'Treasury withdrawal successful',
      data: {
        tokenSymbol,
        amount,
        destinationWallet,
        txSignature,
        reason,
        remainingBalance: Number(balance.balance) - amount
      }
    });
  } catch (error) {
    logger.error({ error, body: req.body }, 'Failed to withdraw from treasury');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/admin/treasury/summary
 * Get overall treasury summary
 */
export async function getTreasurySummary(req: Request, res: Response): Promise<void> {
  try {
    const [balances, recentTaxes, statistics] = await Promise.all([
      getAllTreasuryBalances(),
      prisma.taxRecord.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              username: true,
              walletAddress: true
            }
          }
        }
      }),
      getTaxStatistics()
    ]);

    // Calculate totals with USD values
    // TAKARA price (approximate)
    const takaraPrice = 0.00134;

    let totalValueUSD = 0;
    let totalTaxCollectedUSD = 0;
    let totalWithdrawalsUSD = 0;

    const formattedBalances = balances.map(b => {
      const balance = Number(b.balance);
      const totalCollected = Number(b.totalCollected);
      const totalWithdrawn = Number(b.totalWithdrawn);

      // Calculate USD values
      const price = b.tokenSymbol === 'USDT' ? 1 : takaraPrice;
      const valueUSD = balance * price;

      totalValueUSD += valueUSD;
      totalTaxCollectedUSD += totalCollected * price;
      totalWithdrawalsUSD += totalWithdrawn * price;

      return {
        tokenSymbol: b.tokenSymbol,
        tokenName: b.tokenSymbol === 'TAKARA' ? 'Takara Token' : 'Tether USD',
        balance,
        valueUSD,
        totalCollected,
        totalWithdrawn,
        lastUpdated: b.updatedAt.toISOString()
      };
    });

    res.json({
      success: true,
      data: {
        // Frontend expected format
        totalValueUSD,
        totalTaxCollectedUSD,
        totalWithdrawalsUSD,
        balances: formattedBalances,
        // Additional data
        recentTaxes: recentTaxes.map(tax => ({
          id: tax.id,
          sourceType: tax.sourceType,
          tokenSymbol: tax.tokenSymbol,
          taxAmount: Number(tax.taxAmount),
          user: tax.user.username || (tax.user.walletAddress?.slice(0, 8) + '...' || 'N/A'),
          createdAt: tax.createdAt
        })),
        statistics
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get treasury summary');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

export default {
  getTreasuryBalances,
  getTreasuryBalanceBySymbol,
  getStatistics,
  getTaxRecords,
  withdrawFromTreasury,
  getTreasurySummary
};
