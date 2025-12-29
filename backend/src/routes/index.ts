/**
 * API Routes Index
 *
 * Consolidates all route modules
 */

import { Router } from 'express';
import authRoutes from './auth.routes';
import vaultRoutes from './vault.routes';
import investmentRoutes from './investment.routes';
import marketplaceRoutes from './marketplace.routes';
import adminRoutes from './admin.routes';
import priceRoutes from './price.routes';
import partnersRoutes from './partners.routes';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/vaults', vaultRoutes);
router.use('/investments', investmentRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/admin', adminRoutes);
router.use('/prices', priceRoutes);
router.use('/partners', partnersRoutes);

export default router;
