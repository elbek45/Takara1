/**
 * Authentication Middleware
 *
 * Handles:
 * - JWT token verification
 * - User authentication
 * - Admin authentication
 * - Role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { AuthenticatedRequest, AdminRequest, JWTPayload, AdminJWTPayload } from '../types';
import { ERROR_MESSAGES } from '../config/constants';
import { getEnv } from '../config/env';

/**
 * Verify JWT token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * User authentication middleware
 * Verifies JWT and attaches user to request
 */
export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.UNAUTHORIZED
      });
      return;
    }

    // Verify JWT
    const decoded = jwt.verify(
      token,
      getEnv().JWT_SECRET
    ) as JWTPayload;

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.UNAUTHORIZED
      });
      return;
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Attach user to request
    (req as AuthenticatedRequest).user = user;
    (req as AuthenticatedRequest).userId = user.id;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * Admin authentication middleware
 * Verifies JWT and attaches admin to request
 */
export async function authenticateAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.UNAUTHORIZED
      });
      return;
    }

    // Verify JWT
    const decoded = jwt.verify(
      token,
      getEnv().JWT_SECRET
    ) as AdminJWTPayload;

    // Fetch admin from database
    const admin = await prisma.adminUser.findUnique({
      where: { id: decoded.adminId }
    });

    if (!admin || !admin.isActive) {
      res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.UNAUTHORIZED
      });
      return;
    }

    // Update last login
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIP: req.ip
      }
    });

    // Attach admin to request
    (req as AdminRequest).admin = admin;
    (req as AdminRequest).adminId = admin.id;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * Require super admin role
 */
export async function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const admin = (req as AdminRequest).admin;

  if (!admin || admin.role !== 'SUPER_ADMIN') {
    res.status(403).json({
      success: false,
      message: ERROR_MESSAGES.FORBIDDEN
    });
    return;
  }

  next();
}

/**
 * Optional authentication - attaches user if token is valid, but doesn't require it
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      next();
      return;
    }

    const decoded = jwt.verify(
      token,
      getEnv().JWT_SECRET
    ) as JWTPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (user && user.isActive) {
      (req as AuthenticatedRequest).user = user;
      (req as AuthenticatedRequest).userId = user.id;
    }

    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
}
