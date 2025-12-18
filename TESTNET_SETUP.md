# Testnet Wallet and Token Setup

## Wallet Creation ✅

New test wallets have been generated and saved securely:

### Solana (Devnet)
- **Public Key**: `9HTEaEGeFLEVZ54Buuy8rQcaofKGET4jbf4PbSWJDQAC`
- **Network**: Devnet (testnet)
- **Status**: Created ✅

### Ethereum (Sepolia)
- **Address**: `0x9dDD3F657fAa82ef17424722DdCB0c403AC8eDA4`
- **Network**: Sepolia Testnet
- **Status**: Created ✅

### Wallet Files
- Private keys and mnemonic: `.keys/test-wallets.json` (secured, gitignored)
- Token info: `.keys/token-info.json` (will be created after token minting)

## Configuration Updates ✅

The following files have been automatically updated with new wallet addresses:

- `frontend/.env.production` - Updated with both Solana and Ethereum addresses
- `.gitignore` - Added `.keys/` directory to prevent committing sensitive data

## Next Steps 🚀

### 1. Fund Wallets with Testnet Gas

#### Solana (SOL)
The wallet needs SOL for gas fees. Request devnet SOL from:
- https://faucet.solana.com/
- https://solfaucet.com/
- Or run: `cd backend && npx tsx scripts/request-sol-airdrop.ts`

**Wallet to fund**: `9HTEaEGeFLEVZ54Buuy8rQcaofKGET4jbf4PbSWJDQAC`

#### Ethereum (Sepolia ETH)
The wallet needs Sepolia ETH for gas fees. Request from:
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://sepolia-faucet.pk910.de/

**Wallet to fund**: `0x9dDD3F657fAa82ef17424722DdCB0c403AC8eDA4`

### 2. Create Test Tokens

After funding the wallets with gas, run the token creation scripts:

#### Create Solana SPL Tokens (USDT and TAKARA)
```bash
cd backend
npx tsx scripts/create-solana-tokens.ts
```

This will:
- Create test USDT token mint (6 decimals, 1M supply)
- Create test TAKARA token mint (9 decimals, 10M supply)
- Mint tokens to the platform wallet
- Save token addresses to `.keys/token-info.json`

#### Setup Ethereum ERC-20 Tokens
```bash
cd backend
npx tsx scripts/create-ethereum-tokens.ts
```

This will use existing Sepolia test USDT contracts. For custom TAKARA token:
1. Install Hardhat: `npm install --save-dev hardhat ethers`
2. Deploy `contracts/TestToken.sol` using Hardhat
3. Update `.env.production` with deployed addresses

### 3. Update Environment Configuration

After tokens are created, update `frontend/.env.production` with new token addresses:

```env
# USDT Contract Addresses (from token-info.json)
VITE_USDT_CONTRACT_SOL=<solana_usdt_mint>
VITE_USDT_CONTRACT_ETH=0x7169D38820dfd117C3FA1f22a697dBA58d90BA06

# TAKARA Contract Addresses (from token-info.json)
VITE_TAKARA_CONTRACT_SOL=<solana_takara_mint>
VITE_TAKARA_CONTRACT_ETH=<ethereum_takara_contract>
```

### 4. Deploy to Production

After all tokens are set up:

```bash
cd /home/elbek/TakaraClaude/takara-gold
./deploy.sh
```

This will:
- Build the frontend with updated configuration
- Deploy to production server
- Restart backend services

### 5. Verify Setup

Check that everything is working:
- Visit https://sitpool.org
- Connect both Phantom (Solana) and MetaMask (Ethereum) wallets
- Try creating a test vault investment
- Verify tokens are recognized

## Available Scripts

| Script | Purpose |
|--------|---------|
| `scripts/create-test-wallets.ts` | Generate new Solana and Ethereum wallets |
| `scripts/request-sol-airdrop.ts` | Request SOL from devnet faucet |
| `scripts/create-solana-tokens.ts` | Create USDT and TAKARA SPL tokens on Solana |
| `scripts/create-ethereum-tokens.ts` | Setup test tokens on Ethereum Sepolia |

## Security Notes ⚠️

- **Never commit** `.keys/` directory to git
- **Never use** these wallets on mainnet
- **Private keys** are stored in `.keys/test-wallets.json`
- **Backup** the `.keys/` directory if needed for recovery

## Troubleshooting

### SOL Airdrop Fails (Rate Limited)
If automated airdrop fails, manually request from:
- https://faucet.solana.com/
- Use the public key: `9HTEaEGeFLEVZ54Buuy8rQcaofKGET4jbf4PbSWJDQAC`

### Ethereum Balance Check Fails
This is normal if using public RPC without API key. Check balance manually at:
- https://sepolia.etherscan.io/address/0x9dDD3F657fAa82ef17424722DdCB0c403AC8eDA4

### Token Creation Fails
Ensure wallets have sufficient gas:
- Solana: Need at least 0.5 SOL
- Ethereum: Need at least 0.1 Sepolia ETH

## Current Status

- [x] Generate test wallets
- [x] Update configuration files
- [x] Create token minting scripts
- [ ] Fund wallets with testnet gas
- [ ] Create Solana tokens (USDT, TAKARA)
- [ ] Create Ethereum tokens (USDT, TAKARA)
- [ ] Update frontend config with token addresses
- [ ] Deploy to production
- [ ] Verify functionality

Last updated: 2025-12-18
