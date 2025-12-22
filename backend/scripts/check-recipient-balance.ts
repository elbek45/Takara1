/**
 * Check TAKARA balance on recipient wallet
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

  const recipientPubkey = new PublicKey('7rXW8Sjiz4u7dd1afhid1K7oQiSXghtEpop9zxLSjbha');
  const takaraMint = new PublicKey(tokenInfo.solana.takara.mintAddress);

  console.log('🔑 Wallet:', recipientPubkey.toBase58());
  console.log('💎 TAKARA Mint:', takaraMint.toBase58());
  console.log('');

  try {
    // Check TAKARA balance
    const takaraTokenAccount = await getAssociatedTokenAddress(takaraMint, recipientPubkey);
    console.log('📦 TAKARA Token Account:', takaraTokenAccount.toBase58());

    try {
      const takaraAccount = await getAccount(connection, takaraTokenAccount);
      const takaraBalance = Number(takaraAccount.amount) / (10 ** 9);
      console.log('✅ TAKARA Balance:', takaraBalance.toLocaleString(), 'TAKARA');
    } catch (error) {
      console.log('❌ TAKARA Token Account not found or empty');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkBalance().catch(console.error);
