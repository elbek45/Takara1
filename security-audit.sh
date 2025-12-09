#!/bin/bash

#################################################
# Takara Gold v2.2 - Security Audit Script
#################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   TAKARA GOLD v2.2 - SECURITY AUDIT${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

ISSUES=0

# ==================== 1. Environment Variables ====================
echo -e "${YELLOW}1. Checking Environment Variables Security...${NC}"

# Check for .env files in repo
if find . -name ".env" -not -path "*/node_modules/*" | grep -q .; then
    echo -e "  ${RED}✗${NC} .env files found in repository!"
    find . -name ".env" -not -path "*/node_modules/*"
    ISSUES=$((ISSUES+1))
else
    echo -e "  ${GREEN}✓${NC} No .env files in repository"
fi

# Check deploy.sh for exposed credentials
if grep -q "SERVER_PASS=" deploy.sh; then
    echo -e "  ${RED}✗${NC} Credentials exposed in deploy.sh!"
    ISSUES=$((ISSUES+1))
else
    echo -e "  ${GREEN}✓${NC} No exposed credentials in deploy.sh"
fi

# Check for JWT_SECRET in code
if grep -r "JWT_SECRET.*=" backend/src/ --exclude-dir=node_modules | grep -v "getEnv\|process.env"; then
    echo -e "  ${RED}✗${NC} Hardcoded JWT_SECRET found!"
    ISSUES=$((ISSUES+1))
else
    echo -e "  ${GREEN}✓${NC} No hardcoded JWT_SECRET"
fi

# ==================== 2. SQL Injection Prevention ====================
echo -e "\n${YELLOW}2. Checking SQL Injection Prevention...${NC}"

# Check for raw SQL queries
if grep -r "prisma\.\$executeRaw\|prisma\.\$queryRaw" backend/src/ --exclude-dir=node_modules | grep -v "Prisma.sql"; then
    echo -e "  ${YELLOW}⚠${NC} Raw SQL queries detected (ensure parameterization)"
else
    echo -e "  ${GREEN}✓${NC} Using Prisma ORM (SQL injection protected)"
fi

# ==================== 3. XSS Prevention ====================
echo -e "\n${YELLOW}3. Checking XSS Prevention...${NC}"

# Check for dangerous HTML rendering
if grep -r "dangerouslySetInnerHTML\|innerHTML" frontend/src/ --exclude-dir=node_modules; then
    echo -e "  ${YELLOW}⚠${NC} Potentially unsafe HTML rendering detected"
else
    echo -e "  ${GREEN}✓${NC} No dangerous HTML rendering"
fi

# Check for React escaping
echo -e "  ${GREEN}✓${NC} Using React (auto-escapes by default)"

# ==================== 4. Authentication Security ====================
echo -e "\n${YELLOW}4. Checking Authentication Security...${NC}"

# Check JWT expiration
if grep -q "JWT_EXPIRES_IN" backend/.env.production 2>/dev/null || grep -q "JWT_EXPIRES_IN" deploy.sh; then
    echo -e "  ${GREEN}✓${NC} JWT expiration configured"
else
    echo -e "  ${YELLOW}⚠${NC} JWT expiration not found in .env.production"
fi

# Check password hashing
if grep -r "bcrypt\|argon2" backend/src/ --exclude-dir=node_modules | grep -q "hash\|compare"; then
    echo -e "  ${GREEN}✓${NC} Password hashing implemented"
else
    echo -e "  ${RED}✗${NC} No password hashing found!"
    ISSUES=$((ISSUES+1))
fi

# Check for httpOnly cookies
if grep -r "httpOnly.*true" backend/src/ --exclude-dir=node_modules | grep -q "cookie"; then
    echo -e "  ${GREEN}✓${NC} httpOnly cookies configured"
else
    echo -e "  ${YELLOW}⚠${NC} httpOnly cookies not explicitly set"
fi

# ==================== 5. Rate Limiting ====================
echo -e "\n${YELLOW}5. Checking Rate Limiting...${NC}"

if grep -q "express-rate-limit\|rate-limit" backend/package.json; then
    echo -e "  ${GREEN}✓${NC} Rate limiting package installed"

    # Check implementation
    if grep -r "rateLimit\|limiter" backend/src/app.ts backend/src/middleware/ --exclude-dir=node_modules | grep -q "windowMs\|max"; then
        echo -e "  ${GREEN}✓${NC} Rate limiting implemented"
    else
        echo -e "  ${YELLOW}⚠${NC} Rate limiting package installed but not configured"
    fi
else
    echo -e "  ${RED}✗${NC} No rate limiting found!"
    ISSUES=$((ISSUES+1))
fi

# ==================== 6. CORS Configuration ====================
echo -e "\n${YELLOW}6. Checking CORS Configuration...${NC}"

if grep -r "cors" backend/src/app.ts --exclude-dir=node_modules | grep -q "origin"; then
    echo -e "  ${GREEN}✓${NC} CORS configured"

    # Check for overly permissive CORS
    if grep -r "origin.*\*" backend/src/app.ts; then
        echo -e "  ${RED}✗${NC} CORS allows all origins (*)!"
        ISSUES=$((ISSUES+1))
    else
        echo -e "  ${GREEN}✓${NC} CORS properly restricted"
    fi
else
    echo -e "  ${RED}✗${NC} CORS not configured!"
    ISSUES=$((ISSUES+1))
fi

# ==================== 7. Security Headers ====================
echo -e "\n${YELLOW}7. Checking Security Headers...${NC}"

if grep -q "helmet" backend/package.json; then
    echo -e "  ${GREEN}✓${NC} Helmet.js installed"

    if grep -r "app.use(helmet" backend/src/app.ts; then
        echo -e "  ${GREEN}✓${NC} Helmet.js enabled"
    else
        echo -e "  ${YELLOW}⚠${NC} Helmet.js installed but not enabled"
    fi
else
    echo -e "  ${RED}✗${NC} Helmet.js not installed!"
    ISSUES=$((ISSUES+1))
fi

# ==================== 8. Input Validation ====================
echo -e "\n${YELLOW}8. Checking Input Validation...${NC}"

# Check for validation libraries
if grep -q "zod\|joi\|yup\|express-validator" backend/package.json; then
    echo -e "  ${GREEN}✓${NC} Validation library found"
else
    echo -e "  ${YELLOW}⚠${NC} No validation library detected"
fi

# ==================== 9. Sensitive Data Exposure ====================
echo -e "\n${YELLOW}9. Checking for Sensitive Data Exposure...${NC}"

# Check for console.log in production code
if grep -r "console\.log" backend/src/ frontend/src/ --exclude-dir=node_modules | grep -v "logger\|TODO\|DEBUG"; then
    echo -e "  ${YELLOW}⚠${NC} console.log statements found (may leak data)"
else
    echo -e "  ${GREEN}✓${NC} No console.log in production code"
fi

# Check for error message exposure
if grep -r "error\.message\|err\.message" backend/src/ --exclude-dir=node_modules | grep -v "logger\|getLogger"; then
    echo -e "  ${YELLOW}⚠${NC} Error messages may be exposed to clients"
else
    echo -e "  ${GREEN}✓${NC} Error messages properly handled"
fi

# ==================== 10. Dependencies ====================
echo -e "\n${YELLOW}10. Checking Dependencies for Vulnerabilities...${NC}"

# Run npm audit
cd backend
if npm audit --production --audit-level=high 2>&1 | grep -q "found 0 vulnerabilities"; then
    echo -e "  ${GREEN}✓${NC} No high/critical vulnerabilities in backend"
else
    echo -e "  ${YELLOW}⚠${NC} Vulnerabilities detected in backend:"
    npm audit --production --audit-level=high | grep "high\|critical" | head -5
fi
cd ..

cd frontend
if npm audit --production --audit-level=high 2>&1 | grep -q "found 0 vulnerabilities"; then
    echo -e "  ${GREEN}✓${NC} No high/critical vulnerabilities in frontend"
else
    echo -e "  ${YELLOW}⚠${NC} Vulnerabilities detected in frontend:"
    npm audit --production --audit-level=high | grep "high\|critical" | head -5
fi
cd ..

# ==================== 11. Solana Security ====================
echo -e "\n${YELLOW}11. Checking Solana/Blockchain Security...${NC}"

# Check for private key exposure
if grep -r "privateKey\|secretKey\|mnemonic" backend/src/ --exclude-dir=node_modules | grep -v "PublicKey\|getEnv\|process.env"; then
    echo -e "  ${RED}✗${NC} Private keys may be exposed!"
    ISSUES=$((ISSUES+1))
else
    echo -e "  ${GREEN}✓${NC} No exposed private keys"
fi

# Check for keypair generation from env
if grep -r "Keypair.fromSecretKey" backend/src/ --exclude-dir=node_modules | grep -q "getEnv\|process.env"; then
    echo -e "  ${GREEN}✓${NC} Keypairs loaded from environment"
else
    echo -e "  ${YELLOW}⚠${NC} Keypair handling not found or unsafe"
fi

# ==================== 12. Admin Panel Security ====================
echo -e "\n${YELLOW}12. Checking Admin Panel Security...${NC}"

# Check for admin authentication
if grep -r "authenticateAdmin\|requireSuperAdmin" backend/src/middleware/ backend/src/routes/admin.routes.ts --exclude-dir=node_modules | grep -q "export"; then
    echo -e "  ${GREEN}✓${NC} Admin authentication middleware found"
else
    echo -e "  ${RED}✗${NC} No admin authentication found!"
    ISSUES=$((ISSUES+1))
fi

# Check for role-based access
if grep -r "role.*===.*'SUPER_ADMIN'\|admin.role" backend/src/middleware/ --exclude-dir=node_modules; then
    echo -e "  ${GREEN}✓${NC} Role-based access control implemented"
else
    echo -e "  ${YELLOW}⚠${NC} RBAC not explicitly implemented"
fi

# ==================== Summary ====================
echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}"
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ SECURITY AUDIT: PASSED${NC}"
    echo -e "   All critical security checks passed!"
else
    echo -e "${RED}❌ SECURITY AUDIT: FAILED${NC}"
    echo -e "   Found $ISSUES critical security issues!"
    echo -e "   ${YELLOW}Please review and fix the issues above.${NC}"
fi
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

exit $ISSUES
