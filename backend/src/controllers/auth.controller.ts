/**
 * Authentication Controller
 *
 * Handles:
 * - User login via Solana wallet signature
 * - Admin login via username/password
 * - Token generation
 * - Nonce management
 */

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { prisma } from '../config/database';
import { verifyWalletSignature, generateSignatureMessage, isValidSolanaAddress } from '../services/solana.service';
import { LoginResponse, AdminLoginResponse } from '../types';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config/constants';
import pino from 'pino';

const logger = pino({ name: 'auth-controller' });

// In-memory nonce storage (use Redis in production)
const nonces = new Map<string, { nonce: string; expiresAt: Date }>();

// Clean expired nonces every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [key, value] of nonces.entries()) {
    if (value.expiresAt < now) {
      nonces.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * GET /api/auth/nonce
 * Generate nonce for wallet signature
 */
export async function getNonce(req: Request, res: Response): Promise<void> {
  try {
    const { walletAddress } = req.query;

    if (!walletAddress || typeof walletAddress !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Wallet address is required'
      });
      return;
    }

    if (!isValidSolanaAddress(walletAddress)) {
      res.status(400).json({
        success: false,
        message: 'Invalid Solana wallet address'
      });
      return;
    }

    // Generate random nonce
    const nonce = randomBytes(32).toString('hex');

    // Store nonce with 5 minute expiration
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    nonces.set(walletAddress, { nonce, expiresAt });

    // Generate message to sign
    const message = generateSignatureMessage(nonce);

    res.json({
      success: true,
      data: {
        nonce,
        message,
        expiresAt
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to generate nonce');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * POST /api/auth/login
 * Login with Solana wallet signature
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      res.status(400).json({
        success: false,
        message: 'Wallet address and signature are required'
      });
      return;
    }

    // Get stored nonce
    const stored = nonces.get(walletAddress);
    if (!stored) {
      res.status(400).json({
        success: false,
        message: 'Nonce not found or expired. Please request a new nonce.'
      });
      return;
    }

    // Check if nonce expired
    if (stored.expiresAt < new Date()) {
      nonces.delete(walletAddress);
      res.status(400).json({
        success: false,
        message: 'Nonce expired. Please request a new nonce.'
      });
      return;
    }

    // Verify signature
    const message = generateSignatureMessage(stored.nonce);
    const isValid = verifyWalletSignature(walletAddress, signature, message);

    if (!isValid) {
      res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_SIGNATURE
      });
      return;
    }

    // Delete used nonce
    nonces.delete(walletAddress);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress,
          role: 'USER',
          isActive: true,
          lastLoginAt: new Date()
        }
      });
      logger.info({ walletAddress }, 'New user created');
    } else {
      // Update last login
      user = await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });
    }

    // Generate JWT
    // @ts-expect-error - JWT type definitions have overload resolution issues
    const token = jwt.sign(
      {
        userId: user.id,
        walletAddress: user.walletAddress,
        role: user.role
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );

    const response: LoginResponse = {
      success: true,
      token,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username || undefined,
        email: user.email || undefined
      }
    };

    res.json(response);
  } catch (error) {
    logger.error({ error }, 'Login failed');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * POST /api/auth/admin/login
 * Admin login with username/password
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

    // Find admin user
    const admin = await prisma.adminUser.findUnique({
      where: { username }
    });

    if (!admin || !admin.isActive) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);

    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
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

    // Generate JWT
    // @ts-expect-error - JWT type definitions have overload resolution issues
    const token = jwt.sign(
      {
        adminId: admin.id,
        username: admin.username,
        role: admin.role
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );

    const response: AdminLoginResponse = {
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    };

    res.json(response);
  } catch (error) {
    logger.error({ error }, 'Admin login failed');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/auth/me
 * Get current user info
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        walletAddress: true,
        username: true,
        email: true,
        avatarUrl: true,
        role: true,
        totalInvested: true,
        totalEarnedUSDT: true,
        totalMinedTAKARA: true,
        createdAt: true,
        lastLoginAt: true
      }
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get current user');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

export default {
  getNonce,
  login,
  adminLogin,
  getCurrentUser
};
