/**
 * Admin Authentication Controller
 */

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { ERROR_MESSAGES } from '../config/constants';
import { getEnv } from '../config/env';
import { getLogger } from '../config/logger';

const logger = getLogger('admin-auth-controller');

/**
 * POST /api/admin/auth/login
 * Admin login
 */
export async function adminLogin(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
      return;
    }

    // Find admin by username or email
    const admin = await prisma.adminUser.findFirst({
      where: {
        OR: [
          { username },
          { email: username }
        ]
      }
    });

    if (!admin) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }

    // Check if admin is active
    if (!admin.isActive) {
      res.status(403).json({
        success: false,
        message: 'Admin account is disabled'
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      {
        adminId: admin.id,
        username: admin.username,
        role: admin.role
      },
      getEnv().JWT_SECRET,
      { expiresIn: getEnv().JWT_EXPIRES_IN }
    );

    // Update last login
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIP: req.ip
      }
    });

    logger.info({
      adminId: admin.id,
      username: admin.username,
      role: admin.role
    }, 'Admin logged in');

    // Set httpOnly cookie (secure in production)
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role
        }
      }
    });
  } catch (error) {
    logger.error({ error }, 'Admin login error');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * POST /api/admin/auth/logout
 * Admin logout (clear cookie)
 */
export async function adminLogout(req: Request, res: Response): Promise<void> {
  try {
    // Clear admin cookie
    res.clearCookie('admin_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    logger.error({ error }, 'Admin logout error');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

export default {
  adminLogin,
  adminLogout
};
