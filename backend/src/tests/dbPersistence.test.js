/**
 * ============================================================
 * DATA PERSISTENCE & STRICT DATABASE DURABILITY TEST SUITE
 * Verifies Option A enterprise requirements:
 * 1. Offline unit test resilience (dual-mode in dev/test).
 * 2. Strict production enforcement: blocks silent in-memory/JSON
 *    fallbacks, returning structured HTTP 503 DatabaseUnavailableError.
 * 3. Kubernetes / load-balancer readiness probe fail-fast.
 * ============================================================
 */

const request = require('supertest');
const app = require('../app');
const { withDb, isStrictDbMode, DatabaseUnavailableError } = require('../utils/dbPolicy');

const ADMIN_HEADERS = { 'x-api-key': 'admin-key-123' };

describe('Option A: Data Persistence & Strict Database Durability', () => {
  const originalStrict = process.env.STRICT_DB_MODE;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.STRICT_DB_MODE = originalStrict;
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('1. Dual-Mode Fallback in Test / Development Mode', () => {
    beforeEach(() => {
      delete process.env.STRICT_DB_MODE;
      process.env.NODE_ENV = 'test';
    });

    it('isStrictDbMode() should evaluate to false in test environment', () => {
      expect(isStrictDbMode()).toBe(false);
    });

    it('withDb() should transparently invoke fallback function when DB is offline', async () => {
      const fallbackSpy = jest.fn(() => ({ data: 'offline_fallback' }));
      const result = await withDb(
        async () => { throw new Error('DB Connection Refused'); },
        fallbackSpy
      );
      expect(fallbackSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ data: 'offline_fallback' });
    });

    it('GET /api/leads should succeed with 200 via in-memory/resilient store', async () => {
      const res = await request(app).get('/api/leads').set(ADMIN_HEADERS);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('leads');
      expect(Array.isArray(res.body.leads)).toBe(true);
    });

    it('GET /api/employees should succeed with 200 via safe file/mock store', async () => {
      const res = await request(app).get('/api/employees').set(ADMIN_HEADERS);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('employees');
      expect(res.body).toHaveProperty('summary');
    });

    it('GET /api/inventory should succeed with 200 via local fallback', async () => {
      const res = await request(app).get('/api/inventory').set(ADMIN_HEADERS);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('inventory');
      expect(res.body.success).toBe(true);
    });

    it('GET /api/invoices should succeed with 200 via local store', async () => {
      const res = await request(app).get('/api/invoices').set(ADMIN_HEADERS);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('invoices');
    });
  });

  describe('2. Strict Production Mode Durability Enforcement (STRICT_DB_MODE=true)', () => {
    beforeEach(() => {
      process.env.STRICT_DB_MODE = 'true';
    });

    it('isStrictDbMode() should evaluate to true when STRICT_DB_MODE=true', () => {
      expect(isStrictDbMode()).toBe(true);
    });

    it('withDb() must reject with DatabaseUnavailableError without calling fallback', async () => {
      const fallbackSpy = jest.fn(() => ({ data: 'silent_fallback' }));

      await expect(
        withDb(async () => { throw new Error('Postgres down'); }, fallbackSpy)
      ).rejects.toThrow(DatabaseUnavailableError);

      expect(fallbackSpy).not.toHaveBeenCalled();
    });

    it('GET /api/health/ready must fail-fast with HTTP 503 when DB is offline', async () => {
      const res = await request(app).get('/api/health/ready');
      expect(res.status).toBe(503);
      expect(res.body.ready).toBe(false);
      expect(res.body.reason).toBe('DATABASE_DISCONNECTED');
    });

    it('GET /api/leads must fail-fast with HTTP 503 and Retry-After header', async () => {
      const res = await request(app).get('/api/leads').set(ADMIN_HEADERS);
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('DATABASE_UNAVAILABLE');
      expect(res.headers['retry-after']).toBe('5');
    });

    it('POST /api/leads must refuse uncommitted in-memory writes with HTTP 503', async () => {
      const res = await request(app)
        .post('/api/leads')
        .set(ADMIN_HEADERS)
        .send({
          name: 'Critical Enterprise Buyer',
          phone: '+91 99887 76655',
          company: 'Indore Engineering Works',
          interest: 'Automatic Paper Plate Machine'
        });

      expect(res.status).toBe(503);
      expect(res.body.code).toBe('DATABASE_UNAVAILABLE');
      expect(res.headers['retry-after']).toBe('5');
    });

    it('GET /api/employees must return HTTP 503 instead of silent JSON file reading', async () => {
      const res = await request(app).get('/api/employees').set(ADMIN_HEADERS);
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('DATABASE_UNAVAILABLE');
      expect(res.headers['retry-after']).toBe('5');
    });

    it('POST /api/employees must refuse write without PostgreSQL transaction with HTTP 503', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set(ADMIN_HEADERS)
        .send({
          name: 'Production Associate',
          email: 'prod.assoc@aps-enterprise.com',
          role: 'Operations'
        });

      expect(res.status).toBe(503);
      expect(res.body.code).toBe('DATABASE_UNAVAILABLE');
      expect(res.headers['retry-after']).toBe('5');
    });

    it('GET /api/inventory must fail-fast with HTTP 503 rather than serving local JSON', async () => {
      const res = await request(app).get('/api/inventory').set(ADMIN_HEADERS);
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('DATABASE_UNAVAILABLE');
      expect(res.headers['retry-after']).toBe('5');
    });

    it('POST /api/inventory must fail-fast with HTTP 503 in strict mode', async () => {
      const res = await request(app)
        .post('/api/inventory')
        .set(ADMIN_HEADERS)
        .send({
          sku: 'APS-TEST-99',
          name: 'Hydraulic Press Machine',
          category: 'Machinery',
          totalStock: 5,
          unitPrice: 250000
        });

      expect(res.status).toBe(503);
      expect(res.body.code).toBe('DATABASE_UNAVAILABLE');
      expect(res.headers['retry-after']).toBe('5');
    });

    it('GET /api/invoices must fail-fast with HTTP 503 in strict mode', async () => {
      const res = await request(app).get('/api/invoices').set(ADMIN_HEADERS);
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('DATABASE_UNAVAILABLE');
      expect(res.headers['retry-after']).toBe('5');
    });

    it('POST /api/invoices must fail-fast with HTTP 503 when DB is offline', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set(ADMIN_HEADERS)
        .send({
          clientName: 'Tata Steel Indore',
          product: 'APS-HYD-500',
          baseAmount: 150000
        });

      expect(res.status).toBe(503);
      expect(res.body.code).toBe('DATABASE_UNAVAILABLE');
      expect(res.headers['retry-after']).toBe('5');
    });
  });
});
