/**
 * Marketplace Controller
 *
 * Handles NFT marketplace operations:
 * - List investment NFT for sale
 * - Browse marketplace listings
 * - Purchase NFT
 * - Cancel listing
 * - Get marketplace statistics
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest, CreateListingInput } from '../types';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, MARKETPLACE_CONFIG } from '../config/constants';
import { applyWexelSaleTax } from '../services/tax.service';
import { getLogger } from '../config/logger';
import { invalidateCacheByPrefix } from '../middleware/cache.middleware';

const logger = getLogger('marketplace-controller');

/**
 * GET /api/marketplace
 * Browse all marketplace listings
 */
export async function getMarketplaceListings(req: Request, res: Response): Promise<void> {
  try {
    const { status = 'ACTIVE', sortBy = 'createdAt', sortOrder = 'desc', minPrice, maxPrice } = req.query;

    // Build filter
    const where: any = { status };

    if (minPrice) {
      where.priceUSDT = { ...where.priceUSDT, gte: Number(minPrice) };
    }
    if (maxPrice) {
      where.priceUSDT = { ...where.priceUSDT, lte: Number(maxPrice) };
    }

    const listings = await prisma.marketplaceListing.findMany({
      where,
      include: {
        investment: {
          include: {
            vault: true,
            laikaBoost: true
          }
        },
        seller: {
          select: {
            id: true,
            walletAddress: true,
            username: true
          }
        }
      },
      orderBy: {
        [sortBy as string]: sortOrder
      }
    });

    // Transform listings with calculated data
    const listingsWithDetails = listings.map(listing => {
      const inv = listing.investment;
      const now = new Date();
      const monthsRemaining = Math.max(0,
        Math.floor((inv.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30))
      );

      return {
        id: listing.id,
        investmentId: listing.investmentId,
        priceUSDT: Number(listing.priceUSDT),
        originalInvestment: Number(listing.originalInvestment),
        currentValue: Number(listing.currentValue),
        vault: {
          id: inv.vault.id,
          name: inv.vault.name,
          tier: inv.vault.tier,
          duration: inv.vault.duration
        },
        finalAPY: Number(inv.finalAPY),
        remainingMonths: monthsRemaining,
        totalEarnedUSDT: Number(inv.totalEarnedUSDT),
        totalMinedTAKARA: Number(inv.totalMinedTAKARA),
        laikaBoost: inv.laikaBoost ? {
          laikaAmount: Number(inv.laikaBoost.laikaAmount),
          additionalAPY: Number(inv.laikaBoost.additionalAPY)
        } : null,
        seller: {
          walletAddress: listing.seller.walletAddress,
          username: listing.seller.username
        },
        nftMintAddress: inv.nftMintAddress,
        createdAt: listing.createdAt,
        platformFee: Number(listing.platformFee)
      };
    });

    res.json({
      success: true,
      data: listingsWithDetails
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get marketplace listings');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * POST /api/marketplace/list
 * List investment NFT for sale
 */
export async function createListing(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId!;
    const { investmentId, priceUSDT }: CreateListingInput = req.body;

    if (!investmentId || !priceUSDT || priceUSDT <= 0) {
      res.status(400).json({
        success: false,
        message: 'Investment ID and valid price are required'
      });
      return;
    }

    // Validate minimum price
    if (priceUSDT < MARKETPLACE_CONFIG.MIN_LISTING_PRICE) {
      res.status(400).json({
        success: false,
        message: `Minimum listing price is $${MARKETPLACE_CONFIG.MIN_LISTING_PRICE}`
      });
      return;
    }

    // Get investment
    const investment = await prisma.investment.findFirst({
      where: {
        id: investmentId,
        userId,
        status: 'ACTIVE'
      },
      include: {
        marketplaceListing: true
      }
    });

    if (!investment) {
      res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.INVESTMENT_NOT_FOUND
      });
      return;
    }

    // Check if already listed
    if (investment.marketplaceListing) {
      res.status(400).json({
        success: false,
        message: 'Investment is already listed on marketplace'
      });
      return;
    }

    // Check if NFT is minted
    if (!investment.nftMintAddress) {
      res.status(400).json({
        success: false,
        message: 'NFT must be minted before listing'
      });
      return;
    }

    // Calculate current value (principal + earnings)
    const currentValue = Number(investment.usdtAmount) + Number(investment.totalEarnedUSDT);

    // Create listing
    const listing = await prisma.marketplaceListing.create({
      data: {
        investmentId,
        sellerId: userId,
        priceUSDT,
        originalInvestment: investment.usdtAmount,
        currentValue,
        platformFee: MARKETPLACE_CONFIG.PLATFORM_FEE_PERCENT,
        status: 'ACTIVE'
      },
      include: {
        investment: {
          include: {
            vault: true
          }
        }
      }
    });

    logger.info({
      listingId: listing.id,
      investmentId,
      userId,
      price: priceUSDT
    }, 'Listing created');

    // Invalidate marketplace caches
    await invalidateCacheByPrefix('cache:short:public:/api/marketplace');
    await invalidateCacheByPrefix('cache:medium:public:/api/marketplace/stats');
    await invalidateCacheByPrefix(`cache:short:${userId}:/api/marketplace/my-listings`);

    res.status(201).json({
      success: true,
      message: SUCCESS_MESSAGES.NFT_LISTED,
      data: {
        listingId: listing.id,
        investmentId,
        vaultName: listing.investment.vault.name,
        priceUSDT: Number(listing.priceUSDT),
        platformFee: `${listing.platformFee}%`,
        sellerReceives: Number(listing.priceUSDT) * (1 - Number(listing.platformFee) / 100)
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create listing');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * POST /api/marketplace/:id/buy
 * Purchase NFT from marketplace
 */
export async function purchaseNFT(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as AuthenticatedRequest).userId!;
    const { txSignature } = req.body;

    if (!txSignature) {
      res.status(400).json({
        success: false,
        message: 'Transaction signature is required'
      });
      return;
    }

    // Get listing
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
      include: {
        investment: {
          include: {
            vault: true,
            laikaBoost: true
          }
        },
        seller: true
      }
    });

    if (!listing || listing.status !== 'ACTIVE') {
      res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.LISTING_NOT_FOUND
      });
      return;
    }

    // Check if user is not the seller
    if (listing.sellerId === userId) {
      res.status(400).json({
        success: false,
        message: 'Cannot buy your own listing'
      });
      return;
    }

    // Calculate platform fee and seller proceeds
    const price = Number(listing.priceUSDT);
    const platformFeeAmount = price * (Number(listing.platformFee) / 100);

    // Apply 5% tax on WEXEL sale (v2.2)
    let taxAmount = 0;
    let sellerProceeds = price - platformFeeAmount;

    try {
      const taxResult = await applyWexelSaleTax({
        userId: listing.sellerId,
        investmentId: listing.investmentId,
        salePrice: price
        // Note: platformWallet would be needed for actual tax transfer
      });

      taxAmount = taxResult.taxAmount;
      sellerProceeds = price - platformFeeAmount - taxAmount;

      logger.info({
        listingId: id,
        salePrice: price,
        platformFee: platformFeeAmount,
        taxAmount,
        sellerReceives: sellerProceeds
      }, 'WEXEL sale tax applied');
    } catch (taxError: any) {
      logger.error({
        error: taxError,
        listingId: id
      }, 'Failed to apply WEXEL sale tax');

      res.status(500).json({
        success: false,
        message: `Tax application failed: ${taxError?.message || 'Unknown error'}`
      });
      return;
    }

    // Start transaction
    await prisma.$transaction(async (tx) => {
      // Update listing
      await tx.marketplaceListing.update({
        where: { id },
        data: {
          status: 'SOLD',
          buyerId: userId,
          soldPrice: price,
          soldAt: new Date(),
          saleTxSignature: txSignature
        }
      });

      // Transfer investment ownership (keep ACTIVE so new owner can use/resell)
      await tx.investment.update({
        where: { id: listing.investmentId },
        data: {
          userId // New owner - status remains ACTIVE for resale
        }
      });

      // Record transaction
      await tx.transaction.create({
        data: {
          investmentId: listing.investmentId,
          type: 'NFT_SALE',
          amount: price,
          tokenType: 'USDT',
          txSignature,
          fromAddress: listing.seller.walletAddress || '',
          toAddress: '', // Will be filled with buyer's wallet
          status: 'CONFIRMED',
          description: `NFT sale on marketplace: ${listing.investment.vault.name}`,
          metadata: {
            listingId: id,
            sellerId: listing.sellerId,
            buyerId: userId,
            platformFee: platformFeeAmount
          }
        }
      });

      // Update seller stats
      await tx.user.update({
        where: { id: listing.sellerId },
        data: {
          totalEarnedUSDT: {
            increment: sellerProceeds
          }
        }
      });
    });

    logger.info({
      listingId: id,
      investmentId: listing.investmentId,
      buyerId: userId,
      sellerId: listing.sellerId,
      price,
      platformFee: platformFeeAmount
    }, 'NFT purchased');

    // Invalidate marketplace caches
    await invalidateCacheByPrefix('cache:short:public:/api/marketplace');
    await invalidateCacheByPrefix('cache:medium:public:/api/marketplace/stats');
    await invalidateCacheByPrefix(`cache:short:${userId}:/api/marketplace/my-listings`);
    await invalidateCacheByPrefix(`cache:short:${listing.sellerId}:/api/marketplace/my-listings`);

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.NFT_PURCHASED,
      data: {
        investmentId: listing.investmentId,
        vaultName: listing.investment.vault.name,
        pricePaid: price,
        platformFee: platformFeeAmount,
        taxAmount, // v2.2: 5% tax on WEXEL sale
        sellerReceived: sellerProceeds,
        nftMintAddress: listing.investment.nftMintAddress,
        laikaIncluded: !!listing.investment.laikaBoost
      }
    });
  } catch (error) {
    logger.error({ error, listingId: req.params.id }, 'Failed to purchase NFT');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * DELETE /api/marketplace/:id
 * Cancel listing
 */
export async function cancelListing(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as AuthenticatedRequest).userId!;

    // Get listing
    const listing = await prisma.marketplaceListing.findFirst({
      where: {
        id,
        sellerId: userId,
        status: 'ACTIVE'
      }
    });

    if (!listing) {
      res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.LISTING_NOT_FOUND
      });
      return;
    }

    // Cancel listing
    await prisma.marketplaceListing.update({
      where: { id },
      data: {
        status: 'CANCELLED'
      }
    });

    logger.info({
      listingId: id,
      userId
    }, 'Listing cancelled');

    // Invalidate marketplace caches
    await invalidateCacheByPrefix('cache:short:public:/api/marketplace');
    await invalidateCacheByPrefix('cache:medium:public:/api/marketplace/stats');
    await invalidateCacheByPrefix(`cache:short:${userId}:/api/marketplace/my-listings`);

    res.json({
      success: true,
      message: 'Listing cancelled successfully'
    });
  } catch (error) {
    logger.error({ error, listingId: req.params.id }, 'Failed to cancel listing');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/marketplace/stats
 * Get marketplace statistics
 */
export async function getMarketplaceStats(req: Request, res: Response): Promise<void> {
  try {
    // Get listing counts
    const [activeListings, totalSold, totalVolume] = await Promise.all([
      prisma.marketplaceListing.count({
        where: { status: 'ACTIVE' }
      }),
      prisma.marketplaceListing.count({
        where: { status: 'SOLD' }
      }),
      prisma.marketplaceListing.aggregate({
        where: { status: 'SOLD' },
        _sum: {
          soldPrice: true
        }
      })
    ]);

    // Get recent sales
    const recentSales = await prisma.marketplaceListing.findMany({
      where: { status: 'SOLD' },
      include: {
        investment: {
          include: {
            vault: true
          }
        }
      },
      orderBy: { soldAt: 'desc' },
      take: 10
    });

    // Calculate average sale price
    const avgSalePrice = totalSold > 0 && totalVolume._sum.soldPrice
      ? Number(totalVolume._sum.soldPrice) / totalSold
      : 0;

    res.json({
      success: true,
      data: {
        activeListings,
        totalSold,
        totalVolume: Number(totalVolume._sum.soldPrice || 0),
        avgSalePrice: Number(avgSalePrice.toFixed(2)),
        recentSales: recentSales.map(sale => ({
          investmentId: sale.investmentId,
          vaultName: sale.investment.vault.name,
          price: Number(sale.soldPrice),
          soldAt: sale.soldAt
        }))
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get marketplace stats');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/marketplace/my-listings
 * Get current user's listings
 */
export async function getMyListings(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId!;

    const listings = await prisma.marketplaceListing.findMany({
      where: { sellerId: userId },
      include: {
        investment: {
          include: {
            vault: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const listingsData = listings.map(listing => ({
      id: listing.id,
      investmentId: listing.investmentId,
      vaultName: listing.investment.vault.name,
      priceUSDT: Number(listing.priceUSDT),
      originalInvestment: Number(listing.originalInvestment),
      status: listing.status,
      createdAt: listing.createdAt,
      soldAt: listing.soldAt,
      soldPrice: listing.soldPrice ? Number(listing.soldPrice) : null
    }));

    res.json({
      success: true,
      data: listingsData
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get my listings');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

export default {
  getMarketplaceListings,
  createListing,
  purchaseNFT,
  cancelListing,
  getMarketplaceStats,
  getMyListings
};
