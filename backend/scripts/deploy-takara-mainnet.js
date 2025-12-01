/**
 * Deploy TAKARA Token to Solana Mainnet
 *
 * Token Specifications:
 * - Name: Takara Gold
 * - Symbol: TAKARA
 * - Decimals: 9
 * - Total Supply: 600,000,000 (600 million)
 * - Distribution: 5 years via mining system
 */

const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} = require('@solana/web3.js');
const {
  createMint,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID
} = require('@solana/spl-token');
const bs58 = require('bs58');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.mainnet' });

async function deployTakaraToken() {
  console.log('🚀 DEPLOYING TAKARA TOKEN TO SOLANA MAINNET');
  console.log('⚠️  WARNING: This will cost real SOL!');
  console.log('');

  // Load platform wallet
  const privateKey = process.env.PLATFORM_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PLATFORM_WALLET_PRIVATE_KEY not found in .env.mainnet');
  }

  const platformWallet = Keypair.fromSecretKey(bs58.decode(privateKey));
  const publicKey = platformWallet.publicKey.toBase58();

  console.log('📝 Platform Wallet: ' + publicKey);
  console.log('');

  // Connect to mainnet
  const connection = new Connection(
    process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    'confirmed'
  );

  // Check balance
  console.log('💰 Checking wallet balance...');
  const balance = await connection.getBalance(platformWallet.publicKey);
  const solBalance = balance / LAMPORTS_PER_SOL;

  console.log('   Balance: ' + solBalance.toFixed(4) + ' SOL');

  if (solBalance < 1) {
    throw new Error('Insufficient balance! Need at least 1 SOL for token deployment. Current: ' + solBalance);
  }
  console.log('');

  // Token specifications
  const tokenSpecs = {
    name: 'Takara Gold',
    symbol: 'TAKARA',
    decimals: 9,
    totalSupply: 600_000_000, // 600 million
    description: 'TAKARA is the mining reward token for Takara Gold DeFi platform'
  };

  console.log('📋 Token Specifications:');
  console.log('   Name:          ' + tokenSpecs.name);
  console.log('   Symbol:        ' + tokenSpecs.symbol);
  console.log('   Decimals:      ' + tokenSpecs.decimals);
  console.log('   Total Supply:  ' + tokenSpecs.totalSupply.toLocaleString() + ' ' + tokenSpecs.symbol);
  console.log('');

  console.log('⏳ Creating TAKARA token mint...');
  console.log('   This will take ~30 seconds and cost ~1 SOL');
  console.log('');

  try {
    // Create the token mint
    const mint = await createMint(
      connection,
      platformWallet,           // Payer
      platformWallet.publicKey, // Mint authority
      platformWallet.publicKey, // Freeze authority (can freeze accounts if needed)
      tokenSpecs.decimals       // Decimals
    );

    const mintAddress = mint.toBase58();

    console.log('✅ TAKARA Token Mint Created!');
    console.log('   Mint Address: ' + mintAddress);
    console.log('');

    // Get mint info
    const mintInfo = await getMint(connection, mint);
    console.log('📊 Mint Info:');
    console.log('   Decimals:       ' + mintInfo.decimals);
    console.log('   Supply:         ' + (Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals)).toLocaleString());
    console.log('   Mint Authority: ' + (mintInfo.mintAuthority ? mintInfo.mintAuthority.toBase58() : 'None'));
    console.log('');

    // Create associated token account for platform
    console.log('⏳ Creating platform token account...');
    const platformTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      platformWallet,
      mint,
      platformWallet.publicKey
    );

    console.log('✅ Platform Token Account Created:');
    console.log('   Address: ' + platformTokenAccount.address.toBase58());
    console.log('');

    // Mint initial supply (optional - or mint as needed via mining)
    // For now, we'll mint 10% of total supply for initial liquidity/testing
    const initialMintAmount = BigInt(60_000_000) * BigInt(Math.pow(10, tokenSpecs.decimals)); // 60M TAKARA (10%)

    console.log('⏳ Minting initial supply (10% = 60M TAKARA)...');
    const mintSignature = await mintTo(
      connection,
      platformWallet,
      mint,
      platformTokenAccount.address,
      platformWallet.publicKey,
      initialMintAmount
    );

    console.log('✅ Initial supply minted!');
    console.log('   Transaction: https://solscan.io/tx/' + mintSignature);
    console.log('   Amount: ' + (Number(initialMintAmount) / Math.pow(10, tokenSpecs.decimals)).toLocaleString() + ' TAKARA');
    console.log('');

    // Check final balance
    const finalBalance = await connection.getBalance(platformWallet.publicKey);
    const finalSolBalance = finalBalance / LAMPORTS_PER_SOL;
    const costInSol = solBalance - finalSolBalance;

    console.log('💰 Cost Summary:');
    console.log('   Initial Balance: ' + solBalance.toFixed(4) + ' SOL');
    console.log('   Final Balance:   ' + finalSolBalance.toFixed(4) + ' SOL');
    console.log('   Cost:            ' + costInSol.toFixed(4) + ' SOL');
    console.log('');

    // Save deployment info
    const deploymentInfo = {
      deployedAt: new Date().toISOString(),
      network: 'mainnet-beta',
      token: tokenSpecs,
      mintAddress: mintAddress,
      platformTokenAccount: platformTokenAccount.address.toBase58(),
      mintAuthority: platformWallet.publicKey.toBase58(),
      initialSupplyMinted: Number(initialMintAmount) / Math.pow(10, tokenSpecs.decimals),
      totalSupplyPlanned: tokenSpecs.totalSupply,
      costInSol: costInSol,
      transactions: {
        createMint: 'https://solscan.io/token/' + mintAddress,
        initialMint: 'https://solscan.io/tx/' + mintSignature
      }
    };

    const deploymentPath = path.join(process.cwd(), 'takara-mainnet-deployment.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('💾 Deployment info saved to: takara-mainnet-deployment.json');
    console.log('');
    console.log('🎉 TAKARA TOKEN DEPLOYMENT COMPLETE!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. View on Solscan: https://solscan.io/token/' + mintAddress);
    console.log('   2. Update .env.mainnet:');
    console.log('      TAKARA_TOKEN_MINT=' + mintAddress);
    console.log('   3. Deploy LAIKA token: node scripts/deploy-laika-mainnet.js');
    console.log('   4. Update Prisma seed to use new token addresses');
    console.log('');
    console.log('⚠️  IMPORTANT:');
    console.log('   - Mint Authority: ' + mintInfo.mintAuthority.toBase58());
    console.log('   - Can mint additional TAKARA as needed for mining rewards');
    console.log('   - Total planned supply: 600M TAKARA over 5 years');
    console.log('   - Currently minted: 60M TAKARA (10%)');
    console.log('');

    return deploymentInfo;

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    throw error;
  }
}

// Run deployment
if (require.main === module) {
  deployTakaraToken()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deployTakaraToken };
