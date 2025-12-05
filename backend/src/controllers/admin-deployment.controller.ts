/**
 * Admin Deployment Controller
 *
 * Manages token deployments and API configuration through admin UI:
 * - Deploy TAKARA token to Solana mainnet
 * - Configure API keys (Infura, RPC URLs)
 * - Check deployment status
 * - Update environment variables
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { getLogger } from '../config/logger';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import bs58 from 'bs58';

const logger = getLogger('admin-deployment-controller');

// Deployment state
interface DeploymentState {
  inProgress: boolean;
  currentStep: string;
  progress: number;
  logs: string[];
  result?: any;
  error?: string;
}

const deploymentState: DeploymentState = {
  inProgress: false,
  currentStep: '',
  progress: 0,
  logs: []
};

/**
 * GET /api/admin/deployment/status
 * Get current deployment status
 */
export async function getDeploymentStatus(req: Request, res: Response): Promise<void> {
  try {
    // Get current environment configuration
    const config = {
      solanaNetwork: process.env.SOLANA_NETWORK,
      solanaRpcUrl: process.env.SOLANA_RPC_URL,
      ethereumRpcUrl: process.env.ETHEREUM_RPC_URL,
      takaraTokenMint: process.env.TAKARA_TOKEN_MINT,
      laikaTokenMint: process.env.LAIKA_TOKEN_MINT,
      wexelTokenMint: process.env.WEXEL_TOKEN_MINT,
      platformWallet: process.env.PLATFORM_WALLET,
      platformEthAddress: process.env.PLATFORM_ETHEREUM_ADDRESS
    };

    // Check if tokens are deployed
    const takaraDeployed = config.takaraTokenMint && config.takaraTokenMint !== 'TO_BE_DEPLOYED';
    const laikaConfigured = config.laikaTokenMint && config.laikaTokenMint !== 'TO_BE_DEPLOYED';
    const wexelConfigured = config.wexelTokenMint && config.wexelTokenMint !== 'TO_BE_DEPLOYED';

    // Check deployment files
    let takaraDeploymentInfo = null;
    let laikaDeploymentInfo = null;
    let wexelDeploymentInfo = null;

    try {
      const takaraPath = path.join(__dirname, '../../takara-mainnet-deployment.json');
      const takaraData = await fs.readFile(takaraPath, 'utf-8');
      takaraDeploymentInfo = JSON.parse(takaraData);
    } catch (error) {
      // File doesn't exist yet
    }

    try {
      const laikaPath = path.join(__dirname, '../../laika-mainnet-deployment.json');
      const laikaData = await fs.readFile(laikaPath, 'utf-8');
      laikaDeploymentInfo = JSON.parse(laikaData);
    } catch (error) {
      // File doesn't exist yet
    }

    try {
      const wexelPath = path.join(__dirname, '../../wexel-mainnet-deployment.json');
      const wexelData = await fs.readFile(wexelPath, 'utf-8');
      wexelDeploymentInfo = JSON.parse(wexelData);
    } catch (error) {
      // File doesn't exist yet
    }

    res.json({
      success: true,
      data: {
        deployment: deploymentState,
        config,
        status: {
          takaraDeployed,
          laikaConfigured,
          wexelConfigured,
          infuraConfigured: config.ethereumRpcUrl?.includes('infura') || false,
          walletsGenerated: !!config.platformWallet && !!config.platformEthAddress
        },
        deploymentInfo: {
          takara: takaraDeploymentInfo,
          laika: laikaDeploymentInfo,
          wexel: wexelDeploymentInfo
        }
      }
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get deployment status');
    res.status(500).json({
      success: false,
      message: 'Failed to get deployment status',
      error: error.message
    });
  }
}

/**
 * POST /api/admin/deployment/deploy-takara
 * Deploy TAKARA token to Solana mainnet
 *
 * Body: {
 *   walletPrivateKey: string (base58 encoded),
 *   confirm: boolean
 * }
 */
export async function deployTakaraToken(req: Request, res: Response): Promise<void> {
  try {
    const schema = z.object({
      confirm: z.boolean().refine(val => val === true, {
        message: 'Confirmation required to deploy token'
      })
    });

    const data = schema.parse(req.body);

    if (deploymentState.inProgress) {
      res.status(409).json({
        success: false,
        message: 'Another deployment is already in progress'
      });
      return;
    }

    // Reset deployment state
    deploymentState.inProgress = true;
    deploymentState.currentStep = 'Initializing';
    deploymentState.progress = 0;
    deploymentState.logs = [];
    deploymentState.error = undefined;
    deploymentState.result = undefined;

    // Log start
    deploymentState.logs.push(`[${new Date().toISOString()}] Starting TAKARA token deployment`);

    // Return immediately and deploy in background
    res.json({
      success: true,
      message: 'TAKARA token deployment started. Monitor progress via /api/admin/deployment/status',
      deploymentId: Date.now()
    });

    // Deploy in background
    deployTakaraInBackground().catch(error => {
      logger.error({ error }, 'Background TAKARA deployment failed');
      deploymentState.error = error.message;
      deploymentState.inProgress = false;
    });

  } catch (error: any) {
    deploymentState.inProgress = false;
    logger.error({ error: error.message }, 'Failed to start TAKARA deployment');
    res.status(400).json({
      success: false,
      message: 'Failed to start deployment',
      error: error.message
    });
  }
}

/**
 * Deploy TAKARA token in background
 */
async function deployTakaraInBackground() {
  try {
    deploymentState.currentStep = 'Loading wallet';
    deploymentState.progress = 10;
    deploymentState.logs.push(`[${new Date().toISOString()}] Loading platform wallet`);

    // Load wallet from backup file
    const backupPath = path.join(__dirname, '../../.mainnet-wallets-BACKUP.json');
    const backupData = await fs.readFile(backupPath, 'utf-8');
    const walletBackup = JSON.parse(backupData);

    const privateKey = bs58.decode(walletBackup.solana.privateKey);
    const payer = Keypair.fromSecretKey(privateKey);

    deploymentState.logs.push(`[${new Date().toISOString()}] Wallet loaded: ${payer.publicKey.toString()}`);

    deploymentState.currentStep = 'Connecting to Solana';
    deploymentState.progress = 20;

    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // Check balance
    const balance = await connection.getBalance(payer.publicKey);
    deploymentState.logs.push(`[${new Date().toISOString()}] Wallet balance: ${balance / 1e9} SOL`);

    if (balance < 1e9) {
      throw new Error(`Insufficient balance. Need at least 1 SOL, have ${balance / 1e9} SOL`);
    }

    deploymentState.currentStep = 'Creating token mint';
    deploymentState.progress = 40;
    deploymentState.logs.push(`[${new Date().toISOString()}] Creating TAKARA token mint...`);

    // Create token mint
    const mint = await createMint(
      connection,
      payer,
      payer.publicKey, // mint authority
      payer.publicKey, // freeze authority
      9 // decimals
    );

    deploymentState.logs.push(`[${new Date().toISOString()}] ✅ Token mint created: ${mint.toString()}`);

    deploymentState.currentStep = 'Creating token account';
    deploymentState.progress = 60;

    // Create associated token account
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      payer.publicKey
    );

    deploymentState.logs.push(`[${new Date().toISOString()}] Token account: ${tokenAccount.address.toString()}`);

    deploymentState.currentStep = 'Minting tokens';
    deploymentState.progress = 80;
    deploymentState.logs.push(`[${new Date().toISOString()}] Minting 60,000,000 TAKARA...`);

    // Mint 60 million TAKARA (10% of total supply)
    const initialSupply = 60_000_000 * 10 ** 9; // 60M with 9 decimals
    await mintTo(
      connection,
      payer,
      mint,
      tokenAccount.address,
      payer,
      initialSupply
    );

    deploymentState.logs.push(`[${new Date().toISOString()}] ✅ Minted 60,000,000 TAKARA`);

    // Save deployment info
    const deploymentInfo = {
      token: 'TAKARA',
      name: 'Takara Gold',
      symbol: 'TAKARA',
      decimals: 9,
      totalSupply: 600_000_000,
      initialMint: 60_000_000,
      mintAddress: mint.toString(),
      tokenAccount: tokenAccount.address.toString(),
      mintAuthority: payer.publicKey.toString(),
      freezeAuthority: payer.publicKey.toString(),
      network: 'mainnet-beta',
      rpcUrl,
      deployedAt: new Date().toISOString(),
      deployedBy: 'admin',
      solscanUrl: `https://solscan.io/token/${mint.toString()}`
    };

    deploymentState.currentStep = 'Saving deployment info';
    deploymentState.progress = 90;

    const deploymentPath = path.join(__dirname, '../../takara-mainnet-deployment.json');
    await fs.writeFile(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

    deploymentState.logs.push(`[${new Date().toISOString()}] ✅ Deployment info saved`);

    deploymentState.currentStep = 'Complete';
    deploymentState.progress = 100;
    deploymentState.result = deploymentInfo;
    deploymentState.inProgress = false;

    deploymentState.logs.push(`[${new Date().toISOString()}] ✅ TAKARA deployment complete!`);
    deploymentState.logs.push(`[${new Date().toISOString()}] 📊 View on Solscan: ${deploymentInfo.solscanUrl}`);
    deploymentState.logs.push(`[${new Date().toISOString()}] ⚠️ NEXT STEP: Update .env with TAKARA_TOKEN_MINT=${mint.toString()}`);

    logger.info({ mint: mint.toString() }, 'TAKARA token deployed successfully');

  } catch (error: any) {
    deploymentState.error = error.message;
    deploymentState.inProgress = false;
    deploymentState.logs.push(`[${new Date().toISOString()}] ❌ Error: ${error.message}`);
    logger.error({ error }, 'TAKARA deployment failed');
    throw error;
  }
}

/**
 * POST /api/admin/deployment/update-env
 * Update environment variables
 *
 * Body: {
 *   takaraTokenMint?: string,
 *   infuraApiKey?: string,
 *   solanaRpcUrl?: string
 * }
 */
export async function updateEnvironment(req: Request, res: Response): Promise<void> {
  try {
    const schema = z.object({
      takaraTokenMint: z.string().optional(),
      infuraApiKey: z.string().optional(),
      solanaRpcUrl: z.string().url().optional()
    });

    const data = schema.parse(req.body);

    const updates: Record<string, string> = {};

    if (data.takaraTokenMint) {
      updates['TAKARA_TOKEN_MINT'] = data.takaraTokenMint;
      process.env.TAKARA_TOKEN_MINT = data.takaraTokenMint;
    }

    if (data.infuraApiKey) {
      const infuraUrl = `https://mainnet.infura.io/v3/${data.infuraApiKey}`;
      updates['ETHEREUM_RPC_URL'] = infuraUrl;
      process.env.ETHEREUM_RPC_URL = infuraUrl;
    }

    if (data.solanaRpcUrl) {
      updates['SOLANA_RPC_URL'] = data.solanaRpcUrl;
      process.env.SOLANA_RPC_URL = data.solanaRpcUrl;
    }

    logger.info({ updates }, 'Environment variables updated');

    res.json({
      success: true,
      message: 'Environment updated. Please restart the backend to apply changes.',
      updates,
      note: 'These changes are in-memory only. To persist, update .env file on server.'
    });

  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to update environment');
    res.status(400).json({
      success: false,
      message: 'Failed to update environment',
      error: error.message
    });
  }
}

/**
 * POST /api/admin/deployment/verify-takara
 * Verify TAKARA token on Solana
 */
export async function verifyTakaraToken(req: Request, res: Response): Promise<void> {
  try {
    const takaraMint = process.env.TAKARA_TOKEN_MINT;

    if (!takaraMint || takaraMint === 'TO_BE_DEPLOYED') {
      res.status(404).json({
        success: false,
        message: 'TAKARA token not yet deployed'
      });
      return;
    }

    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // Verify mint exists
    const mintPubkey = new PublicKey(takaraMint);
    const mintInfo = await connection.getParsedAccountInfo(mintPubkey);

    if (!mintInfo.value) {
      res.status(404).json({
        success: false,
        message: 'TAKARA mint not found on Solana'
      });
      return;
    }

    res.json({
      success: true,
      message: 'TAKARA token verified on Solana',
      data: {
        mint: takaraMint,
        solscanUrl: `https://solscan.io/token/${takaraMint}`,
        mintInfo: mintInfo.value
      }
    });

  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to verify TAKARA token');
    res.status(500).json({
      success: false,
      message: 'Failed to verify token',
      error: error.message
    });
  }
}

/**
 * POST /api/admin/deployment/deploy-wexel
 * Deploy WEXEL token to Solana mainnet
 *
 * Body: {
 *   confirm: boolean
 * }
 */
export async function deployWexelToken(req: Request, res: Response): Promise<void> {
  try {
    const schema = z.object({
      confirm: z.boolean().refine(val => val === true, {
        message: 'Confirmation required to deploy token'
      })
    });

    const data = schema.parse(req.body);

    if (deploymentState.inProgress) {
      res.status(409).json({
        success: false,
        message: 'Another deployment is already in progress'
      });
      return;
    }

    // Reset deployment state
    deploymentState.inProgress = true;
    deploymentState.currentStep = 'Initializing';
    deploymentState.progress = 0;
    deploymentState.logs = [];
    deploymentState.error = undefined;
    deploymentState.result = undefined;

    // Log start
    deploymentState.logs.push(`[${new Date().toISOString()}] Starting WEXEL token deployment`);

    // Return immediately and deploy in background
    res.json({
      success: true,
      message: 'WEXEL token deployment started. Monitor progress via /api/admin/deployment/status',
      deploymentId: Date.now()
    });

    // Deploy in background
    deployWexelInBackground().catch(error => {
      logger.error({ error }, 'Background WEXEL deployment failed');
      deploymentState.error = error.message;
      deploymentState.inProgress = false;
    });

  } catch (error: any) {
    deploymentState.inProgress = false;
    logger.error({ error: error.message }, 'Failed to start WEXEL deployment');
    res.status(400).json({
      success: false,
      message: 'Failed to start deployment',
      error: error.message
    });
  }
}

/**
 * Deploy WEXEL token in background
 */
async function deployWexelInBackground() {
  try {
    deploymentState.currentStep = 'Loading wallet';
    deploymentState.progress = 10;
    deploymentState.logs.push(`[${new Date().toISOString()}] Loading platform wallet`);

    // Load wallet from backup file
    const backupPath = path.join(__dirname, '../../.mainnet-wallets-BACKUP.json');
    const backupData = await fs.readFile(backupPath, 'utf-8');
    const walletBackup = JSON.parse(backupData);

    const privateKey = bs58.decode(walletBackup.solana.privateKey);
    const payer = Keypair.fromSecretKey(privateKey);

    deploymentState.logs.push(`[${new Date().toISOString()}] Wallet loaded: ${payer.publicKey.toString()}`);

    deploymentState.currentStep = 'Connecting to Solana';
    deploymentState.progress = 20;

    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // Check balance
    const balance = await connection.getBalance(payer.publicKey);
    deploymentState.logs.push(`[${new Date().toISOString()}] Wallet balance: ${balance / 1e9} SOL`);

    if (balance < 1e9) {
      throw new Error(`Insufficient balance. Need at least 1 SOL, have ${balance / 1e9} SOL`);
    }

    deploymentState.currentStep = 'Creating token mint';
    deploymentState.progress = 40;
    deploymentState.logs.push(`[${new Date().toISOString()}] Creating WEXEL token mint...`);

    // Create token mint
    const mint = await createMint(
      connection,
      payer,
      payer.publicKey, // mint authority
      payer.publicKey, // freeze authority
      9 // decimals
    );

    deploymentState.logs.push(`[${new Date().toISOString()}] ✅ Token mint created: ${mint.toString()}`);

    deploymentState.currentStep = 'Creating token account';
    deploymentState.progress = 60;

    // Create associated token account
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      payer.publicKey
    );

    deploymentState.logs.push(`[${new Date().toISOString()}] Token account: ${tokenAccount.address.toString()}`);

    deploymentState.currentStep = 'Minting tokens';
    deploymentState.progress = 80;
    deploymentState.logs.push(`[${new Date().toISOString()}] Minting 2,000,000,000 WEXEL...`);

    // Mint 2 billion WEXEL (20% of total supply)
    const initialSupply = 2_000_000_000 * 10 ** 9; // 2B with 9 decimals
    await mintTo(
      connection,
      payer,
      mint,
      tokenAccount.address,
      payer,
      initialSupply
    );

    deploymentState.logs.push(`[${new Date().toISOString()}] ✅ Minted 2,000,000,000 WEXEL`);

    // Save deployment info
    const deploymentInfo = {
      token: 'WEXEL',
      name: 'Wexel',
      symbol: 'WXL',
      decimals: 9,
      totalSupply: 10_000_000_000,
      initialMint: 2_000_000_000,
      mintAddress: mint.toString(),
      tokenAccount: tokenAccount.address.toString(),
      mintAuthority: payer.publicKey.toString(),
      freezeAuthority: payer.publicKey.toString(),
      network: 'mainnet-beta',
      rpcUrl,
      deployedAt: new Date().toISOString(),
      deployedBy: 'admin',
      solscanUrl: `https://solscan.io/token/${mint.toString()}`,
      usage: {
        purpose: 'Utility token for Takara Gold ecosystem',
        features: [
          'Governance rights',
          'Platform fee discounts',
          'Staking rewards',
          'Premium features access'
        ]
      }
    };

    deploymentState.currentStep = 'Saving deployment info';
    deploymentState.progress = 90;

    const deploymentPath = path.join(__dirname, '../../wexel-mainnet-deployment.json');
    await fs.writeFile(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

    deploymentState.logs.push(`[${new Date().toISOString()}] ✅ Deployment info saved`);

    deploymentState.currentStep = 'Complete';
    deploymentState.progress = 100;
    deploymentState.result = deploymentInfo;
    deploymentState.inProgress = false;

    deploymentState.logs.push(`[${new Date().toISOString()}] ✅ WEXEL deployment complete!`);
    deploymentState.logs.push(`[${new Date().toISOString()}] 📊 View on Solscan: ${deploymentInfo.solscanUrl}`);
    deploymentState.logs.push(`[${new Date().toISOString()}] ⚠️ NEXT STEP: Update .env with WEXEL_TOKEN_MINT=${mint.toString()}`);

    logger.info({ mint: mint.toString() }, 'WEXEL token deployed successfully');

  } catch (error: any) {
    deploymentState.error = error.message;
    deploymentState.inProgress = false;
    deploymentState.logs.push(`[${new Date().toISOString()}] ❌ Error: ${error.message}`);
    logger.error({ error }, 'WEXEL deployment failed');
    throw error;
  }
}

export default {
  getDeploymentStatus,
  deployTakaraToken,
  deployWexelToken,
  updateEnvironment,
  verifyTakaraToken
};
