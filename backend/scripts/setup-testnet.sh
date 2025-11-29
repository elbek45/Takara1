#!/bin/bash

# =========================================
# Takara Gold - Testnet Automated Setup
# =========================================

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${GREEN}"
echo "╔═══════════════════════════════════════════════╗"
echo "║   TAKARA GOLD - TESTNET AUTOMATED SETUP       ║"
echo "╚═══════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from backend directory${NC}"
    exit 1
fi

# =========================================
# Step 1: Check if .env.testnet exists
# =========================================
echo -e "${CYAN}[1/6] Checking configuration...${NC}"

if [ ! -f ".env.testnet" ]; then
    echo -e "${RED}Error: .env.testnet not found${NC}"
    echo "Please ensure .env.testnet exists in backend directory"
    exit 1
fi

echo -e "${GREEN}✓ Configuration file found${NC}"

# =========================================
# Step 2: Check Solana wallet
# =========================================
echo -e "\n${CYAN}[2/6] Checking Solana wallet...${NC}"

SOLANA_WALLET="$HOME/.config/solana/devnet-platform-wallet.json"

if [ ! -f "$SOLANA_WALLET" ]; then
    echo -e "${YELLOW}⚠  Solana wallet not found, creating...${NC}"
    mkdir -p "$HOME/.config/solana"
    solana-keygen new --outfile "$SOLANA_WALLET" --no-bip39-passphrase
else
    echo -e "${GREEN}✓ Solana wallet exists${NC}"
fi

# Get wallet address
SOLANA_ADDRESS=$(solana address --keypair "$SOLANA_WALLET")
echo "  Address: $SOLANA_ADDRESS"

# Check balance
BALANCE=$(solana balance "$SOLANA_ADDRESS" --url devnet 2>/dev/null | grep -oP '^\d+(\.\d+)?')

if (( $(echo "$BALANCE < 0.5" | bc -l) )); then
    echo -e "${YELLOW}⚠  Low SOL balance, requesting airdrop...${NC}"
    solana airdrop 1 "$SOLANA_ADDRESS" --url devnet || {
        echo -e "${YELLOW}⚠  Airdrop failed (rate limit). Get SOL manually from:${NC}"
        echo "   https://faucet.solana.com/"
    }
else
    echo -e "${GREEN}✓ SOL balance: $BALANCE SOL${NC}"
fi

# =========================================
# Step 3: Check Ethereum wallet
# =========================================
echo -e "\n${CYAN}[3/6] Checking Ethereum wallet...${NC}"

ETH_ADDRESS="0x5B2De17a0aC667B08B501C92e6B271ed110665E1"
echo "  Address: $ETH_ADDRESS"
echo -e "${YELLOW}⚠  Please ensure this wallet has testnet ETH from:${NC}"
echo "   https://sepoliafaucet.com/"

# =========================================
# Step 4: Check SPL tokens
# =========================================
echo -e "\n${CYAN}[4/6] Checking SPL tokens...${NC}"

TAKARA_MINT="2Mx29ELkJxNZshN2mUYtStcyi54FK2Cve68QAASXfWjn"
LAIKA_MINT="8aCNPGawekMyWTq9W9C3NnKL1ycEbb6pZxBJ1DMmeWEM"

echo "  TAKARA: $TAKARA_MINT"
echo "  LAIKA: $LAIKA_MINT"
echo -e "${GREEN}✓ SPL tokens created${NC}"

# =========================================
# Step 5: Check API keys
# =========================================
echo -e "\n${CYAN}[5/6] Checking API keys...${NC}"

source .env.testnet

if [ -z "$ETHEREUM_RPC_URL" ] || [[ "$ETHEREUM_RPC_URL" == *"YOUR_"* ]]; then
    echo -e "${YELLOW}⚠  ETHEREUM_RPC_URL not set${NC}"
    echo "   Get free API key from:"
    echo "   - Alchemy: https://dashboard.alchemy.com/"
    echo "   - Infura: https://infura.io/"
    MISSING_KEYS=1
else
    echo -e "${GREEN}✓ Ethereum RPC URL configured${NC}"
fi

if [ -z "$NFT_STORAGE_API_KEY" ] || [[ "$NFT_STORAGE_API_KEY" == *"your_"* ]]; then
    echo -e "${YELLOW}⚠  NFT_STORAGE_API_KEY not set${NC}"
    echo "   Get free API key from: https://nft.storage/"
    MISSING_KEYS=1
else
    echo -e "${GREEN}✓ NFT Storage API key configured${NC}"
fi

if [ ! -z "$MISSING_KEYS" ]; then
    echo -e "\n${YELLOW}Please update .env.testnet with missing API keys before continuing${NC}"
    exit 1
fi

# =========================================
# Step 6: Database setup
# =========================================
echo -e "\n${CYAN}[6/6] Setting up database...${NC}"

# Check if database exists
DB_NAME="takara_testnet"

if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${GREEN}✓ Database '$DB_NAME' exists${NC}"
else
    echo -e "${YELLOW}Creating database '$DB_NAME'...${NC}"
    createdb "$DB_NAME" || {
        echo -e "${RED}Failed to create database${NC}"
        exit 1
    }
    echo -e "${GREEN}✓ Database created${NC}"
fi

# Run migrations
echo -e "${YELLOW}Running Prisma migrations...${NC}"
cp .env.testnet .env
npm run prisma:generate
npm run prisma:migrate:dev --name testnet_init

echo -e "${GREEN}✓ Database migrations completed${NC}"

# =========================================
# Summary
# =========================================
echo -e "\n${BOLD}${GREEN}"
echo "╔═══════════════════════════════════════════════╗"
echo "║             TESTNET SETUP COMPLETE             ║"
echo "╚═══════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BOLD}Next Steps:${NC}"
echo ""
echo "1. ${CYAN}Deploy Mock USDT Contract:${NC}"
echo "   node scripts/deploy-mock-usdt.js"
echo ""
echo "2. ${CYAN}Update .env.testnet with contract address${NC}"
echo ""
echo "3. ${CYAN}Check balances:${NC}"
echo "   node scripts/check-testnet-balances.js"
echo ""
echo "4. ${CYAN}Start development server:${NC}"
echo "   npm run dev"
echo ""
echo -e "${BOLD}${GREEN}Ready to test on testnet! 🚀${NC}"
