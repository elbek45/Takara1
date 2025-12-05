/**
 * TAKARA Boost Service - v2.2
 *
 * Handles TAKARA token boost for investments:
 * - Apply TAKARA boost to investment
 * - Lock TAKARA tokens
 * - Calculate additional APY
 * - Return TAKARA at investment completion
 */

import { PrismaClient } from '@prisma/client';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { connection } from './solana.service';
import { getLogger } from '../config/logger';
import {
  calculateTakaraBoost,
  validateTakaraBoost,
  TakaraBoostInput,
  TakaraBoostResult
} from '../utils/takara.calculator';

const prisma = new PrismaClient();
const logger = getLogger('takara-boost-service');

const TAKARA_TOKEN_MINT = process.env.TAKARA_TOKEN_MINT;
const PLATFORM_WALLET_ADDRESS = process.env.PLATFORM_WALLET_ADDRESS;

export interface ApplyTakaraBoostInput {
  investmentId: string;
  userId: string;
  takaraAmount: number; // Amount of TAKARA tokens to use for boost
  takaraPrice: number; // Current TAKARA price in USDT
  userWallet: string; // User's wallet address (for token transfer)
  platformWallet?: Keypair; // Platform wallet keypair (for receiving tokens)
}

export interface ApplyTakaraBoostResult {
  boostId: string;
  calculation: TakaraBoostResult;
  depositTxSignature?: string;
}

/**
 * Apply TAKARA boost to an investment
 */
export async function applyTakaraBoost(
  input: ApplyTakaraBoostInput
): Promise<ApplyTakaraBoostResult> {
  const { investmentId, userId, takaraAmount, takaraPrice, userWallet, platformWallet } = input;

  try {
    logger.info({
      investmentId,
      userId,
      takaraAmount,
      takaraPrice
    }, 'Applying TAKARA boost');

    // 1. Get investment details
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        vault: true,
        takaraBoost: true
      }
    });

    if (!investment) {
      throw new Error('Investment not found');
    }

    if (investment.userId !== userId) {
      throw new Error('Investment does not belong to user');
    }

    if (investment.takaraBoost) {
      throw new Error('TAKARA boost already applied to this investment');
    }

    if (investment.status !== 'ACTIVE') {
      throw new Error('Investment must be active to apply boost');
    }

    // 2. Calculate market value
    const takaraMarketValueUSD = takaraAmount * takaraPrice;

    // 3. Prepare boost input
    const boostInput: TakaraBoostInput = {
      baseAPY: Number(investment.finalAPY), // Current APY (may include LAIKA boost)
      maxAPY: Number(investment.vault.maxAPY),
      tier: investment.vault.tier,
      usdtInvested: Number(investment.usdtAmount),
      takaraMarketValueUSD
    };

    // 4. Validate boost
    const validation = validateTakaraBoost(boostInput);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid TAKARA boost parameters');
    }

    // Log warning if any
    if (validation.warning) {
      logger.warn({ warning: validation.warning }, 'TAKARA boost validation warning');
    }

    // 5. Calculate boost
    const calculation = calculateTakaraBoost(boostInput);

    logger.info({
      calculation
    }, 'TAKARA boost calculated');

    // 6. Transfer TAKARA tokens to platform (if wallet provided)
    let depositTxSignature: string | undefined;
    if (platformWallet && TAKARA_TOKEN_MINT) {
      try {
        depositTxSignature = await transferTakaraToPlat form(
          takaraAmount,
          userWallet,
          platformWallet
        );
        logger.info({
          depositTxSignature,
          takaraAmount
        }, 'TAKARA transferred to platform');
      } catch (error) {
        logger.error({ error }, 'Failed to transfer TAKARA tokens');
        throw new Error('Failed to transfer TAKARA tokens. Please check your wallet balance and try again.');
      }
    }

    // 7. Create boost record
    const takaraBoost = await prisma.takaraBoost.create({
      data: {
        investmentId,
        takaraAmount,
        takaraValueUSD: calculation.takaraMarketValueUSD,
        maxAllowedUSD: calculation.maxTakaraValueUSD,
        boostPercentage: calculation.boostFillPercent,
        additionalAPY: calculation.additionalAPY,
        depositTxSignature,
        isReturned: false
      }
    });

    // 8. Update investment with new final APY
    await prisma.investment.update({
      where: { id: investmentId },
      data: {
        finalAPY: calculation.finalAPY
      }
    });

    logger.info({
      boostId: takaraBoost.id,
      investmentId,
      finalAPY: calculation.finalAPY
    }, 'TAKARA boost applied successfully');

    return {
      boostId: takaraBoost.id,
      calculation,
      depositTxSignature
    };

  } catch (error) {
    logger.error({ error, input }, 'Failed to apply TAKARA boost');
    throw error;
  }
}

/**
 * Return TAKARA tokens to user when investment completes
 */
export async function returnTakaraBoost(params: {
  investmentId: string;
  userWallet: string;
  platformWallet?: Keypair;
}): Promise<{
  takaraAmount: number;
  returnTxSignature?: string;
}> {
  const { investmentId, userWallet, platformWallet } = params;

  try {
    logger.info({ investmentId, userWallet }, 'Returning TAKARA boost');

    // 1. Get boost record
    const takaraBoost = await prisma.takaraBoost.findUnique({
      where: { investmentId },
      include: {
        investment: true
      }
    });

    if (!takaraBoost) {
      throw new Error('TAKARA boost not found for this investment');
    }

    if (takaraBoost.isReturned) {
      throw new Error('TAKARA boost already returned');
    }

    const takaraAmount = Number(takaraBoost.takaraAmount);

    // 2. Transfer TAKARA back to user (if wallet provided)
    let returnTxSignature: string | undefined;
    if (platformWallet && TAKARA_TOKEN_MINT) {
      try {
        returnTxSignature = await transferTakaraToUser(
          takaraAmount,
          userWallet,
          platformWallet
        );
        logger.info({
          returnTxSignature,
          takaraAmount,
          userWallet
        }, 'TAKARA returned to user');
      } catch (error) {
        logger.error({ error }, 'Failed to return TAKARA tokens');
        throw new Error('Failed to return TAKARA tokens');
      }
    }

    // 3. Mark as returned
    await prisma.takaraBoost.update({
      where: { investmentId },
      data: {
        isReturned: true,
        returnDate: new Date(),
        returnTxSignature
      }
    });

    logger.info({
      investmentId,
      takaraAmount
    }, 'TAKARA boost returned successfully');

    return {
      takaraAmount,
      returnTxSignature
    };

  } catch (error) {
    logger.error({ error, params }, 'Failed to return TAKARA boost');
    throw error;
  }
}

/**
 * Get TAKARA boost details for an investment
 */
export async function getTakaraBoost(investmentId: string) {
  try {
    const takaraBoost = await prisma.takaraBoost.findUnique({
      where: { investmentId },
      include: {
        investment: {
          include: {
            vault: true
          }
        }
      }
    });

    return takaraBoost;
  } catch (error) {
    logger.error({ error, investmentId }, 'Failed to get TAKARA boost');
    throw error;
  }
}

/**
 * Check if investment has TAKARA boost
 */
export async function hasTakaraBoost(investmentId: string): Promise<boolean> {
  try {
    const count = await prisma.takaraBoost.count({
      where: { investmentId }
    });
    return count > 0;
  } catch (error) {
    logger.error({ error, investmentId }, 'Failed to check TAKARA boost');
    return false;
  }
}

/**
 * Get all TAKARA boosts for a user
 */
export async function getUserTakaraBoosts(userId: string) {
  try {
    const boosts = await prisma.takaraBoost.findMany({
      where: {
        investment: {
          userId
        }
      },
      include: {
        investment: {
          include: {
            vault: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return boosts;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get user TAKARA boosts');
    throw error;
  }
}

/**
 * Get statistics for TAKARA boost
 */
export async function getTakaraBoostStatistics() {
  try {
    const [
      totalBoosts,
      activeBoosts,
      returnedBoosts,
      totalTakaraLocked,
      totalTakaraReturned
    ] = await Promise.all([
      // Total boosts
      prisma.takaraBoost.count(),

      // Active boosts (not returned)
      prisma.takaraBoost.count({
        where: { isReturned: false }
      }),

      // Returned boosts
      prisma.takaraBoost.count({
        where: { isReturned: true }
      }),

      // Total TAKARA locked
      prisma.takaraBoost.aggregate({
        where: { isReturned: false },
        _sum: { takaraAmount: true }
      }),

      // Total TAKARA returned
      prisma.takaraBoost.aggregate({
        where: { isReturned: true },
        _sum: { takaraAmount: true }
      })
    ]);

    return {
      totalBoosts,
      activeBoosts,
      returnedBoosts,
      totalTakaraLocked: Number(totalTakaraLocked._sum.takaraAmount || 0),
      totalTakaraReturned: Number(totalTakaraReturned._sum.takaraAmount || 0)
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get TAKARA boost statistics');
    throw error;
  }
}

/**
 * Transfer TAKARA tokens from user to platform
 */
async function transferTakaraToPlat form(
  amount: number,
  fromWallet: string,
  platformWallet: Keypair
): Promise<string> {
  if (!TAKARA_TOKEN_MINT) {
    throw new Error('TAKARA_TOKEN_MINT not configured');
  }

  const mintPubkey = new PublicKey(TAKARA_TOKEN_MINT);
  const fromPubkey = new PublicKey(fromWallet);

  // Get token accounts
  const fromTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    fromPubkey
  );

  const toTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    platformWallet.publicKey
  );

  // Create transfer instruction
  // Note: Assuming TAKARA has 6 decimals, adjust if different
  const transferInstruction = createTransferInstruction(
    fromTokenAccount,
    toTokenAccount,
    fromPubkey,
    amount * 1e6, // Convert to token units
    [],
    TOKEN_PROGRAM_ID
  );

  // Create and send transaction
  const transaction = new Transaction().add(transferInstruction);

  // Note: This needs to be signed by the user's wallet
  // In production, this would be handled by the frontend
  const signature = await connection.sendTransaction(
    transaction,
    [platformWallet]
  );

  await connection.confirmTransaction(signature);

  return signature;
}

/**
 * Transfer TAKARA tokens from platform to user
 */
async function transferTakaraToUser(
  amount: number,
  toWallet: string,
  platformWallet: Keypair
): Promise<string> {
  if (!TAKARA_TOKEN_MINT) {
    throw new Error('TAKARA_TOKEN_MINT not configured');
  }

  const mintPubkey = new PublicKey(TAKARA_TOKEN_MINT);
  const toPubkey = new PublicKey(toWallet);

  // Get token accounts
  const fromTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    platformWallet.publicKey
  );

  const toTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    toPubkey
  );

  // Create transfer instruction
  const transferInstruction = createTransferInstruction(
    fromTokenAccount,
    toTokenAccount,
    platformWallet.publicKey,
    amount * 1e6, // Convert to token units
    [],
    TOKEN_PROGRAM_ID
  );

  // Create and send transaction
  const transaction = new Transaction().add(transferInstruction);
  const signature = await connection.sendTransaction(
    transaction,
    [platformWallet]
  );

  await connection.confirmTransaction(signature);

  return signature;
}

export default {
  applyTakaraBoost,
  returnTakaraBoost,
  getTakaraBoost,
  hasTakaraBoost,
  getUserTakaraBoosts,
  getTakaraBoostStatistics
};
