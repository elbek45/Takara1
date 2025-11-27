/**
 * Vault Routes
 */

import { Router } from 'express';
import * as vaultController from '../controllers/vault.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Public routes (with optional auth for personalization)
router.get('/', optionalAuth, vaultController.getAllVaults);
router.get('/:id', optionalAuth, vaultController.getVaultById);
router.post('/:id/calculate', vaultController.calculateInvestment);

export default router;
