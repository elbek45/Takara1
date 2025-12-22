/**
 * Create WEXEL NFT Collection on Solana Mainnet using Metaplex
 *
 * This creates a master Collection NFT that all WEXEL investment NFTs will belong to.
 * This allows them to be grouped together on Solscan, Magic Eden, etc.
 */

const {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL
} = require('@solana/web3.js');
const {
  Metaplex,
  keypairIdentity,
  bundlrStorage
} = require('@metaplex-foundation/js');
const bs58 = require('bs58');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.mainnet' });

async function createWexelCollection() {
  console.log('🚀 CREATING WEXEL NFT COLLECTION');
  console.log('===========================================');
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
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');

  // Check balance
  console.log('💰 Checking wallet balance...');
  const balance = await connection.getBalance(platformWallet.publicKey);
  const solBalance = balance / LAMPORTS_PER_SOL;

  console.log('   Balance: ' + solBalance.toFixed(4) + ' SOL');

  if (solBalance < 0.5) {
    throw new Error('Insufficient balance! Need at least 0.5 SOL. Current: ' + solBalance);
  }
  console.log('');

  // Collection specifications
  const collectionSpec = {
    name: 'WEXEL Investment NFTs',
    symbol: 'WXL',
    description: 'WEXEL NFTs represent ownership of investments in Takara Gold vaults. Each NFT contains vault details including APY, duration, mining power, and can be traded on the marketplace.',
    image: 'https://arweave.net/placeholder-wexel-collection.png', // TODO: Upload actual image
    externalUrl: 'https://takaragold.com',
    sellerFeeBasisPoints: 250, // 2.5% royalty
    creators: [
      {
        address: publicKey,
        share: 100
      }
    ],
    properties: {
      category: 'image',
      files: [
        {
          uri: 'https://arweave.net/placeholder-wexel-collection.png',
          type: 'image/png'
        }
      ]
    }
  };

  console.log('📋 Collection Specifications:');
  console.log('   Name:        ' + collectionSpec.name);
  console.log('   Symbol:      ' + collectionSpec.symbol);
  console.log('   Royalty:     ' + (collectionSpec.sellerFeeBasisPoints / 100) + '%');
  console.log('');

  console.log('⏳ Initializing Metaplex...');

  try {
    // Initialize Metaplex
    const metaplex = Metaplex.make(connection)
      .use(keypairIdentity(platformWallet));

    console.log('✅ Metaplex initialized');
    console.log('');

    console.log('⏳ Creating collection NFT...');
    console.log('   This will take ~30-60 seconds and cost ~0.01-0.02 SOL');
    console.log('');

    // Create the collection NFT
    const { nft: collectionNft } = await metaplex.nfts().create({
      name: collectionSpec.name,
      symbol: collectionSpec.symbol,
      uri: '', // Will be uploaded
      sellerFeeBasisPoints: collectionSpec.sellerFeeBasisPoints,
      isCollection: true, // Mark as collection
      updateAuthority: platformWallet,
      creators: collectionSpec.creators.map(c => ({
        address: metaplex.identity().publicKey,
        share: c.share
      }))
    });

    const collectionAddress = collectionNft.address.toBase58();

    console.log('✅ WEXEL Collection Created!');
    console.log('   Collection Address: ' + collectionAddress);
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

    // Save collection info
    const collectionInfo = {
      deployedAt: new Date().toISOString(),
      network: 'mainnet-beta',
      collection: {
        name: collectionSpec.name,
        symbol: collectionSpec.symbol,
        description: collectionSpec.description,
        address: collectionAddress,
        updateAuthority: publicKey,
        sellerFeeBasisPoints: collectionSpec.sellerFeeBasisPoints
      },
      costInSol: costInSol,
      solscanUrl: 'https://solscan.io/token/' + collectionAddress,
      magicEdenUrl: 'https://magiceden.io/marketplace/' + collectionAddress,
      usage: {
        purpose: 'NFT Collection for Takara Gold Investment NFTs',
        features: [
          'Groups all WEXEL investment NFTs together',
          'Enables collection-wide royalties',
          'Shows unified collection on marketplaces',
          'Each investment vault NFT belongs to this collection'
        ]
      }
    };

    const collectionPath = path.join(process.cwd(), 'wexel-collection-mainnet.json');
    fs.writeFileSync(collectionPath, JSON.stringify(collectionInfo, null, 2));

    console.log('💾 Collection info saved to: wexel-collection-mainnet.json');
    console.log('');
    console.log('🎉 WEXEL COLLECTION DEPLOYMENT COMPLETE!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. View on Solscan: ' + collectionInfo.solscanUrl);
    console.log('   2. Update .env.mainnet:');
    console.log('      WEXEL_COLLECTION_ADDRESS=' + collectionAddress);
    console.log('   3. Upload collection image to Arweave/IPFS');
    console.log('   4. Update collection metadata with image URL');
    console.log('   5. Test minting NFT with collection');
    console.log('');
    console.log('⚠️  IMPORTANT:');
    console.log('   - Collection Address: ' + collectionAddress);
    console.log('   - All new WEXEL NFTs should reference this collection');
    console.log('   - Update Authority: ' + publicKey);
    console.log('   - Can verify/update NFTs in the collection');
    console.log('');

    return collectionInfo;

  } catch (error) {
    console.error('❌ Collection creation failed:', error);
    throw error;
  }
}

// Run collection creation
if (require.main === module) {
  createWexelCollection()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { createWexelCollection };
