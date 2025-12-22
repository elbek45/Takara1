/**
 * Admin Boost Controller - v2.2
 *
 * Handles boost token configuration management:
 * - Get all boost token configs
 * - Update boost token (enable/disable, max boost %)
 * - Add new boost token
 * - Remove boost token
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AdminRequest } from '../types';
import { ERROR_MESSAGES } from '../config/constants';
import { getLogger } from '../config/logger';

const logger = getLogger('admin-boost-controller');

export interface CreateBoostTokenInput {
  tokenSymbol: string;
  tokenName: string;
  tokenMint: string;
  isEnabled?: boolean;
  maxBoostPercent?: number;
  displayOrder?: number;
}

export interface UpdateBoostTokenInput {
  isEnabled?: boolean;
  maxBoostPercent?: number;
  displayOrder?: number;
}

/**
 * GET /api/admin/boost-tokens
 * Get all boost token configurations
 */
export async function getBoostTokens(req: Request, res: Response): Promise<void> {
  try {
    const boostTokens = await prisma.boostTokenConfig.findMany({
      orderBy: { displayOrder: 'asc' }
    });

    logger.info({ count: boostTokens.length }, 'Fetched boost tokens');

    res.json({
      success: true,
      data: boostTokens.map(token => ({
        id: token.id,
        tokenSymbol: token.tokenSymbol,
        tokenName: token.tokenName,
        tokenMint: token.tokenMint,
        isEnabled: token.isEnabled,
        maxBoostPercent: Number(token.maxBoostPercent),
        displayOrder: token.displayOrder,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt
      }))
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get boost tokens');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/admin/boost-tokens/:symbol
 * Get boost token by symbol
 */
export async function getBoostToken(req: Request, res: Response): Promise<void> {
  try {
    const { symbol } = req.params;

    const boostToken = await prisma.boostTokenConfig.findUnique({
      where: { tokenSymbol: symbol }
    });

    if (!boostToken) {
      res.status(404).json({
        success: false,
        message: 'Boost token not found'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: boostToken.id,
        tokenSymbol: boostToken.tokenSymbol,
        tokenName: boostToken.tokenName,
        tokenMint: boostToken.tokenMint,
        isEnabled: boostToken.isEnabled,
        maxBoostPercent: Number(boostToken.maxBoostPercent),
        displayOrder: boostToken.displayOrder,
        createdAt: boostToken.createdAt,
        updatedAt: boostToken.updatedAt
      }
    });
  } catch (error) {
    logger.error({ error, symbol: req.params.symbol }, 'Failed to get boost token');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * POST /api/admin/boost-tokens
 * Create new boost token configuration
 */
export async function createBoostToken(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as AdminRequest).adminId!;
    const {
      tokenSymbol,
      tokenName,
      tokenMint,
      isEnabled = true,
      maxBoostPercent = 100,
      displayOrder = 0
    }: CreateBoostTokenInput = req.body;

    // Validate required fields
    if (!tokenSymbol || !tokenName || !tokenMint) {
      res.status(400).json({
        success: false,
        message: 'Token symbol, name, and mint address are required'
      });
      return;
    }

    // Check if token already exists
    const existing = await prisma.boostTokenConfig.findUnique({
      where: { tokenSymbol }
    });

    if (existing) {
      res.status(400).json({
        success: false,
        message: `Boost token with symbol ${tokenSymbol} already exists`
      });
      return;
    }

    // Create boost token
    const boostToken = await prisma.boostTokenConfig.create({
      data: {
        tokenSymbol,
        tokenName,
        tokenMint,
        isEnabled,
        maxBoostPercent,
        displayOrder
      }
    });

    logger.info({
      adminId,
      tokenSymbol,
      tokenName
    }, 'Boost token created');

    res.status(201).json({
      success: true,
      message: 'Boost token created successfully',
      data: {
        id: boostToken.id,
        tokenSymbol: boostToken.tokenSymbol,
        tokenName: boostToken.tokenName,
        tokenMint: boostToken.tokenMint,
        isEnabled: boostToken.isEnabled,
        maxBoostPercent: Number(boostToken.maxBoostPercent),
        displayOrder: boostToken.displayOrder
      }
    });
  } catch (error) {
    logger.error({ error, body: req.body }, 'Failed to create boost token');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * PUT /api/admin/boost-tokens/:symbol
 * Update boost token configuration
 */
export async function updateBoostToken(req: Request, res: Response): Promise<void> {
  try {
    const { symbol } = req.params;
    const adminId = (req as AdminRequest).adminId!;
    const {
      isEnabled,
      maxBoostPercent,
      displayOrder
    }: UpdateBoostTokenInput = req.body;

    // Check if boost token exists
    const existing = await prisma.boostTokenConfig.findUnique({
      where: { tokenSymbol: symbol }
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Boost token not found'
      });
      return;
    }

    // Prepare update data
    const updateData: any = {};
    if (typeof isEnabled === 'boolean') updateData.isEnabled = isEnabled;
    if (typeof maxBoostPercent === 'number') updateData.maxBoostPercent = maxBoostPercent;
    if (typeof displayOrder === 'number') updateData.displayOrder = displayOrder;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
      return;
    }

    // Update boost token
    const boostToken = await prisma.boostTokenConfig.update({
      where: { tokenSymbol: symbol },
      data: updateData
    });

    logger.info({
      adminId,
      tokenSymbol: symbol,
      updates: updateData
    }, 'Boost token updated');

    res.json({
      success: true,
      message: 'Boost token updated successfully',
      data: {
        id: boostToken.id,
        tokenSymbol: boostToken.tokenSymbol,
        tokenName: boostToken.tokenName,
        tokenMint: boostToken.tokenMint,
        isEnabled: boostToken.isEnabled,
        maxBoostPercent: Number(boostToken.maxBoostPercent),
        displayOrder: boostToken.displayOrder,
        updatedAt: boostToken.updatedAt
      }
    });
  } catch (error) {
    logger.error({ error, symbol: req.params.symbol }, 'Failed to update boost token');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * DELETE /api/admin/boost-tokens/:symbol
 * Delete boost token configuration
 */
export async function deleteBoostToken(req: Request, res: Response): Promise<void> {
  try {
    const { symbol } = req.params;
    const adminId = (req as AdminRequest).adminId!;

    // Check if boost token exists
    const existing = await prisma.boostTokenConfig.findUnique({
      where: { tokenSymbol: symbol }
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Boost token not found'
      });
      return;
    }

    // Check if token is being used in active boosts
    const [laikaBoostCount, takaraBoostCount] = await Promise.all([
      symbol === 'LAIKA' ? prisma.laikaBoost.count({ where: { isReturned: false } }) : 0,
      symbol === 'TAKARA' ? prisma.takaraBoost.count({ where: { isReturned: false } }) : 0
    ]);

    const activeBoostCount = laikaBoostCount + takaraBoostCount;

    if (activeBoostCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete boost token ${symbol}. ${activeBoostCount} active boosts are using this token.`
      });
      return;
    }

    // Delete boost token
    await prisma.boostTokenConfig.delete({
      where: { tokenSymbol: symbol }
    });

    logger.info({
      adminId,
      tokenSymbol: symbol
    }, 'Boost token deleted');

    res.json({
      success: true,
      message: 'Boost token deleted successfully'
    });
  } catch (error) {
    logger.error({ error, symbol: req.params.symbol }, 'Failed to delete boost token');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/admin/boost-tokens/statistics
 * Get boost token usage statistics
 */
export async function getBoostTokenStatistics(req: Request, res: Response): Promise<void> {
  try {
    const tokens = await prisma.boostTokenConfig.findMany({
      orderBy: { displayOrder: 'asc' }
    });

    const statistics = await Promise.all(tokens.map(async (token) => {
      let activeBoosts = 0;
      let returnedBoosts = 0;
      let totalLocked = 0;

      if (token.tokenSymbol === 'LAIKA') {
        const [active, returned, locked] = await Promise.all([
          prisma.laikaBoost.count({ where: { isReturned: false } }),
          prisma.laikaBoost.count({ where: { isReturned: true } }),
          prisma.laikaBoost.aggregate({
            where: { isReturned: false },
            _sum: { laikaAmount: true }
          })
        ]);
        activeBoosts = active;
        returnedBoosts = returned;
        totalLocked = Number(locked._sum.laikaAmount || 0);
      } else if (token.tokenSymbol === 'TAKARA') {
        const [active, returned, locked] = await Promise.all([
          prisma.takaraBoost.count({ where: { isReturned: false } }),
          prisma.takaraBoost.count({ where: { isReturned: true } }),
          prisma.takaraBoost.aggregate({
            where: { isReturned: false },
            _sum: { takaraAmount: true }
          })
        ]);
        activeBoosts = active;
        returnedBoosts = returned;
        totalLocked = Number(locked._sum.takaraAmount || 0);
      }

      return {
        tokenSymbol: token.tokenSymbol,
        tokenName: token.tokenName,
        isEnabled: token.isEnabled,
        maxBoostPercent: Number(token.maxBoostPercent),
        activeBoosts,
        returnedBoosts,
        totalBoosts: activeBoosts + returnedBoosts,
        totalLocked
      };
    }));

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get boost token statistics');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

export default {
  getBoostTokens,
  getBoostToken,
  createBoostToken,
  updateBoostToken,
  deleteBoostToken,
  getBoostTokenStatistics
};
