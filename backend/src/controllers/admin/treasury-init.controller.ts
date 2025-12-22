/**
 * Treasury Initialization Controller
 * Initialize TAKARA token in treasury
 */

import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { getLogger } from '../../config/logger';

const logger = getLogger('treasury-init-controller');

/**
 * POST /api/admin/treasury/init-takara
 * Initialize TAKARA token in treasury
 */
export async function initTakara(req: Request, res: Response): Promise<void> {
  try {
    const takaraMint = process.env.TAKARA_TOKEN_MINT || 'DDk2kJUPcJhjaRxKp5y91BzedgUamFiYBkEZgp2UEYyJ';
    const takaraBalance = 10_000_000; // 10 million TAKARA

    // Check if TAKARA already exists
    const existing = await prisma.treasuryBalance.findUnique({
      where: { tokenSymbol: 'TAKARA' }
    });

    if (existing) {
      // Update existing
      const updated = await prisma.treasuryBalance.update({
        where: { tokenSymbol: 'TAKARA' },
        data: {
          balance: takaraBalance,
          totalCollected: takaraBalance
        }
      });

      logger.info({ balance: takaraBalance }, 'Updated TAKARA treasury balance');

      res.json({
        success: true,
        message: 'TAKARA treasury balance updated',
        data: {
          tokenSymbol: updated.tokenSymbol,
          balance: Number(updated.balance),
          totalCollected: Number(updated.totalCollected)
        }
      });
    } else {
      // Create new
      const created = await prisma.treasuryBalance.create({
        data: {
          tokenSymbol: 'TAKARA',
          balance: takaraBalance,
          totalCollected: takaraBalance,
          totalWithdrawn: 0
        }
      });

      logger.info({ balance: takaraBalance }, 'Created TAKARA treasury balance');

      res.json({
        success: true,
        message: 'TAKARA treasury balance created',
        data: {
          tokenSymbol: created.tokenSymbol,
          balance: Number(created.balance),
          totalCollected: Number(created.totalCollected)
        }
      });
    }
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to initialize TAKARA');
    res.status(500).json({
      success: false,
      message: 'Failed to initialize TAKARA treasury',
      error: error.message
    });
  }
}

export default {
  initTakara
};
