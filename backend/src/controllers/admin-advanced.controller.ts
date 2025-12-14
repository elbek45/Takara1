/**
 * Advanced Admin Controller
 *
 * Features:
 * - Mining statistics and TAKARA supply tracking
 * - Wallet management (USDT, LAIKA, TAKARA addresses)
 * - Vault management (CRUD operations)
 * - System configuration
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { getLogger } from '../config/logger';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TAKARA_CONFIG } from '../utils/mining.calculator';
import { getMint } from '@solana/spl-token';

const logger = getLogger('admin-advanced-controller');

// ==================== MINING STATISTICS ====================

/**
 * Get Mining Statistics Dashboard
 *
 * GET /api/admin/mining-stats
 *
 * Returns:
 * - Total TAKARA supply (21M)
 * - TAKARA minted so far
 * - TAKARA remaining to mint
 * - Total TAKARA mined by users
 * - Mining difficulty
 * - Active investments mining count
 */
export async function getMiningStats(req: Request, res: Response) {
  try {
    logger.info('Fetching mining statistics');

    // 1. Get total mined TAKARA from all investments
    const totalMinedResult = await prisma.takaraMining.aggregate({
      _sum: {
        takaraMinedFinal: true
      }
    });

    const totalMinedByUsers = Number(totalMinedResult._sum?.takaraMinedFinal || 0);

    // 2. Get current mining difficulty and stats
    const miningStats = await prisma.miningStats.findFirst({
      orderBy: {
        date: 'desc'
      }
    });

    const currentDifficulty = Number(miningStats?.currentDifficulty || 1.0);
    const totalMiningPower = 0; // TODO: Calculate from active investments

    // 3. Get active investments count
    const activeInvestments = await prisma.investment.count({
      where: {
        status: 'ACTIVE'
      }
    });

    // 4. Check on-chain supply (if available)
    let onChainSupply = 0;
    let mintAuthority = null;

    try {
      const connection = new Connection(
        process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        'confirmed'
      );

      const takaraMint = process.env.TAKARA_TOKEN_MINT;
      if (takaraMint) {
        const mintInfo = await getMint(connection, new PublicKey(takaraMint));
        onChainSupply = Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals);
        mintAuthority = mintInfo.mintAuthority?.toBase58() || null;
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to fetch on-chain TAKARA supply');
    }

    // 5. Calculate statistics
    const TOTAL_SUPPLY = TAKARA_CONFIG.TOTAL_SUPPLY; // 21M TAKARA
    const DISTRIBUTION_YEARS = 5;
    const DAILY_BASE_RATE = TOTAL_SUPPLY / (DISTRIBUTION_YEARS * 365);

    const mintedSoFar = Math.max(onChainSupply, totalMinedByUsers);
    const remainingToMint = TOTAL_SUPPLY - mintedSoFar;
    const percentageMined = (mintedSoFar / TOTAL_SUPPLY) * 100;

    // 6. Estimate daily mining at current rate
    const estimatedDailyMining = activeInvestments > 0
      ? (totalMiningPower / currentDifficulty) * DAILY_BASE_RATE
      : 0;

    // 7. Estimate time to complete distribution
    const daysToComplete = remainingToMint > 0 && estimatedDailyMining > 0
      ? remainingToMint / estimatedDailyMining
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        supply: {
          total: TOTAL_SUPPLY,
          minted: mintedSoFar,
          remaining: remainingToMint,
          percentageMined: percentageMined.toFixed(2),
          onChainSupply,
          minedByUsers: totalMinedByUsers
        },
        distribution: {
          targetYears: DISTRIBUTION_YEARS,
          dailyBaseRate: DAILY_BASE_RATE,
          estimatedDailyMining,
          daysToComplete: Math.ceil(daysToComplete),
          estimatedCompletionDate: daysToComplete > 0
            ? new Date(Date.now() + daysToComplete * 24 * 60 * 60 * 1000).toISOString()
            : null
        },
        mining: {
          difficulty: currentDifficulty,
          totalMiningPower,
          activeInvestments
        },
        blockchain: {
          mintAddress: process.env.TAKARA_TOKEN_MINT || null,
          mintAuthority,
          network: process.env.SOLANA_NETWORK || 'devnet'
        },
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error({ error }, 'Failed to fetch mining stats');
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch mining statistics'
    });
  }
}

// ==================== WALLET MANAGEMENT ====================

/**
 * Get Current Wallets Configuration
 *
 * GET /api/admin/wallets
 */
export async function getWallets(req: Request, res: Response) {
  try {
    logger.info('Fetching wallet configuration');

    // Get from SystemConfig or environment
    const wallets = {
      solana: {
        platformWallet: process.env.PLATFORM_WALLET || null,
        network: process.env.SOLANA_NETWORK || 'devnet',
        rpcUrl: process.env.SOLANA_RPC_URL || null
      },
      ethereum: {
        platformAddress: process.env.PLATFORM_ETHEREUM_ADDRESS || null,
        network: process.env.ETHEREUM_NETWORK || 'sepolia',
        rpcUrl: process.env.ETHEREUM_RPC_URL || null
      },
      tokens: {
        takara: process.env.TAKARA_TOKEN_MINT || null,
        laika: process.env.LAIKA_TOKEN_MINT || null,
        usdt: process.env.USDT_CONTRACT_ADDRESS || '0xdAC17F958D2ee523a2206206994597C13D831ec7'
      }
    };

    // Get balances
    let balances: any = {};

    try {
      // Solana balance
      if (wallets.solana.platformWallet && wallets.solana.rpcUrl) {
        const connection = new Connection(wallets.solana.rpcUrl, 'confirmed');
        const publicKey = new PublicKey(wallets.solana.platformWallet);
        const balance = await connection.getBalance(publicKey);
        balances.solana = {
          sol: balance / LAMPORTS_PER_SOL,
          slot: await connection.getSlot()
        };
      }

      // Token balances (TAKARA, LAIKA) would go here
      // Ethereum balance would go here

    } catch (error) {
      logger.warn({ error }, 'Failed to fetch wallet balances');
      balances.error = 'Failed to fetch some balances';
    }

    return res.status(200).json({
      success: true,
      data: {
        wallets,
        balances,
        warning: 'Private keys are not exposed via API for security'
      }
    });

  } catch (error) {
    logger.error({ error }, 'Failed to fetch wallets');
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet configuration'
    });
  }
}

/**
 * Update Wallet Configuration
 *
 * PUT /api/admin/wallets
 *
 * Body:
 * {
 *   type: 'solana' | 'ethereum' | 'tokens',
 *   updates: { ... }
 * }
 */
export async function updateWallet(req: Request, res: Response) {
  try {
    const schema = z.object({
      type: z.enum(['solana', 'ethereum', 'tokens']),
      updates: z.record(z.string())
    });

    const data = schema.parse(req.body);

    logger.info({
      type: data.type,
      keys: Object.keys(data.updates)
    }, 'Updating wallet configuration');

    // Map of allowed updates per type
    const allowedUpdates: Record<string, string[]> = {
      solana: ['PLATFORM_WALLET', 'SOLANA_RPC_URL', 'SOLANA_NETWORK'],
      ethereum: ['PLATFORM_ETHEREUM_ADDRESS', 'ETHEREUM_RPC_URL', 'ETHEREUM_NETWORK'],
      tokens: ['TAKARA_TOKEN_MINT', 'LAIKA_TOKEN_MINT', 'USDT_CONTRACT_ADDRESS']
    };

    const allowed = allowedUpdates[data.type] || [];

    // Update SystemConfig for each field
    for (const [key, value] of Object.entries(data.updates)) {
      if (!allowed.includes(key)) {
        return res.status(400).json({
          success: false,
          message: `Field ${key} is not allowed for type ${data.type}`
        });
      }

      // Upsert to SystemConfig
      await prisma.systemConfig.upsert({
        where: { key },
        update: {
          value,
          description: `${data.type} configuration`,
          updatedAt: new Date()
        },
        create: {
          key,
          value,
          description: `${data.type} configuration`
        }
      });

      logger.info({ key, value: value.substring(0, 10) + '...' }, 'Updated config');
    }

    return res.status(200).json({
      success: true,
      message: 'Wallet configuration updated',
      data: {
        updated: Object.keys(data.updates),
        note: 'Restart backend to apply changes from environment variables'
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }

    logger.error({ error }, 'Failed to update wallet');
    return res.status(500).json({
      success: false,
      message: 'Failed to update wallet configuration'
    });
  }
}

// ==================== VAULT MANAGEMENT ====================

/**
 * Get All Vaults (Admin View)
 *
 * GET /api/admin/vaults
 */
export async function getVaults(req: Request, res: Response) {
  try {
    const vaults = await prisma.vault.findMany({
      include: {
        _count: {
          select: {
            investments: true
          }
        }
      },
      orderBy: [
        { tier: 'asc' },
        { duration: 'asc' }
      ]
    });

    // Calculate statistics for each vault
    const vaultsWithStats = await Promise.all(
      vaults.map(async (vault) => {
        const stats = await prisma.investment.aggregate({
          where: {
            vaultId: vault.id,
            status: {
              in: ['PENDING', 'ACTIVE']
            }
          },
          _sum: {
            usdtAmount: true
          },
          _count: true
        });

        return {
          ...vault,
          statistics: {
            totalInvestments: vault._count.investments,
            activeInvestments: stats._count,
            totalUSDT: Number(stats._sum?.usdtAmount || 0),
            fillPercentage: vault.totalCapacity
              ? (Number(vault.currentFilled) / Number(vault.totalCapacity)) * 100
              : null
          }
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: vaultsWithStats
    });

  } catch (error) {
    logger.error({ error }, 'Failed to fetch vaults');
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch vaults'
    });
  }
}

/**
 * Create New Vault
 *
 * POST /api/admin/vaults
 */
export async function createVault(req: Request, res: Response) {
  try {
    const schema = z.object({
      name: z.string().min(3).max(100),
      tier: z.enum(['STARTER', 'PRO', 'ELITE']),
      duration: z.number().int().positive(),
      payoutSchedule: z.enum(['MONTHLY', 'QUARTERLY', 'END_OF_TERM']),
      minInvestment: z.number().positive(),
      maxInvestment: z.number().positive(),
      baseAPY: z.number().min(0).max(100),
      maxAPY: z.number().min(0).max(100),
      takaraAPY: z.number().min(0),
      requireTAKARA: z.boolean().default(false),
      takaraRatio: z.number().min(0).optional(),
      totalCapacity: z.number().positive().optional(),
      isActive: z.boolean().default(true)
    });

    const data = schema.parse(req.body);

    logger.info({ name: data.name, tier: data.tier }, 'Creating new vault');

    // Validate maxAPY >= baseAPY
    if (data.maxAPY < data.baseAPY) {
      return res.status(400).json({
        success: false,
        message: 'maxAPY must be greater than or equal to baseAPY'
      });
    }

    // Validate maxInvestment >= minInvestment
    if (data.maxInvestment < data.minInvestment) {
      return res.status(400).json({
        success: false,
        message: 'maxInvestment must be greater than or equal to minInvestment'
      });
    }

    // Check for duplicate name
    const existing = await prisma.vault.findUnique({
      where: { name: data.name }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Vault with this name already exists'
      });
    }

    // Create vault
    const vault = await prisma.vault.create({
      data: {
        name: data.name,
        tier: data.tier,
        duration: data.duration,
        payoutSchedule: data.payoutSchedule,
        minInvestment: data.minInvestment,
        maxInvestment: data.maxInvestment,
        baseAPY: data.baseAPY,
        maxAPY: data.maxAPY,
        takaraAPY: data.takaraAPY,
        requireTAKARA: data.requireTAKARA,
        takaraRatio: data.takaraRatio,
        totalCapacity: data.totalCapacity,
        isActive: data.isActive
      }
    });

    logger.info({ vaultId: vault.id }, 'Vault created successfully');

    return res.status(201).json({
      success: true,
      message: 'Vault created successfully',
      data: vault
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }

    logger.error({ error }, 'Failed to create vault');
    return res.status(500).json({
      success: false,
      message: 'Failed to create vault'
    });
  }
}

/**
 * Update Vault
 *
 * PUT /api/admin/vaults/:id
 */
export async function updateVault(req: Request, res: Response) {
  try {
    const vaultId = req.params.id;

    const schema = z.object({
      name: z.string().min(3).max(100).optional(),
      minInvestment: z.number().positive().optional(),
      maxInvestment: z.number().positive().optional(),
      baseAPY: z.number().min(0).max(100).optional(),
      maxAPY: z.number().min(0).max(100).optional(),
      takaraAPY: z.number().min(0).optional(),
      requireTAKARA: z.boolean().optional(),
      takaraRatio: z.number().min(0).optional(),
      totalCapacity: z.number().positive().optional(),
      isActive: z.boolean().optional()
    });

    const data = schema.parse(req.body);

    logger.info({ vaultId, updates: Object.keys(data) }, 'Updating vault');

    // Check vault exists
    const vault = await prisma.vault.findUnique({
      where: { id: vaultId }
    });

    if (!vault) {
      return res.status(404).json({
        success: false,
        message: 'Vault not found'
      });
    }

    // Update vault
    const updated = await prisma.vault.update({
      where: { id: vaultId },
      data
    });

    logger.info({ vaultId }, 'Vault updated successfully');

    return res.status(200).json({
      success: true,
      message: 'Vault updated successfully',
      data: updated
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }

    logger.error({ error }, 'Failed to update vault');
    return res.status(500).json({
      success: false,
      message: 'Failed to update vault'
    });
  }
}

/**
 * Delete Vault (Soft Delete - Set isActive = false)
 *
 * DELETE /api/admin/vaults/:id
 */
export async function deleteVault(req: Request, res: Response) {
  try {
    const vaultId = req.params.id;

    logger.info({ vaultId }, 'Deactivating vault');

    // Check for active investments
    const activeInvestments = await prisma.investment.count({
      where: {
        vaultId,
        status: {
          in: ['PENDING', 'ACTIVE']
        }
      }
    });

    if (activeInvestments > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot deactivate vault with ${activeInvestments} active investments. Wait for them to complete or move them.`
      });
    }

    // Soft delete
    const vault = await prisma.vault.update({
      where: { id: vaultId },
      data: {
        isActive: false
      }
    });

    logger.info({ vaultId }, 'Vault deactivated successfully');

    return res.status(200).json({
      success: true,
      message: 'Vault deactivated successfully',
      data: vault
    });

  } catch (error) {
    logger.error({ error }, 'Failed to deactivate vault');
    return res.status(500).json({
      success: false,
      message: 'Failed to deactivate vault'
    });
  }
}

/**
 * Get Vault Statistics
 *
 * GET /api/admin/vaults/:id/stats
 */
export async function getVaultStats(req: Request, res: Response) {
  try {
    const vaultId = req.params.id;

    const vault = await prisma.vault.findUnique({
      where: { id: vaultId },
      include: {
        investments: {
          select: {
            id: true,
            status: true,
            usdtAmount: true,
            createdAt: true
          }
        }
      }
    });

    if (!vault) {
      return res.status(404).json({
        success: false,
        message: 'Vault not found'
      });
    }

    // Calculate statistics
    const stats = {
      totalInvestments: vault.investments.length,
      byStatus: vault.investments.reduce((acc: any, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1;
        return acc;
      }, {}),
      totalUSDT: vault.investments.reduce(
        (sum, inv) => sum + Number(inv.usdtAmount),
        0
      ),
      capacity: {
        total: Number(vault.totalCapacity || 0),
        filled: Number(vault.currentFilled),
        percentage: vault.totalCapacity
          ? (Number(vault.currentFilled) / Number(vault.totalCapacity)) * 100
          : null
      },
      recentInvestments: vault.investments
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10)
    };

    return res.status(200).json({
      success: true,
      data: {
        vault: {
          id: vault.id,
          name: vault.name,
          tier: vault.tier,
          duration: vault.duration
        },
        statistics: stats
      }
    });

  } catch (error) {
    logger.error({ error }, 'Failed to fetch vault stats');
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch vault statistics'
    });
  }
}

// ==================== NETWORK CONFIGURATION ====================

/**
 * Get Network Configuration
 *
 * GET /api/admin/network
 *
 * Returns current network configuration (testnet/mainnet)
 */
export async function getNetworkConfig(req: Request, res: Response) {
  try {
    logger.info('Fetching network configuration');

    const config = {
      // Solana Configuration
      solana: {
        network: process.env.SOLANA_NETWORK || 'testnet',
        rpcUrl: process.env.SOLANA_RPC_URL || '',
        platformWallet: process.env.PLATFORM_WALLET || '',
        takaraTokenMint: process.env.TAKARA_TOKEN_MINT || '',
        laikaTokenMint: process.env.LAIKA_TOKEN_MINT || '',
        usdtTokenMint: process.env.USDT_TOKEN_MINT || '',
      },
      // Ethereum Configuration
      ethereum: {
        network: process.env.ETHEREUM_NETWORK || 'sepolia',
        rpcUrl: process.env.ETHEREUM_RPC_URL || '',
        platformAddress: process.env.PLATFORM_ETHEREUM_ADDRESS || '',
        usdtContractAddress: process.env.USDT_CONTRACT_ADDRESS || '',
      },
      // General
      nodeEnv: process.env.NODE_ENV || 'development',
      appVersion: process.env.APP_VERSION || '2.1.1',
    };

    return res.status(200).json({
      success: true,
      data: config
    });

  } catch (error) {
    logger.error({ error }, 'Failed to fetch network configuration');
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch network configuration'
    });
  }
}

/**
 * Update Network Configuration
 *
 * PUT /api/admin/network
 *
 * Updates network configuration and restarts backend
 */
export async function updateNetworkConfig(req: Request, res: Response) {
  try {
    const schema = z.object({
      solana: z.object({
        network: z.enum(['testnet', 'devnet', 'mainnet-beta']),
        rpcUrl: z.string().url(),
        platformWallet: z.string().optional(),
        platformWalletPrivateKey: z.string().optional(),
        takaraTokenMint: z.string().optional(),
        laikaTokenMint: z.string().optional(),
        usdtTokenMint: z.string().optional(),
      }).optional(),
      ethereum: z.object({
        network: z.enum(['sepolia', 'mainnet']),
        rpcUrl: z.string().url(),
        platformAddress: z.string().optional(),
        platformPrivateKey: z.string().optional(),
        usdtContractAddress: z.string().optional(),
      }).optional(),
    });

    const validatedData = schema.parse(req.body);

    logger.info({ config: validatedData }, 'Updating network configuration');

    // In production, this would:
    // 1. Write to .env file or database
    // 2. Restart the backend service
    // 3. Update configuration

    // For now, we'll return a message that manual update is required
    return res.status(200).json({
      success: true,
      message: 'Network configuration received. Manual server restart required to apply changes.',
      data: validatedData,
      note: 'Configuration must be manually updated in .env.production file and server must be restarted'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }

    logger.error({ error }, 'Failed to update network configuration');
    return res.status(500).json({
      success: false,
      message: 'Failed to update network configuration'
    });
  }
}

// ==================== TAKARA PRICING CALCULATOR ====================

/**
 * GET /api/admin/pricing/takara
 *
 * Get comprehensive TAKARA pricing calculations for admin panel
 *
 * Returns:
 * - Current TAKARA price (dynamic or calculated)
 * - Mining economics and difficulty
 * - Example calculations for different vaults
 * - Price scenarios and recommendations
 * - ROI analysis
 */
export async function getTakaraPricingCalculations(req: Request, res: Response) {
  try {
    logger.info('Fetching TAKARA pricing calculations');

    const { getTakaraPricingCalculations } = await import('../services/price.service');
    const calculations = await getTakaraPricingCalculations();

    return res.json({
      success: true,
      data: calculations
    });

  } catch (error) {
    logger.error({ error }, 'Failed to get TAKARA pricing calculations');
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch TAKARA pricing calculations'
    });
  }
}

/**
 * GET /api/admin/pricing/laika
 * Get current LAIKA token price from multiple sources
 * Returns cached price if available (5min cache)
 */
export async function getLaikaPricing(req: Request, res: Response) {
  try {
    logger.info('Fetching LAIKA price');

    const { getLaikaPrice } = await import('../services/price.service');
    const laikaPrice = await getLaikaPrice();

    // Calculate platform acceptance value (10% below market)
    const platformAcceptanceRate = 0.90;
    const platformValue = laikaPrice * platformAcceptanceRate;

    return res.json({
      success: true,
      data: {
        currentPrice: laikaPrice,
        platformAcceptanceValue: platformValue,
        platformDiscount: 10, // percentage
        sources: ['CoinMarketCap', 'Jupiter', 'CoinGecko'],
        cacheAge: '5 minutes',
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error({ error }, 'Failed to get LAIKA price');
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch LAIKA price'
    });
  }
}
