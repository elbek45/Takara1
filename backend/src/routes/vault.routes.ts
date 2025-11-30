/**
 * Vault Routes
 */

import { Router } from 'express';
import * as vaultController from '../controllers/vault.controller';
import { optionalAuth } from '../middleware/auth.middleware';
import { cacheMedium, cacheShort } from '../middleware/cache.middleware';

const router = Router();

// Public routes (with optional auth for personalization)
// Cache vault list for 5 minutes (vaults don't change often)
router.get('/', optionalAuth, cacheMedium, vaultController.getAllVaults);

// Cache individual vault for 5 minutes
router.get('/:id', optionalAuth, cacheMedium, vaultController.getVaultById);

// Cache calculation results for 30 seconds (varies by input)
router.post('/:id/calculate', cacheShort, vaultController.calculateInvestment);

export default router;
