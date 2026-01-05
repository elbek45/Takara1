#!/bin/bash

#################################################
# Takara Gold v2.1.1 - Production Deployment
# Server: takarafi.com (68.178.174.34)
#
# Usage:
#   ./deploy.sh          - Full deployment (backend + frontend)
#   ./deploy.sh frontend - Frontend only (build locally, upload dist)
#   ./deploy.sh backend  - Backend only
#################################################

set -e  # Exit on error

# Colors
RED='\033[0:31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
# Load deployment credentials from deploy.env
if [ -f "deploy.env" ]; then
  source deploy.env
else
  echo "Error: deploy.env file not found!"
  echo "Create deploy.env from deploy.env.example and fill in your credentials."
  exit 1
fi

PROJECT_DIR="/var/www/takara-gold"
BACKUP_DIR="/var/backups/takara-gold"

# Determine deployment mode
MODE="${1:-full}"

echo -e "${GREEN}🚀 Starting Takara Gold Deployment (${MODE})${NC}"
echo "==========================================="

# Function: Deploy Frontend (build locally, upload dist)
deploy_frontend() {
  echo -e "${YELLOW}📦 Building frontend locally...${NC}"
  cd frontend && npm run build && cd ..

  echo -e "${YELLOW}📤 Uploading frontend dist...${NC}"
  sshpass -p "${SERVER_PASS}" rsync -avz \
    -e "ssh -o StrictHostKeyChecking=no" \
    frontend/dist/ ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/frontend/dist/

  echo -e "${YELLOW}🔄 Restarting nginx...${NC}"
  sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "echo '${SERVER_PASS}' | sudo -S systemctl reload nginx"
}

# Function: Deploy Backend
deploy_backend() {
  echo -e "${YELLOW}📦 Creating backup...${NC}"
  sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "echo '${SERVER_PASS}' | sudo -S mkdir -p ${BACKUP_DIR} && \
    if [ -d ${PROJECT_DIR} ]; then \
      echo '${SERVER_PASS}' | sudo -S tar -czf ${BACKUP_DIR}/backup-\$(date +%Y%m%d-%H%M%S).tar.gz -C ${PROJECT_DIR} .; \
      echo 'Backup created successfully'; \
    else \
      echo 'No existing installation to backup'; \
    fi"

  echo -e "${YELLOW}📤 Uploading backend code...${NC}"
  sshpass -p "${SERVER_PASS}" rsync -avz --delete \
    -e "ssh -o StrictHostKeyChecking=no" \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude 'dist' \
    --exclude 'coverage' \
    backend/ ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/backend/

  # Load secrets from deploy.secrets file (not committed to git)
  if [ ! -f "deploy.secrets" ]; then
    echo -e "${RED}Error: deploy.secrets file not found!${NC}"
    echo "Create deploy.secrets with the following variables:"
    echo "  JWT_SECRET=<your-jwt-secret>"
    echo "  DB_PASSWORD=<your-db-password>"
    echo "  PLATFORM_WALLET=<solana-public-key>"
    echo "  PLATFORM_WALLET_PRIVATE_KEY=<solana-private-key>"
    echo "  PLATFORM_WALLET_ETH=<evm-wallet-address>"
    exit 1
  fi
  source deploy.secrets

  echo -e "${YELLOW}⚙️  Creating .env.production...${NC}"
  sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "cat > ${PROJECT_DIR}/backend/.env.production <<ENVEOF
NODE_ENV=production
PORT=3000
APP_VERSION=2.1.1
DATABASE_URL=postgresql://takara:${DB_PASSWORD}@127.0.0.1:5432/takara_gold
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
REDIS_URL=redis://localhost:6379
FRONTEND_URL=https://takarafi.com
CORS_ORIGIN=https://takarafi.com
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PLATFORM_WALLET=${PLATFORM_WALLET}
PLATFORM_WALLET_PRIVATE_KEY=${PLATFORM_WALLET_PRIVATE_KEY}
PLATFORM_WALLET_ETH=${PLATFORM_WALLET_ETH}
TAKARA_TOKEN_MINT=6biyv9NcaHmf8rKfLFGmj6eTwR9LBQtmi8dGUp2vRsgA
LAIKA_TOKEN_MINT=Euoq6CyQFCjCVSLR9wFaUPDW19Y6ZHwEcJoZsEi643i1
TRON_FULL_HOST=https://api.trongrid.io
USDT_CONTRACT_TRON=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
PLATFORM_WALLET_TRON=TQ9ovCpPB2vXXeRbHXgTnxFkQKJAzdZNX9
TEST_MODE=false
SKIP_TX_VERIFICATION=false
ENABLE_CRON_JOBS=true
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
ENVEOF
"

  echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
  sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "cd ${PROJECT_DIR}/backend && npm install"

  echo -e "${YELLOW}🔧 Generating Prisma Client...${NC}"
  sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "cd ${PROJECT_DIR}/backend && npx prisma generate"

  echo -e "${YELLOW}🗄️  Skipping schema sync (protecting production data)...${NC}"

  echo -e "${YELLOW}🏗️  Building backend...${NC}"
  sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "cd ${PROJECT_DIR}/backend && npm run build && npm prune --production"

  echo -e "${YELLOW}🔄 Restarting services...${NC}"
  sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "cd ${PROJECT_DIR}/backend && pm2 delete takara-backend 2>/dev/null || true"
  sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "cd ${PROJECT_DIR}/backend && export \$(cat .env.production | xargs) && pm2 start dist/app.js --name takara-backend"

  echo -e "${YELLOW}🏥 Running health check...${NC}"
  sleep 5
  if sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "curl -f http://localhost:3000/health"; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
  else
    echo -e "${RED}❌ Backend health check failed${NC}"
    exit 1
  fi
}

# Execute based on mode
case "$MODE" in
  frontend)
    deploy_frontend
    ;;
  backend)
    deploy_backend
    ;;
  full|*)
    deploy_backend
    deploy_frontend
    ;;
esac

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo "==========================================="
echo "Backend: http://${SERVER_IP}:3000"
echo "Frontend: http://${SERVER_IP}"
