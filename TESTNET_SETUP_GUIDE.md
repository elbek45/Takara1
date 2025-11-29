# Testnet Setup Guide - Takara Gold

Complete guide for setting up and testing Takara Gold platform on testnet networks.

## Overview

Takara Gold uses a **hybrid blockchain architecture**:

- **Ethereum Sepolia Testnet** - For USDT deposits, withdrawals, and yield claims
- **Solana Devnet** - For NFT minting, TAKARA token, and LAIKA token

---

## Prerequisites

### Required Software

```bash
# Node.js and npm
node --version  # Should be v18+
npm --version

# PostgreSQL
psql --version  # Should be 14+

# Solana CLI
solana --version  # Should be 1.14+

# SPL Token CLI
spl-token --version
```

### Required Accounts

1. **NFT.Storage** - Free IPFS storage for NFT metadata
   - Sign up at: https://nft.storage/

2. **Alchemy or Infura** - Free Ethereum RPC provider
   - Alchemy: https://dashboard.alchemy.com/
   - Infura: https://infura.io/

---

## Phase 1: Created Wallets and Tokens ✅

### 1.1 Ethereum Wallet (COMPLETED)

**Platform Ethereum Wallet Created:**
```
Address:     0x5B2De17a0aC667B08B501C92e6B271ed110665E1
Private Key: 0xdf074bfbd94bca6ab0844c56ce5d42bb023d056cf931a933a371551a7bc9bd60
```

**Get Testnet ETH:**
1. Visit: https://sepoliafaucet.com/
2. Enter address: `0x5B2De17a0aC667B08B501C92e6B271ed110665E1`
3. Request testnet ETH (needed for gas fees)
4. Wait 1-2 minutes for confirmation

**Verify Balance:**
```bash
# Using Etherscan
# Visit: https://sepolia.etherscan.io/address/0x5B2De17a0aC667B08B501C92e6B271ed110665E1

# Or using web3.js
node -e "
  const { Web3 } = require('web3');
  const web3 = new Web3('https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY');
  web3.eth.getBalance('0x5B2De17a0aC667B08B501C92e6B271ed110665E1')
    .then(balance => console.log('Balance:', web3.utils.fromWei(balance, 'ether'), 'ETH'));
"
```

### 1.2 Solana Wallet (COMPLETED)

**Platform Solana Wallet:**
```
Address: AinafdFme7f68yGjJwfnmYgtJpZPu9RAHuJBcRTXif4i
Keypair: ~/.config/solana/devnet-platform-wallet.json
```

**Get Devnet SOL:**
```bash
# Airdrop SOL to platform wallet
solana airdrop 2 AinafdFme7f68yGjJwfnmYgtJpZPu9RAHuJBcRTXif4i --url devnet

# Check balance
solana balance AinafdFme7f68yGjJwfnmYgtJpZPu9RAHuJBcRTXif4i --url devnet
```

**Verify on Explorer:**
Visit: https://explorer.solana.com/address/AinafdFme7f68yGjJwfnmYgtJpZPu9RAHuJBcRTXif4i?cluster=devnet

### 1.3 SPL Tokens Created (COMPLETED)

**TAKARA Token:**
```
Mint Address: 2Mx29ELkJxNZshN2mUYtStcyi54FK2Cve68QAASXfWjn
Decimals: 6
Initial Supply: 1,000,000 TAKARA
Explorer: https://explorer.solana.com/address/2Mx29ELkJxNZshN2mUYtStcyi54FK2Cve68QAASXfWjn?cluster=devnet
```

**LAIKA Token:**
```
Mint Address: 8aCNPGawekMyWTq9W9C3NnKL1ycEbb6pZxBJ1DMmeWEM
Decimals: 6
Initial Supply: 1,000,000 LAIKA
Explorer: https://explorer.solana.com/address/8aCNPGawekMyWTq9W9C3NnKL1ycEbb6pZxBJ1DMmeWEM?cluster=devnet
```

**Check Token Balances:**
```bash
# TAKARA balance
spl-token balance 2Mx29ELkJxNZshN2mUYtStcyi54FK2Cve68QAASXfWjn --url devnet

# LAIKA balance
spl-token balance 8aCNPGawekMyWTq9W9C3NnKL1ycEbb6pZxBJ1DMmeWEM --url devnet
```

---

## Phase 2: Deploy Mock USDT Contract

### 2.1 Get API Keys

**Alchemy (Recommended):**
1. Sign up at https://dashboard.alchemy.com/
2. Create new app:
   - Name: "Takara Gold Testnet"
   - Chain: Ethereum
   - Network: Sepolia
3. Copy the API key from dashboard
4. Your RPC URL will be: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`

**Update .env.testnet:**
```bash
cd /home/elbek/TakaraClaude/takara-gold/backend
nano .env.testnet

# Replace this line:
ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
# With your actual API key
```

### 2.2 Deploy Mock USDT

**IMPORTANT:** Make sure you have testnet ETH first (from step 1.1)!

```bash
cd /home/elbek/TakaraClaude/takara-gold/backend

# Deploy the contract
node scripts/deploy-mock-usdt.js
```

**Expected Output:**
```
========================================
Deploying Mock USDT to Sepolia Testnet
========================================

Deployer Address: 0x5B2De17a0aC667B08B501C92e6B271ed110665E1
ETH Balance: 0.5 ETH

Deploying contract...
✅ Contract deployed successfully!

Contract Address: 0x1234567890abcdef1234567890abcdef12345678
Transaction Hash: 0xabcdef...

========================================
IMPORTANT: Update .env.testnet
========================================

USDT_CONTRACT_ADDRESS=0x1234567890abcdef1234567890abcdef12345678
```

**Update .env.testnet with contract address:**
```bash
nano .env.testnet

# Replace:
USDT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
# With the deployed address from output above
```

### 2.3 Verify Mock USDT

**Check on Etherscan:**
Visit: `https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS`

**Test the faucet function:**
```bash
# Create test script
node -e "
  const { Web3 } = require('web3');
  const web3 = new Web3('https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY');

  const usdtABI = [
    {
      constant: false,
      inputs: [],
      name: 'faucet',
      outputs: [],
      type: 'function'
    }
  ];

  const contract = new web3.eth.Contract(usdtABI, 'YOUR_CONTRACT_ADDRESS');

  // Call faucet to get 1000 USDT
  contract.methods.faucet().send({
    from: '0x5B2De17a0aC667B08B501C92e6B271ed110665E1',
    gas: 100000
  }).then(tx => console.log('Faucet TX:', tx.transactionHash));
"
```

---

## Phase 3: Configure NFT.Storage

### 3.1 Get API Key

1. Sign up at https://nft.storage/
2. Go to "API Keys" section
3. Create new API key: "Takara Gold Testnet"
4. Copy the key

### 3.2 Update .env.testnet

```bash
nano .env.testnet

# Replace:
NFT_STORAGE_API_KEY=your_nft_storage_api_key_here
# With your actual API key
```

---

## Phase 4: Database Setup

### 4.1 Create Testnet Database

```bash
# Create PostgreSQL database
createdb takara_testnet

# Verify connection
psql takara_testnet -c "SELECT version();"
```

### 4.2 Update Database URL

The `.env.testnet` already has:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/takara_testnet"
```

If your PostgreSQL credentials are different, update accordingly.

### 4.3 Run Migrations

```bash
cd /home/elbek/TakaraClaude/takara-gold/backend

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate:dev
```

---

## Phase 5: Start Testnet Server

### 5.1 Load Environment

```bash
cd /home/elbek/TakaraClaude/takara-gold/backend

# Copy testnet config to .env
cp .env.testnet .env

# Or use NODE_ENV
export NODE_ENV=testnet
```

### 5.2 Start Backend

```bash
npm run dev
```

**Expected Output:**
```
[INFO] Server running on port 3000
[INFO] Solana platform wallet initialized: AinafdFme7f68yGjJwfnmYgtJpZPu9RAHuJBcRTXif4i
[INFO] Ethereum platform wallet initialized: 0x5B2De17a0aC667B08B501C92e6B271ed110665E1
```

### 5.3 Start Frontend

```bash
cd /home/elbek/TakaraClaude/takara-gold/frontend
npm run dev
```

---

## Phase 6: Testing Checklist

### 6.1 User Registration

- [ ] Register with email/password
- [ ] Connect Phantom wallet (Solana)
- [ ] Connect MetaMask wallet (Ethereum)
- [ ] Verify both addresses saved in database

### 6.2 USDT Investment (Ethereum)

**Enable real transfers:**
```bash
# In .env.testnet
ENABLE_REAL_ETH_TRANSFERS=true
SKIP_TX_VERIFICATION=false
```

**Test flow:**
1. User gets test USDT from faucet:
   ```bash
   # Call faucet from user's MetaMask wallet
   # Or send USDT from platform wallet to user
   ```

2. User approves USDT spend in MetaMask

3. User creates investment:
   - Select vault
   - Enter amount
   - Sign transaction in MetaMask

4. Backend verifies transaction on Ethereum

5. NFT minted on Solana devnet

**Verify:**
- [ ] Transaction appears on https://sepolia.etherscan.io/
- [ ] NFT appears on https://explorer.solana.com/?cluster=devnet
- [ ] Investment record created in database

### 6.3 NFT Minting (Solana)

**Enable real NFT minting:**
```bash
# In .env.testnet
ENABLE_REAL_NFT_MINTING=true
```

**Verify:**
- [ ] NFT metadata uploaded to IPFS via NFT.Storage
- [ ] NFT minted on Solana devnet
- [ ] NFT ownership transferred to user's Phantom wallet
- [ ] NFT visible in Phantom wallet
- [ ] NFT visible on Solana Explorer

### 6.4 Yield Claims (Ethereum USDT)

**Test claim:**
1. Wait for yield to accrue (or manually update database)
2. Click "Claim Yield"
3. USDT transferred via Ethereum to user's MetaMask wallet

**Verify:**
- [ ] USDT balance increased in MetaMask
- [ ] Transaction on Sepolia Etherscan
- [ ] Claim record in database

### 6.5 Token Claims (Solana TAKARA)

**Enable real token transfers:**
```bash
# In .env.testnet
ENABLE_REAL_TOKEN_TRANSFERS=true
```

**Test claim:**
1. Wait for TAKARA mining rewards
2. Click "Claim TAKARA"
3. TAKARA transferred via Solana to user's Phantom wallet

**Verify:**
- [ ] TAKARA balance in Phantom wallet
- [ ] Transaction on Solana Explorer
- [ ] Claim record in database

### 6.6 Withdrawals

**Test USDT withdrawal:**
1. Request withdrawal (USDT)
2. Admin approves
3. USDT transferred via Ethereum

**Test TAKARA withdrawal:**
1. Request withdrawal (TAKARA)
2. Admin approves
3. TAKARA transferred via Solana

**Verify:**
- [ ] Correct blockchain used (Ethereum for USDT, Solana for TAKARA)
- [ ] Transaction confirmed on respective explorer
- [ ] Withdrawal status updated in database

---

## Phase 7: Monitoring and Debugging

### 7.1 Check Platform Balances

**Ethereum (ETH for gas):**
```bash
node -e "
  const { Web3 } = require('web3');
  const web3 = new Web3(process.env.ETHEREUM_RPC_URL);
  web3.eth.getBalance(process.env.PLATFORM_ETHEREUM_ADDRESS)
    .then(b => console.log('ETH:', web3.utils.fromWei(b, 'ether')));
"
```

**Ethereum (USDT balance):**
```bash
node -e "
  const { getPlatformUSDTBalance } = require('./src/services/ethereum.service');
  getPlatformUSDTBalance().then(balance => console.log('USDT:', balance));
"
```

**Solana (SOL for fees):**
```bash
solana balance AinafdFme7f68yGjJwfnmYgtJpZPu9RAHuJBcRTXif4i --url devnet
```

**Solana (TAKARA balance):**
```bash
spl-token balance 2Mx29ELkJxNZshN2mUYtStcyi54FK2Cve68QAASXfWjn --url devnet
```

### 7.2 Watch Transactions

**Ethereum logs:**
```bash
# In separate terminal
cd /home/elbek/TakaraClaude/takara-gold/backend
npm run dev | grep -i ethereum
```

**Solana logs:**
```bash
# Watch platform wallet transactions
solana logs AinafdFme7f68yGjJwfnmYgtJpZPu9RAHuJBcRTXif4i --url devnet
```

### 7.3 Common Issues

**Issue: "Insufficient funds"**
- Check ETH balance for gas fees
- Get more testnet ETH from faucet

**Issue: "Transaction not confirmed"**
- Sepolia can be slow, wait 30-60 seconds
- Check Etherscan for pending transactions

**Issue: "NFT minting failed"**
- Check NFT_STORAGE_API_KEY is valid
- Ensure platform wallet has SOL for fees
- Check Solana devnet status

**Issue: "USDT transfer failed"**
- Verify USDT_CONTRACT_ADDRESS is correct
- Check USDT balance of platform wallet
- Ensure enough ETH for gas fees

---

## Phase 8: Switching to Mock Mode

For faster development without blockchain transactions:

```bash
# .env.testnet
ENABLE_REAL_ETH_TRANSFERS=false
ENABLE_REAL_TOKEN_TRANSFERS=false
ENABLE_REAL_NFT_MINTING=false
SKIP_TX_VERIFICATION=true
```

In mock mode:
- Transactions return fake signatures
- No actual blockchain calls
- Faster iteration for UI/UX development

---

## Resources

### Documentation
- [Solana Docs](https://docs.solana.com/)
- [Metaplex Docs](https://docs.metaplex.com/)
- [Web3.js Docs](https://web3js.readthedocs.io/)
- [SPL Token Guide](https://spl.solana.com/token)

### Explorers
- [Sepolia Etherscan](https://sepolia.etherscan.io/)
- [Solana Explorer (Devnet)](https://explorer.solana.com/?cluster=devnet)

### Faucets
- [Sepolia Faucet](https://sepoliafaucet.com/)
- Solana Devnet: `solana airdrop 2 --url devnet`

### Tools
- [NFT.Storage](https://nft.storage/)
- [Alchemy Dashboard](https://dashboard.alchemy.com/)
- [Infura Dashboard](https://infura.io/)

---

## Summary of Created Resources

### Ethereum Sepolia
```
Platform Wallet: 0x5B2De17a0aC667B08B501C92e6B271ed110665E1
Mock USDT Contract: [To be deployed]
```

### Solana Devnet
```
Platform Wallet: AinafdFme7f68yGjJwfnmYgtJpZPu9RAHuJBcRTXif4i
TAKARA Token: 2Mx29ELkJxNZshN2mUYtStcyi54FK2Cve68QAASXfWjn
LAIKA Token: 8aCNPGawekMyWTq9W9C3NnKL1ycEbb6pZxBJ1DMmeWEM
```

### Scripts Created
```
backend/scripts/create-eth-wallet.js
backend/scripts/deploy-mock-usdt.js
backend/contracts/MockUSDT.sol
backend/.env.testnet
```

---

**Next Steps:**
1. Get testnet ETH from faucet
2. Deploy Mock USDT contract
3. Get API keys (Alchemy, NFT.Storage)
4. Update .env.testnet with all credentials
5. Run database migrations
6. Start testing!
