const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const fs = require('fs');
const path = require('path');

async function setupTestnet() {
  console.log('🔧 Setting up Takara Gold Testnet Environment\n');
  
  // Generate platform wallet
  console.log('📝 Generating platform wallet...');
  const platformWallet = Keypair.generate();
  const publicKey = platformWallet.publicKey.toBase58();
  const privateKey = Buffer.from(platformWallet.secretKey).toString('base64');
  
  console.log('✅ Platform wallet generated:');
  console.log('   Public Key:  ' + publicKey);
  console.log('   Private Key: ' + privateKey.substring(0, 20) + '...');
  
  // Update .env.testnet file
  console.log('\n📝 Updating .env.testnet file...');
  
  const envPath = path.join(process.cwd(), '.env.testnet');
  let envContent = fs.readFileSync(envPath, 'utf-8');
  
  envContent = envContent.replace(
    /PLATFORM_WALLET_PRIVATE_KEY=.*/,
    'PLATFORM_WALLET_PRIVATE_KEY=' + privateKey
  );
  envContent = envContent.replace(
    /PLATFORM_WALLET=.*/,
    'PLATFORM_WALLET=' + publicKey
  );
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env.testnet updated');
  
  // Save wallet info
  const walletsJsonPath = path.join(process.cwd(), 'testnet-wallets.json');
  fs.writeFileSync(
    walletsJsonPath,
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      network: 'testnet',
      platformWallet: {
        publicKey: publicKey
      },
      instructions: {
        airdrop: 'solana airdrop 2 ' + publicKey + ' --url testnet',
        balance: 'solana balance ' + publicKey + ' --url testnet',
        faucet: 'https://faucet.solana.com'
      }
    }, null, 2)
  );
  console.log('✅ Wallet details saved to ' + walletsJsonPath);
  
  console.log('\n📦 Next Steps - Airdrop SOL for testing:');
  console.log('   1. Visit: https://faucet.solana.com');
  console.log('   2. Paste wallet address: ' + publicKey);
  console.log('   3. Request airdrop (max 5 SOL)\n');
  
  console.log('   Or use CLI:');
  console.log('   solana airdrop 2 ' + publicKey + ' --url testnet\n');
  
  console.log('✅ Testnet setup completed!');
  console.log('\n📝 To start using testnet:');
  console.log('   1. Copy .env.testnet to .env');
  console.log('   2. Request testnet SOL from faucet');
  console.log('   3. Create testnet database');
  console.log('   4. Run: npm run dev\n');
}

setupTestnet().catch(console.error);
