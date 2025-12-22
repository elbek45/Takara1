/**
 * Send TAKARA tokens to a wallet
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, transfer } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

async function sendTakara() {
  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // Read wallet info
    const walletsPath = path.join(__dirname, '..', '..', '.keys', 'test-wallets.json');
    const wallets = JSON.parse(fs.readFileSync(walletsPath, 'utf-8'));

    // Read token info
    const tokenInfoPath = path.join(__dirname, '..', '..', '.keys', 'token-info.json');
    const tokenInfo = JSON.parse(fs.readFileSync(tokenInfoPath, 'utf-8'));

    // Platform wallet (sender)
    const privateKeyBytes = Buffer.from(wallets.solana.privateKey, 'base64');
    const senderKeypair = Keypair.fromSecretKey(privateKeyBytes);
    console.log('🔑 Sender:', senderKeypair.publicKey.toBase58());

    // Recipient wallet
    const recipientAddress = '7rXW8Sjiz4u7dd1afhid1K7oQiSXghtEpop9zxLSjbha';
    const recipientPubkey = new PublicKey(recipientAddress);
    console.log('📬 Recipient:', recipientAddress);

    // TAKARA token mint
    const takaraMint = new PublicKey(tokenInfo.solana.takara.mintAddress);
    console.log('💎 TAKARA Mint:', takaraMint.toBase58());

    // Get sender's token account
    console.log('\n📦 Getting sender token account...');
    const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      senderKeypair,
      takaraMint,
      senderKeypair.publicKey
    );
    console.log('✅ Sender Token Account:', senderTokenAccount.address.toBase58());

    // Get or create recipient's token account
    console.log('\n📦 Getting/creating recipient token account...');
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      senderKeypair, // Payer
      takaraMint,
      recipientPubkey
    );
    console.log('✅ Recipient Token Account:', recipientTokenAccount.address.toBase58());

    // Amount to send (1,000 TAKARA)
    const amount = 1000 * (10 ** tokenInfo.solana.takara.decimals);
    console.log('\n💸 Sending', (amount / (10 ** tokenInfo.solana.takara.decimals)).toLocaleString(), 'TAKARA...');

    // Transfer tokens
    const signature = await transfer(
      connection,
      senderKeypair,
      senderTokenAccount.address,
      recipientTokenAccount.address,
      senderKeypair.publicKey,
      amount
    );

    console.log('\n✅ Transfer successful!');
    console.log('📝 Transaction signature:', signature);
    console.log('🔗 View on Solana Explorer:');
    console.log(`   https://explorer.solana.com/tx/${signature}?cluster=devnet`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
    process.exit(1);
  }
}

sendTakara();
