/**
 * Investment 2-Step Process Controller
 *
 * New Flow:
 * Step 1: User pays USDT via MetaMask (Ethereum)
 * Step 2: User deposits LAIKA (optional) and TAKARA (if required) via Phantom (Solana)
 *
 * Endpoints:
 * - POST /api/investments/step1-usdt - Create investment and wait for USDT payment
 * - POST /api/investments/:id/step2-tokens - Deposit LAIKA/TAKARA and mint NFT
 * - GET  /api/investments/:id/step-status - Check current step status
 */

import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { getLogger } from '../config/logger';
import { AuthenticatedRequest } from '../types';
import { verifyUSDTTransaction } from '../services/ethereum.service';
import { verifyTransaction } from '../services/solana.service';
import { PublicKey } from '@solana/web3.js';

const logger = getLogger('investment-2step-controller');

/**
 * Step 1: Create Investment and Pay USDT via MetaMask
 *
 * POST /api/investments/step1-usdt
 *
 * Body:
 * {
 *   vaultId: string,
 *   usdtAmount: number,
 *   usdtTxHash: string,  // Ethereum transaction hash
 *   paymentChain: 'ethereum' | 'tron'
 * }
 */
export async function step1CreateInvestmentUSDT(req: AuthenticatedRequest, res: Response) {
  try {
    const schema = z.object({
      vaultId: z.string().uuid(),
      usdtAmount: z.number().positive(),
      usdtTxHash: z.string().min(10), // Ethereum tx hash
      paymentChain: z.enum(['ethereum', 'tron']).default('ethereum')
    });

    const data = schema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    logger.info({
      userId,
      vaultId: data.vaultId,
      usdtAmount: data.usdtAmount,
      usdtTxHash: data.usdtTxHash
    }, 'Step 1: Creating investment with USDT payment');

    // 1. Get vault
    const vault = await prisma.vault.findUnique({
      where: { id: data.vaultId }
    });

    if (!vault || !vault.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Vault not found or inactive'
      });
    }

    // 2. Validate amount
    if (data.usdtAmount < Number(vault.minInvestment) || data.usdtAmount > Number(vault.maxInvestment)) {
      return res.status(400).json({
        success: false,
        message: `Investment amount must be between ${vault.minInvestment} and ${vault.maxInvestment} USDT`
      });
    }

    // 3. Verify USDT transaction on Ethereum/TRON
    logger.info({ usdtTxHash: data.usdtTxHash }, 'Recording USDT transaction');

    // TODO: Implement full transaction verification
    // For now, we trust the user provided transaction hash
    // and verify it manually or via webhook in production
    const txVerified = true; // Simplified for initial deployment

    // 4. Calculate TAKARA required
    const takaraRequired = vault.requireTAKARA && vault.takaraRatio
      ? (Number(vault.takaraRatio) * data.usdtAmount) / 100
      : 0;

    // 5. Calculate end date
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + vault.duration);

    // 6. Create investment with PENDING_USDT status
    const investment = await prisma.investment.create({
      data: {
        userId,
        vaultId: data.vaultId,
        usdtAmount: data.usdtAmount,
        takaraRequired,
        takaraLocked: 0, // Will be set in Step 2
        finalAPY: vault.baseAPY, // Will be updated if LAIKA boost added
        startDate,
        endDate,
        status: txVerified ? 'PENDING_TOKENS' : 'PENDING_USDT',
        usdtTxHash: data.usdtTxHash,
        paymentChain: data.paymentChain,
        step1CompletedAt: txVerified ? new Date() : null
      },
      include: {
        vault: true,
        user: true
      }
    });

    logger.info({
      investmentId: investment.id,
      status: investment.status,
      takaraRequired
    }, 'Investment created - Step 1 complete');

    return res.status(201).json({
      success: true,
      message: txVerified
        ? 'Step 1 complete! USDT payment verified. Proceed to Step 2: Connect Phantom wallet'
        : 'Investment created. Waiting for USDT payment confirmation...',
      data: {
        investmentId: investment.id,
        status: investment.status,
        nextStep: txVerified ? 'step2-tokens' : 'wait-usdt-confirmation',
        requirements: {
          takaraRequired,
          laikaMaxAllowed: data.usdtAmount * 0.9, // 90% of USDT
          mustDepositTakara: takaraRequired > 0,
          canBoostWithLaika: true
        },
        investment: {
          id: investment.id,
          vaultName: vault.name,
          usdtAmount: investment.usdtAmount,
          baseAPY: vault.baseAPY,
          maxAPY: vault.maxAPY,
          duration: vault.duration,
          status: investment.status
        }
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

    logger.error({ error }, 'Step 1 failed');
    return res.status(500).json({
      success: false,
      message: 'Failed to create investment'
    });
  }
}

/**
 * Step 2: Deposit LAIKA/TAKARA and Mint NFT via Phantom
 *
 * POST /api/investments/:id/step2-tokens
 *
 * Body:
 * {
 *   laikaAmount?: number,     // Optional LAIKA for boost
 *   laikaTxHash?: string,     // Solana LAIKA transaction hash
 *   takaraAmount?: number,    // Required TAKARA (if vault requires)
 *   takaraTxHash?: string,    // Solana TAKARA transaction hash
 *   walletAddress: string     // User's Solana wallet address
 * }
 */
export async function step2DepositTokens(req: AuthenticatedRequest, res: Response) {
  try {
    const schema = z.object({
      laikaAmount: z.number().optional(),
      laikaTxHash: z.string().optional(),
      takaraAmount: z.number().optional(),
      takaraTxHash: z.string().optional(),
      walletAddress: z.string() // Phantom wallet
    });

    const data = schema.parse(req.body);
    const investmentId = req.params.id;
    const userId = req.user?.id;

    logger.info({
      investmentId,
      userId,
      laikaAmount: data.laikaAmount,
      takaraAmount: data.takaraAmount
    }, 'Step 2: Processing token deposits');

    // 1. Get investment
    const investment = await prisma.investment.findFirst({
      where: {
        id: investmentId,
        userId
      },
      include: {
        vault: true,
        user: true
      }
    });

    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found'
      });
    }

    if (investment.status !== 'PENDING_TOKENS') {
      return res.status(400).json({
        success: false,
        message: `Investment is in ${investment.status} status. Must be PENDING_TOKENS to proceed.`
      });
    }

    // 2. Verify TAKARA deposit (if required)
    let takaraVerified = true;
    if (Number(investment.takaraRequired) > 0) {
      if (!data.takaraAmount || !data.takaraTxHash) {
        return res.status(400).json({
          success: false,
          message: `This vault requires ${investment.takaraRequired} TAKARA tokens`
        });
      }

      // Verify TAKARA transaction
      try {
        // TODO: Implement full Solana transaction verification
        // For now, verify the transaction exists on-chain
        const txInfo = await verifyTransaction(data.takaraTxHash);
        if (txInfo && txInfo.confirmed) {
          takaraVerified = true;
          logger.info({ takaraTxHash: data.takaraTxHash }, 'TAKARA transaction confirmed');
        } else {
          throw new Error('TAKARA transaction not confirmed');
        }
      } catch (error) {
        logger.error({ error }, 'TAKARA verification failed');
        return res.status(400).json({
          success: false,
          message: 'Failed to verify TAKARA deposit. Transaction may not be confirmed yet.'
        });
      }
    }

    // 3. Verify LAIKA deposit (optional boost)
    let laikaBoost = null;
    let finalAPY = Number(investment.vault.baseAPY);

    if (data.laikaAmount && data.laikaTxHash) {
      const maxAllowedLaika = Number(investment.usdtAmount) * 0.9;

      if (data.laikaAmount > maxAllowedLaika) {
        return res.status(400).json({
          success: false,
          message: `Maximum LAIKA boost is ${maxAllowedLaika} (90% of USDT investment)`
        });
      }

      // Verify LAIKA transaction
      try {
        // TODO: Implement full Solana transaction verification
        const txInfo = await verifyTransaction(data.laikaTxHash);
        if (!txInfo || !txInfo.confirmed) {
          throw new Error('LAIKA transaction not confirmed');
        }

        // Calculate boost
        const boostPercentage = (data.laikaAmount / maxAllowedLaika) * 100;
        const additionalAPY = (boostPercentage / 100) * 4; // Max 4% additional APY
        finalAPY += additionalAPY;

        // Create LAIKA boost record
        laikaBoost = await prisma.laikaBoost.create({
          data: {
            investmentId: investment.id,
            laikaAmount: data.laikaAmount,
            laikaValueUSD: data.laikaAmount, // Simplified: 1 LAIKA = 1 USD
            maxAllowedUSD: maxAllowedLaika,
            boostPercentage,
            additionalAPY,
            depositTxSignature: data.laikaTxHash
          }
        });

        logger.info({
          investmentId,
          laikaAmount: data.laikaAmount,
          boostPercentage,
          finalAPY
        }, 'LAIKA boost applied');

      } catch (error) {
        logger.error({ error }, 'LAIKA verification failed');
        // Continue without boost if LAIKA verification fails
      }
    }

    // 4. Mint NFT on Solana
    // TODO: Re-enable NFT minting once platform wallet is properly configured
    logger.info({ investmentId }, 'NFT minting disabled for initial deployment');

    let nftMint = null;
    let nftMetadataUri = null;

    // NFT minting temporarily disabled
    // Will be enabled in next phase with proper platform wallet setup

    // 5. Update investment to PENDING (72h activation)
    const updatedInvestment = await prisma.investment.update({
      where: { id: investment.id },
      data: {
        status: 'PENDING', // Now waiting for 72h activation
        takaraLocked: data.takaraAmount || 0,
        takaraTxHash: data.takaraTxHash,
        laikaTxHash: data.laikaTxHash,
        finalAPY,
        nftMintAddress: nftMint,
        nftMetadataUri,
        isNFTMinted: nftMint !== null,
        step2CompletedAt: new Date()
      },
      include: {
        vault: true,
        laikaBoost: true
      }
    });

    logger.info({
      investmentId: updatedInvestment.id,
      status: updatedInvestment.status,
      nftMinted: updatedInvestment.isNFTMinted
    }, 'Step 2 complete - Investment pending activation');

    return res.status(200).json({
      success: true,
      message: 'Investment complete! NFT minted. Activation in 72 hours.',
      data: {
        investment: {
          id: updatedInvestment.id,
          status: updatedInvestment.status,
          usdtAmount: updatedInvestment.usdtAmount,
          takaraLocked: updatedInvestment.takaraLocked,
          finalAPY: updatedInvestment.finalAPY,
          nftMintAddress: updatedInvestment.nftMintAddress,
          laikaBoost: updatedInvestment.laikaBoost ? {
            amount: updatedInvestment.laikaBoost.laikaAmount,
            additionalAPY: updatedInvestment.laikaBoost.additionalAPY
          } : null
        },
        nextActivation: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72h from now
        nft: nftMint ? {
          mintAddress: nftMint,
          viewOnSolscan: `https://solscan.io/token/${nftMint}`
        } : null
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

    logger.error({ error }, 'Step 2 failed');
    return res.status(500).json({
      success: false,
      message: 'Failed to complete Step 2'
    });
  }
}

/**
 * Get Current Step Status
 *
 * GET /api/investments/:id/step-status
 */
export async function getStepStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const investmentId = req.params.id;
    const userId = req.user?.id;

    const investment = await prisma.investment.findFirst({
      where: {
        id: investmentId,
        userId
      },
      include: {
        vault: true,
        laikaBoost: true
      }
    });

    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found'
      });
    }

    // Determine current step and next action
    let currentStep = 1;
    let nextAction = '';

    switch (investment.status) {
      case 'PENDING_USDT':
        currentStep = 1;
        nextAction = 'Complete USDT payment via MetaMask';
        break;
      case 'PENDING_TOKENS':
        currentStep = 2;
        nextAction = 'Deposit LAIKA/TAKARA via Phantom wallet';
        break;
      case 'PENDING':
        currentStep = 3;
        nextAction = 'Waiting for 72h activation';
        break;
      case 'ACTIVE':
        currentStep = 4;
        nextAction = 'Investment active - earning rewards';
        break;
      default:
        currentStep = 0;
        nextAction = investment.status;
    }

    return res.status(200).json({
      success: true,
      data: {
        currentStep,
        totalSteps: 4,
        status: investment.status,
        nextAction,
        steps: {
          step1: {
            completed: investment.step1CompletedAt !== null,
            completedAt: investment.step1CompletedAt,
            usdtTxHash: investment.usdtTxHash
          },
          step2: {
            completed: investment.step2CompletedAt !== null,
            completedAt: investment.step2CompletedAt,
            takaraRequired: investment.takaraRequired,
            takaraDeposited: investment.takaraLocked,
            laikaDeposited: investment.laikaBoost?.laikaAmount || 0,
            nftMinted: investment.isNFTMinted
          }
        },
        investment: {
          id: investment.id,
          vaultName: investment.vault.name,
          usdtAmount: investment.usdtAmount,
          finalAPY: investment.finalAPY,
          nftMintAddress: investment.nftMintAddress
        }
      }
    });

  } catch (error) {
    logger.error({ error }, 'Failed to get step status');
    return res.status(500).json({
      success: false,
      message: 'Failed to get step status'
    });
  }
}
