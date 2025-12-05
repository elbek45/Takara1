/**
 * Deploy WEXEL Token to Solana Mainnet
 *
 * Token Specifications:
 * - Name: Wexel
 * - Symbol: WXL
 * - Decimals: 9
 * - Total Supply: 10,000,000,000 (10 billion)
 * - Purpose: Utility token for Takara Gold ecosystem
 */

const {
  Connection,
  Keypair,
  PublicKey,
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

async function deployWexelToken() {
  console.log('🚀 DEPLOYING WEXEL TOKEN TO SOLANA MAINNET');
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
    name: 'Wexel',
    symbol: 'WXL',
    decimals: 9,
    totalSupply: 10_000_000_000, // 10 billion
    description: 'WEXEL is the utility token for Takara Gold DeFi platform ecosystem'
  };

  console.log('📋 Token Specifications:');
  console.log('   Name:          ' + tokenSpecs.name);
  console.log('   Symbol:        ' + tokenSpecs.symbol);
  console.log('   Decimals:      ' + tokenSpecs.decimals);
  console.log('   Total Supply:  ' + tokenSpecs.totalSupply.toLocaleString() + ' ' + tokenSpecs.symbol);
  console.log('');

  console.log('⏳ Creating WEXEL token mint...');
  console.log('   This will take ~30 seconds and cost ~1 SOL');
  console.log('');

  try {
    // Create the token mint
    const mint = await createMint(
      connection,
      platformWallet,           // Payer
      platformWallet.publicKey, // Mint authority
      platformWallet.publicKey, // Freeze authority
      tokenSpecs.decimals       // Decimals
    );

    const mintAddress = mint.toBase58();

    console.log('✅ WEXEL Token Mint Created!');
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

    // Mint initial supply (20% = 2B for initial distribution)
    const initialMintAmount = BigInt(2_000_000_000) * BigInt(Math.pow(10, tokenSpecs.decimals)); // 2B WXL

    console.log('⏳ Minting initial supply (20% = 2B WXL)...');
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
    console.log('   Amount: ' + (Number(initialMintAmount) / Math.pow(10, tokenSpecs.decimals)).toLocaleString() + ' WXL');
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
      },
      usage: {
        purpose: 'Utility token for Takara Gold ecosystem',
        features: [
          'Governance rights',
          'Platform fee discounts',
          'Staking rewards',
          'Premium features access'
        ],
        distribution: {
          initialSupply: '2B WXL (20%)',
          platform: '30%',
          liquidity: '20%',
          team: '15%',
          community: '20%',
          treasury: '15%'
        }
      }
    };

    const deploymentPath = path.join(process.cwd(), 'wexel-mainnet-deployment.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('💾 Deployment info saved to: wexel-mainnet-deployment.json');
    console.log('');
    console.log('🎉 WEXEL TOKEN DEPLOYMENT COMPLETE!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. View on Solscan: https://solscan.io/token/' + mintAddress);
    console.log('   2. Update .env.mainnet:');
    console.log('      WEXEL_TOKEN_MINT=' + mintAddress);
    console.log('   3. Test token transfers');
    console.log('   4. Create liquidity pools (optional)');
    console.log('   5. Set up token metadata with Metaplex');
    console.log('');
    console.log('⚠️  IMPORTANT:');
    console.log('   - Mint Authority: ' + mintInfo.mintAuthority.toBase58());
    console.log('   - Can mint additional WEXEL as needed');
    console.log('   - Total planned supply: 10B WXL');
    console.log('   - Currently minted: 2B WXL (20%)');
    console.log('   - Remaining: 8B WXL for gradual distribution');
    console.log('');

    return deploymentInfo;

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    throw error;
  }
}

// Run deployment
if (require.main === module) {
  deployWexelToken()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deployWexelToken };
