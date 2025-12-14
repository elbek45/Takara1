/**
 * Admin Routes
 */

import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import * as adminAuthController from '../controllers/admin-auth.controller';
import * as adminAdvancedController from '../controllers/admin-advanced.controller';
import * as adminDeploymentController from '../controllers/admin-deployment.controller';
import * as adminBoostController from '../controllers/admin-boost.controller';
import * as adminTreasuryController from '../controllers/admin-treasury.controller';
import * as adminTakaraStatsController from '../controllers/admin/takara-stats.controller';
import { authenticateAdmin, requireSuperAdmin } from '../middleware/auth.middleware';
import { adminLoginLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Public routes (no auth required)
router.post('/auth/login', adminLoginLimiter, adminAuthController.adminLogin);

// Auth routes (require authentication)
router.post('/auth/logout', authenticateAdmin, adminAuthController.adminLogout);

// All other admin routes require authentication
router.use(authenticateAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getUsers);

// Investment monitoring
router.get('/investments', adminController.getInvestments);

// Withdrawal management
router.get('/withdrawals', adminController.getWithdrawals);
router.put('/withdrawals/:id/process', adminController.processWithdrawal);

// Mining Statistics (Enhanced)
router.get('/mining-stats', adminAdvancedController.getMiningStats);
router.get('/stats/mining', adminController.getMiningStats); // Legacy endpoint

// Wallet Management (Super Admin Only)
router.get('/wallets', requireSuperAdmin, adminAdvancedController.getWallets);
router.put('/wallets', requireSuperAdmin, adminAdvancedController.updateWallet);

// Vault Management (Enhanced - Super Admin Only)
router.get('/vaults', requireSuperAdmin, adminAdvancedController.getVaults);
router.post('/vaults', requireSuperAdmin, adminAdvancedController.createVault);
router.put('/vaults/:id', requireSuperAdmin, adminAdvancedController.updateVault);
router.delete('/vaults/:id', requireSuperAdmin, adminAdvancedController.deleteVault);
router.get('/vaults/:id/stats', requireSuperAdmin, adminAdvancedController.getVaultStats);

// Legacy vault toggle (kept for compatibility)
router.put('/vaults/:id/toggle', requireSuperAdmin, adminController.toggleVaultStatus);

// Deployment Management (Super Admin Only) - NEW v2.2
router.get('/deployment/status', requireSuperAdmin, adminDeploymentController.getDeploymentStatus);
router.post('/deployment/deploy-takara', requireSuperAdmin, adminDeploymentController.deployTakaraToken);
router.post('/deployment/create-wexel-collection', requireSuperAdmin, adminDeploymentController.createWexelCollection);
router.post('/deployment/update-env', requireSuperAdmin, adminDeploymentController.updateEnvironment);
router.post('/deployment/verify-takara', requireSuperAdmin, adminDeploymentController.verifyTakaraToken);

// Network Configuration (Super Admin Only) - NEW v2.2 LAIKA Boost
router.get('/network', requireSuperAdmin, adminAdvancedController.getNetworkConfig);
router.put('/network', requireSuperAdmin, adminAdvancedController.updateNetworkConfig);

// Boost Token Management (Super Admin Only) - NEW v2.2
router.get('/boost-tokens', requireSuperAdmin, adminBoostController.getBoostTokens);
router.get('/boost-tokens/statistics', requireSuperAdmin, adminBoostController.getBoostTokenStatistics);
router.get('/boost-tokens/:symbol', requireSuperAdmin, adminBoostController.getBoostToken);
router.post('/boost-tokens', requireSuperAdmin, adminBoostController.createBoostToken);
router.put('/boost-tokens/:symbol', requireSuperAdmin, adminBoostController.updateBoostToken);
router.delete('/boost-tokens/:symbol', requireSuperAdmin, adminBoostController.deleteBoostToken);

// Treasury Management (Super Admin Only) - NEW v2.2
router.get('/treasury/summary', requireSuperAdmin, adminTreasuryController.getTreasurySummary);
router.get('/treasury/balances', requireSuperAdmin, adminTreasuryController.getTreasuryBalances);
router.get('/treasury/balances/:symbol', requireSuperAdmin, adminTreasuryController.getTreasuryBalanceBySymbol);
router.get('/treasury/statistics', requireSuperAdmin, adminTreasuryController.getStatistics);
router.get('/treasury/tax-records', requireSuperAdmin, adminTreasuryController.getTaxRecords);
router.post('/treasury/withdraw', requireSuperAdmin, adminTreasuryController.withdrawFromTreasury);

// TAKARA Pricing Calculator (Super Admin Only) - NEW
router.get('/pricing/takara', requireSuperAdmin, adminAdvancedController.getTakaraPricingCalculations);

// TAKARA Statistics & Supply Tracking (Super Admin Only) - NEW v2.3
router.get('/takara/stats', requireSuperAdmin, adminTakaraStatsController.getTakaraStats);
router.get('/takara/history', requireSuperAdmin, adminTakaraStatsController.getTakaraHistory);
router.get('/takara/breakdown', requireSuperAdmin, adminTakaraStatsController.getTakaraBreakdown);

export default router;
