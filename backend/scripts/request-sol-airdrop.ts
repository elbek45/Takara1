/**
 * Request SOL Airdrop for Test Wallet
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

async function requestAirdrop() {
  // Read wallet info
  const walletPath = path.join(__dirname, '..', '..', '.keys', 'test-wallets.json');
  const walletInfo = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));

  const publicKey = new PublicKey(walletInfo.solana.publicKey);
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  console.log('🔑 Wallet:', publicKey.toBase58());
  console.log('💰 Requesting SOL airdrop...\n');

  try {
    // Check current balance
    const balanceBefore = await connection.getBalance(publicKey);
    console.log('Balance before:', balanceBefore / LAMPORTS_PER_SOL, 'SOL');

    // Request 2 SOL
    const signature = await connection.requestAirdrop(publicKey, 2 * LAMPORTS_PER_SOL);
    console.log('✅ Airdrop requested, signature:', signature);

    // Wait for confirmation
    await connection.confirmTransaction(signature);
    console.log('✅ Airdrop confirmed!');

    // Check new balance
    const balanceAfter = await connection.getBalance(publicKey);
    console.log('Balance after:', balanceAfter / LAMPORTS_PER_SOL, 'SOL');
    console.log('Added:', (balanceAfter - balanceBefore) / LAMPORTS_PER_SOL, 'SOL');
  } catch (error: any) {
    console.log('❌ Airdrop failed:', error.message);
    console.log('\n🌐 You can request manually at:');
    console.log('   https://faucet.solana.com/');
    console.log('   https://solfaucet.com/');
  }
}

requestAirdrop().catch(console.error);
