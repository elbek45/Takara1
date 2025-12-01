#!/bin/bash

###############################################################################
# Takara Gold Backend - Production Deployment Script
# Deploys backend to production using Docker
###############################################################################

set -e  # Exit on any error

echo "🚀 Starting Takara Gold Backend Deployment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ ERROR: .env.production file not found${NC}"
    echo "Please create .env.production from .env.production.example"
    exit 1
fi

echo -e "${GREEN}✅ Environment file found${NC}"

# Load production environment
set -a
source .env.production
set +a

# Check required environment variables
REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET" "REDIS_URL" "SOLANA_RPC_URL" "PLATFORM_WALLET")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}❌ ERROR: Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

echo -e "${GREEN}✅ All required environment variables set${NC}"
echo ""

# Step 1: Build Docker image
echo "📦 Building Docker image..."
docker build -t takara-gold-backend:latest .
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image built successfully${NC}"
else
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi
echo ""

# Step 2: Run database migrations
echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.prod.yml up -d postgres redis
sleep 5  # Wait for PostgreSQL to be ready

# Run Prisma migrations
docker run --rm \
    --network takara-gold-network \
    -e DATABASE_URL="$DATABASE_URL" \
    takara-gold-backend:latest \
    npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database migrations completed${NC}"
else
    echo -e "${YELLOW}⚠️  Database migrations may have failed - check logs${NC}"
fi
echo ""

# Step 3: Stop old containers
echo "🛑 Stopping old containers..."
docker-compose -f docker-compose.prod.yml down
echo -e "${GREEN}✅ Old containers stopped${NC}"
echo ""

# Step 4: Start new containers
echo "🚀 Starting production containers..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for health check
echo "⏳ Waiting for health check..."
sleep 10

# Check health endpoint
HEALTH_CHECK=$(curl -s http://localhost:${PORT:-3000}/health | grep -o '"status":"healthy"' || echo "")

if [ -n "$HEALTH_CHECK" ]; then
    echo -e "${GREEN}✅ Application is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Health check did not pass - check logs${NC}"
    docker-compose -f docker-compose.prod.yml logs --tail=50 backend
fi
echo ""

# Step 5: Show status
echo "📊 Deployment Status:"
echo "===================="
docker-compose -f docker-compose.prod.yml ps
echo ""

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "📝 Next steps:"
echo "  - Check logs: docker-compose -f docker-compose.prod.yml logs -f backend"
echo "  - Monitor health: curl http://localhost:${PORT:-3000}/health"
echo "  - View containers: docker-compose -f docker-compose.prod.yml ps"
echo ""
