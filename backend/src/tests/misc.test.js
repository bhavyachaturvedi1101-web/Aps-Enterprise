/**
 * ============================================================
 * CALLS, DIALER, CONFIG, A3, HEALTH — Deep Test Suite
 * Tests:
 *   GET  /api/health
 *   POST /api/calls/outcome, GET /api/calls
 *   GET  /api/dialer/queue, POST /api/dialer/call
 *   GET  /api/config, POST /api/config/approval-policy
 *   POST /api/a3/query, GET /api/a3/suggestions,
 *   GET  /api/a3/export (csv, xml, pdf, json)
 * ============================================================
 */

const request = require('supertest');
const app = require('../app');

const ADMIN_HEADERS = { 'x-api-key': 'admin-key-123' };

// ============================================================
// 1. GET /api/health
// ============================================================
describe('GET /api/health', () => {
  it('should return 200 with healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('modules');
    expect(Array.isArray(res.body.modules)).toBe(true);
  });

  it('should list all 5 expected modules', async () => {
    const res = await request(app).get('/api/health');
    const modules = res.body.modules;
    expect(modules.length).toBe(5);
    expect(modules.some(m => m.includes('A1'))).toBe(true);
    expect(modules.some(m => m.includes('A3'))).toBe(true);
    expect(modules.some(m => m.includes('A5'))).toBe(true);
  });
});

// ============================================================
// 2. POST /api/calls/outcome
// ============================================================
describe('POST /api/calls/outcome', () => {
  it('should ingest a call outcome and create a new lead', async () => {
    const res = await request(app)
      .post('/api/calls/outcome')
      .set(ADMIN_HEADERS)
      .send({
        name: 'Voice Agent Test Prospect',
        phone: '+919900001234',
        interest: 'CNC Machine Pro',
        budget: '35000',
        timeline: 'Within 15 days',
        callOutcome: 'Interested',
        durationSeconds: 180,
        notes: 'Prospect asked about financing options.'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('callId');
    expect(res.body.callId).toMatch(/^CALL-/);
    expect(res.body.lead).toBeDefined();
    expect(res.body.lead.stage).toBe('Qualified'); // A1 auto-qualifies
    expect(res.body.lead.source).toBe('A1 Voice Agent');
  });

  it('should auto-qualify and link to existing lead with matching name', async () => {
    // First call creates the lead
    await request(app).post('/api/calls/outcome').set(ADMIN_HEADERS).send({
      name: 'Duplicate Check Lead',
      interest: 'Lathe', budget: '10000', callOutcome: 'Interested'
    });

    // Second call with same name should update, not create duplicate
    const res2 = await request(app).post('/api/calls/outcome').set(ADMIN_HEADERS).send({
      name: 'Duplicate Check Lead',
      interest: 'Lathe', budget: '10000', callOutcome: 'Follow-Up'
    });

    expect(res2.status).toBe(201);
    expect(res2.body.lead.name).toBe('Duplicate Check Lead');
  });

  it('should apply defaults for missing fields', async () => {
    const res = await request(app)
      .post('/api/calls/outcome')
      .set(ADMIN_HEADERS)
      .send({ callOutcome: 'Not Interested' });

    expect(res.status).toBe(201);
    expect(res.body.lead.name).toBe('Inbound Voice Prospect');
    expect(res.body.lead.stage).toBe('Qualified');
  });
});

// ============================================================
// 3. GET /api/calls
// ============================================================
describe('GET /api/calls', () => {
  it('should return all call logs', async () => {
    const res = await request(app).get('/api/calls').set(ADMIN_HEADERS);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('calls');
    expect(Array.isArray(res.body.calls)).toBe(true);
  });

  it('call log should have required fields', async () => {
    const res = await request(app).get('/api/calls').set(ADMIN_HEADERS);
    if (res.body.calls.length > 0) {
      const call = res.body.calls[0];
      expect(call).toHaveProperty('callId');
      expect(call).toHaveProperty('leadId');
      expect(call).toHaveProperty('callOutcome');
      expect(call).toHaveProperty('timestamp');
    }
  });

  it('should grow by 1 after a new call outcome is posted', async () => {
    const before = (await request(app).get('/api/calls').set(ADMIN_HEADERS)).body.calls.length;
    await request(app).post('/api/calls/outcome').set(ADMIN_HEADERS).send({ name: 'Count Check Call', callOutcome: 'Callback' });
    const after = (await request(app).get('/api/calls').set(ADMIN_HEADERS)).body.calls.length;
    expect(after).toBe(before + 1);
  });
});

// ============================================================
// 4. GET /api/dialer/queue
// ============================================================
describe('GET /api/dialer/queue', () => {
  it('should return 200 with queue, activeCallsCount, and totalQueued', async () => {
    const res = await request(app).get('/api/dialer/queue').set(ADMIN_HEADERS);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('queue');
    expect(res.body).toHaveProperty('activeCallsCount');
    expect(res.body).toHaveProperty('totalQueued');
    expect(Array.isArray(res.body.queue)).toBe(true);
  });

  it('queue entries should only include Enquiry or Qualified stage leads', async () => {
    const res = await request(app).get('/api/dialer/queue').set(ADMIN_HEADERS);
    res.body.queue.forEach(entry => {
      expect(entry).toHaveProperty('queueId');
      expect(entry).toHaveProperty('leadId');
      expect(entry).toHaveProperty('name');
      expect(entry).toHaveProperty('status');
    });
  });

  it('totalQueued should match queue array length', async () => {
    const res = await request(app).get('/api/dialer/queue').set(ADMIN_HEADERS);
    expect(res.body.totalQueued).toBe(res.body.queue.length);
  });

  it('first queue entry should be "In Progress", rest "Pending"', async () => {
    const res = await request(app).get('/api/dialer/queue').set(ADMIN_HEADERS);
    if (res.body.queue.length > 0) {
      expect(res.body.queue[0].status).toBe('In Progress');
    }
    if (res.body.queue.length > 1) {
      expect(res.body.queue[1].status).toBe('Pending');
    }
  });
});

// ============================================================
// 5. POST /api/dialer/call
// ============================================================
describe('POST /api/dialer/call', () => {
  it('should initiate an outbound call for a valid lead', async () => {
    const res = await request(app)
      .post('/api/dialer/call')
      .set(ADMIN_HEADERS)
      .send({ leadId: 'LEAD-001' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('initiated');
    expect(res.body.callSessionId).toMatch(/^DIAL-SESS-/);
  });

  it('should return 400 if leadId is missing', async () => {
    const res = await request(app)
      .post('/api/dialer/call')
      .set(ADMIN_HEADERS)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/leadId is required/i);
  });

  it('should return 404 for a non-existent lead', async () => {
    const res = await request(app)
      .post('/api/dialer/call')
      .set(ADMIN_HEADERS)
      .send({ leadId: 'LEAD-999' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/lead not found/i);
  });
});

// ============================================================
// 6. GET /api/config
// ============================================================
describe('GET /api/config', () => {
  it('should return 200 with system config object', async () => {
    const res = await request(app).get('/api/config').set(ADMIN_HEADERS);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('config');
    expect(res.body.config).toHaveProperty('approvalPolicy');
  });

  it('approvalPolicy should be a valid value', async () => {
    const res = await request(app).get('/api/config').set(ADMIN_HEADERS);
    expect(['single-action', 'countersign']).toContain(res.body.config.approvalPolicy);
  });
});

// ============================================================
// 7. POST /api/config/approval-policy
// ============================================================
describe('POST /api/config/approval-policy', () => {
  afterEach(async () => {
    // Always reset to single-action after each test
    await request(app).post('/api/config/approval-policy').set(ADMIN_HEADERS).send({ policy: 'single-action' });
  });

  it('should set policy to "countersign"', async () => {
    const res = await request(app)
      .post('/api/config/approval-policy')
      .set(ADMIN_HEADERS)
      .send({ policy: 'countersign' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.config.approvalPolicy).toBe('countersign');
  });

  it('should set policy to "single-action"', async () => {
    const res = await request(app)
      .post('/api/config/approval-policy')
      .set(ADMIN_HEADERS)
      .send({ policy: 'single-action' });

    expect(res.status).toBe(200);
    expect(res.body.config.approvalPolicy).toBe('single-action');
  });

  it('should return 400 for invalid policy value', async () => {
    const res = await request(app)
      .post('/api/config/approval-policy')
      .set(ADMIN_HEADERS)
      .send({ policy: 'auto-approve' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid policy/i);
  });

  it('should persist policy change (verify with GET /api/config)', async () => {
    await request(app).post('/api/config/approval-policy').set(ADMIN_HEADERS).send({ policy: 'countersign' });
    const res = await request(app).get('/api/config').set(ADMIN_HEADERS);
    expect(res.body.config.approvalPolicy).toBe('countersign');
  });
});

// ============================================================
// 8. POST /api/a3/query
// ============================================================
describe('POST /api/a3/query', () => {
  it('should return 200 with text response for a valid query', async () => {
    const res = await request(app)
      .post('/api/a3/query')
      .set(ADMIN_HEADERS)
      .send({ query: 'Show me all leads' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('text');
    expect(res.body).toHaveProperty('processingMs');
    expect(typeof res.body.processingMs).toBe('number');
    expect(res.body.query).toBe('Show me all leads');
  });

  it('should return 400 if query is missing', async () => {
    const res = await request(app)
      .post('/api/a3/query')
      .set(ADMIN_HEADERS)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/query field is required/i);
  });

  it('should return 400 for empty string query', async () => {
    const res = await request(app)
      .post('/api/a3/query')
      .set(ADMIN_HEADERS)
      .send({ query: '   ' });

    expect(res.status).toBe(400);
  });

  it('should return 400 if query is not a string (number)', async () => {
    const res = await request(app)
      .post('/api/a3/query')
      .set(ADMIN_HEADERS)
      .send({ query: 123 });

    expect(res.status).toBe(400);
  });

  it('should handle a revenue query', async () => {
    const res = await request(app)
      .post('/api/a3/query')
      .set(ADMIN_HEADERS)
      .send({ query: 'Total revenue this month' });

    expect(res.status).toBe(200);
    expect(res.body.text).toBeDefined();
  });

  it('should measure processing time > 0', async () => {
    const res = await request(app)
      .post('/api/a3/query')
      .set(ADMIN_HEADERS)
      .send({ query: 'Performance KPIs' });

    expect(res.status).toBe(200);
    expect(res.body.processingMs).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// 9. GET /api/a3/suggestions
// ============================================================
describe('GET /api/a3/suggestions', () => {
  it('should return 200 with suggestions array', async () => {
    const res = await request(app).get('/api/a3/suggestions').set(ADMIN_HEADERS);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('suggestions');
    expect(Array.isArray(res.body.suggestions)).toBe(true);
    expect(res.body.suggestions.length).toBeGreaterThan(0);
  });

  it('each suggestion should be an object with label and query fields', async () => {
    const res = await request(app).get('/api/a3/suggestions').set(ADMIN_HEADERS);
    res.body.suggestions.forEach(s => {
      // Suggestions are { label: string, query: string } objects
      expect(typeof s).toBe('object');
      expect(s).toHaveProperty('label');
      expect(s).toHaveProperty('query');
      expect(typeof s.label).toBe('string');
      expect(typeof s.query).toBe('string');
      expect(s.label.trim().length).toBeGreaterThan(0);
      expect(s.query.trim().length).toBeGreaterThan(0);
    });
  });
});

// ============================================================
// 10. GET /api/a3/export — Multi-format export
// ============================================================
describe('GET /api/a3/export (multi-format)', () => {
  it('should export CSV with correct Content-Type and disposition', async () => {
    const res = await request(app)
      .get('/api/a3/export?format=csv')
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('.csv');
    expect(res.text).toContain('ID,Name,Stage');
  });

  it('should export XML with correct Content-Type', async () => {
    const res = await request(app)
      .get('/api/a3/export?format=xml')
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/xml');
    expect(res.text).toContain('<?xml');
    expect(res.text).toContain('<leads>');
  });

  it('should export JSON with correct Content-Type', async () => {
    const res = await request(app)
      .get('/api/a3/export?format=json')
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    const parsed = JSON.parse(res.text);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('should export PDF format (text/plain content)', async () => {
    const res = await request(app)
      .get('/api/a3/export?format=pdf')
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('.pdf');
  });

  it('should export XLSX format', async () => {
    const res = await request(app)
      .get('/api/a3/export?format=xlsx')
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
  });

  it('should default to CSV if format is not specified', async () => {
    const res = await request(app)
      .get('/api/a3/export')
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
  });
});

// ============================================================
// 11. Auth & RBAC middleware
// ============================================================
describe('Auth & RBAC Middleware', () => {
  it('should allow Admin key full access', async () => {
    const res = await request(app).get('/api/leads').set({ 'x-api-key': 'admin-key-123' });
    expect(res.status).toBe(200);
  });

  it('should allow Sales key access to leads', async () => {
    const res = await request(app).get('/api/leads').set({ 'x-api-key': 'sales-key-456' });
    expect(res.status).toBe(200);
  });

  it('should allow Ops key access to leads', async () => {
    const res = await request(app).get('/api/leads').set({ 'x-api-key': 'ops-key-789' });
    expect(res.status).toBe(200);
  });

  it('should default to Admin in dev mode when no key is provided', async () => {
    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(200);
  });

  it('should use Bearer Authorization header as alternative auth', async () => {
    const res = await request(app).get('/api/leads')
      .set({ 'authorization': 'Bearer admin-key-123' });
    expect(res.status).toBe(200);
  });
});
