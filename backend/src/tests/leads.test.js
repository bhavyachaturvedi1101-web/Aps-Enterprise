/**
 * ============================================================
 * LEADS API — Deep Test Suite
 * Tests: GET /api/leads, GET /api/leads/:id, POST /api/leads,
 *        PUT /api/leads/:id, DELETE /api/leads/:id,
 *        POST /api/leads/:id/transition (State Machine)
 * ============================================================
 */

const request = require('supertest');
const app = require('../app');

// ────────────────────────────────────────────────────────────────────────────
// HELPER HEADERS
// ────────────────────────────────────────────────────────────────────────────
const ADMIN_HEADERS  = { 'x-api-key': 'admin-key-123' };
const SALES_HEADERS  = { 'x-api-key': 'sales-key-456' };

// ============================================================
// 1. GET /api/leads  —  List all leads
// ============================================================
describe('GET /api/leads', () => {
  it('should return 200 and an array of leads', async () => {
    const res = await request(app).get('/api/leads').set(ADMIN_HEADERS);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('leads');
    expect(Array.isArray(res.body.leads)).toBe(true);
    expect(res.body.leads.length).toBeGreaterThan(0);
  });

  it('should return leads with required schema fields', async () => {
    const res = await request(app).get('/api/leads').set(ADMIN_HEADERS);
    const lead = res.body.leads[0];
    expect(lead).toHaveProperty('id');
    expect(lead).toHaveProperty('name');
    expect(lead).toHaveProperty('stage');
    expect(lead).toHaveProperty('budget');
    expect(lead).toHaveProperty('crmSynced');
    expect(lead).toHaveProperty('tallyPaymentVerified');
  });

  it('should work with no API key (dev mode defaults to Admin)', async () => {
    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('leads');
  });

  it('should return lead stages from valid state machine values', async () => {
    const validStages = ['Enquiry','Qualified','Booked','Confirmed Lead','Client (Paid)','In Production','Dispatched'];
    const res = await request(app).get('/api/leads').set(ADMIN_HEADERS);
    res.body.leads.forEach(lead => {
      expect(validStages).toContain(lead.stage);
    });
  });
});

// ============================================================
// 2. GET /api/leads/:id  —  Single lead lookup
// ============================================================
describe('GET /api/leads/:id', () => {
  it('should return a specific lead by full ID (LEAD-001)', async () => {
    const res = await request(app).get('/api/leads/LEAD-001').set(ADMIN_HEADERS);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('lead');
    expect(res.body.lead.id).toBe('LEAD-001');
  });

  it('should also accept short numeric ID "1" and resolve to LEAD-001', async () => {
    const res = await request(app).get('/api/leads/1').set(ADMIN_HEADERS);
    expect(res.status).toBe(200);
    expect(res.body.lead.id).toBe('LEAD-001');
  });

  it('should return 404 for a non-existent lead ID', async () => {
    const res = await request(app).get('/api/leads/LEAD-999').set(ADMIN_HEADERS);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('should return full lead object with correct id and name', async () => {
    const res = await request(app).get('/api/leads/LEAD-002').set(ADMIN_HEADERS);
    expect(res.status).toBe(200);
    expect(res.body.lead.name).toBe('Jane Smith');
    expect(res.body.lead.stage).toBe('Qualified');
  });
});

// ============================================================
// 3. POST /api/leads  —  Create new lead
// ============================================================
describe('POST /api/leads', () => {
  let createdLeadId;

  it('should create a new lead with full body', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set(ADMIN_HEADERS)
      .send({
        name: 'Test Corp',
        phone: '+91 99999 88888',
        company: 'Test Industries Pvt Ltd',
        interest: 'CNC Machine v3',
        budget: '30000',
        stage: 'Enquiry',
        priority: 'Hot',
        notes: 'Test lead created by automated test suite.',
        source: 'Test Suite'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.lead).toHaveProperty('id');
    expect(res.body.lead.name).toBe('Test Corp');
    expect(res.body.lead.stage).toBe('Enquiry');
    createdLeadId = res.body.lead.id;
  });

  it('should apply default values when optional fields are omitted', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set(ADMIN_HEADERS)
      .send({ name: 'Minimal Lead' });

    expect(res.status).toBe(201);
    expect(res.body.lead.stage).toBe('Enquiry');
    expect(res.body.lead.priority).toBe('Warm');
    expect(res.body.lead.crmSynced).toBe(true);
    expect(res.body.lead.erpBookingCreated).toBe(false);
    expect(res.body.lead.tallyPaymentVerified).toBe(false);
  });

  it('should return 400 if name is missing', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set(ADMIN_HEADERS)
      .send({ phone: '+91 00000 00000' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/Name is required/i);
  });

  it('should generate a unique LEAD-xxx ID for each new lead', async () => {
    const res1 = await request(app).post('/api/leads').set(ADMIN_HEADERS).send({ name: 'Alpha Lead' });
    const res2 = await request(app).post('/api/leads').set(ADMIN_HEADERS).send({ name: 'Beta Lead' });
    expect(res1.body.lead.id).not.toBe(res2.body.lead.id);
  });

  it('should be retrievable after creation', async () => {
    const createRes = await request(app)
      .post('/api/leads')
      .set(ADMIN_HEADERS)
      .send({ name: 'Persistent Test Lead' });
    
    const newId = createRes.body.lead.id;
    const fetchRes = await request(app).get(`/api/leads/${newId}`).set(ADMIN_HEADERS);
    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body.lead.name).toBe('Persistent Test Lead');
  });

  it('should appear in the leads list after creation', async () => {
    const listRes = await request(app).get('/api/leads').set(ADMIN_HEADERS);
    const found = listRes.body.leads.find(l => l.id === createdLeadId);
    expect(found).toBeDefined();
  });
});

// ============================================================
// 4. PUT /api/leads/:id  —  Update a lead
// ============================================================
describe('PUT /api/leads/:id', () => {
  let testLeadId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/leads')
      .set(ADMIN_HEADERS)
      .send({ name: 'Update Test Lead', budget: '10000', stage: 'Enquiry' });
    testLeadId = res.body.lead.id;
  });

  it('should update a lead name and budget', async () => {
    const res = await request(app)
      .put(`/api/leads/${testLeadId}`)
      .set(ADMIN_HEADERS)
      .send({ name: 'Updated Corp Name', budget: '99000' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.lead.name).toBe('Updated Corp Name');
    expect(res.body.lead.budget).toBe('99000');
  });

  it('should preserve unchanged fields after partial update', async () => {
    const getRes = await request(app).get(`/api/leads/${testLeadId}`).set(ADMIN_HEADERS);
    const originalStage = getRes.body.lead.stage;

    const res = await request(app)
      .put(`/api/leads/${testLeadId}`)
      .set(ADMIN_HEADERS)
      .send({ notes: 'Only notes updated' });

    expect(res.status).toBe(200);
    expect(res.body.lead.stage).toBe(originalStage);
    expect(res.body.lead.notes).toBe('Only notes updated');
  });

  it('should return 404 for updating a non-existent lead', async () => {
    const res = await request(app)
      .put('/api/leads/LEAD-999')
      .set(ADMIN_HEADERS)
      .send({ name: 'Ghost' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('should update all modifiable fields at once', async () => {
    const updates = {
      name: 'Full Update Corp',
      phone: '+91 11111 22222',
      company: 'Full Update Industries',
      interest: 'Lathe Machine XL',
      budget: '55000',
      notes: 'Full field update test',
      source: 'Direct Walk-In',
      priority: 'Hot'
    };

    const res = await request(app)
      .put(`/api/leads/${testLeadId}`)
      .set(ADMIN_HEADERS)
      .send(updates);

    expect(res.status).toBe(200);
    expect(res.body.lead.name).toBe('Full Update Corp');
    expect(res.body.lead.phone).toBe('+91 11111 22222');
    expect(res.body.lead.budget).toBe('55000');
    expect(res.body.lead.priority).toBe('Hot');
  });
});

// ============================================================
// 5. DELETE /api/leads/:id  —  Delete a lead
// ============================================================
describe('DELETE /api/leads/:id', () => {
  let leadToDeleteId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/leads')
      .set(ADMIN_HEADERS)
      .send({ name: 'Lead To Be Deleted' });
    leadToDeleteId = res.body.lead.id;
  });

  it('should delete a lead and return success', async () => {
    const res = await request(app)
      .delete(`/api/leads/${leadToDeleteId}`)
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('deleted successfully');
    expect(res.body.lead.id).toBe(leadToDeleteId);
  });

  it('should return 404 when fetching a deleted lead', async () => {
    const res = await request(app)
      .get(`/api/leads/${leadToDeleteId}`)
      .set(ADMIN_HEADERS);
    expect(res.status).toBe(404);
  });

  it('should return 404 when trying to delete a non-existent lead', async () => {
    const res = await request(app)
      .delete('/api/leads/LEAD-999')
      .set(ADMIN_HEADERS);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ============================================================
// 6. POST /api/leads/:id/transition  —  State Machine
// ============================================================
describe('POST /api/leads/:id/transition — State Machine', () => {

  describe('Valid transitions (happy path)', () => {
    it('Enquiry → Qualified: should succeed', async () => {
      const createRes = await request(app)
        .post('/api/leads')
        .set(ADMIN_HEADERS)
        .send({ name: 'SM Test Enquiry Lead', stage: 'Enquiry', budget: '10000' });
      const leadId = createRes.body.lead.id;

      const res = await request(app)
        .post(`/api/leads/${leadId}/transition`)
        .set(ADMIN_HEADERS)
        .send({ toStage: 'Qualified', employeeId: 'e1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.integrationData).toHaveProperty('crm');
    });

    it('Confirmed Lead → Client (Paid): should pass Tally payment gate', async () => {
      const createRes = await request(app).post('/api/leads').set(ADMIN_HEADERS)
        .send({ name: 'Tally Gate Test', stage: 'Enquiry', budget: '20000' });
      const id = createRes.body.lead.id;
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Qualified' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Booked' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Confirmed Lead' });

      const res = await request(app)
        .post(`/api/leads/${id}/transition`)
        .set(ADMIN_HEADERS)
        .send({ toStage: 'Client (Paid)', employeeId: 'e2' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.integrationData.tally).toBeDefined();
      expect(res.body.integrationData.tally.verified).toBe(true);
    });

    it('should set tallyPaymentVerified=true on lead after Client (Paid)', async () => {
      const createRes = await request(app).post('/api/leads').set(ADMIN_HEADERS)
        .send({ name: 'Tally Flag Test', stage: 'Enquiry', budget: '20000' });
      const id = createRes.body.lead.id;
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Qualified' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Booked' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Confirmed Lead' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Client (Paid)' });

      const fetchRes = await request(app).get(`/api/leads/${id}`).set(ADMIN_HEADERS);
      expect(fetchRes.body.lead.tallyPaymentVerified).toBe(true);
    });

    it('Client (Paid) → In Production: should trigger ERP factory release', async () => {
      const createRes = await request(app).post('/api/leads').set(ADMIN_HEADERS)
        .send({ name: 'ERP Factory Test', stage: 'Enquiry', budget: '50000' });
      const id = createRes.body.lead.id;
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Qualified' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Booked' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Confirmed Lead' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Client (Paid)' });

      const prodRes = await request(app)
        .post(`/api/leads/${id}/transition`)
        .set(ADMIN_HEADERS)
        .send({ toStage: 'In Production' });

      expect(prodRes.status).toBe(200);
      expect(prodRes.body.integrationData.erp).toBeDefined();
      expect(prodRes.body.integrationData.erp.success).toBe(true);
      expect(prodRes.body.integrationData.erp.factoryOrderId).toMatch(/^FAC-ORD-/);
    });

    it('should set erpBookingCreated=true after In Production transition', async () => {
      const createRes = await request(app).post('/api/leads').set(ADMIN_HEADERS)
        .send({ name: 'ERP Flag Test', stage: 'Enquiry', budget: '10000' });
      const id = createRes.body.lead.id;
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Qualified' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Booked' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Confirmed Lead' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Client (Paid)' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'In Production' });

      const fetchRes = await request(app).get(`/api/leads/${id}`).set(ADMIN_HEADERS);
      expect(fetchRes.body.lead.erpBookingCreated).toBe(true);
    });
  });

  describe('Invalid transitions (state machine guard rails)', () => {
    it('should reject Enquiry → Booked (skipping Qualified)', async () => {
      const createRes = await request(app).post('/api/leads').set(ADMIN_HEADERS)
        .send({ name: 'Skip Stage Test', stage: 'Enquiry' });
      const id = createRes.body.lead.id;

      const res = await request(app)
        .post(`/api/leads/${id}/transition`)
        .set(ADMIN_HEADERS)
        .send({ toStage: 'Booked' });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('INVALID_TRANSITION');
      expect(res.body.validTransitions).toContain('Qualified');
    });

    it('should reject Enquiry → Client (Paid) (major skip)', async () => {
      const createRes = await request(app).post('/api/leads').set(ADMIN_HEADERS)
        .send({ name: 'Major Skip Test', stage: 'Enquiry' });
      const id = createRes.body.lead.id;

      const res = await request(app)
        .post(`/api/leads/${id}/transition`)
        .set(ADMIN_HEADERS)
        .send({ toStage: 'Client (Paid)' });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('INVALID_TRANSITION');
    });

    it('should reject any transition from Dispatched (terminal state)', async () => {
      const createRes = await request(app).post('/api/leads').set(ADMIN_HEADERS)
        .send({ name: 'Dispatched Terminal Test', stage: 'Enquiry', budget: '15000' });
      const id = createRes.body.lead.id;
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Qualified' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Booked' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Confirmed Lead' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Client (Paid)' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'In Production' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Dispatched' });

      const res = await request(app)
        .post(`/api/leads/${id}/transition`)
        .set(ADMIN_HEADERS)
        .send({ toStage: 'Enquiry' });

      expect(res.status).toBe(422);
      expect(res.body.validTransitions).toEqual([]);
    });

    it('should return 400 if toStage is missing', async () => {
      const res = await request(app)
        .post('/api/leads/LEAD-001/transition')
        .set(ADMIN_HEADERS)
        .send({ employeeId: 'e1' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/toStage is required/i);
    });

    it('should return 404 for transitioning a non-existent lead', async () => {
      const res = await request(app)
        .post('/api/leads/LEAD-999/transition')
        .set(ADMIN_HEADERS)
        .send({ toStage: 'Qualified' });

      expect(res.status).toBe(404);
    });
  });

  describe('Tally Payment Gate', () => {
    it('should REJECT when simulateError=true (payment not found in ledger)', async () => {
      const createRes = await request(app).post('/api/leads').set(ADMIN_HEADERS)
        .send({ name: 'Tally Fail Test', stage: 'Enquiry', budget: '20000' });
      const id = createRes.body.lead.id;
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Qualified' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Booked' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Confirmed Lead' });

      const res = await request(app)
        .post(`/api/leads/${id}/transition`)
        .set(ADMIN_HEADERS)
        .send({ toStage: 'Client (Paid)', simulateError: true });

      expect(res.status).toBe(402);
      expect(res.body.code).toBe('PAYMENT_VERIFICATION_FAILED');
      expect(res.body.reason).toContain('not found in ledger');
    });
  });

  describe('Dual-Approval / Countersign Policy', () => {
    beforeAll(async () => {
      await request(app).post('/api/config/approval-policy').set(ADMIN_HEADERS).send({ policy: 'countersign' });
    });

    afterAll(async () => {
      await request(app).post('/api/config/approval-policy').set(ADMIN_HEADERS).send({ policy: 'single-action' });
    });

    it('should REJECT high-stakes transition without countersignedBy', async () => {
      const createRes = await request(app).post('/api/leads').set(ADMIN_HEADERS)
        .send({ name: 'Countersign Req Test', stage: 'Enquiry', budget: '30000' });
      const id = createRes.body.lead.id;
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Qualified' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Booked' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Confirmed Lead' });

      const res = await request(app)
        .post(`/api/leads/${id}/transition`)
        .set(ADMIN_HEADERS)
        .send({ toStage: 'Client (Paid)', employeeId: 'e1' });

      expect(res.status).toBe(402);
      expect(res.body.code).toBe('COUNTERSIGN_REQUIRED');
    });

    it('should REJECT when countersignedBy === employeeId (self-sign violation)', async () => {
      const createRes = await request(app).post('/api/leads').set(ADMIN_HEADERS)
        .send({ name: 'Self-Sign Violation Test', stage: 'Enquiry', budget: '30000' });
      const id = createRes.body.lead.id;
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Qualified' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Booked' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Confirmed Lead' });

      const res = await request(app)
        .post(`/api/leads/${id}/transition`)
        .set(ADMIN_HEADERS)
        .send({ toStage: 'Client (Paid)', employeeId: 'e1', countersignedBy: 'e1' });

      expect(res.status).toBe(402);
      expect(res.body.code).toBe('DUAL_APPROVAL_VIOLATION');
    });

    it('should ALLOW transition with valid distinct countersignedBy', async () => {
      const createRes = await request(app).post('/api/leads').set(ADMIN_HEADERS)
        .send({ name: 'Valid Countersign Test', stage: 'Enquiry', budget: '30000' });
      const id = createRes.body.lead.id;
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Qualified' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Booked' });
      await request(app).post(`/api/leads/${id}/transition`).set(ADMIN_HEADERS).send({ toStage: 'Confirmed Lead' });

      const res = await request(app)
        .post(`/api/leads/${id}/transition`)
        .set(ADMIN_HEADERS)
        .send({ toStage: 'Client (Paid)', employeeId: 'e1', countersignedBy: 'e2' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.integrationData.countersign.countersignedBy).toBe('e2');
    });
  });

  describe('Audit log creation on transition', () => {
    it('should create an activity log entry on successful transition', async () => {
      const createRes = await request(app).post('/api/leads').set(ADMIN_HEADERS)
        .send({ name: 'Audit Log Test Lead', stage: 'Enquiry' });
      const id = createRes.body.lead.id;

      await request(app)
        .post(`/api/leads/${id}/transition`)
        .set(ADMIN_HEADERS)
        .send({ toStage: 'Qualified', employeeId: 'e1' });

      const logsRes = await request(app).get('/api/activity').set(ADMIN_HEADERS);
      const entry = logsRes.body.activityLogs.find(l => l.leadId === id && l.toStage === 'Qualified');
      expect(entry).toBeDefined();
      expect(entry.fromStage).toBe('Enquiry');
    });
  });
});
