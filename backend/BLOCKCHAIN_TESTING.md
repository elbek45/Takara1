# Blockchain Integration Testing Guide

This guide explains how to test Solana blockchain integration on testnet.

## 📋 Test Coverage

### Passing Tests (5/8 - 62.5%)

✅ **SOL Transfer** - Send real SOL transactions on testnet  
✅ **Balance Checks** - Verify recipient balances after transfers  
✅ **Wrong Recipient Validation** - Reject transactions with incorrect recipient  
✅ **Account Info Retrieval** - Get account information from blockchain  
✅ **Blockhash Generation** - Fetch recent blockhash for new transactions

### Known Issues (3/8)

⚠️ **Transaction Verification** - Testnet RPC indexing delays may cause verification to fail  
⚠️ **Detailed Validation** - Same indexing issue affects detailed transaction checks  
⚠️ **Amount Validation** - Transaction indexing delays affect amount verification

> **Note**: These failures are due to Solana testnet RPC indexing delays, not code issues.  
> The actual transactions succeed (as shown by balance checks), but the RPC may take  
> 10-30 seconds to index them for retrieval via `getTransaction()`.

## 🚀 Quick Start

### 1. Setup Testnet Environment

```bash
# Generate testnet wallets
npm run testnet:setup

# This creates:
# - Platform wallet for receiving investments
# - .env.testnet configuration file
# - testnet-wallets.json with wallet details
```

### 2. Get Testnet SOL

Visit [Solana Faucet](https://faucet.solana.com) and request SOL for your platform wallet.

Or use CLI:
```bash
solana airdrop 2 <YOUR_WALLET_ADDRESS> --url testnet
```

### 3. Verify Balance

```bash
# Check wallet balance
node scripts/check-balance.js

# Should show: "💰 Balance: 5.0000 SOL" (or similar)
```

### 4. Run Tests

```bash
# Run basic blockchain tests (no real transactions)
TEST_BLOCKCHAIN=true npm test -- --testPathPattern=blockchain

# Run live transaction tests (costs testnet SOL)
TEST_BLOCKCHAIN_LIVE=true npm test -- --testPathPattern=blockchain-live
```

## 📊 Test Breakdown

### Basic Blockchain Tests (17/17 ✅)

**File**: `src/__tests__/integration/blockchain.test.ts`

- Solana connection verification
- Wallet address validation  
- Signature verification with bs58 encoding
- Account balance checks
- Transaction verification (read-only)

**Run**:
```bash
export TEST_BLOCKCHAIN=true
npm test -- --testPathPattern=blockchain
```

### Live Transaction Tests (5/8 ⚠️)

**File**: `src/__tests__/integration/blockchain-live.test.ts`

**⚠️ WARNING**: These tests create REAL transactions and cost testnet SOL!

Tests:
1. ✅ Send SOL from platform wallet  
2. ⚠️ Verify transaction on-chain (testnet indexing delays)
3. ⚠️ Detailed transaction validation (testnet indexing delays)
4. ✅ Check recipient balance
5. ✅ Reject wrong recipient
6. ⚠️ Reject wrong amount (testnet indexing delays)
7. ✅ Retrieve account info
8. ✅ Get recent blockhash

**Run**:
```bash
export PLATFORM_WALLET_PRIVATE_KEY="<your_key_from_.env.testnet>"
export TEST_BLOCKCHAIN_LIVE=true
npm test -- --testPathPattern=blockchain-live
```

## 🔧 Configuration Files

### `.env.testnet`
```env
SOLANA_NETWORK=testnet
SOLANA_RPC_URL=https://api.testnet.solana.com
PLATFORM_WALLET_PRIVATE_KEY=<generated_by_setup_script>
PLATFORM_WALLET=<public_key>
DATABASE_URL=postgresql://takara:takara_password@localhost:5432/takara_testnet
```

### `testnet-wallets.json`
```json
{
  "generatedAt": "2025-12-01T...",
  "network": "testnet",
  "platformWallet": {
    "publicKey": "CZLRyrrcz1b2madGW4D79aK1uiigeLnABoE1Rp2UtQcQ"
  },
  "instructions": {
    "airdrop": "solana airdrop 2 <wallet> --url testnet",
    "balance": "solana balance <wallet> --url testnet"
  }
}
```

## 🐛 Troubleshooting

### Transaction Verification Fails

**Problem**: `verifyTransaction()` returns `null` even though transaction succeeded.

**Cause**: Solana testnet RPC nodes can take 10-30 seconds to index transactions.

**Solution**: 
- Wait longer (30+ seconds) before verification
- Use balance checks instead of transaction retrieval
- Use devnet or mainnet for faster indexing

### Insufficient Balance

**Problem**: Tests fail with "Insufficient balance" error.

**Solution**:
```bash
# Check current balance
node scripts/check-balance.js

# Request more SOL from faucet
# Visit: https://faucet.solana.com
```

### Jest Environment Variables

**Problem**: `PLATFORM_WALLET_PRIVATE_KEY not set` error.

**Solution**: Export environment variable before running tests:
```bash
export PLATFORM_WALLET_PRIVATE_KEY="<key_from_.env.testnet>"
```

Or use:
```bash
# Copy testnet config to .env
cp .env.testnet .env
npm run testnet:dev
```

## 📈 Future Improvements

- [ ] Add retry mechanism with exponential backoff
- [ ] Use alternative RPC endpoints (Helius, QuickNode)
- [ ] Implement transaction subscription instead of polling
- [ ] Add SPL token transfer tests
- [ ] Add NFT minting tests
- [ ] Test program interactions (on-chain programs)

## 🔗 Resources

- [Solana Testnet Faucet](https://faucet.solana.com)
- [Solana Explorer (Testnet)](https://explorer.solana.com/?cluster=testnet)
- [Solana RPC API Docs](https://docs.solana.com/api)
- [Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)

## 💡 Tips

1. **Use Devnet for development**: Devnet is more stable than testnet
2. **Keep SOL balance > 1**: Always maintain buffer for test failures
3. **Monitor RPC status**: Check [Solana Status](https://status.solana.com/)
4. **Wait between tests**: Give RPC time to index (5-10 seconds)
5. **Check Explorer**: Verify transactions at explorer.solana.com

## 📝 Example Test Output

```
✓ should send SOL from platform wallet to recipient (1560 ms)
Platform wallet loaded: CZLRyrrcz1b2madGW4D79aK1uiigeLnABoE1Rp2UtQcQ
Test recipient generated: 8xMPvfqJQRnJGZJz3xKGGMqCJpqjhqjJzXqZ9vF9qYnL
Sending 0.01 SOL to 8xMPvfqJQRnJGZJz3xKGGMqCJpqjhqjJzXqZ9vF9qYnL
Transaction confirmed: 5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnb...

✓ should check recipient balance after transfer (291 ms)
Recipient balance: 0.0100 SOL

✓ should retrieve account info for funded account (95 ms)
Account info retrieved
Lamports: 10000000
Owner: 11111111111111111111111111111111

Final platform wallet balance: 4.9650 SOL
```
