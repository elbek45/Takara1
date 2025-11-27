#!/bin/bash

###############################################################################
# Takara Gold v2.1.1 - Production Server Setup
# Server: 159.203.104.235 (Ubuntu 22.04)
# This script sets up a fresh server with all dependencies
###############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Takara Gold Production Server Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Update system
echo -e "${BLUE}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Install essentials
echo -e "${BLUE}🔧 Installing essential packages...${NC}"
apt install -y curl wget git build-essential nginx certbot python3-certbot-nginx ufw fail2ban

# Install Node.js 20 LTS
echo -e "${BLUE}📦 Installing Node.js 20 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version
npm --version

# Install PostgreSQL 15
echo -e "${BLUE}🗄️  Installing PostgreSQL 15...${NC}"
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# Create database
echo -e "${BLUE}📊 Setting up database...${NC}"
sudo -u postgres psql <<EOF
CREATE DATABASE takara_production;
CREATE USER takara_user WITH ENCRYPTED PASSWORD 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE takara_production TO takara_user;
ALTER DATABASE takara_production OWNER TO takara_user;
\c takara_production
GRANT ALL ON SCHEMA public TO takara_user;
EOF

echo -e "${GREEN}✅ Database created: takara_production${NC}"

# Install Redis
echo -e "${BLUE}🔴 Installing Redis...${NC}"
apt install -y redis-server
systemctl start redis-server
systemctl enable redis-server

# Configure Redis for production
cat > /etc/redis/redis.conf <<EOF
bind 127.0.0.1
protected-mode yes
port 6379
maxmemory 256mb
maxmemory-policy allkeys-lru
EOF

systemctl restart redis-server

# Install PM2
echo -e "${BLUE}⚙️  Installing PM2...${NC}"
npm install -g pm2
pm2 startup systemd -u root --hp /root

# Create project directory
echo -e "${BLUE}📁 Creating project directory...${NC}"
mkdir -p /var/www/takara-gold
mkdir -p /var/backups/takara-gold
mkdir -p /var/log/takara-gold

# Configure firewall
echo -e "${BLUE}🔥 Configuring firewall...${NC}"
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw status

# Configure fail2ban
echo -e "${BLUE}🛡️  Configuring fail2ban...${NC}"
systemctl start fail2ban
systemctl enable fail2ban

# Configure Nginx
echo -e "${BLUE}🌐 Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/takara-gold <<'EOF'
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/takara-gold/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Caching for static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
EOF

# Enable site
ln -sf /etc/nginx/sites-available/takara-gold /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
systemctl restart nginx

# Generate strong JWT secret
echo -e "${BLUE}🔐 Generating JWT secret...${NC}"
JWT_SECRET=$(openssl rand -hex 32)
echo "JWT_SECRET=$JWT_SECRET" > /var/www/takara-gold/.env.secret
echo -e "${GREEN}✅ JWT secret generated and saved to /var/www/takara-gold/.env.secret${NC}"

# Set permissions
chown -R root:root /var/www/takara-gold
chmod 600 /var/www/takara-gold/.env.secret

# Create monitoring script
cat > /root/takara-monitor.sh <<'EOF'
#!/bin/bash
# Monitor Takara Gold services
pm2 status
systemctl status nginx --no-pager
systemctl status postgresql --no-pager
systemctl status redis-server --no-pager
EOF
chmod +x /root/takara-monitor.sh

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ Server Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Update .env.production with database credentials"
echo "2. Deploy code: ./deploy.sh"
echo "3. Configure SSL: certbot --nginx -d yourdomain.com"
echo "4. Monitor: /root/takara-monitor.sh"
echo ""
echo -e "${BLUE}📊 Service URLs:${NC}"
echo "  Backend API: http://$(hostname -I | awk '{print $1}'):3000"
echo "  Frontend: http://$(hostname -I | awk '{print $1}')"
echo ""
echo -e "${BLUE}🔐 Important Files:${NC}"
echo "  JWT Secret: /var/www/takara-gold/.env.secret"
echo "  Database: takara_production (user: takara_user)"
echo ""
echo -e "${RED}⚠️  IMPORTANT:${NC}"
echo "1. Change database password in .env.production"
echo "2. Update domain names in Nginx config"
echo "3. Set up SSL certificates with certbot"
echo "4. Review firewall rules: ufw status"
echo ""
