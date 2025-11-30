/**
 * Marketplace Routes
 */

import { Router } from 'express';
import * as marketplaceController from '../controllers/marketplace.controller';
import { authenticateUser, optionalAuth } from '../middleware/auth.middleware';
import { cacheMedium, cacheShort } from '../middleware/cache.middleware';

const router = Router();

// Public routes (with optional auth)
// Cache marketplace listings for 30 seconds (changes frequently)
router.get('/', optionalAuth, cacheShort, marketplaceController.getMarketplaceListings);

// Cache stats for 5 minutes (aggregated data, less critical)
router.get('/stats', cacheMedium, marketplaceController.getMarketplaceStats);

// Protected routes
router.use(authenticateUser);

router.post('/list', marketplaceController.createListing);

// Cache user's listings for 30 seconds
router.get('/my-listings', cacheShort, marketplaceController.getMyListings);

router.post('/:id/buy', marketplaceController.purchaseNFT);
router.delete('/:id', marketplaceController.cancelListing);

export default router;
