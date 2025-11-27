/**
 * Admin Routes
 */

import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticateAdmin, requireSuperAdmin } from '../middleware/auth.middleware';

const router = Router();

// All admin routes require authentication
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

// Vault management (super admin only)
router.put('/vaults/:id/toggle', requireSuperAdmin, adminController.toggleVaultStatus);

// Statistics
router.get('/stats/mining', adminController.getMiningStats);

export default router;
