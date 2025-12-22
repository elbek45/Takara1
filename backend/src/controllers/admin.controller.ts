/**
 * Admin Controller
 *
 * Handles admin panel operations:
 * - Dashboard statistics
 * - User management
 * - Withdrawal processing
 * - Vault management
 * - Investment monitoring
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AdminRequest, DashboardStats, ProcessWithdrawalInput } from '../types';
import { ERROR_MESSAGES } from '../config/constants';
import { transferFromPlatform } from '../services/solana.service';
import { transferUSDTFromPlatform } from '../services/ethereum.service';
import { applyTakaraClaimTax } from '../services/tax.service';
import { getLogger } from '../config/logger';
import { TAKARA_CONFIG } from '../utils/mining.calculator';

const logger = getLogger('admin-controller');

/**
 * GET /api/admin/dashboard
 * Get dashboard statistics
 */
export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    // Get counts and aggregates in parallel
    const [
      totalUsers,
      totalInvestments,
      activeInvestments,
      pendingWithdrawals,
      marketplaceListings,
      totalValueLocked,
      totalUSDTPaid,
      totalTAKARAMined,
      recentUsers,
      recentInvestments
    ] = await Promise.all([
      prisma.user.count(),
      prisma.investment.count(),
      prisma.investment.count({ where: { status: 'ACTIVE' } }),
      prisma.withdrawalRequest.count({ where: { status: 'PENDING' } }),
      prisma.marketplaceListing.count({ where: { status: 'ACTIVE' } }),
      prisma.investment.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { usdtAmount: true }
      }),
      prisma.investment.aggregate({
        _sum: { totalEarnedUSDT: true }
      }),
      prisma.investment.aggregate({
        _sum: { totalMinedTAKARA: true }
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          walletAddress: true,
          username: true,
          createdAt: true
        }
      }),
      prisma.investment.findMany({
        where: { status: { in: ['PENDING', 'ACTIVE'] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: {
            select: {
              walletAddress: true,
              username: true
            }
          },
          vault: {
            select: {
              name: true
            }
          }
        }
      })
    ]);

    const stats: DashboardStats = {
      totalUsers,
      totalInvestments,
      totalValueLocked: Number(totalValueLocked._sum.usdtAmount || 0),
      totalUSDTPaid: Number(totalUSDTPaid._sum.totalEarnedUSDT || 0),
      totalTAKARAMined: Number(totalTAKARAMined._sum.totalMinedTAKARA || 0),
      activeInvestments,
      pendingWithdrawals,
      marketplaceListings
    };

    res.json({
      success: true,
      data: {
        stats,
        recentUsers,
        recentInvestments: recentInvestments.map(inv => ({
          id: inv.id,
          user: inv.user.username || (inv.user.walletAddress?.slice(0, 8) + '...' || 'N/A'),
          vault: inv.vault.name,
          amount: Number(inv.usdtAmount),
          status: inv.status,
          createdAt: inv.createdAt
        }))
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get dashboard stats');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/admin/users
 * Get all users with filters
 */
export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { walletAddress: { contains: search as string, mode: 'insensitive' } },
        { username: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              investments: true,
              withdrawals: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    const usersData = users.map(user => ({
      id: user.id,
      walletAddress: user.walletAddress,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      totalInvested: Number(user.totalInvested),
      totalEarnedUSDT: Number(user.totalEarnedUSDT),
      totalMinedTAKARA: Number(user.totalMinedTAKARA),
      investmentCount: user._count.investments,
      withdrawalCount: user._count.withdrawals,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    }));

    res.json({
      success: true,
      data: usersData,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get users');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/admin/investments
 * Get all investments with filters
 */
export async function getInvestments(req: Request, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, status, vaultId } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (vaultId) where.vaultId = vaultId;

    const [investments, total] = await Promise.all([
      prisma.investment.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              walletAddress: true,
              username: true
            }
          },
          vault: {
            select: {
              name: true,
              tier: true
            }
          },
          laikaBoost: true
        }
      }),
      prisma.investment.count({ where })
    ]);

    const investmentsData = investments.map(inv => ({
      id: inv.id,
      user: inv.user.username || (inv.user.walletAddress?.slice(0, 8) + '...' || 'N/A'),
      userWallet: inv.user.walletAddress || 'N/A',
      vault: inv.vault.name,
      vaultTier: inv.vault.tier,
      usdtAmount: Number(inv.usdtAmount),
      finalAPY: Number(inv.finalAPY),
      startDate: inv.startDate,
      endDate: inv.endDate,
      status: inv.status,
      totalEarnedUSDT: Number(inv.totalEarnedUSDT),
      totalMinedTAKARA: Number(inv.totalMinedTAKARA),
      hasLaikaBoost: !!inv.laikaBoost,
      nftMinted: inv.isNFTMinted,
      createdAt: inv.createdAt
    }));

    res.json({
      success: true,
      data: investmentsData,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get investments');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/admin/withdrawals
 * Get all withdrawal requests
 */
export async function getWithdrawals(req: Request, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, status = 'PENDING' } = req.query;

    const where: any = {};
    if (status) where.status = status;

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              walletAddress: true,
              username: true
            }
          }
        }
      }),
      prisma.withdrawalRequest.count({ where })
    ]);

    const withdrawalsData = withdrawals.map(w => ({
      id: w.id,
      user: w.user.username || (w.user.walletAddress?.slice(0, 8) + '...' || 'N/A'),
      userWallet: w.user.walletAddress || 'N/A',
      amount: Number(w.amount),
      tokenType: w.tokenType,
      destinationWallet: w.destinationWallet,
      status: w.status,
      createdAt: w.createdAt,
      processedAt: w.processedAt,
      processedBy: w.processedBy,
      txSignature: w.txSignature,
      rejectionReason: w.rejectionReason
    }));

    res.json({
      success: true,
      data: withdrawalsData,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get withdrawals');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * PUT /api/admin/withdrawals/:id/process
 * Process withdrawal request (approve/reject)
 */
export async function processWithdrawal(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const adminId = (req as AdminRequest).adminId!;
    const { action, txSignature, rejectionReason }: ProcessWithdrawalInput = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      res.status(400).json({
        success: false,
        message: 'Action must be "approve" or "reject"'
      });
      return;
    }

    // Get withdrawal request
    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!withdrawal) {
      res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
      return;
    }

    if (withdrawal.status !== 'PENDING') {
      res.status(400).json({
        success: false,
        message: 'Withdrawal has already been processed'
      });
      return;
    }

    if (action === 'approve') {
      // Validate transaction signature
      if (!txSignature) {
        res.status(400).json({
          success: false,
          message: 'Transaction signature is required for approval'
        });
        return;
      }

      // Transfer tokens (Ethereum for USDT, Solana for TAKARA/LAIKA)
      let actualTxSignature = txSignature;

      try {
        if (withdrawal.tokenType === 'USDT') {
          // Transfer USDT via Ethereum
          if (process.env.ENABLE_REAL_ETH_TRANSFERS === 'true') {
            actualTxSignature = await transferUSDTFromPlatform(
              withdrawal.destinationWallet,
              Number(withdrawal.amount)
            );

            logger.info({
              withdrawalId: id,
              txSignature: actualTxSignature,
              amount: Number(withdrawal.amount),
              blockchain: 'Ethereum'
            }, 'USDT transferred on Ethereum');
          } else {
            logger.warn({
              withdrawalId: id
            }, 'USDT transfer skipped (ENABLE_REAL_ETH_TRANSFERS not set to true)');
          }
        } else {
          // Transfer TAKARA/LAIKA via Solana
          const tokenMint = withdrawal.tokenType === 'TAKARA'
            ? process.env.TAKARA_TOKEN_MINT
            : process.env.LAIKA_TOKEN_MINT;

          if (!tokenMint) {
            res.status(500).json({
              success: false,
              message: `${withdrawal.tokenType} token mint address not configured`
            });
            return;
          }

          // Apply 5% tax on TAKARA withdrawals (v2.2)
          let amountToTransfer = Number(withdrawal.amount);
          let taxAmount = 0;

          if (withdrawal.tokenType === 'TAKARA') {
            try {
              const taxResult = await applyTakaraClaimTax({
                userId: withdrawal.userId,
                transactionId: id,
                takaraAmount: Number(withdrawal.amount)
                // Note: platformWallet would be needed for actual tax transfer
              });

              amountToTransfer = taxResult.amountAfterTax;
              taxAmount = taxResult.taxAmount;

              logger.info({
                withdrawalId: id,
                originalAmount: Number(withdrawal.amount),
                taxAmount,
                amountAfterTax: amountToTransfer
              }, 'TAKARA withdrawal tax applied');
            } catch (taxError: any) {
              logger.error({
                error: taxError,
                withdrawalId: id
              }, 'Failed to apply TAKARA tax');

              res.status(500).json({
                success: false,
                message: `Tax application failed: ${taxError?.message || 'Unknown error'}`
              });
              return;
            }
          }

          if (process.env.ENABLE_REAL_TOKEN_TRANSFERS === 'true') {
            actualTxSignature = await transferFromPlatform(
              withdrawal.destinationWallet,
              tokenMint,
              amountToTransfer // Transfer amount AFTER tax
            );

            logger.info({
              withdrawalId: id,
              txSignature: actualTxSignature,
              amountTransferred: amountToTransfer,
              taxDeducted: taxAmount,
              blockchain: 'Solana'
            }, `${withdrawal.tokenType} transferred on Solana`);
          } else {
            logger.warn({
              withdrawalId: id,
              amountToTransfer,
              taxDeducted: taxAmount
            }, `${withdrawal.tokenType} transfer skipped (ENABLE_REAL_TOKEN_TRANSFERS not set to true)`);
          }
        }
      } catch (transferError: any) {
        logger.error({
          error: transferError,
          withdrawalId: id,
          tokenType: withdrawal.tokenType
        }, 'Failed to transfer tokens');

        res.status(500).json({
          success: false,
          message: `Token transfer failed: ${transferError?.message || 'Unknown error'}`
        });
        return;
      }

      // Update withdrawal
      await prisma.withdrawalRequest.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          processedBy: adminId,
          txSignature: actualTxSignature
        }
      });

      logger.info({
        withdrawalId: id,
        adminId,
        amount: Number(withdrawal.amount),
        tokenType: withdrawal.tokenType
      }, 'Withdrawal approved');

      res.json({
        success: true,
        message: 'Withdrawal approved and processed',
        data: {
          withdrawalId: id,
          txSignature,
          amount: Number(withdrawal.amount),
          tokenType: withdrawal.tokenType
        }
      });
    } else {
      // Reject withdrawal
      if (!rejectionReason) {
        res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
        return;
      }

      await prisma.withdrawalRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          processedAt: new Date(),
          processedBy: adminId,
          rejectionReason
        }
      });

      logger.info({
        withdrawalId: id,
        adminId,
        reason: rejectionReason
      }, 'Withdrawal rejected');

      res.json({
        success: true,
        message: 'Withdrawal rejected',
        data: {
          withdrawalId: id,
          rejectionReason
        }
      });
    }
  } catch (error) {
    logger.error({ error, withdrawalId: req.params.id }, 'Failed to process withdrawal');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * PUT /api/admin/vaults/:id/activate
 * Activate/deactivate vault
 */
export async function toggleVaultStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'isActive must be a boolean'
      });
      return;
    }

    const vault = await prisma.vault.update({
      where: { id },
      data: { isActive }
    });

    logger.info({
      vaultId: id,
      isActive
    }, 'Vault status toggled');

    res.json({
      success: true,
      message: `Vault ${isActive ? 'activated' : 'deactivated'}`,
      data: {
        vaultId: id,
        name: vault.name,
        isActive: vault.isActive
      }
    });
  } catch (error) {
    logger.error({ error, vaultId: req.params.id }, 'Failed to toggle vault status');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/admin/stats/mining
 * Get TAKARA mining statistics
 */
export async function getMiningStats(req: Request, res: Response): Promise<void> {
  try {
    // Get latest mining stats
    const latestStats = await prisma.miningStats.findFirst({
      orderBy: { date: 'desc' }
    });

    // Get historical stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historicalStats = await prisma.miningStats.findMany({
      where: {
        date: { gte: thirtyDaysAgo }
      },
      orderBy: { date: 'asc' }
    });

    // Get top miners
    const topMiners = await prisma.investment.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { totalMinedTAKARA: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            walletAddress: true,
            username: true
          }
        },
        vault: {
          select: {
            name: true
          }
        }
      }
    });

    const TOTAL_SUPPLY = TAKARA_CONFIG.TOTAL_SUPPLY; // 21M TAKARA
    const totalMined = latestStats ? Number(latestStats.totalMined) : 0;
    const percentMined = (totalMined / TOTAL_SUPPLY) * 100;

    res.json({
      success: true,
      data: {
        current: {
          totalMined,
          totalSupply: TOTAL_SUPPLY,
          percentMined: Number(percentMined.toFixed(4)),
          remaining: TOTAL_SUPPLY - totalMined,
          currentDifficulty: latestStats ? Number(latestStats.currentDifficulty) : 1.0,
          activeMiners: latestStats ? latestStats.activeMiners : 0
        },
        history: historicalStats.map(stat => ({
          date: stat.date,
          totalMined: Number(stat.totalMined),
          difficulty: Number(stat.currentDifficulty),
          activeMiners: stat.activeMiners
        })),
        topMiners: topMiners.map(miner => ({
          user: miner.user.username || (miner.user.walletAddress?.slice(0, 8) + '...' || 'N/A'),
          vault: miner.vault.name,
          totalMined: Number(miner.totalMinedTAKARA),
          investment: Number(miner.usdtAmount)
        }))
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get mining stats');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

export default {
  getDashboardStats,
  getUsers,
  getInvestments,
  getWithdrawals,
  processWithdrawal,
  toggleVaultStatus,
  getMiningStats
};
