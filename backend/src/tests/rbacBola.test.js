/**
 * ============================================================
 * APS ENTERPRISE — RBAC & BOLA (HORIZONTAL ACCESS CONTROL) SUITE
 * Validates strict role boundaries across all sensitive read/mutation
 * endpoints and verifies horizontal tenant/operator isolation.
 * ============================================================
 */

const request = require('supertest');
const app = require('../app');

const ADMIN_HEADERS = { 'x-api-key': 'admin-key-123' };
const OPS_HEADERS   = { 'x-api-key': 'ops-key-789' };
const ACCT_HEADERS  = { 'x-api-key': 'acct-key-321' };
const SALES_HEADERS = { 'x-api-key': 'sales-key-456' }; // role: employee, employeeId: e4

describe('Access Control (RBAC & BOLA Hardening)', () => {

  describe('1. Role-Based Access Control (RBAC) on Read Endpoints', () => {

    it('should reject employee from reading company invoices with 403 Forbidden', async () => {
      const res = await request(app).get('/api/invoices').set(SALES_HEADERS);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should allow accountant and manager to read company invoices with 200 OK', async () => {
      const resAcct = await request(app).get('/api/invoices').set(ACCT_HEADERS);
      expect(resAcct.status).toBe(200);

      const resOps = await request(app).get('/api/invoices').set(OPS_HEADERS);
      expect(resOps.status).toBe(200);
    });

    it('should reject employee from downloading invoice PDF with 403 Forbidden', async () => {
      const res = await request(app).get('/api/invoices/inv-001/pdf').set(SALES_HEADERS);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should reject employee from viewing system config with 403 Forbidden', async () => {
      const res = await request(app).get('/api/config').set(SALES_HEADERS);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should allow manager to view system config with 200 OK', async () => {
      const res = await request(app).get('/api/config').set(OPS_HEADERS);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('config');
    });

    it('should reject employee from viewing WhatsApp message audit logs with 403 Forbidden', async () => {
      const res = await request(app).get('/api/whatsapp/messages').set(SALES_HEADERS);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should reject employee from viewing executive analytics overview with 403 Forbidden', async () => {
      const res = await request(app).get('/api/analytics/overview').set(SALES_HEADERS);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should allow manager to view analytics overview with 200 OK', async () => {
      const res = await request(app).get('/api/analytics/overview').set(OPS_HEADERS);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalRevenue');
    });

    it('should reject employee from viewing Tally financial vouchers with 403 Forbidden', async () => {
      const res = await request(app).get('/api/tally/vouchers').set(SALES_HEADERS);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should allow accountant to access Tally vouchers with 200 OK', async () => {
      const res = await request(app).get('/api/tally/vouchers').set(ACCT_HEADERS);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('vouchers');
    });
  });

  describe('2. Broken Object Level Authorization (BOLA) & Horizontal Isolation', () => {

    it('should restrict employee lead list to only their own assigned or unassigned leads', async () => {
      const res = await request(app).get('/api/leads').set(SALES_HEADERS);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.leads)).toBe(true);

      // Verify no lead belonging to other employees (e.g. assigned specifically to e1 or e2) is exposed
      const foreignLeads = res.body.leads.filter(l =>
        l.assignedEmployeeId &&
        l.assignedEmployeeId !== 'e4' &&
        l.assignedEmployeeId !== 'USR-004'
      );
      expect(foreignLeads.length).toBe(0);
    });

    it('should block employee from viewing single lead assigned to another employee with 403', async () => {
      // First, get a lead assigned to e1 as admin
      const allRes = await request(app).get('/api/leads').set(ADMIN_HEADERS);
      const foreignLead = allRes.body.leads.find(l => l.assignedEmployeeId === 'e1');

      if (foreignLead) {
        const res = await request(app).get(`/api/leads/${foreignLead.id}`).set(SALES_HEADERS);
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('FORBIDDEN');
      }
    });

    it('should block employee from modifying lead assigned to another operator with 403', async () => {
      const allRes = await request(app).get('/api/leads').set(ADMIN_HEADERS);
      const foreignLead = allRes.body.leads.find(l => l.assignedEmployeeId === 'e1');

      if (foreignLead) {
        const res = await request(app)
          .put(`/api/leads/${foreignLead.id}`)
          .set(SALES_HEADERS)
          .send({ notes: 'Malicious modification attempt' });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('FORBIDDEN');
      }
    });

    it('should block employee from transitioning a lead assigned to another operator with 403', async () => {
      const allRes = await request(app).get('/api/leads').set(ADMIN_HEADERS);
      const foreignLead = allRes.body.leads.find(l => l.assignedEmployeeId === 'e1' && l.stage === 'Enquiry');

      if (foreignLead) {
        const res = await request(app)
          .post(`/api/leads/${foreignLead.id}/transition`)
          .set(SALES_HEADERS)
          .send({ toStage: 'Qualified' });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('FORBIDDEN');
      }
    });

    it('should block employee from inspecting another employee performance profile with 403', async () => {
      // e4 attempts to view e1 or e2 performance profile
      const res = await request(app).get('/api/employees/e1/performance').set(SALES_HEADERS);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should allow employee to inspect their own performance profile with 200 OK', async () => {
      const res = await request(app).get('/api/employees/e4/performance').set(SALES_HEADERS);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile.id).toBe('e4');
    });

    it('should block employee from completing another employee task with 403 Forbidden', async () => {
      const res = await request(app).post('/api/employees/e2/complete-task').set(SALES_HEADERS);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });
  });

  describe('3. Login Backdoor Elimination & Credential Safety', () => {

    it('should strictly reject using API_KEY as password during operator login with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@apsenterprises.in',
          password: 'admin-key-123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid Credentials');
    });
  });
});
