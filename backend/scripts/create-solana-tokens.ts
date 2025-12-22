/**
 * Create Test USDT and TAKARA SPL Tokens on Solana Devnet
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

async function createTokens() {
  // Read wallet info
  const walletPath = path.join(__dirname, '..', '..', '.keys', 'test-wallets.json');
  const walletInfo = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));

  // Convert base64 private key to Uint8Array
  const privateKeyBytes = Buffer.from(walletInfo.solana.privateKey, 'base64');
  const payer = Keypair.fromSecretKey(privateKeyBytes);

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  console.log('🔑 Wallet:', payer.publicKey.toBase58());
  console.log('🌐 Network: Solana Devnet\n');

  try {
    // Check SOL balance
    const balance = await connection.getBalance(payer.publicKey);
    console.log('💰 SOL Balance:', balance / LAMPORTS_PER_SOL, 'SOL\n');

    if (balance === 0) {
      console.log('❌ No SOL balance! Please request airdrop first:');
      console.log('   https://faucet.solana.com/');
      console.log('   Or run: npm run sol:airdrop\n');
      return;
    }

    // Create USDT Token
    console.log('📦 Creating Test USDT Token...');
    const usdtMint = await createMint(
      connection,
      payer,
      payer.publicKey, // mint authority
      payer.publicKey, // freeze authority
      6 // decimals (USDT uses 6 decimals)
    );
    console.log('✅ USDT Mint Address:', usdtMint.toBase58());

    // Create token account for USDT
    const usdtTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      usdtMint,
      payer.publicKey
    );
    console.log('✅ USDT Token Account:', usdtTokenAccount.address.toBase58());

    // Mint 1,000,000 USDT (1 million)
    const usdtAmount = 1_000_000 * 10 ** 6; // 1M USDT with 6 decimals
    await mintTo(
      connection,
      payer,
      usdtMint,
      usdtTokenAccount.address,
      payer.publicKey,
      usdtAmount
    );
    console.log('✅ Minted 1,000,000 USDT\n');

    // Create TAKARA Token
    console.log('📦 Creating Test TAKARA Token...');
    const takaraMint = await createMint(
      connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      9 // decimals (standard for Solana tokens)
    );
    console.log('✅ TAKARA Mint Address:', takaraMint.toBase58());

    // Create token account for TAKARA
    const takaraTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      takaraMint,
      payer.publicKey
    );
    console.log('✅ TAKARA Token Account:', takaraTokenAccount.address.toBase58());

    // Mint 10,000,000 TAKARA (10 million)
    const takaraAmount = 10_000_000 * 10 ** 9; // 10M TAKARA with 9 decimals
    await mintTo(
      connection,
      payer,
      takaraMint,
      takaraTokenAccount.address,
      payer.publicKey,
      takaraAmount
    );
    console.log('✅ Minted 10,000,000 TAKARA\n');

    // Save token info
    const tokenInfo = {
      solana: {
        usdt: {
          mintAddress: usdtMint.toBase58(),
          tokenAccount: usdtTokenAccount.address.toBase58(),
          decimals: 6,
          supply: 1_000_000
        },
        takara: {
          mintAddress: takaraMint.toBase58(),
          tokenAccount: takaraTokenAccount.address.toBase58(),
          decimals: 9,
          supply: 10_000_000
        }
      }
    };

    const tokenInfoPath = path.join(__dirname, '..', '..', '.keys', 'token-info.json');
    fs.writeFileSync(tokenInfoPath, JSON.stringify(tokenInfo, null, 2));
    console.log('💾 Token info saved to:', tokenInfoPath);

    console.log('\n✅ All Solana tokens created successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update frontend/.env.production with new token addresses');
    console.log('2. Create Ethereum test tokens');
    console.log('3. Deploy to production');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.logs) {
      console.error('Logs:', error.logs);
    }
  }
}

createTokens().catch(console.error);
