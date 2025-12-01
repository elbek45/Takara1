const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

async function checkBalance() {
  console.log('🔍 Checking Testnet Wallet Balances\n');
  
  // Load environment
  const envPath = path.join(process.cwd(), '.env.testnet');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  const platformWalletMatch = envContent.match(/PLATFORM_WALLET=(.+)/);
  if (!platformWalletMatch) {
    console.error('❌ PLATFORM_WALLET not found in .env.testnet');
    return;
  }
  
  const platformWallet = platformWalletMatch[1].trim();
  console.log('Platform Wallet:', platformWallet);
  
  // Connect to testnet
  const rpcUrl = 'https://api.testnet.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  
  try {
    // Check balance
    const publicKey = new PublicKey(platformWallet);
    const balance = await connection.getBalance(publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    
    console.log('\n💰 Balance:', balanceSOL.toFixed(4), 'SOL');
    console.log('   Lamports:', balance);
    
    if (balanceSOL === 0) {
      console.log('\n⚠️  Warning: Wallet has 0 SOL');
      console.log('   Request testnet SOL from: https://faucet.solana.com');
    } else if (balanceSOL < 1) {
      console.log('\n⚠️  Warning: Low balance (< 1 SOL)');
      console.log('   Consider requesting more from faucet');
    } else {
      console.log('\n✅ Wallet funded and ready for testing!');
    }
    
    // Check account info
    const accountInfo = await connection.getAccountInfo(publicKey);
    if (accountInfo) {
      console.log('\n📊 Account Info:');
      console.log('   Owner:', accountInfo.owner.toBase58());
      console.log('   Executable:', accountInfo.executable);
      console.log('   Rent Epoch:', accountInfo.rentEpoch);
    }
    
    // Get recent slot
    const slot = await connection.getSlot();
    console.log('\n🔗 Network Info:');
    console.log('   Current Slot:', slot);
    console.log('   RPC URL:', rpcUrl);
    
  } catch (error) {
    console.error('\n❌ Error checking balance:', error.message);
  }
}

checkBalance().catch(console.error);
