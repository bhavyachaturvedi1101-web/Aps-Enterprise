/**
 * ============================================================
 * PHASE 5: SECURITY, AUTHENTICATION & SECRETS HARDENING TEST SUITE
 * Verifies strict cryptographic entropy, timing-safe evaluation,
 * rejection of default master keys, and production gates.
 * ============================================================
 */

const { validateSecurityConfig, isWeakKey } = require('../config/envValidator');
const { timingSafeCompare, matchApiKey } = require('../middleware/authMiddleware');
const request = require('supertest');
const app = require('../app');
const jwt = require('jsonwebtoken');

describe('Security & Secrets Hardening Verification', () => {

  describe('1. Environment & Cryptographic Secrets Validator', () => {
    it('should identify known weak default keys', () => {
      expect(isWeakKey('admin-key-123')).toBe(true);
      expect(isWeakKey('supersecret_aps_key_2026')).toBe(true);
      expect(isWeakKey('admin123')).toBe(true);
      expect(isWeakKey('aps2026')).toBe(true);
      expect(isWeakKey('short')).toBe(true);
      expect(isWeakKey('a9f4c3b2e1d0f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3')).toBe(false);
    });

    it('should fail production validation when weak JWT_SECRET is supplied', () => {
      const mockEnv = {
        NODE_ENV: 'production',
        API_KEY: 'a9f4c3b2e1d0f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3',
        JWT_SECRET: 'supersecret_aps_key_2026',
        ADMIN_PASSWORD: 'StrongCustomAdminPassword!2026'
      };

      const result = validateSecurityConfig(mockEnv);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('JWT_SECRET'))).toBe(true);
    });

    it('should fail production validation when default API_KEY is supplied', () => {
      const mockEnv = {
        NODE_ENV: 'production',
        API_KEY: 'admin-key-123',
        JWT_SECRET: 'a9f4c3b2e1d0f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3',
        ADMIN_PASSWORD: 'StrongCustomAdminPassword!2026'
      };

      const result = validateSecurityConfig(mockEnv);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('API_KEY'))).toBe(true);
    });

    it('should pass production validation when high-entropy 256-bit keys are supplied', () => {
      const mockEnv = {
        NODE_ENV: 'production',
        API_KEY: 'c7b5a3e1f9d2a4b6c8e0f1a3d5b7c9e1f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2',
        JWT_SECRET: 'f1a3d5b7c9e1f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2c7b5a3e1f9d2a4b6c8e0',
        ADMIN_PASSWORD: 'HighEntropyProdPassword!2026'
      };

      const result = validateSecurityConfig(mockEnv);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('2. Timing-Safe Constant Time Verification', () => {
    it('should accurately match identical strings with constant time evaluation', () => {
      const keyA = 'a-very-long-secret-key-for-admin-panel-98234';
      const keyB = 'a-very-long-secret-key-for-admin-panel-98234';
      expect(timingSafeCompare(keyA, keyB)).toBe(true);
    });

    it('should accurately reject mismatched strings', () => {
      const keyA = 'a-very-long-secret-key-for-admin-panel-98234';
      const keyB = 'a-very-long-secret-key-for-admin-panel-98235';
      expect(timingSafeCompare(keyA, keyB)).toBe(false);
      expect(timingSafeCompare(keyA, null)).toBe(false);
      expect(timingSafeCompare('', 'abc')).toBe(false);
    });

    it('should resolve known API keys accurately without timing leaks', () => {
      const currentApiKey = process.env.API_KEY || 'admin-key-123';
      const matched = matchApiKey(currentApiKey);
      expect(matched).toBeTruthy();
      expect(matched.role).toBe('admin');

      const invalidMatch = matchApiKey('completely-bogus-attacker-key');
      expect(invalidMatch).toBeNull();
    });
  });

  describe('3. API Authentication & Token Boundary Enforcement', () => {
    it('should reject requests with invalid Bearer JWT signatures with 401', async () => {
      const forgedToken = jwt.sign(
        { id: 'hacker', role: 'admin' },
        'wrong_attacker_secret_key_123',
        { algorithm: 'HS256' }
      );

      const res = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('should reject requests with unrecognized x-api-key with 401', async () => {
      const res = await request(app)
        .get('/api/leads')
        .set('x-api-key', 'unauthorized-key-attempt');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_API_KEY');
    });

    it('should accept valid x-api-key and grant authenticated access', async () => {
      const currentApiKey = process.env.API_KEY || 'admin-key-123';
      const res = await request(app)
        .get('/api/leads')
        .set('x-api-key', currentApiKey);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('leads');
    });
  });

  describe('4. Operator Login & Password Hardening', () => {
    it('should block logins with empty credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MISSING_CREDENTIALS');
    });

    it('should reject invalid credentials with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@apsenterprises.in',
          password: 'IncorrectAttackerPassword123'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid Credentials');
    });
  });

});
