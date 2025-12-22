/**
 * Check Token Balance on Solana Wallet
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

async function checkBalance() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Read token info
  const tokenInfoPath = path.join(__dirname, '..', '..', '.keys', 'token-info.json');
  const tokenInfo = JSON.parse(fs.readFileSync(tokenInfoPath, 'utf-8'));

  const walletPubkey = new PublicKey('9HTEaEGeFLEVZ54Buuy8rQcaofKGET4jbf4PbSWJDQAC');
  const takaraMint = new PublicKey(tokenInfo.solana.takara.mintAddress);
  const usdtMint = new PublicKey(tokenInfo.solana.usdt.mintAddress);

  console.log('🔑 Wallet:', walletPubkey.toBase58());
  console.log('💎 TAKARA Mint:', takaraMint.toBase58());
  console.log('💵 USDT Mint:', usdtMint.toBase58());
  console.log('');

  try {
    // Check TAKARA balance
    const takaraTokenAccount = await getAssociatedTokenAddress(takaraMint, walletPubkey);
    console.log('📦 TAKARA Token Account:', takaraTokenAccount.toBase58());

    try {
      const takaraAccount = await getAccount(connection, takaraTokenAccount);
      const takaraBalance = Number(takaraAccount.amount) / (10 ** 9);
      console.log('✅ TAKARA Balance:', takaraBalance.toLocaleString(), 'TAKARA');
    } catch (error) {
      console.log('❌ TAKARA Token Account not found or empty');
    }

    // Check USDT balance
    const usdtTokenAccount = await getAssociatedTokenAddress(usdtMint, walletPubkey);
    console.log('📦 USDT Token Account:', usdtTokenAccount.toBase58());

    try {
      const usdtAccount = await getAccount(connection, usdtTokenAccount);
      const usdtBalance = Number(usdtAccount.amount) / (10 ** 6);
      console.log('✅ USDT Balance:', usdtBalance.toLocaleString(), 'USDT');
    } catch (error) {
      console.log('❌ USDT Token Account not found or empty');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkBalance().catch(console.error);
