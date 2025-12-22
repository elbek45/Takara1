/**
 * Instant Sale Service - v2.2
 *
 * Handles instant sale of WEXEL NFTs:
 * - Calculate instant sale price (20% below market value)
 * - Enable/disable instant sale for investment
 * - Execute instant sale transaction
 * - Apply 5% tax on sale
 * - Transfer NFT and funds
 */

import { PrismaClient, InvestmentStatus } from '@prisma/client';
import { Keypair } from '@solana/web3.js';
import { getLogger } from '../config/logger';
import { applyWexelSaleTax } from './tax.service';
import { returnTakaraBoost } from './takaraBoost.service';

const prisma = new PrismaClient();
const logger = getLogger('instant-sale-service');

const INSTANT_SALE_DISCOUNT_PERCENT = 20; // 20% below market value

export interface CalculateInstantSalePriceInput {
  investmentId: string;
}

export interface CalculateInstantSalePriceResult {
  marketValue: number;
  discountPercent: number;
  discountAmount: number;
  instantSalePrice: number;
  taxPercent: number;
  taxAmount: number;
  sellerReceives: number;
}

export interface ExecuteInstantSaleInput {
  investmentId: string;
  userId: string; // Seller's user ID
  platformWallet?: Keypair;
}

export interface ExecuteInstantSaleResult {
  investmentId: string;
  salePrice: number;
  taxAmount: number;
  sellerReceived: number;
  txSignature?: string;
}

/**
 * Calculate instant sale price for an investment
 */
export async function calculateInstantSalePrice(
  input: CalculateInstantSalePriceInput
): Promise<CalculateInstantSalePriceResult> {
  const { investmentId } = input;

  try {
    logger.info({ investmentId }, 'Calculating instant sale price');

    // Get investment details
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        vault: true,
        takaraBoost: true,
        laikaBoost: true
      }
    });

    if (!investment) {
      throw new Error('Investment not found');
    }

    if (investment.status !== 'ACTIVE') {
      throw new Error('Only active investments can be sold');
    }

    // Calculate market value (current value of investment)
    // Market value = initial investment + accrued earnings
    const initialInvestment = Number(investment.usdtAmount);
    const accruedEarnings = Number(investment.totalEarnedUSDT);
    const marketValue = initialInvestment + accruedEarnings;

    // Apply 20% discount
    const discountAmount = marketValue * (INSTANT_SALE_DISCOUNT_PERCENT / 100);
    const instantSalePrice = marketValue - discountAmount;

    // Calculate 5% tax
    const taxPercent = 5;
    const taxAmount = instantSalePrice * (taxPercent / 100);
    const sellerReceives = instantSalePrice - taxAmount;

    logger.info({
      investmentId,
      marketValue,
      instantSalePrice,
      taxAmount,
      sellerReceives
    }, 'Instant sale price calculated');

    return {
      marketValue: Number(marketValue.toFixed(2)),
      discountPercent: INSTANT_SALE_DISCOUNT_PERCENT,
      discountAmount: Number(discountAmount.toFixed(2)),
      instantSalePrice: Number(instantSalePrice.toFixed(2)),
      taxPercent,
      taxAmount: Number(taxAmount.toFixed(2)),
      sellerReceives: Number(sellerReceives.toFixed(2))
    };

  } catch (error) {
    logger.error({ error, input }, 'Failed to calculate instant sale price');
    throw error;
  }
}

/**
 * Enable or disable instant sale for an investment
 */
export async function toggleInstantSale(params: {
  investmentId: string;
  userId: string;
  enabled: boolean;
}): Promise<{
  investmentId: string;
  isInstantSaleEnabled: boolean;
  instantSalePrice?: number;
}> {
  const { investmentId, userId, enabled } = params;

  try {
    logger.info({ investmentId, userId, enabled }, 'Toggling instant sale');

    // Verify ownership
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId }
    });

    if (!investment) {
      throw new Error('Investment not found');
    }

    if (investment.userId !== userId) {
      throw new Error('Investment does not belong to user');
    }

    if (investment.status !== 'ACTIVE') {
      throw new Error('Only active investments can enable instant sale');
    }

    // Calculate instant sale price if enabling
    let instantSalePrice: number | undefined;
    if (enabled) {
      const priceCalc = await calculateInstantSalePrice({ investmentId });
      instantSalePrice = priceCalc.instantSalePrice;
    }

    // Update investment
    const updated = await prisma.investment.update({
      where: { id: investmentId },
      data: {
        isInstantSaleEnabled: enabled,
        instantSalePrice: enabled ? instantSalePrice : null
      }
    });

    logger.info({
      investmentId,
      isInstantSaleEnabled: updated.isInstantSaleEnabled,
      instantSalePrice: updated.instantSalePrice
    }, 'Instant sale toggled');

    return {
      investmentId: updated.id,
      isInstantSaleEnabled: updated.isInstantSaleEnabled,
      instantSalePrice: updated.instantSalePrice ? Number(updated.instantSalePrice) : undefined
    };

  } catch (error) {
    logger.error({ error, params }, 'Failed to toggle instant sale');
    throw error;
  }
}

/**
 * Execute instant sale
 */
export async function executeInstantSale(
  input: ExecuteInstantSaleInput
): Promise<ExecuteInstantSaleResult> {
  const { investmentId, userId, platformWallet } = input;

  try {
    logger.info({ investmentId, userId }, 'Executing instant sale');

    // Get investment details
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        vault: true,
        user: true,
        takaraBoost: true,
        laikaBoost: true
      }
    });

    if (!investment) {
      throw new Error('Investment not found');
    }

    if (investment.userId !== userId) {
      throw new Error('Investment does not belong to user');
    }

    if (!investment.isInstantSaleEnabled) {
      throw new Error('Instant sale is not enabled for this investment');
    }

    if (investment.status !== 'ACTIVE') {
      throw new Error('Only active investments can be sold');
    }

    if (!investment.instantSalePrice) {
      throw new Error('Instant sale price not set');
    }

    const salePrice = Number(investment.instantSalePrice);

    // Apply 5% tax
    const taxResult = await applyWexelSaleTax({
      userId,
      investmentId,
      salePrice,
      platformWallet
    });

    logger.info({
      salePrice,
      taxAmount: taxResult.taxAmount,
      sellerReceives: taxResult.amountAfterTax
    }, 'Tax applied to instant sale');

    // Return TAKARA boost if exists
    if (investment.takaraBoost && !investment.takaraBoost.isReturned) {
      try {
        if (!investment.user.walletAddress) {
          throw new Error('User wallet address not found');
        }
        await returnTakaraBoost({
          investmentId,
          userWallet: investment.user.walletAddress,
          platformWallet
        });
        logger.info({ investmentId }, 'TAKARA boost returned');
      } catch (error) {
        logger.error({ error }, 'Failed to return TAKARA boost during instant sale');
        // Continue with sale even if boost return fails
      }
    }

    // TODO: Return LAIKA boost if exists (similar to TAKARA)
    // if (investment.laikaBoost && !investment.laikaBoost.isReturned) { ... }

    // TODO: Transfer NFT ownership to platform or burn
    // This would involve Metaplex NFT transfer

    // TODO: Transfer USDT to seller (amountAfterTax)
    // This would involve SPL token transfer

    // Update investment status
    await prisma.investment.update({
      where: { id: investmentId },
      data: {
        status: 'SOLD',
        isInstantSaleEnabled: false
      }
    });

    logger.info({
      investmentId,
      salePrice,
      taxAmount: taxResult.taxAmount,
      sellerReceived: taxResult.amountAfterTax
    }, 'Instant sale executed successfully');

    return {
      investmentId,
      salePrice,
      taxAmount: taxResult.taxAmount,
      sellerReceived: taxResult.amountAfterTax,
      txSignature: taxResult.txSignature
    };

  } catch (error) {
    logger.error({ error, input }, 'Failed to execute instant sale');
    throw error;
  }
}

/**
 * Get all investments with instant sale enabled
 */
export async function getInstantSaleListings() {
  try {
    const listings = await prisma.investment.findMany({
      where: {
        isInstantSaleEnabled: true,
        status: 'ACTIVE',
        instantSalePrice: {
          not: null
        }
      },
      include: {
        vault: true,
        user: {
          select: {
            id: true,
            walletAddress: true
          }
        },
        takaraBoost: true,
        laikaBoost: true
      },
      orderBy: {
        instantSalePrice: 'asc' // Cheapest first
      }
    });

    return listings;
  } catch (error) {
    logger.error({ error }, 'Failed to get instant sale listings');
    throw error;
  }
}

/**
 * Get instant sale statistics
 */
export async function getInstantSaleStatistics() {
  try {
    const [
      totalEnabled,
      totalSold,
      averageDiscount,
      totalVolume
    ] = await Promise.all([
      // Total with instant sale enabled
      prisma.investment.count({
        where: {
          isInstantSaleEnabled: true,
          status: 'ACTIVE'
        }
      }),

      // Total sold via instant sale
      // Note: SOLD status includes both marketplace and instant sales
      prisma.investment.count({
        where: {
          status: 'SOLD'
        }
      }),

      // Calculate average discount
      prisma.investment.aggregate({
        where: {
          isInstantSaleEnabled: true,
          status: 'ACTIVE',
          instantSalePrice: { not: null }
        },
        _avg: {
          instantSalePrice: true
        }
      }),

      // Total volume sold via instant sale
      prisma.investment.aggregate({
        where: {
          status: 'SOLD',
          instantSalePrice: { not: null } // Only count instant sales
        },
        _sum: {
          instantSalePrice: true
        }
      })
    ]);

    return {
      totalEnabled,
      totalSold,
      averagePrice: Number(averageDiscount._avg.instantSalePrice || 0),
      totalVolume: Number(totalVolume._sum.instantSalePrice || 0),
      discountPercent: INSTANT_SALE_DISCOUNT_PERCENT
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get instant sale statistics');
    throw error;
  }
}

/**
 * Check if investment can enable instant sale
 */
export async function canEnableInstantSale(investmentId: string): Promise<{
  canEnable: boolean;
  reason?: string;
}> {
  try {
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId }
    });

    if (!investment) {
      return {
        canEnable: false,
        reason: 'Investment not found'
      };
    }

    if (investment.status !== 'ACTIVE') {
      return {
        canEnable: false,
        reason: 'Investment is not active'
      };
    }

    if (!investment.isNFTMinted) {
      return {
        canEnable: false,
        reason: 'NFT not yet minted'
      };
    }

    return {
      canEnable: true
    };

  } catch (error) {
    logger.error({ error, investmentId }, 'Failed to check instant sale eligibility');
    return {
      canEnable: false,
      reason: 'Error checking eligibility'
    };
  }
}

export default {
  calculateInstantSalePrice,
  toggleInstantSale,
  executeInstantSale,
  getInstantSaleListings,
  getInstantSaleStatistics,
  canEnableInstantSale
};
