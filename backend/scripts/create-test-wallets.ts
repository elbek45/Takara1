/**
 * Create Test Wallets for Development
 *
 * Generates new Solana and Ethereum wallets for testing
 * WARNING: Only use for testnet/devnet! Never use generated keys on mainnet!
 */

import { Keypair, Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

interface WalletInfo {
  solana: {
    publicKey: string;
    privateKey: string;
    mnemonic?: string;
  };
  ethereum: {
    address: string;
    privateKey: string;
    mnemonic: string;
  };
}

async function createSolanaWallet(): Promise<{ publicKey: string; privateKey: string }> {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toString();
  const privateKey = Buffer.from(keypair.secretKey).toString('base64');

  console.log('🔐 Solana Wallet Created:');
  console.log('  Public Key:', publicKey);
  console.log('  Private Key (Base64):', privateKey);

  return { publicKey, privateKey };
}

async function createEthereumWallet(): Promise<{ address: string; privateKey: string; mnemonic: string }> {
  const wallet = ethers.Wallet.createRandom();

  console.log('\n🔐 Ethereum Wallet Created:');
  console.log('  Address:', wallet.address);
  console.log('  Private Key:', wallet.privateKey);
  console.log('  Mnemonic:', wallet.mnemonic?.phrase);

  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase || ''
  };
}

async function requestSolanaAirdrop(publicKey: string): Promise<void> {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  console.log('\n💰 Requesting SOL airdrop...');
  try {
    const pubkey = new PublicKey(publicKey);
    const signature = await connection.requestAirdrop(pubkey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(signature);

    const balance = await connection.getBalance(pubkey);
    console.log('✅ Airdrop successful!');
    console.log('  Balance:', balance / LAMPORTS_PER_SOL, 'SOL');
  } catch (error: any) {
    console.log('❌ Airdrop failed:', error.message);
    console.log('  You can request manually at: https://faucet.solana.com/');
  }
}

async function checkEthereumBalance(address: string): Promise<void> {
  console.log('\n💰 Checking Ethereum balance...');
  try {
    const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/');
    const balance = await provider.getBalance(address);
    console.log('  Balance:', ethers.formatEther(balance), 'ETH');

    if (balance === 0n) {
      console.log('ℹ️  Get Sepolia ETH from faucet:');
      console.log('  - https://sepoliafaucet.com/');
      console.log('  - https://www.alchemy.com/faucets/ethereum-sepolia');
    }
  } catch (error: any) {
    console.log('⚠️  Could not check balance:', error.message);
  }
}

async function saveWalletInfo(walletInfo: WalletInfo): Promise<void> {
  const keysDir = path.join(__dirname, '..', '..', '.keys');

  // Create .keys directory if it doesn't exist
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { mode: 0o700 });
  }

  const filePath = path.join(keysDir, 'test-wallets.json');
  fs.writeFileSync(filePath, JSON.stringify(walletInfo, null, 2), { mode: 0o600 });

  console.log('\n💾 Wallet info saved to:', filePath);
  console.log('⚠️  IMPORTANT: Keep this file secure! Never commit to git!');

  // Add to .gitignore
  const gitignorePath = path.join(__dirname, '..', '..', '.gitignore');
  let gitignore = '';
  if (fs.existsSync(gitignorePath)) {
    gitignore = fs.readFileSync(gitignorePath, 'utf-8');
  }

  if (!gitignore.includes('.keys/')) {
    fs.appendFileSync(gitignorePath, '\n# Test wallet keys\n.keys/\n');
    console.log('✅ Added .keys/ to .gitignore');
  }
}

async function updateEnvFiles(walletInfo: WalletInfo): Promise<void> {
  console.log('\n📝 Updating .env files...');

  const envProdPath = path.join(__dirname, '..', '..', 'frontend', '.env.production');
  let envContent = fs.readFileSync(envProdPath, 'utf-8');

  // Update Solana wallet
  envContent = envContent.replace(
    /VITE_PLATFORM_WALLET_SOL=.*/,
    `VITE_PLATFORM_WALLET_SOL=${walletInfo.solana.publicKey}`
  );

  // Update Ethereum wallet
  envContent = envContent.replace(
    /VITE_PLATFORM_WALLET_ETH=.*/,
    `VITE_PLATFORM_WALLET_ETH=${walletInfo.ethereum.address}`
  );

  fs.writeFileSync(envProdPath, envContent);
  console.log('✅ Updated frontend/.env.production');
}

async function main() {
  console.log('🚀 Creating Test Wallets for Takara Gold\n');
  console.log('⚠️  WARNING: These are for TESTNET ONLY!\n');

  // Create wallets
  const solana = await createSolanaWallet();
  const ethereum = await createEthereumWallet();

  const walletInfo: WalletInfo = { solana, ethereum };

  // Save wallet info
  await saveWalletInfo(walletInfo);

  // Update env files
  await updateEnvFiles(walletInfo);

  // Request airdrops
  await requestSolanaAirdrop(solana.publicKey);
  await checkEthereumBalance(ethereum.address);

  console.log('\n✅ Wallet setup complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Get Sepolia ETH from faucet (links above)');
  console.log('2. Create/mint test USDT tokens on both networks');
  console.log('3. Create/mint test TAKARA tokens on both networks');
  console.log('4. Deploy updated configuration');

  console.log('\n🔑 Wallet Addresses:');
  console.log('Solana:', solana.publicKey);
  console.log('Ethereum:', ethereum.address);
}

main().catch(console.error);
