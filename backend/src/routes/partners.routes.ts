/**
 * Partners Routes
 * Public and admin routes for partners management
 */

import { Router } from 'express';
import {
  getPartners,
  adminGetPartners,
  adminCreatePartner,
  adminUpdatePartner,
  adminDeletePartner,
  adminUploadPartnerLogo,
  adminReorderPartners,
  upload,
} from '../controllers/partners.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

// ==================== PUBLIC ROUTES ====================

// Get all active partners
router.get('/', getPartners);

// ==================== ADMIN ROUTES ====================

// Get all partners (including inactive)
router.get('/admin', authenticateAdmin, adminGetPartners);

// Create a new partner
router.post('/admin', authenticateAdmin, adminCreatePartner);

// Upload partner logo
router.post('/admin/upload', authenticateAdmin, upload.single('logo'), adminUploadPartnerLogo);

// Reorder partners
router.post('/admin/reorder', authenticateAdmin, adminReorderPartners);

// Update a partner
router.put('/admin/:id', authenticateAdmin, adminUpdatePartner);

// Delete a partner
router.delete('/admin/:id', authenticateAdmin, adminDeletePartner);

export default router;
