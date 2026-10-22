/**
 * ============================================================
 * PHASE 4: RESILIENCE, OBSERVABILITY & ERROR HANDLING TEST SUITE
 * Tests:
 *   - Enhanced /api/health diagnostics (uptime, memory, database, modules)
 *   - 404 catch-all handler for unmatched routes
 *   - Centralized error handler & AppError behavior
 *   - Winston logger initialization & structured output
 * ============================================================
 */

const request = require('supertest');
const app = require('../app');
const { logger } = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

const ADMIN_HEADERS = { 'x-api-key': 'admin-key-123' };

describe('Phase 4: Observability, Resilience & Error Handling', () => {

  describe('GET /api/health — Deep Observability Diagnostics', () => {
    it('should return 200 with healthy status and metadata', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptimeSeconds');
      expect(typeof res.body.uptimeSeconds).toBe('number');
      expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it('should return accurate process memory usage metrics', async () => {
      const res = await request(app).get('/api/health');
      expect(res.body).toHaveProperty('memory');
      const { memory } = res.body;
      expect(memory).toHaveProperty('heapUsedMB');
      expect(memory).toHaveProperty('heapTotalMB');
      expect(memory).toHaveProperty('rssMB');
      expect(typeof memory.heapUsedMB).toBe('number');
      expect(memory.heapUsedMB).toBeGreaterThan(0);
    });

    it('should report database connection health', async () => {
      const res = await request(app).get('/api/health');
      expect(res.body).toHaveProperty('database');
      expect(res.body.database).toHaveProperty('status');
      expect(res.body.database).toHaveProperty('connected');
      expect(typeof res.body.database.connected).toBe('boolean');
    });

    it('should declare all 5 enterprise core modules', async () => {
      const res = await request(app).get('/api/health');
      expect(res.body).toHaveProperty('modules');
      expect(Array.isArray(res.body.modules)).toBe(true);
      expect(res.body.modules.length).toBe(5);
      expect(res.body.modules.some(m => m.includes('A1'))).toBe(true);
      expect(res.body.modules.some(m => m.includes('A2'))).toBe(true);
      expect(res.body.modules.some(m => m.includes('A3'))).toBe(true);
      expect(res.body.modules.some(m => m.includes('A4'))).toBe(true);
      expect(res.body.modules.some(m => m.includes('A5'))).toBe(true);
    });
  });

  describe('404 Unmatched Route Handler', () => {
    it('should return 404 RESOURCE_NOT_FOUND for non-existent GET endpoints', async () => {
      const res = await request(app)
        .get('/api/this-endpoint-does-not-exist')
        .set(ADMIN_HEADERS);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('Resource Not Found');
      expect(res.body.code).toBe('RESOURCE_NOT_FOUND');
      expect(res.body.message).toContain('Cannot GET');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('should return 404 RESOURCE_NOT_FOUND for non-existent POST endpoints', async () => {
      const res = await request(app)
        .post('/api/unknown/action')
        .set(ADMIN_HEADERS)
        .send({ test: true });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('RESOURCE_NOT_FOUND');
      expect(res.body.message).toContain('Cannot POST');
    });
  });

  describe('Centralized AppError & Exception Handling', () => {
    it('AppError class should instantiate correctly with status and code', () => {
      const err = new AppError('Payment voucher missing', 402, 'VOUCHER_MISSING', { voucherId: 'V123' });
      expect(err.message).toBe('Payment voucher missing');
      expect(err.statusCode).toBe(402);
      expect(err.code).toBe('VOUCHER_MISSING');
      expect(err.details).toEqual({ voucherId: 'V123' });
      expect(err.isOperational).toBe(true);
    });

    it('Winston logger instance should execute without errors', () => {
      expect(() => {
        logger.info('Test resilience log message', { traceId: 'test-123' });
        logger.warn('Test warning log message');
        logger.error('Test error log message', new Error('Simulated test error'));
      }).not.toThrow();
    });
  });

  describe('Cloud Probes & Prometheus Observability', () => {
    it('GET /api/health/live should return 200 UP', async () => {
      const res = await request(app).get('/api/health/live');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
    });

    it('GET /api/health/ready should return 200 READY', async () => {
      const res = await request(app).get('/api/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('READY');
      expect(res.body).toHaveProperty('database');
    });

    it('GET /api/metrics should return Prometheus metrics with 200', async () => {
      const res = await request(app).get('/api/metrics');
      expect(res.status).toBe(200);
      expect(res.text).toContain('process_uptime_seconds');
      expect(res.text).toContain('nodejs_heap_size_used_bytes');
      expect(res.text).toContain('aps_database_connected');
    });

    it('should inject X-Request-Id correlation header on responses', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers).toHaveProperty('x-request-id');
      expect(res.headers['x-request-id']).toMatch(/^req-/);
    });
  });

  describe('Pillar 4: Background Job Queue Subsystem', () => {
    it('should enqueue and execute background job with progress reporting', async () => {
      const queueManager = require('../services/queueService');
      const testQueue = queueManager.getQueue('TEST_BATCH_JOB');
      let executed = false;

      testQueue.process(async (job, progress) => {
        progress(50);
        executed = true;
        progress(100);
        return { success: true };
      });

      const job = await queueManager.addJob('TEST_BATCH_JOB', { test: true }, { priority: 'High' });
      expect(job).toHaveProperty('id');
      expect(['queued', 'active', 'completed']).toContain(job.status);

      await new Promise(r => setTimeout(r, 100));
      expect(executed).toBe(true);

      const metrics = queueManager.getAllMetrics();
      expect(metrics).toHaveProperty('engine');
      expect(metrics.queues).toHaveProperty('TEST_BATCH_JOB');
    });
  });

});
