/**
 * Authentication Routes
 */

import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/nonce', authController.getNonce);
router.post('/login', authController.login);
router.post('/register', authController.registerWithPassword);
router.post('/login-password', authController.loginWithPassword);
router.post('/admin/login', authController.adminLogin);

// Protected routes
router.get('/me', authenticateUser, authController.getCurrentUser);

export default router;
