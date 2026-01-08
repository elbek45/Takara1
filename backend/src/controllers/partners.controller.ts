/**
 * Partners Controller
 * Handles public and admin endpoints for partners (Powered By slider)
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/uploads/partners');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `partner-${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG, JPEG, SVG, WebP, and GIF are allowed.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// ==================== PUBLIC ENDPOINTS ====================

/**
 * Get all active partners (public)
 */
export async function getPartners(req: Request, res: Response) {
  try {
    const partners = await prisma.partner.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        websiteUrl: true,
        displayOrder: true,
      },
    });

    return res.json({
      success: true,
      data: partners,
    });
  } catch (error) {
    console.error('Failed to fetch partners:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch partners',
    });
  }
}

// ==================== ADMIN ENDPOINTS ====================

/**
 * Get all partners (admin - includes inactive)
 */
export async function adminGetPartners(req: Request, res: Response) {
  try {
    const partners = await prisma.partner.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    return res.json({
      success: true,
      data: partners,
    });
  } catch (error) {
    console.error('Failed to fetch partners:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch partners',
    });
  }
}

/**
 * Create a new partner (admin)
 */
export async function adminCreatePartner(req: Request, res: Response) {
  try {
    const { name, logoUrl, websiteUrl, displayOrder } = req.body;

    if (!name || !logoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Name and logoUrl are required',
      });
    }

    // Get max display order if not provided
    let order = displayOrder;
    if (order === undefined) {
      const maxOrder = await prisma.partner.aggregate({
        _max: { displayOrder: true },
      });
      order = (maxOrder._max.displayOrder || 0) + 1;
    }

    const partner = await prisma.partner.create({
      data: {
        name,
        logoUrl,
        websiteUrl,
        displayOrder: order,
      },
    });

    return res.status(201).json({
      success: true,
      data: partner,
    });
  } catch (error) {
    console.error('Failed to create partner:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create partner',
    });
  }
}

/**
 * Update a partner (admin)
 */
export async function adminUpdatePartner(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, logoUrl, websiteUrl, displayOrder, isActive } = req.body;

    const existing = await prisma.partner.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found',
      });
    }

    const partner = await prisma.partner.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(websiteUrl !== undefined && { websiteUrl }),
        ...(displayOrder !== undefined && { displayOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return res.json({
      success: true,
      data: partner,
    });
  } catch (error) {
    console.error('Failed to update partner:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update partner',
    });
  }
}

/**
 * Delete a partner (admin)
 */
export async function adminDeletePartner(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const existing = await prisma.partner.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found',
      });
    }

    // Delete the logo file if it's a local upload
    if (existing.logoUrl.startsWith('/uploads/partners/')) {
      const filePath = path.join(__dirname, '../../public', existing.logoUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.partner.delete({ where: { id } });

    return res.json({
      success: true,
      message: 'Partner deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete partner:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete partner',
    });
  }
}

/**
 * Upload partner logo (admin)
 */
export async function adminUploadPartnerLogo(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const url = `/uploads/partners/${req.file.filename}`;

    return res.json({
      success: true,
      data: { url },
    });
  } catch (error) {
    console.error('Failed to upload logo:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload logo',
    });
  }
}

/**
 * Reorder partners (admin)
 */
export async function adminReorderPartners(req: Request, res: Response) {
  try {
    const { order } = req.body; // Array of { id, displayOrder }

    if (!Array.isArray(order)) {
      return res.status(400).json({
        success: false,
        error: 'Order must be an array',
      });
    }

    // Update all in transaction
    await prisma.$transaction(
      order.map(({ id, displayOrder }: { id: string; displayOrder: number }) =>
        prisma.partner.update({
          where: { id },
          data: { displayOrder },
        })
      )
    );

    return res.json({
      success: true,
      message: 'Partners reordered successfully',
    });
  } catch (error) {
    console.error('Failed to reorder partners:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reorder partners',
    });
  }
}
