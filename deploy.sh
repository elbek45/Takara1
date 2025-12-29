#!/bin/bash

#################################################
# Takara Gold v2.1.1 - Production Deployment
# Server: takarafi.com (68.178.174.34)
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

echo -e "${GREEN}🚀 Starting Takara Gold Deployment${NC}"
echo "==========================================="

# Step 1: Backup current version
echo -e "${YELLOW}📦 Creating backup...${NC}"
sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "echo '${SERVER_PASS}' | sudo -S mkdir -p ${BACKUP_DIR} && \
  if [ -d ${PROJECT_DIR} ]; then \
    echo '${SERVER_PASS}' | sudo -S tar -czf ${BACKUP_DIR}/backup-\$(date +%Y%m%d-%H%M%S).tar.gz -C ${PROJECT_DIR} .; \
    echo 'Backup created successfully'; \
  else \
    echo 'No existing installation to backup'; \
  fi"

# Step 2: Upload code
echo -e "${YELLOW}📤 Uploading code...${NC}"
sshpass -p "${SERVER_PASS}" rsync -avz --delete \
  -e "ssh -o StrictHostKeyChecking=no" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'dist' \
  --exclude 'coverage' \
  ./ ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/

# Step 3: Create .env.production
echo -e "${YELLOW}⚙️  Creating .env.production...${NC}"
sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "cat > ${PROJECT_DIR}/backend/.env.production <<'ENVEOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://takara:takara_password@127.0.0.1:5432/takara_gold
JWT_SECRET=5518e3b09562c0335fce4022c6e6edc7a17f25c6cd309a1048296d960aa6b557
JWT_EXPIRES_IN=7d
REDIS_URL=redis://localhost:6379
FRONTEND_URL=https://takarafi.com
CORS_ORIGIN=https://takarafi.com
SOLANA_RPC_URL=https://api.devnet.solana.com
TRON_FULL_HOST=https://api.trongrid.io
USDT_CONTRACT_TRON=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
PLATFORM_WALLET_TRON=TPs3TqoQq24X46Zmw3JA5hZ7kyx2F1tKg2
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
ADMIN_RATE_LIMIT_WINDOW_MS=900000
ADMIN_RATE_LIMIT_MAX=5
ENVEOF
"

# Step 4: Install dependencies, generate Prisma, migrate, and build
echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "cd ${PROJECT_DIR}/backend && npm install"

echo -e "${YELLOW}🔧 Generating Prisma Client...${NC}"
sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "cd ${PROJECT_DIR}/backend && npx prisma generate"

echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "cd ${PROJECT_DIR}/backend && export \$(cat .env.production | xargs) && npx prisma migrate deploy"

echo -e "${YELLOW}🏗️  Building backend...${NC}"
sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "cd ${PROJECT_DIR}/backend && npm run build && npm prune --production"

echo -e "${YELLOW}📦 Installing and building frontend...${NC}"
sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "cd ${PROJECT_DIR}/frontend && npm install && npm run build"

# Step 6: Restart services
echo -e "${YELLOW}🔄 Restarting services...${NC}"
sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "cd ${PROJECT_DIR}/backend && pm2 delete takara-backend 2>/dev/null || true"
sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "cd ${PROJECT_DIR}/backend && export \$(cat .env.production | xargs) && pm2 start dist/app.js --name takara-backend"
sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "echo '${SERVER_PASS}' | sudo -S systemctl restart nginx"

# Step 7: Health check (via SSH to check localhost on server)
echo -e "${YELLOW}🏥 Running health check...${NC}"
sleep 5
if sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "curl -f http://localhost:3000/health"; then
  echo -e "${GREEN}✅ Backend is healthy${NC}"
else
  echo -e "${RED}❌ Backend health check failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo "==========================================="
echo "Backend: http://${SERVER_IP}:3000"
echo "Frontend: http://${SERVER_IP}"
