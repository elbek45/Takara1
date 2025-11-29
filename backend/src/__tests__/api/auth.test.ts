/**
 * Authentication API Tests
 * Tests for /api/auth endpoints
 */

import request from 'supertest';
import app from '../../app';
import { cleanDatabase, createTestUser, generateTestToken, generateExpiredToken, disconnectPrisma } from '../helpers/testUtils';
import { mockUsers } from '../helpers/mockData';
import { UserRole } from '@prisma/client';

describe('Authentication API', () => {
  beforeAll(async () => {
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  // ==================== REGISTRATION TESTS ====================

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(mockUsers.validUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(mockUsers.validUser.email);
      expect(response.body.user.username).toBe(mockUsers.validUser.username);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject registration with duplicate email', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(mockUsers.validUser);

      // Try to create second user with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(mockUsers.validUser);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/email.*already.*exists/i);
    });

    it('should reject registration with duplicate username', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(mockUsers.validUser);

      // Try with same username but different email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...mockUsers.validUser,
          email: 'different@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/username.*already.*exists/i);
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(mockUsers.weakPassword);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/password/i);
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(mockUsers.invalidEmail);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/email/i);
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' }); // Missing password and username

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  // ==================== LOGIN TESTS ====================

  describe('POST /api/auth/login-password', () => {
    beforeEach(async () => {
      // Create test user before each login test
      await request(app)
        .post('/api/auth/register')
        .send(mockUsers.validUser);
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login-password')
        .send({
          email: mockUsers.validUser.email,
          password: mockUsers.validUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(mockUsers.validUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login-password')
        .send({
          email: mockUsers.validUser.email,
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid.*credentials/i);
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login-password')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid.*credentials/i);
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login-password')
        .send({ email: mockUsers.validUser.email }); // Missing password

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should login using username instead of email', async () => {
      const response = await request(app)
        .post('/api/auth/login-password')
        .send({
          username: mockUsers.validUser.username,
          password: mockUsers.validUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.username).toBe(mockUsers.validUser.username);
    });
  });

  // ==================== JWT TOKEN TESTS ====================

  describe('GET /api/auth/me', () => {
    let userId: string;
    let validToken: string;

    beforeEach(async () => {
      const user = await createTestUser({
        email: 'authme@example.com',
        username: 'authmeuser',
      });
      userId = user.id;
      validToken = generateTestToken(userId);
    });

    it('should return user data with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.id).toBe(userId);
      expect(response.body.user.email).toBe('authme@example.com');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/token.*required/i);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid.*token/i);
    });

    it('should reject request with expired token', async () => {
      const expiredToken = generateExpiredToken(userId);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/token.*expired/i);
    });

    it('should reject request with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', validToken); // Missing 'Bearer' prefix

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  // ==================== WALLET CONNECTION TESTS ====================

  describe('POST /api/auth/connect-ethereum', () => {
    let userId: string;
    let validToken: string;

    beforeEach(async () => {
      const user = await createTestUser({
        email: 'ethereum@example.com',
        username: 'ethereumuser',
      });
      userId = user.id;
      validToken = generateTestToken(userId);
    });

    it('should connect Ethereum wallet successfully', async () => {
      const ethereumAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';

      const response = await request(app)
        .post('/api/auth/connect-ethereum')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ ethereumAddress });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.ethereumAddress).toBe(ethereumAddress.toLowerCase());
    });

    it('should reject invalid Ethereum address', async () => {
      const response = await request(app)
        .post('/api/auth/connect-ethereum')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ ethereumAddress: 'invalid-address' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid.*ethereum.*address/i);
    });

    it('should reject already connected Ethereum address', async () => {
      const ethereumAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';

      // First connection
      await request(app)
        .post('/api/auth/connect-ethereum')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ ethereumAddress });

      // Try to connect same address to another user
      const anotherUser = await createTestUser({
        email: 'another@example.com',
        username: 'anotheruser',
      });
      const anotherToken = generateTestToken(anotherUser.id);

      const response = await request(app)
        .post('/api/auth/connect-ethereum')
        .set('Authorization', `Bearer ${anotherToken}`)
        .send({ ethereumAddress });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/already.*connected/i);
    });
  });

  describe('POST /api/auth/connect-solana', () => {
    let userId: string;
    let validToken: string;

    beforeEach(async () => {
      const user = await createTestUser({
        email: 'solana@example.com',
        username: 'solanauser',
      });
      userId = user.id;
      validToken = generateTestToken(userId);
    });

    it('should connect Solana wallet successfully', async () => {
      const walletAddress = '7xKWvfqJQRnJGZJz3xKGGMqCJpqjhqjJzXqZ9vF9qYnJ';

      const response = await request(app)
        .post('/api/auth/connect-solana')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ walletAddress });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.walletAddress).toBe(walletAddress);
    });

    it('should reject invalid Solana address', async () => {
      const response = await request(app)
        .post('/api/auth/connect-solana')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ walletAddress: 'invalid-solana-address' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid.*solana.*address/i);
    });

    it('should reject already connected Solana address', async () => {
      const walletAddress = '7xKWvfqJQRnJGZJz3xKGGMqCJpqjhqjJzXqZ9vF9qYnJ';

      // First connection
      await request(app)
        .post('/api/auth/connect-solana')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ walletAddress });

      // Try to connect same address to another user
      const anotherUser = await createTestUser({
        email: 'another2@example.com',
        username: 'anotheruser2',
      });
      const anotherToken = generateTestToken(anotherUser.id);

      const response = await request(app)
        .post('/api/auth/connect-solana')
        .set('Authorization', `Bearer ${anotherToken}`)
        .send({ walletAddress });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/already.*connected/i);
    });
  });

  // ==================== ADMIN LOGIN TESTS ====================

  describe('POST /api/auth/admin/login', () => {
    beforeEach(async () => {
      await createTestUser({
        email: mockUsers.adminUser.email,
        username: mockUsers.adminUser.username,
        role: UserRole.ADMIN,
      });
    });

    it('should login admin successfully', async () => {
      const response = await request(app)
        .post('/api/auth/admin/login')
        .send({
          email: mockUsers.adminUser.email,
          password: mockUsers.adminUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.role).toBe(UserRole.ADMIN);
    });

    it('should reject non-admin user login to admin endpoint', async () => {
      await createTestUser({
        email: 'regularuser@example.com',
        username: 'regularuser',
        role: UserRole.USER,
      });

      const response = await request(app)
        .post('/api/auth/admin/login')
        .send({
          email: 'regularuser@example.com',
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/admin.*access/i);
    });
  });

  // ==================== RATE LIMITING TESTS ====================

  describe('Rate Limiting', () => {
    it('should rate limit excessive login attempts', async () => {
      // Create user
      await request(app)
        .post('/api/auth/register')
        .send(mockUsers.validUser);

      // Make many login attempts
      const requests = Array(150).fill(null).map(() =>
        request(app)
          .post('/api/auth/login-password')
          .send({
            email: mockUsers.validUser.email,
            password: 'WrongPassword123!'
          })
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited (429)
      const rateLimitedRequests = responses.filter(r => r.status === 429);
      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    }, 30000); // Increase timeout for this test
  });
});
