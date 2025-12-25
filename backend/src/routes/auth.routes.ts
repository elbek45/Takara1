/**
 * Authentication Routes
 */

import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticateUser } from '../middleware/auth.middleware';
import { nonceLimiter, apiLimiter, adminLoginLimiter } from '../middleware/rateLimiter.middleware';
import { validateBody, validateQuery } from '../middleware/validate.middleware';
import {
  GetNonceSchema,
  WalletLoginSchema,
  RegisterSchema,
  PasswordLoginSchema,
  AdminLoginSchema,
  ConnectSolanaSchema,
  ConnectTronSchema,
} from '../validators/auth.validators';

const router = Router();

// Public routes
router.get('/nonce', nonceLimiter, validateQuery(GetNonceSchema), authController.getNonce);
router.post('/login', apiLimiter, validateBody(WalletLoginSchema), authController.login);
router.post('/register', apiLimiter, validateBody(RegisterSchema), authController.registerWithPassword);
router.post('/login-password', apiLimiter, validateBody(PasswordLoginSchema), authController.loginWithPassword);
router.post('/admin/login', adminLoginLimiter, validateBody(AdminLoginSchema), authController.adminLogin);

// Protected routes
router.get('/me', authenticateUser, authController.getCurrentUser);
router.post('/connect-solana', authenticateUser, validateBody(ConnectSolanaSchema), authController.connectSolana);
router.post('/connect-tron', authenticateUser, validateBody(ConnectTronSchema), authController.connectTron);

export default router;
