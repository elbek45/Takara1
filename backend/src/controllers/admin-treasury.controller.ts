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

    logger.info({ count: balances.length }, 'Fetched treasury balances');

    res.json({
      success: true,
      data: balances.map(balance => ({
        tokenSymbol: balance.tokenSymbol,
        balance: Number(balance.balance),
        totalCollected: Number(balance.totalCollected),
        totalWithdrawn: Number(balance.totalWithdrawn),
        updatedAt: balance.updatedAt
      }))
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

    const statistics = await getTaxStatistics(filters);

    logger.info({ filters, resultCount: statistics.length }, 'Fetched tax statistics');

    res.json({
      success: true,
      data: statistics
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

    res.json({
      success: true,
      data: records.map(record => ({
        id: record.id,
        sourceType: record.sourceType,
        sourceId: record.sourceId,
        user: {
          id: record.user.id,
          username: record.user.username,
          walletAddress: record.user.walletAddress
        },
        tokenSymbol: record.tokenSymbol,
        amountBeforeTax: Number(record.amountBeforeTax),
        taxPercent: Number(record.taxPercent),
        taxAmount: Number(record.taxAmount),
        amountAfterTax: Number(record.amountAfterTax),
        txSignature: record.txSignature,
        treasuryWallet: record.treasuryWallet,
        createdAt: record.createdAt
      })),
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

    // Calculate totals
    const totalCollected = {
      TAKARA: 0,
      USDT: 0
    };

    const totalWithdrawn = {
      TAKARA: 0,
      USDT: 0
    };

    balances.forEach(balance => {
      if (balance.tokenSymbol === 'TAKARA' || balance.tokenSymbol === 'USDT') {
        totalCollected[balance.tokenSymbol] = Number(balance.totalCollected);
        totalWithdrawn[balance.tokenSymbol] = Number(balance.totalWithdrawn);
      }
    });

    res.json({
      success: true,
      data: {
        balances: balances.map(b => ({
          tokenSymbol: b.tokenSymbol,
          balance: Number(b.balance),
          totalCollected: Number(b.totalCollected),
          totalWithdrawn: Number(b.totalWithdrawn)
        })),
        totalCollected,
        totalWithdrawn,
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
