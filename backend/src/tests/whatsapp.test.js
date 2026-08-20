/**
 * ============================================================
 * WHATSAPP AUTOMATION API — Deep Test Suite
 * Tests: GET /messages, GET /sequences, GET /templates,
 *        GET /analytics, POST /sequences/:id/toggle,
 *        POST /sequences/:id/update, POST /send-reminder,
 *        POST /send-custom
 * ============================================================
 */

const request = require('supertest');
const app = require('../app');

const ADMIN_HEADERS = { 'x-api-key': 'admin-key-123' };

// ============================================================
// 1. GET /api/whatsapp/messages
// ============================================================
describe('GET /api/whatsapp/messages', () => {
  it('should return 200 with messages array and count', async () => {
    const res = await request(app).get('/api/whatsapp/messages').set(ADMIN_HEADERS);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('messages');
    expect(res.body).toHaveProperty('count');
    expect(Array.isArray(res.body.messages)).toBe(true);
    expect(res.body.count).toBe(res.body.messages.length);
  });

  it('each message should have required fields', async () => {
    const res = await request(app).get('/api/whatsapp/messages').set(ADMIN_HEADERS);
    if (res.body.messages.length > 0) {
      const msg = res.body.messages[0];
      expect(msg).toHaveProperty('messageId');
      expect(msg).toHaveProperty('leadId');
      expect(msg).toHaveProperty('phone');
      expect(msg).toHaveProperty('status');
      expect(msg).toHaveProperty('sentAt');
    }
  });
});

// ============================================================
// 2. GET /api/whatsapp/sequences
// ============================================================
describe('GET /api/whatsapp/sequences', () => {
  it('should return 200 with sequences array', async () => {
    const res = await request(app).get('/api/whatsapp/sequences').set(ADMIN_HEADERS);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sequences');
    expect(Array.isArray(res.body.sequences)).toBe(true);
    expect(res.body.sequences.length).toBeGreaterThan(0);
  });

  it('each sequence should have id, name, and status', async () => {
    const res = await request(app).get('/api/whatsapp/sequences').set(ADMIN_HEADERS);
    res.body.sequences.forEach(seq => {
      expect(seq).toHaveProperty('id');
      expect(seq).toHaveProperty('name');
      expect(seq).toHaveProperty('status');
      expect(['Active', 'Paused']).toContain(seq.status);
    });
  });
});

// ============================================================
// 3. GET /api/whatsapp/templates
// ============================================================
describe('GET /api/whatsapp/templates', () => {
  it('should return 200 with templates array', async () => {
    const res = await request(app).get('/api/whatsapp/templates').set(ADMIN_HEADERS);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('templates');
    expect(Array.isArray(res.body.templates)).toBe(true);
  });

  it('each template should have id and name', async () => {
    const res = await request(app).get('/api/whatsapp/templates').set(ADMIN_HEADERS);
    if (res.body.templates.length > 0) {
      const tpl = res.body.templates[0];
      expect(tpl).toHaveProperty('id');
      expect(tpl).toHaveProperty('name');
    }
  });
});

// ============================================================
// 4. GET /api/whatsapp/analytics
// ============================================================
describe('GET /api/whatsapp/analytics', () => {
  it('should return 200 with all analytics metrics', async () => {
    const res = await request(app).get('/api/whatsapp/analytics').set(ADMIN_HEADERS);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('analytics');
    const a = res.body.analytics;
    expect(a).toHaveProperty('totalMessagesSent');
    expect(a).toHaveProperty('deliveryRate');
    expect(a).toHaveProperty('readRate');
    expect(a).toHaveProperty('conversionRate');
    expect(a).toHaveProperty('activeSequencesCount');
    expect(a).toHaveProperty('provider');
    expect(a).toHaveProperty('webhookStatus');
  });

  it('totalMessagesSent should be a number > 0', async () => {
    const res = await request(app).get('/api/whatsapp/analytics').set(ADMIN_HEADERS);
    expect(typeof res.body.analytics.totalMessagesSent).toBe('number');
    expect(res.body.analytics.totalMessagesSent).toBeGreaterThan(0);
  });
});

// ============================================================
// 5. POST /api/whatsapp/sequences/:id/toggle
// ============================================================
describe('POST /api/whatsapp/sequences/:id/toggle', () => {
  let firstSeqId;
  let originalStatus;

  beforeAll(async () => {
    const res = await request(app).get('/api/whatsapp/sequences').set(ADMIN_HEADERS);
    firstSeqId = res.body.sequences[0].id;
    originalStatus = res.body.sequences[0].status;
  });

  it('should toggle the sequence status (Active → Paused or vice versa)', async () => {
    const res = await request(app)
      .post(`/api/whatsapp/sequences/${firstSeqId}/toggle`)
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.sequence.status).not.toBe(originalStatus);
  });

  it('should toggle back to original status on second toggle', async () => {
    const res = await request(app)
      .post(`/api/whatsapp/sequences/${firstSeqId}/toggle`)
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.sequence.status).toBe(originalStatus);
  });

  it('should return 404 for a non-existent sequence ID', async () => {
    const res = await request(app)
      .post('/api/whatsapp/sequences/seq-999/toggle')
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ============================================================
// 6. POST /api/whatsapp/sequences/:id/update
// ============================================================
describe('POST /api/whatsapp/sequences/:id/update', () => {
  let seqId;

  beforeAll(async () => {
    const res = await request(app).get('/api/whatsapp/sequences').set(ADMIN_HEADERS);
    seqId = res.body.sequences[0].id;
  });

  it('should update delayHours on a sequence', async () => {
    const res = await request(app)
      .post(`/api/whatsapp/sequences/${seqId}/update`)
      .set(ADMIN_HEADERS)
      .send({ delayHours: 48 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.sequence.delayHours).toBe(48);
  });

  it('should update sequence name', async () => {
    const res = await request(app)
      .post(`/api/whatsapp/sequences/${seqId}/update`)
      .set(ADMIN_HEADERS)
      .send({ name: 'Updated Sequence Name' });

    expect(res.status).toBe(200);
    expect(res.body.sequence.name).toBe('Updated Sequence Name');
  });

  it('should return 400 for non-existent sequence', async () => {
    const res = await request(app)
      .post('/api/whatsapp/sequences/seq-999/update')
      .set(ADMIN_HEADERS)
      .send({ delayHours: 24 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ============================================================
// 7. POST /api/whatsapp/send-reminder
// ============================================================
describe('POST /api/whatsapp/send-reminder', () => {
  it('should send a payment reminder to a valid lead', async () => {
    const res = await request(app)
      .post('/api/whatsapp/send-reminder')
      .set(ADMIN_HEADERS)
      .send({ leadId: 'LEAD-004' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toHaveProperty('messageId');
    expect(res.body.message.leadId).toBe('LEAD-004');
    expect(res.body.message.template).toBe('payment_reminder_advance_10pct');
    expect(res.body.message.status).toBe('Delivered');
  });

  it('should include advance amount in the message preview', async () => {
    const res = await request(app)
      .post('/api/whatsapp/send-reminder')
      .set(ADMIN_HEADERS)
      .send({ leadId: 'LEAD-004' });

    expect(res.body.message.preview).toContain('10%');
    expect(res.body.message.advanceAmount).toBeDefined();
  });

  it('should create an activity log entry after sending reminder', async () => {
    const before = (await request(app).get('/api/activity').set(ADMIN_HEADERS)).body.totalLogs;
    await request(app).post('/api/whatsapp/send-reminder').set(ADMIN_HEADERS).send({ leadId: 'LEAD-004' });
    const after = (await request(app).get('/api/activity').set(ADMIN_HEADERS)).body.totalLogs;
    expect(after).toBe(before + 1);
  });

  it('should appear in messages list after being sent', async () => {
    const msgsBefore = (await request(app).get('/api/whatsapp/messages').set(ADMIN_HEADERS)).body.count;
    await request(app).post('/api/whatsapp/send-reminder').set(ADMIN_HEADERS).send({ leadId: 'LEAD-004' });
    const msgsAfter = (await request(app).get('/api/whatsapp/messages').set(ADMIN_HEADERS)).body.count;
    expect(msgsAfter).toBe(msgsBefore + 1);
  });

  it('should return 400 if leadId is missing', async () => {
    const res = await request(app)
      .post('/api/whatsapp/send-reminder')
      .set(ADMIN_HEADERS)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/leadId is required/i);
  });

  it('should return 400 for a non-existent lead', async () => {
    const res = await request(app)
      .post('/api/whatsapp/send-reminder')
      .set(ADMIN_HEADERS)
      .send({ leadId: 'LEAD-999' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/lead not found/i);
  });
});

// ============================================================
// 8. POST /api/whatsapp/send-custom
// ============================================================
describe('POST /api/whatsapp/send-custom', () => {
  it('should send a custom message with recipientName and phone', async () => {
    const res = await request(app)
      .post('/api/whatsapp/send-custom')
      .set(ADMIN_HEADERS)
      .send({
        recipientName: 'Custom Recipient',
        phone: '+91 77777 66666',
        customText: 'Hello from test suite!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toHaveProperty('messageId');
    expect(res.body.message.leadName).toBe('Custom Recipient');
    expect(res.body.message.phone).toBe('+91 77777 66666');
  });

  it('should send a custom message linked to an existing lead', async () => {
    const res = await request(app)
      .post('/api/whatsapp/send-custom')
      .set(ADMIN_HEADERS)
      .send({
        leadId: 'LEAD-001',
        product: 'CNC Machine v2'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message.leadId).toBe('LEAD-001');
    expect(res.body.message.product).toBe('CNC Machine v2');
  });

  it('should assign correct sequenceType based on template ID', async () => {
    const res = await request(app)
      .post('/api/whatsapp/send-custom')
      .set(ADMIN_HEADERS)
      .send({ recipientName: 'Type Test', phone: '+91 11111 11111' });

    expect(res.status).toBe(200);
    expect(typeof res.body.message.sequenceType).toBe('string');
    expect(res.body.message.sequenceType.length).toBeGreaterThan(0);
  });

  it('should increment message count in analytics after custom send', async () => {
    const msgsBefore = (await request(app).get('/api/whatsapp/messages').set(ADMIN_HEADERS)).body.count;
    await request(app).post('/api/whatsapp/send-custom').set(ADMIN_HEADERS).send({ recipientName: 'Analytics Test', phone: '+91 00000 11111' });
    const msgsAfter = (await request(app).get('/api/whatsapp/messages').set(ADMIN_HEADERS)).body.count;
    expect(msgsAfter).toBe(msgsBefore + 1);
  });
});
