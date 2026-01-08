/**
 * Partners Routes
 * Public and admin routes for partners management
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
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

// Multer error handling middleware
const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 5MB.',
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`,
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Upload failed',
    });
  }
  next();
};

// ==================== PUBLIC ROUTES ====================

// Get all active partners
router.get('/', getPartners);

// ==================== ADMIN ROUTES ====================

// Get all partners (including inactive)
router.get('/admin', authenticateAdmin, adminGetPartners);

// Create a new partner
router.post('/admin', authenticateAdmin, adminCreatePartner);

// Upload partner logo (with error handling)
router.post('/admin/upload', authenticateAdmin, upload.single('logo'), handleMulterError, adminUploadPartnerLogo);

// Reorder partners
router.post('/admin/reorder', authenticateAdmin, adminReorderPartners);

// Update a partner
router.put('/admin/:id', authenticateAdmin, adminUpdatePartner);

// Delete a partner
router.delete('/admin/:id', authenticateAdmin, adminDeletePartner);

export default router;
