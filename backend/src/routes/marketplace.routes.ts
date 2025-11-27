/**
 * Marketplace Routes
 */

import { Router } from 'express';
import * as marketplaceController from '../controllers/marketplace.controller';
import { authenticateUser, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Public routes (with optional auth)
router.get('/', optionalAuth, marketplaceController.getMarketplaceListings);
router.get('/stats', marketplaceController.getMarketplaceStats);

// Protected routes
router.use(authenticateUser);

router.post('/list', marketplaceController.createListing);
router.get('/my-listings', marketplaceController.getMyListings);
router.post('/:id/buy', marketplaceController.purchaseNFT);
router.delete('/:id', marketplaceController.cancelListing);

export default router;
