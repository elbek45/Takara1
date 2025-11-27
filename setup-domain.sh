#!/bin/bash

#################################################
# Takara Gold - Domain & SSL Setup
# Domain: sitpool.org
#################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

DOMAIN="sitpool.org"
WWW_DOMAIN="www.sitpool.org"
EMAIL="admin@sitpool.org"  # Change if needed

echo -e "${GREEN}🌐 Setting up domain ${DOMAIN}${NC}"
echo "==========================================="

# Step 1: Install Certbot if not already installed
echo -e "${YELLOW}📦 Installing Certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
else
    echo "Certbot already installed"
fi

# Step 2: Create Nginx configuration
echo -e "${YELLOW}⚙️  Creating Nginx configuration...${NC}"
cat > /etc/nginx/sites-available/takara-gold <<'NGINXEOF'
# Takara Gold - Production Configuration
server {
    listen 80;
    listen [::]:80;
    server_name sitpool.org www.sitpool.org;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect HTTP to HTTPS (will be enabled after SSL setup)
    # location / {
    #     return 301 https://$server_name$request_uri;
    # }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # CORS headers
        add_header 'Access-Control-Allow-Origin' 'https://sitpool.org' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;

        # Handle preflight
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }

    # Frontend
    location / {
        root /var/www/takara-gold/frontend/dist;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
}

# HTTPS configuration (will be added by Certbot)
# server {
#     listen 443 ssl http2;
#     listen [::]:443 ssl http2;
#     server_name sitpool.org www.sitpool.org;
#
#     # SSL certificates (managed by Certbot)
#     # ssl_certificate /etc/letsencrypt/live/sitpool.org/fullchain.pem;
#     # ssl_certificate_key /etc/letsencrypt/live/sitpool.org/privkey.pem;
#
#     # SSL configuration
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_prefer_server_ciphers on;
#     ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
#     ssl_session_timeout 1d;
#     ssl_session_cache shared:SSL:50m;
#     ssl_stapling on;
#     ssl_stapling_verify on;
#
#     # Backend API
#     location /api/ {
#         proxy_pass http://localhost:3000/;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#         proxy_cache_bypass $http_upgrade;
#     }
#
#     # Frontend
#     location / {
#         root /var/www/takara-gold/frontend/dist;
#         try_files $uri $uri/ /index.html;
#     }
# }
NGINXEOF

# Step 3: Enable site
echo -e "${YELLOW}🔗 Enabling site...${NC}"
ln -sf /etc/nginx/sites-available/takara-gold /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Step 4: Test Nginx configuration
echo -e "${YELLOW}✅ Testing Nginx configuration...${NC}"
nginx -t

# Step 5: Reload Nginx
echo -e "${YELLOW}🔄 Reloading Nginx...${NC}"
systemctl reload nginx

echo ""
echo -e "${GREEN}✅ Nginx configuration created!${NC}"
echo ""
echo -e "${YELLOW}📝 ВАЖНО: Настройте DNS записи для домена:${NC}"
echo ""
echo "В панели управления DNS вашего регистратора добавьте:"
echo "  Type: A"
echo "  Name: @"
echo "  Value: 159.203.104.235"
echo "  TTL: 3600"
echo ""
echo "  Type: A"
echo "  Name: www"
echo "  Value: 159.203.104.235"
echo "  TTL: 3600"
echo ""
echo -e "${YELLOW}После настройки DNS (подождите 5-10 минут), запустите:${NC}"
echo ""
echo "  sudo certbot --nginx -d sitpool.org -d www.sitpool.org --non-interactive --agree-tos -m $EMAIL"
echo ""
echo -e "${GREEN}Это автоматически настроит SSL и обновит конфигурацию Nginx${NC}"
echo "==========================================="
