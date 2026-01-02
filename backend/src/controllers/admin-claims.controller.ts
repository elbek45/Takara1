/**
 * Admin Claims Controller - v2.2
 *
 * Handles claim request management:
 * - View all claim requests
 * - Approve/reject claims
 * - Process approved claims (transfer funds)
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AdminRequest } from '../types';
import { ERROR_MESSAGES } from '../config/constants';
import { getLogger } from '../config/logger';

const logger = getLogger('admin-claims-controller');

/**
 * GET /api/admin/claims
 * Get all claim requests with filtering
 */
export async function getClaimRequests(req: Request, res: Response): Promise<void> {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      claimType,
      userId
    } = req.query;

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status as string;
    }

    if (claimType) {
      where.claimType = claimType as string;
    }

    if (userId) {
      where.userId = userId as string;
    }

    const [requests, total] = await Promise.all([
      prisma.claimRequest.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              walletAddress: true,
              tronAddress: true,
              email: true
            }
          },
          investment: {
            select: {
              id: true,
              usdtAmount: true,
              status: true,
              vault: {
                select: {
                  name: true,
                  tier: true
                }
              }
            }
          }
        }
      }),
      prisma.claimRequest.count({ where })
    ]);

    logger.info({
      page,
      limit,
      total,
      filters: where
    }, 'Fetched claim requests');

    res.json({
      success: true,
      data: requests.map(req => ({
        id: req.id,
        claimType: req.claimType,
        amount: Number(req.amount),
        taxAmount: Number(req.taxAmount),
        amountAfterTax: Number(req.amountAfterTax),
        status: req.status,
        destinationWallet: req.destinationWallet,
        txSignature: req.txSignature,
        rejectionReason: req.rejectionReason,
        processedAt: req.processedAt,
        createdAt: req.createdAt,
        user: {
          id: req.user.id,
          username: req.user.username || 'N/A',
          walletAddress: req.user.walletAddress,
          tronAddress: req.user.tronAddress,
          email: req.user.email
        },
        investment: {
          id: req.investment.id,
          usdtAmount: Number(req.investment.usdtAmount),
          status: req.investment.status,
          vaultName: req.investment.vault.name,
          vaultTier: req.investment.vault.tier
        }
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error({ error, query: req.query }, 'Failed to get claim requests');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/admin/claims/stats
 * Get claim request statistics
 */
export async function getClaimStats(req: Request, res: Response): Promise<void> {
  try {
    const [pending, approved, completed, rejected] = await Promise.all([
      prisma.claimRequest.count({ where: { status: 'PENDING' } }),
      prisma.claimRequest.count({ where: { status: 'APPROVED' } }),
      prisma.claimRequest.count({ where: { status: 'COMPLETED' } }),
      prisma.claimRequest.count({ where: { status: 'REJECTED' } })
    ]);

    // Get pending amounts by type
    const pendingAmounts = await prisma.claimRequest.groupBy({
      by: ['claimType'],
      where: { status: 'PENDING' },
      _sum: {
        amount: true,
        amountAfterTax: true
      },
      _count: true
    });

    res.json({
      success: true,
      data: {
        counts: {
          pending,
          approved,
          completed,
          rejected,
          total: pending + approved + completed + rejected
        },
        pendingByType: pendingAmounts.map(p => ({
          claimType: p.claimType,
          count: p._count,
          totalAmount: Number(p._sum.amount) || 0,
          totalAfterTax: Number(p._sum.amountAfterTax) || 0
        }))
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get claim stats');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * POST /api/admin/claims/:id/approve
 * Approve a claim request
 */
export async function approveClaim(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const adminId = (req as AdminRequest).adminId!;

    const claimRequest = await prisma.claimRequest.findUnique({
      where: { id }
    });

    if (!claimRequest) {
      res.status(404).json({
        success: false,
        message: 'Claim request not found'
      });
      return;
    }

    if (claimRequest.status !== 'PENDING') {
      res.status(400).json({
        success: false,
        message: `Cannot approve claim with status: ${claimRequest.status}`
      });
      return;
    }

    // Update status to APPROVED
    const updated = await prisma.claimRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        processedBy: adminId,
        processedAt: new Date()
      }
    });

    logger.info({
      claimRequestId: id,
      adminId
    }, 'Claim request approved');

    res.json({
      success: true,
      message: 'Claim request approved. Ready for processing.',
      data: {
        id: updated.id,
        status: updated.status,
        processedAt: updated.processedAt
      }
    });
  } catch (error) {
    logger.error({ error, claimId: req.params.id }, 'Failed to approve claim');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * POST /api/admin/claims/:id/reject
 * Reject a claim request
 */
export async function rejectClaim(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = (req as AdminRequest).adminId!;

    if (!reason) {
      res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
      return;
    }

    const claimRequest = await prisma.claimRequest.findUnique({
      where: { id },
      include: { investment: true }
    });

    if (!claimRequest) {
      res.status(404).json({
        success: false,
        message: 'Claim request not found'
      });
      return;
    }

    if (claimRequest.status !== 'PENDING' && claimRequest.status !== 'APPROVED') {
      res.status(400).json({
        success: false,
        message: `Cannot reject claim with status: ${claimRequest.status}`
      });
      return;
    }

    // Update status to REJECTED and restore pending amount
    await prisma.$transaction([
      prisma.claimRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          processedBy: adminId,
          processedAt: new Date(),
          rejectionReason: reason
        }
      }),
      // Restore the pending amount to the investment
      prisma.investment.update({
        where: { id: claimRequest.investmentId },
        data: claimRequest.claimType === 'USDT'
          ? { pendingUSDT: { increment: Number(claimRequest.amount) } }
          : { pendingTAKARA: { increment: Number(claimRequest.amount) } }
      })
    ]);

    logger.info({
      claimRequestId: id,
      adminId,
      reason
    }, 'Claim request rejected');

    res.json({
      success: true,
      message: 'Claim request rejected. Pending amount restored to investment.',
      data: {
        id,
        status: 'REJECTED',
        rejectionReason: reason
      }
    });
  } catch (error) {
    logger.error({ error, claimId: req.params.id }, 'Failed to reject claim');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * POST /api/admin/claims/:id/process
 * Process an approved claim (mark as completed with tx signature)
 */
export async function processClaim(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { txSignature } = req.body;
    const adminId = (req as AdminRequest).adminId!;

    if (!txSignature) {
      res.status(400).json({
        success: false,
        message: 'Transaction signature is required'
      });
      return;
    }

    const claimRequest = await prisma.claimRequest.findUnique({
      where: { id },
      include: {
        investment: true,
        user: true
      }
    });

    if (!claimRequest) {
      res.status(404).json({
        success: false,
        message: 'Claim request not found'
      });
      return;
    }

    if (claimRequest.status !== 'APPROVED' && claimRequest.status !== 'PENDING') {
      res.status(400).json({
        success: false,
        message: `Cannot process claim with status: ${claimRequest.status}`
      });
      return;
    }

    // Update claim request to COMPLETED
    await prisma.$transaction([
      prisma.claimRequest.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          txSignature,
          processedBy: adminId,
          processedAt: new Date()
        }
      }),
      // Update investment stats
      prisma.investment.update({
        where: { id: claimRequest.investmentId },
        data: claimRequest.claimType === 'USDT'
          ? {
              totalEarnedUSDT: { increment: Number(claimRequest.amount) },
              lastClaimDate: new Date()
            }
          : {
              totalMinedTAKARA: { increment: Number(claimRequest.amount) }
            }
      }),
      // Update user stats
      prisma.user.update({
        where: { id: claimRequest.userId },
        data: claimRequest.claimType === 'USDT'
          ? { totalEarnedUSDT: { increment: Number(claimRequest.amountAfterTax) } }
          : { totalMinedTAKARA: { increment: Number(claimRequest.amountAfterTax) } }
      }),
      // If TAKARA claim, record tax
      ...(claimRequest.claimType === 'TAKARA' && Number(claimRequest.taxAmount) > 0 ? [
        prisma.taxRecord.create({
          data: {
            sourceType: 'TAKARA_CLAIM',
            sourceId: claimRequest.id,
            userId: claimRequest.userId,
            tokenSymbol: 'TAKARA',
            amountBeforeTax: claimRequest.amount,
            taxPercent: 5,
            taxAmount: claimRequest.taxAmount,
            amountAfterTax: claimRequest.amountAfterTax,
            txSignature,
            treasuryWallet: process.env.PLATFORM_WALLET || 'N/A'
          }
        }),
        prisma.treasuryBalance.upsert({
          where: { tokenSymbol: 'TAKARA' },
          update: {
            balance: { increment: Number(claimRequest.taxAmount) },
            totalCollected: { increment: Number(claimRequest.taxAmount) }
          },
          create: {
            tokenSymbol: 'TAKARA',
            balance: Number(claimRequest.taxAmount),
            totalCollected: Number(claimRequest.taxAmount),
            totalWithdrawn: 0
          }
        })
      ] : [])
    ]);

    logger.info({
      claimRequestId: id,
      adminId,
      txSignature,
      claimType: claimRequest.claimType,
      amount: Number(claimRequest.amountAfterTax)
    }, 'Claim request processed and completed');

    res.json({
      success: true,
      message: 'Claim processed successfully',
      data: {
        id,
        status: 'COMPLETED',
        txSignature,
        amountTransferred: Number(claimRequest.amountAfterTax),
        destinationWallet: claimRequest.destinationWallet
      }
    });
  } catch (error) {
    logger.error({ error, claimId: req.params.id }, 'Failed to process claim');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

export default {
  getClaimRequests,
  getClaimStats,
  approveClaim,
  rejectClaim,
  processClaim
};
