/**
 * Auth Middleware Unit Tests
 *
 * Tests for JWT authentication, user/admin verification, and RBAC
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateUser, authenticateAdmin, requireSuperAdmin, optionalAuth } from '../../middleware/auth.middleware';
import { prisma } from '../../config/database';
import { AuthenticatedRequest, AdminRequest } from '../../types';

// Mock Prisma
jest.mock('../../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    adminUser: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  beforeEach(() => {
    mockRequest = {
      headers: {},
      ip: '127.0.0.1',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    nextFunction = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('authenticateUser', () => {
    it('should authenticate user with valid token', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        isActive: true,
      };

      const token = jwt.sign({ userId, type: 'user' }, JWT_SECRET, { expiresIn: '7d' });
      mockRequest.headers = { authorization: `Bearer ${token}` };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { lastLoginAt: expect.any(Date) },
      });

      expect((mockRequest as AuthenticatedRequest).user).toEqual(mockUser);
      expect((mockRequest as AuthenticatedRequest).userId).toBe(userId);
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Unauthorized'),
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject malformed authorization header', async () => {
      mockRequest.headers = { authorization: 'InvalidFormat' };

      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject invalid JWT token', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid.token.here' };

      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject expired JWT token', async () => {
      const userId = 'user-123';
      const token = jwt.sign({ userId, type: 'user' }, JWT_SECRET, { expiresIn: '-1s' });
      mockRequest.headers = { authorization: `Bearer ${token}` };

      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token expired',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject if user not found', async () => {
      const userId = 'non-existent-user';
      const token = jwt.sign({ userId, type: 'user' }, JWT_SECRET, { expiresIn: '7d' });
      mockRequest.headers = { authorization: `Bearer ${token}` };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject inactive user', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        isActive: false, // Inactive
      };

      const token = jwt.sign({ userId, type: 'user' }, JWT_SECRET, { expiresIn: '7d' });
      mockRequest.headers = { authorization: `Bearer ${token}` };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const userId = 'user-123';
      const token = jwt.sign({ userId, type: 'user' }, JWT_SECRET, { expiresIn: '7d' });
      mockRequest.headers = { authorization: `Bearer ${token}` };

      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Internal'),
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('authenticateAdmin', () => {
    it('should authenticate admin with valid token', async () => {
      const adminId = 'admin-123';
      const mockAdmin = {
        id: adminId,
        username: 'admin',
        email: 'admin@takara.com',
        role: 'ADMIN',
        isActive: true,
      };

      const token = jwt.sign({ adminId, type: 'admin', role: 'ADMIN' }, JWT_SECRET, { expiresIn: '7d' });
      mockRequest.headers = { authorization: `Bearer ${token}` };

      (prisma.adminUser.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.adminUser.update as jest.Mock).mockResolvedValue(mockAdmin);

      await authenticateAdmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(prisma.adminUser.findUnique).toHaveBeenCalledWith({
        where: { id: adminId },
      });

      expect(prisma.adminUser.update).toHaveBeenCalledWith({
        where: { id: adminId },
        data: {
          lastLoginAt: expect.any(Date),
          lastLoginIP: '127.0.0.1',
        },
      });

      expect((mockRequest as AdminRequest).admin).toEqual(mockAdmin);
      expect((mockRequest as AdminRequest).adminId).toBe(adminId);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      await authenticateAdmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject invalid admin token', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid.token' };

      await authenticateAdmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token',
      });
    });

    it('should reject if admin not found', async () => {
      const adminId = 'non-existent-admin';
      const token = jwt.sign({ adminId, type: 'admin', role: 'ADMIN' }, JWT_SECRET);
      mockRequest.headers = { authorization: `Bearer ${token}` };

      (prisma.adminUser.findUnique as jest.Mock).mockResolvedValue(null);

      await authenticateAdmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject inactive admin', async () => {
      const adminId = 'admin-123';
      const mockAdmin = {
        id: adminId,
        username: 'admin',
        isActive: false,
      };

      const token = jwt.sign({ adminId, type: 'admin' }, JWT_SECRET);
      mockRequest.headers = { authorization: `Bearer ${token}` };

      (prisma.adminUser.findUnique as jest.Mock).mockResolvedValue(mockAdmin);

      await authenticateAdmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('requireSuperAdmin', () => {
    it('should allow SUPER_ADMIN to proceed', async () => {
      (mockRequest as AdminRequest).admin = {
        id: 'admin-123',
        role: 'SUPER_ADMIN',
      } as any;

      await requireSuperAdmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject regular ADMIN', async () => {
      (mockRequest as AdminRequest).admin = {
        id: 'admin-123',
        role: 'ADMIN',
      } as any;

      await requireSuperAdmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access forbidden',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject if no admin attached', async () => {
      await requireSuperAdmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should attach user if valid token provided', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        isActive: true,
      };

      const token = jwt.sign({ userId, type: 'user' }, JWT_SECRET);
      mockRequest.headers = { authorization: `Bearer ${token}` };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect((mockRequest as AuthenticatedRequest).user).toEqual(mockUser);
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should proceed without error if no token provided', async () => {
      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect((mockRequest as AuthenticatedRequest).user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should proceed without error if invalid token provided', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid.token' };

      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect((mockRequest as AuthenticatedRequest).user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should not attach inactive user', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        isActive: false,
      };

      const token = jwt.sign({ userId, type: 'user' }, JWT_SECRET);
      mockRequest.headers = { authorization: `Bearer ${token}` };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect((mockRequest as AuthenticatedRequest).user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should proceed even if database error occurs', async () => {
      const userId = 'user-123';
      const token = jwt.sign({ userId, type: 'user' }, JWT_SECRET);
      mockRequest.headers = { authorization: `Bearer ${token}` };

      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('Token Extraction', () => {
    it('should extract Bearer token correctly', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        isActive: true,
      };

      const token = jwt.sign({ userId }, JWT_SECRET);
      mockRequest.headers = { authorization: `Bearer ${token}` };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle authorization with extra spaces', async () => {
      mockRequest.headers = { authorization: '  Bearer   token  ' };

      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Should fail due to invalid format
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should reject non-Bearer schemes', async () => {
      mockRequest.headers = { authorization: 'Basic dXNlcjpwYXNz' };

      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
