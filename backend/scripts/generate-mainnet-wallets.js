/**
 * Generate Production Mainnet Wallets
 *
 * CRITICAL: This generates REAL mainnet wallets with REAL money
 * - Save private keys SECURELY
 * - Never commit to git
 * - Use hardware wallet for large amounts
 */

const { Keypair } = require('@solana/web3.js');
const { Wallet } = require('ethers');
const bs58 = require('bs58');
const fs = require('fs');
const path = require('path');

console.log('🔐 GENERATING MAINNET PRODUCTION WALLETS');
console.log('⚠️  WARNING: This will generate REAL mainnet wallets!');
console.log('⚠️  SAVE THESE KEYS SECURELY - NEVER COMMIT TO GIT!\n');

// Generate Solana wallet
console.log('1️⃣  Generating Solana Mainnet Wallet...');
const solanaWallet = Keypair.generate();
const solanaPublicKey = solanaWallet.publicKey.toBase58();
const solanaPrivateKey = bs58.encode(solanaWallet.secretKey);
const solanaPrivateKeyBase64 = Buffer.from(solanaWallet.secretKey).toString('base64');

console.log('✅ Solana Wallet Generated:');
console.log('   Network: MAINNET-BETA');
console.log('   Public Key:  ' + solanaPublicKey);
console.log('   Private Key (bs58):   ' + solanaPrivateKey.substring(0, 20) + '...');
console.log('   Private Key (base64): ' + solanaPrivateKeyBase64.substring(0, 20) + '...');
console.log('');

// Generate Ethereum wallet
console.log('2️⃣  Generating Ethereum Mainnet Wallet...');
const ethWallet = Wallet.createRandom();
const ethAddress = ethWallet.address;
const ethPrivateKey = ethWallet.privateKey;
const ethMnemonic = ethWallet.mnemonic.phrase;

console.log('✅ Ethereum Wallet Generated:');
console.log('   Network: MAINNET');
console.log('   Address:     ' + ethAddress);
console.log('   Private Key: ' + ethPrivateKey.substring(0, 20) + '...');
console.log('   Mnemonic:    ' + ethMnemonic.split(' ').slice(0, 3).join(' ') + '...');
console.log('');

// Create secure backup file
const backupData = {
  generatedAt: new Date().toISOString(),
  environment: 'PRODUCTION_MAINNET',
  warning: 'CRITICAL: These are REAL mainnet wallets. Protect these keys!',
  solana: {
    network: 'mainnet-beta',
    publicKey: solanaPublicKey,
    privateKey_bs58: solanaPrivateKey,
    privateKey_base64: solanaPrivateKeyBase64,
    fundingInstructions: [
      'Buy SOL from exchange',
      'Withdraw to: ' + solanaPublicKey,
      'Minimum: 5 SOL for token deployment and fees'
    ]
  },
  ethereum: {
    network: 'mainnet',
    address: ethAddress,
    privateKey: ethPrivateKey,
    mnemonic: ethMnemonic,
    fundingInstructions: [
      'Buy ETH from exchange',
      'Withdraw to: ' + ethAddress,
      'Minimum: 0.5 ETH for gas fees'
    ]
  },
  nextSteps: [
    '1. IMMEDIATELY copy this file to secure location (password manager, hardware wallet backup)',
    '2. Fund wallets with initial capital',
    '3. Add to AWS Secrets Manager or similar',
    '4. DELETE this file from server after securing',
    '5. Never commit to git',
    '6. Run verify-mainnet-setup.js to confirm'
  ]
};

// Save to secure location (NOT in git!)
const backupPath = path.join(process.cwd(), '.mainnet-wallets-BACKUP.json');
fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

console.log('💾 Backup saved to: ' + backupPath);
console.log('');
console.log('🔐 SECURITY CHECKLIST:');
console.log('   [ ] Copy backup file to password manager');
console.log('   [ ] Copy backup file to secure offline storage');
console.log('   [ ] Fund Solana wallet with 5+ SOL');
console.log('   [ ] Fund Ethereum wallet with 0.5+ ETH');
console.log('   [ ] Add to AWS Secrets Manager');
console.log('   [ ] DELETE this backup file after securing');
console.log('   [ ] Verify .gitignore excludes .mainnet-wallets-*');
console.log('');

// Create .env.mainnet template
const envMainnetTemplate = `# PRODUCTION MAINNET ENVIRONMENT
# ⚠️  CRITICAL: This file contains REAL mainnet credentials
# ⚠️  NEVER commit this file to git!

NODE_ENV=production
PORT=3000
APP_VERSION=2.1.1

# Database (Production)
DATABASE_URL=postgresql://takara_user:TakaraSecure2025Pass@127.0.0.1:5432/takara_production

# JWT Security (GENERATE NEW SECRET!)
JWT_SECRET=${require('crypto').randomBytes(32).toString('hex')}
JWT_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://localhost:6379

# Frontend
FRONTEND_URL=https://sitpool.org
CORS_ORIGIN=https://sitpool.org

# Solana Mainnet - PRODUCTION
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PLATFORM_WALLET=${solanaPublicKey}
PLATFORM_WALLET_PRIVATE_KEY=${solanaPrivateKey}

# Ethereum Mainnet - PRODUCTION
ETHEREUM_NETWORK=mainnet
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
PLATFORM_ETHEREUM_ADDRESS=${ethAddress}
PLATFORM_ETHEREUM_PRIVATE_KEY=${ethPrivateKey}

# Token Addresses (will be filled after deployment)
USDT_CONTRACT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
TAKARA_TOKEN_MINT=TO_BE_DEPLOYED
LAIKA_TOKEN_MINT=TO_BE_DEPLOYED

# NFT Storage
NFT_STORAGE_API_KEY=

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Background Jobs
ENABLE_CRON_JOBS=true

# Monitoring
SENTRY_DSN=
`;

const envMainnetPath = path.join(process.cwd(), '.env.mainnet');
fs.writeFileSync(envMainnetPath, envMainnetTemplate);

console.log('📝 Template created: .env.mainnet');
console.log('   ⚠️  Update ETHEREUM_RPC_URL with your Infura/Alchemy key');
console.log('   ⚠️  Update NFT_STORAGE_API_KEY');
console.log('   ⚠️  Token addresses will be filled after deployment');
console.log('');
console.log('✅ Mainnet wallets generated successfully!');
console.log('');
console.log('📋 NEXT STEPS:');
console.log('   1. Secure the backup file');
console.log('   2. Fund wallets (5 SOL + 0.5 ETH)');
console.log('   3. Get Infura API key for Ethereum');
console.log('   4. Run: node scripts/deploy-takara-mainnet.js');
console.log('   5. Run: node scripts/deploy-laika-mainnet.js');
console.log('');
