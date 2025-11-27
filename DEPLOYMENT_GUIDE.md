# 🚀 Production Deployment Guide
## Takara Gold v2.1.1

**Server**: 159.203.104.235
**Date**: November 27, 2025

---

## 📋 Pre-Deployment Checklist

### ✅ Critical Security Fixes (DONE)
- [x] Removed JWT_SECRET fallback - now fails if not set
- [x] Added environment validation on startup
- [x] Created env.ts for secure config management
- [ ] Redis for nonce storage (will setup on server)
- [ ] Admin login rate limiting (configured, needs testing)

### 📁 Files Created
- [x] `backend/src/config/env.ts` - Environment validation
- [x] `backend/.env.production.example` - Production env template
- [x] `setup-server.sh` - Server setup script
- [x] `deploy.sh` - Deployment automation

---

## 🖥️ Server Specifications

```
IP: 159.203.104.235
OS: Ubuntu 22.04 LTS
User: root
Password: eLBEK451326a
```

**Requirements**:
- Node.js 20 LTS
- PostgreSQL 15
- Redis 7
- Nginx
- PM2
- SSL certificate (Let's Encrypt)

---

## 🎯 Deployment Steps

### Step 1: Connect to Server
```bash
ssh root@159.203.104.235
# Password: eLBEK451326a
```

### Step 2: Run Server Setup Script
```bash
# Upload setup script
scp setup-server.sh root@159.203.104.235:/root/

# SSH to server and run
ssh root@159.203.104.235
chmod +x /root/setup-server.sh
./setup-server.sh
```

**This will install**:
- Node.js 20
- PostgreSQL 15 (database: takara_production)
- Redis
- Nginx
- PM2
- Firewall (UFW)
- Fail2ban
- SSL tools (certbot)

### Step 3: Configure Environment Variables

```bash
# On server
cd /var/www/takara-gold
nano backend/.env.production
```

**Required variables**:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://takara_user:YOUR_SECURE_PASSWORD@localhost:5432/takara_production
JWT_SECRET=<generated during setup, see /var/www/takara-gold/.env.secret>
REDIS_URL=redis://localhost:6379
FRONTEND_URL=https://yourdomain.com
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

**Get JWT_SECRET**:
```bash
cat /var/www/takara-gold/.env.secret
```

### Step 4: Deploy Code

**From local machine**:
```bash
cd /home/elbek/TakaraClaude/takara-gold
./deploy.sh
```

This will:
1. Create backup
2. Upload code
3. Install dependencies
4. Build backend & frontend
5. Run database migrations
6. Restart services
7. Run health check

### Step 5: Configure Domain & SSL

**Option A: With Domain Name**
```bash
# Update Nginx config with your domain
nano /etc/nginx/sites-available/takara-gold
# Replace yourdomain.com with actual domain

# Install SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Option B: Without Domain (Development)**
```bash
# Access via IP:
# Backend: http://159.203.104.235:3000
# Frontend: http://159.203.104.235
```

### Step 6: Start Services

```bash
# Start backend with PM2
pm2 start /var/www/takara-gold/backend/dist/app.js --name takara-backend
pm2 save
pm2 startup

# Restart Nginx
systemctl restart nginx
```

### Step 7: Verify Deployment

```bash
# Check backend health
curl http://159.203.104.235:3000/health

# Check services
pm2 status
systemctl status nginx
systemctl status postgresql
systemctl status redis-server

# Check logs
pm2 logs takara-backend
tail -f /var/log/nginx/error.log
```

---

## 🔒 Security Hardening

### Change Default Passwords
```bash
# PostgreSQL database password
sudo -u postgres psql
ALTER USER takara_user WITH PASSWORD 'your-strong-password';

# Update .env.production with new password
```

### Configure Firewall
```bash
ufw status
# Should see:
# - 22/tcp (SSH) ALLOW
# - 80/tcp (HTTP) ALLOW
# - 443/tcp (HTTPS) ALLOW
# Everything else DENY
```

### Setup Fail2ban
```bash
systemctl status fail2ban
# Protects against brute-force attacks
```

---

## 📊 Monitoring

### Health Checks
```bash
# Run monitoring script
/root/takara-monitor.sh
```

### PM2 Monitoring
```bash
pm2 monit           # Real-time monitoring
pm2 logs            # View logs
pm2 status          # Service status
```

### Database Monitoring
```bash
sudo -u postgres psql -d takara_production
# In psql:
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Investment";
```

### Redis Monitoring
```bash
redis-cli ping      # Should return PONG
redis-cli info      # Full info
```

---

## 🔄 Update Process

### Deploying Updates
```bash
# From local machine
cd /home/elbek/TakaraClaude/takara-gold
./deploy.sh
```

### Manual Deployment
```bash
# SSH to server
cd /var/www/takara-gold

# Pull updates (if using git)
git pull

# Backend
cd backend
npm install --production
npm run build
npm run prisma:migrate

# Frontend
cd ../frontend
npm install
npm run build

# Restart
pm2 restart takara-backend
systemctl restart nginx
```

---

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check logs
pm2 logs takara-backend --err

# Common issues:
# 1. Missing JWT_SECRET
cat backend/.env.production | grep JWT_SECRET

# 2. Database connection
psql -U takara_user -d takara_production -h localhost

# 3. Port already in use
lsof -i :3000
```

### Database Issues
```bash
# Check PostgreSQL status
systemctl status postgresql

# Check connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Reset database (DANGER!)
sudo -u postgres psql <<EOF
DROP DATABASE takara_production;
CREATE DATABASE takara_production OWNER takara_user;
EOF

cd /var/www/takara-gold/backend
npm run prisma:migrate
npm run prisma:seed
```

### Redis Issues
```bash
# Check Redis
systemctl status redis-server
redis-cli ping

# Clear Redis cache
redis-cli FLUSHALL
```

### Nginx Issues
```bash
# Test config
nginx -t

# Check error logs
tail -f /var/log/nginx/error.log

# Restart
systemctl restart nginx
```

---

## 📈 Performance Optimization

### Enable Gzip Compression
```nginx
# Add to /etc/nginx/nginx.conf
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

### Setup Caching
```nginx
# Add to server block
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Database Connection Pooling
```typescript
// Already configured in Prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## 🔐 Backup Strategy

### Automated Daily Backups
```bash
# Create backup script
cat > /root/backup-takara.sh <<'EOF'
#!/bin/bash
BACKUP_DIR=/var/backups/takara-gold
DATE=$(date +%Y%m%d-%H%M%S)

# Database backup
sudo -u postgres pg_dump takara_production > $BACKUP_DIR/db-$DATE.sql

# Code backup
tar -czf $BACKUP_DIR/code-$DATE.tar.gz -C /var/www/takara-gold .

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete
EOF

chmod +x /root/backup-takara.sh

# Schedule daily backups
echo "0 2 * * * /root/backup-takara.sh" | crontab -
```

### Manual Backup
```bash
./deploy.sh  # Creates automatic backup before deployment
```

---

## 🚨 Rollback Procedure

```bash
# List backups
ls -lh /var/backups/takara-gold/

# Rollback
cd /var/www/takara-gold
tar -xzf /var/backups/takara-gold/backup-YYYYMMDD-HHMMSS.tar.gz

# Restore database
sudo -u postgres psql takara_production < /var/backups/takara-gold/db-YYYYMMDD-HHMMSS.sql

# Restart services
pm2 restart takara-backend
systemctl restart nginx
```

---

## 📞 Post-Deployment Checklist

- [ ] Backend API responds on http://SERVER_IP:3000/health
- [ ] Frontend loads on http://SERVER_IP
- [ ] Can login to admin panel
- [ ] Database migrations completed
- [ ] All 9 vaults visible
- [ ] Wallet connection works
- [ ] SSL certificate installed (if using domain)
- [ ] Firewall configured
- [ ] Backups scheduled
- [ ] Monitoring active
- [ ] Logs rotating properly

---

## 🎯 URLs

**Without Domain**:
- Backend API: http://159.203.104.235:3000
- Frontend: http://159.203.104.235
- Admin Panel: http://159.203.104.235/admin/login

**With Domain** (after SSL setup):
- Backend API: https://api.yourdomain.com
- Frontend: https://yourdomain.com
- Admin Panel: https://yourdomain.com/admin/login

---

## 📝 Important Credentials

**Database**:
```
Host: localhost
Port: 5432
Database: takara_production
User: takara_user
Password: <set during setup>
```

**Admin Panel**:
```
Username: admin
Password: admin123
⚠️ CHANGE THIS IMMEDIATELY after first login!
```

**JWT Secret**:
```
Location: /var/www/takara-gold/.env.secret
Generated during server setup
```

---

## ✅ Success Criteria

Deployment is successful when:
1. ✅ Backend health check returns 200 OK
2. ✅ Frontend loads without errors
3. ✅ Can login to admin panel
4. ✅ Database has 9 vaults seeded
5. ✅ Wallet connection works
6. ✅ All services running (PM2, Nginx, PostgreSQL, Redis)
7. ✅ SSL certificate valid (if using domain)
8. ✅ Logs show no errors

---

## 🆘 Support

If you encounter issues:

1. **Check logs**: `pm2 logs takara-backend`
2. **Check services**: `/root/takara-monitor.sh`
3. **Review audit reports**:
   - `SECURITY_AUDIT_REPORT.md`
   - `RECOMMENDATIONS.md`
   - `AUDIT_SUMMARY.md`

---

**Deployment Guide Version**: 1.0
**Last Updated**: November 27, 2025
**Platform Version**: Takara Gold v2.1.1
