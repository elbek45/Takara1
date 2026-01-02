/**
 * Tax Service - v2.2
 *
 * Handles 5% tax collection on:
 * - TAKARA claims
 * - WEXEL NFT sales
 *
 * Tax goes to Treasury wallet
 */

import { PrismaClient, TaxSourceType } from '@prisma/client';
import { getLogger } from '../config/logger';
import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { connection } from './solana.service';

const prisma = new PrismaClient();
const logger = getLogger('tax-service');

const TAX_RATE = 5.0; // 5%
const TREASURY_WALLET = process.env.TREASURY_WALLET_ADDRESS || process.env.PLATFORM_WALLET_ADDRESS || process.env.PLATFORM_WALLET;

export interface TaxCalculation {
  amountBeforeTax: number;
  taxPercent: number;
  taxAmount: number;
  amountAfterTax: number;
}

/**
 * Calculate 5% tax
 */
export function calculateTax(amount: number): TaxCalculation {
  const taxAmount = (amount * TAX_RATE) / 100;
  const amountAfterTax = amount - taxAmount;

  return {
    amountBeforeTax: amount,
    taxPercent: TAX_RATE,
    taxAmount,
    amountAfterTax
  };
}

/**
 * Record tax in database
 */
export async function recordTax(params: {
  sourceType: TaxSourceType;
  sourceId: string;
  userId: string;
  tokenSymbol: string;
  calculation: TaxCalculation;
  txSignature?: string;
}): Promise<void> {
  try {
    // Validate treasury wallet is configured
    if (!TREASURY_WALLET) {
      logger.error('TREASURY_WALLET not configured - check env variables');
      throw new Error('Treasury wallet not configured');
    }

    await prisma.taxRecord.create({
      data: {
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        userId: params.userId,
        tokenSymbol: params.tokenSymbol,
        amountBeforeTax: params.calculation.amountBeforeTax,
        taxPercent: params.calculation.taxPercent,
        taxAmount: params.calculation.taxAmount,
        amountAfterTax: params.calculation.amountAfterTax,
        txSignature: params.txSignature || null,
        treasuryWallet: TREASURY_WALLET
      }
    });

    // Update treasury balance
    await updateTreasuryBalance(
      params.tokenSymbol,
      params.calculation.taxAmount
    );

    logger.info({
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      tokenSymbol: params.tokenSymbol,
      taxAmount: params.calculation.taxAmount
    }, 'Tax recorded');

  } catch (error) {
    logger.error({ error, params }, 'Failed to record tax');
    throw new Error('Failed to record tax');
  }
}

/**
 * Update treasury balance
 */
async function updateTreasuryBalance(
  tokenSymbol: string,
  taxAmount: number
): Promise<void> {
  try {
    // Upsert treasury balance
    await prisma.treasuryBalance.upsert({
      where: { tokenSymbol },
      create: {
        tokenSymbol,
        balance: taxAmount,
        totalCollected: taxAmount,
        totalWithdrawn: 0
      },
      update: {
        balance: {
          increment: taxAmount
        },
        totalCollected: {
          increment: taxAmount
        }
      }
    });

    logger.info({
      tokenSymbol,
      taxAmount
    }, 'Treasury balance updated');

  } catch (error) {
    logger.error({ error, tokenSymbol, taxAmount }, 'Failed to update treasury balance');
    throw error;
  }
}

/**
 * Apply 5% tax on TAKARA claim
 */
export async function applyTakaraClaimTax(params: {
  userId: string;
  transactionId: string;
  takaraAmount: number;
  platformWallet?: Keypair;
}): Promise<{
  taxAmount: number;
  amountAfterTax: number;
  txSignature?: string;
}> {
  try {
    logger.info({
      userId: params.userId,
      takaraAmount: params.takaraAmount
    }, 'Applying TAKARA claim tax');

    // Calculate tax
    const calculation = calculateTax(params.takaraAmount);

    logger.info({
      calculation
    }, 'Tax calculated');

    // Transfer tax to treasury (if wallet provided)
    let txSignature: string | undefined;
    if (params.platformWallet && TREASURY_WALLET) {
      try {
        txSignature = await transferTaxToTreasury({
          tokenSymbol: 'TAKARA',
          amount: calculation.taxAmount,
          platformWallet: params.platformWallet
        });
      } catch (error) {
        logger.error({ error }, 'Failed to transfer tax to treasury, continuing...');
      }
    }

    // Record tax
    await recordTax({
      sourceType: 'TAKARA_CLAIM',
      sourceId: params.transactionId,
      userId: params.userId,
      tokenSymbol: 'TAKARA',
      calculation,
      txSignature
    });

    logger.info({
      userId: params.userId,
      taxAmount: calculation.taxAmount,
      amountAfterTax: calculation.amountAfterTax
    }, 'TAKARA claim tax applied');

    return {
      taxAmount: calculation.taxAmount,
      amountAfterTax: calculation.amountAfterTax,
      txSignature
    };

  } catch (error) {
    logger.error({ error, params }, 'Failed to apply TAKARA claim tax');
    throw new Error('Failed to apply tax');
  }
}

/**
 * Apply 5% tax on WEXEL NFT sale
 */
export async function applyWexelSaleTax(params: {
  userId: string;
  investmentId: string;
  salePrice: number; // in USDT
  platformWallet?: Keypair;
}): Promise<{
  taxAmount: number;
  amountAfterTax: number;
  txSignature?: string;
}> {
  try {
    logger.info({
      userId: params.userId,
      investmentId: params.investmentId,
      salePrice: params.salePrice
    }, 'Applying WEXEL sale tax');

    // Calculate tax
    const calculation = calculateTax(params.salePrice);

    logger.info({
      calculation
    }, 'Tax calculated');

    // Transfer tax to treasury (if wallet provided)
    let txSignature: string | undefined;
    if (params.platformWallet && TREASURY_WALLET) {
      try {
        txSignature = await transferTaxToTreasury({
          tokenSymbol: 'USDT',
          amount: calculation.taxAmount,
          platformWallet: params.platformWallet
        });
      } catch (error) {
        logger.error({ error }, 'Failed to transfer tax to treasury, continuing...');
      }
    }

    // Record tax
    await recordTax({
      sourceType: 'WEXEL_SALE',
      sourceId: params.investmentId,
      userId: params.userId,
      tokenSymbol: 'USDT',
      calculation,
      txSignature
    });

    logger.info({
      userId: params.userId,
      taxAmount: calculation.taxAmount,
      amountAfterTax: calculation.amountAfterTax
    }, 'WEXEL sale tax applied');

    return {
      taxAmount: calculation.taxAmount,
      amountAfterTax: calculation.amountAfterTax,
      txSignature
    };

  } catch (error) {
    logger.error({ error, params }, 'Failed to apply WEXEL sale tax');
    throw new Error('Failed to apply tax');
  }
}

/**
 * Transfer tax to treasury wallet
 */
async function transferTaxToTreasury(params: {
  tokenSymbol: string;
  amount: number;
  platformWallet: Keypair;
}): Promise<string> {
  try {
    if (!TREASURY_WALLET) {
      throw new Error('TREASURY_WALLET_ADDRESS not configured');
    }

    const treasuryPubkey = new PublicKey(TREASURY_WALLET);

    // Get token mint address
    const tokenMint = getTokenMintAddress(params.tokenSymbol);
    if (!tokenMint) {
      throw new Error(`Token mint not found for ${params.tokenSymbol}`);
    }

    const mintPubkey = new PublicKey(tokenMint);

    // Get token accounts
    const fromTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      params.platformWallet.publicKey
    );

    const toTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      treasuryPubkey
    );

    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      params.platformWallet.publicKey,
      params.amount * 1e6, // Convert to token units (6 decimals for USDT, adjust for TAKARA)
      [],
      TOKEN_PROGRAM_ID
    );

    // Create and send transaction
    const transaction = new Transaction().add(transferInstruction);
    const signature = await connection.sendTransaction(
      transaction,
      [params.platformWallet]
    );

    await connection.confirmTransaction(signature);

    logger.info({
      tokenSymbol: params.tokenSymbol,
      amount: params.amount,
      signature
    }, 'Tax transferred to treasury');

    return signature;

  } catch (error) {
    logger.error({ error, params }, 'Failed to transfer tax to treasury');
    throw error;
  }
}

/**
 * Get token mint address by symbol
 */
function getTokenMintAddress(tokenSymbol: string): string | null {
  switch (tokenSymbol) {
    case 'TAKARA':
      return process.env.TAKARA_TOKEN_MINT || null;
    case 'LAIKA':
      return process.env.LAIKA_TOKEN_MINT || null;
    case 'USDT':
      return process.env.USDT_TOKEN_MINT || null;
    default:
      return null;
  }
}

/**
 * Get treasury balance
 */
export async function getTreasuryBalance(tokenSymbol: string) {
  return await prisma.treasuryBalance.findUnique({
    where: { tokenSymbol }
  });
}

/**
 * Get all treasury balances
 */
export async function getAllTreasuryBalances() {
  return await prisma.treasuryBalance.findMany();
}

/**
 * Get tax records for user
 */
export async function getUserTaxRecords(userId: string) {
  return await prisma.taxRecord.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Get tax statistics
 */
export async function getTaxStatistics(params?: {
  startDate?: Date;
  endDate?: Date;
  sourceType?: TaxSourceType;
}) {
  const where: any = {};

  if (params?.startDate || params?.endDate) {
    where.createdAt = {};
    if (params.startDate) where.createdAt.gte = params.startDate;
    if (params.endDate) where.createdAt.lte = params.endDate;
  }

  if (params?.sourceType) {
    where.sourceType = params.sourceType;
  }

  const records = await prisma.taxRecord.findMany({ where });

  const statistics = records.reduce((acc, record) => {
    const key = `${record.tokenSymbol}_${record.sourceType}`;
    if (!acc[key]) {
      acc[key] = {
        tokenSymbol: record.tokenSymbol,
        sourceType: record.sourceType,
        totalTaxCollected: 0,
        count: 0
      };
    }
    acc[key].totalTaxCollected += Number(record.taxAmount);
    acc[key].count++;
    return acc;
  }, {} as Record<string, any>);

  return Object.values(statistics);
}

export default {
  calculateTax,
  recordTax,
  applyTakaraClaimTax,
  applyWexelSaleTax,
  getTreasuryBalance,
  getAllTreasuryBalances,
  getUserTaxRecords,
  getTaxStatistics
};
