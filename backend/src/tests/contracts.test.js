/**
 * ============================================================
 * PHASE 3: API CONTRACTS & ZOD VALIDATION TEST SUITE
 * Verifies strict request payload boundaries, schema adherence,
 * and deterministic error responses.
 * ============================================================
 */

const request = require('supertest');
const app = require('../app');

const ADMIN_HEADERS = { 'x-api-key': 'admin-key-123' };

describe('Phase 3: Strict API Contracts & Schema Validation', () => {

  describe('POST /api/leads — Zod Schema Contract', () => {
    it('should reject lead creation when name is completely missing', async () => {
      const res = await request(app)
        .post('/api/leads')
        .set(ADMIN_HEADERS)
        .send({ phone: '+919876543210', budget: 50000 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/Lead name is required/i);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.details)).toBe(true);
    });

    it('should reject invalid stage enum in lead creation', async () => {
      const res = await request(app)
        .post('/api/leads')
        .set(ADMIN_HEADERS)
        .send({
          name: 'Invalid Stage Lead',
          stage: 'NonExistentStage'
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid priority enum in lead creation', async () => {
      const res = await request(app)
        .post('/api/leads')
        .set(ADMIN_HEADERS)
        .send({
          name: 'Invalid Priority Lead',
          priority: 'UrgentSuperHot'
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should accept valid schema payload and return 201', async () => {
      const res = await request(app)
        .post('/api/leads')
        .set(ADMIN_HEADERS)
        .send({
          name: 'Zod Validated Lead',
          phone: '+91 99887 76655',
          email: 'valid.lead@example.com',
          company: 'Acme Plates Inc',
          budget: 150000,
          stage: 'Enquiry',
          priority: 'Hot'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.lead.name).toBe('Zod Validated Lead');
    });
  });

  describe('POST /api/leads/:id/transition — Zod Schema Contract', () => {
    it('should reject transition when toStage is omitted', async () => {
      const res = await request(app)
        .post('/api/leads/LEAD-001/transition')
        .set(ADMIN_HEADERS)
        .send({ employeeId: 'e1' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/toStage is required/i);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/employees — Zod Schema Contract', () => {
    it('should reject employee creation when email is malformed', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set(ADMIN_HEADERS)
        .send({
          name: 'Malformed Email User',
          email: 'not-an-email-address',
          role: 'Sales'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email/i);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject when name is missing', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set(ADMIN_HEADERS)
        .send({
          email: 'valid.email@apsenterprises.in',
          role: 'Sales'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/name/i);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should accept valid employee schema and return 201', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set(ADMIN_HEADERS)
        .send({
          name: 'Zod Employee Contract',
          email: 'zod.employee@apsenterprises.in',
          role: 'Operations Engineer',
          department: 'Shopfloor',
          phone: '+91 99112 23344'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.employee.name).toBe('Zod Employee Contract');
    });
  });

  describe('POST /api/invoices — Zod Schema Contract', () => {
    it('should accept valid invoice creation payload', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set(ADMIN_HEADERS)
        .send({
          leadId: 'LEAD-001',
          clientName: 'Sharma Dona Udhyog',
          product: 'Double Die Machine',
          baseAmount: 125000,
          items: [{ name: 'Double Die Machine', qty: 1, rate: 125000 }]
        });

      expect([200, 201]).toContain(res.status);
    });
  });

  describe('Role-Based Access Control (RBAC) Enforcement', () => {
    const SALES_HEADERS = { 'x-api-key': 'sales-key-456' }; // role: employee

    it('should reject employee from deleting other employees with 403 Forbidden', async () => {
      const res = await request(app)
        .delete('/api/employees/e2')
        .set(SALES_HEADERS);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
      expect(res.body.error).toBe('Forbidden');
    });

    it('should reject employee from updating system config with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/config')
        .set(SALES_HEADERS)
        .send({ config: { approvalPolicy: 'countersign' } });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should allow admin to update system config with 200 OK', async () => {
      const res = await request(app)
        .post('/api/config')
        .set(ADMIN_HEADERS)
        .send({ config: { approvalPolicy: 'single-action' } });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('External Integrations: Tally ERP, WhatsApp Dual-Provider & Teleforce CRM', () => {
    const tallyService = require('../services/tallyService');
    const whatsappService = require('../services/whatsappService');
    const crmService = require('../services/crmService');

    describe('Tally ERP 9 / Prime XML Integration', () => {
      it('should accurately parse structured Tally XML envelopes with LEDGERENTRIES using fast-xml-parser', () => {
        const sampleTallyXml = `
          <ENVELOPE>
            <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
            <BODY>
              <DATA>
                <TALLYMESSAGE xmlns:UDF="TallyUDF">
                  <VOUCHER VCHTYPE="Receipt" ACTION="Create">
                    <DATE>20261017</DATE>
                    <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
                    <VOUCHERNUMBER>VCH-LIVE-001</VOUCHERNUMBER>
                    <PARTYNAME>Sharma Dona Udhyog</PARTYNAME>
                    <NARRATION>Advance payment for LEAD-001 order</NARRATION>
                    <LEDGERENTRIES.LIST>
                      <LEDGERNAME>HDFC Bank</LEDGERNAME>
                      <AMOUNT>-25000</AMOUNT>
                    </LEDGERENTRIES.LIST>
                    <LEDGERENTRIES.LIST>
                      <LEDGERNAME>Sharma Dona Udhyog</LEDGERNAME>
                      <AMOUNT>25000</AMOUNT>
                    </LEDGERENTRIES.LIST>
                  </VOUCHER>
                </TALLYMESSAGE>
              </DATA>
            </BODY>
          </ENVELOPE>
        `;

        const parsed = tallyService.parseXML(sampleTallyXml);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBe(1);
        expect(parsed[0].voucherNo).toBe('VCH-LIVE-001');
        expect(parsed[0].partyName).toBe('Sharma Dona Udhyog');
        expect(parsed[0].debitAmount).toBe(25000);
        expect(parsed[0].reconStatus).toBe('Tally Live');
      });

      it('should report comprehensive status including port and company name', async () => {
        const status = await tallyService.getStatus();
        expect(status).toHaveProperty('company');
        expect(status).toHaveProperty('port');
        expect(status).toHaveProperty('mode');
      });

      it('should verify 10% payment gate with structured verification result', async () => {
        const result = await tallyService.verify10PercentPayment('LEAD-001', 50000);
        expect(result.verified).toBe(true);
        expect(result.amountReceived).toBe(5000);
        expect(result).toHaveProperty('transactionId');
        expect(result).toHaveProperty('source');
      });
    });

    describe('WhatsApp Dual-Provider Integration', () => {
      it('should declare active provider and status in analytics', async () => {
        const analytics = await whatsappService.getAnalytics();
        expect(analytics).toHaveProperty('provider');
        expect(analytics.provider).toMatch(/DoubleTick|Meta/i);
        expect(analytics).toHaveProperty('webhookStatus');
      });

      it('should process DoubleTick webhook status updates seamlessly', async () => {
        const webhookPayload = {
          event: 'message_status',
          messageId: 'WA-001',
          status: 'DELIVERED',
          recipient: '+919988001122'
        };

        await expect(whatsappService.processWebhookEvent(webhookPayload)).resolves.not.toThrow();
      });

      it('should process Meta Cloud API webhook events seamlessly', async () => {
        const metaPayload = {
          entry: [{
            changes: [{
              value: {
                statuses: [{ id: 'wamid.12345', status: 'delivered' }]
              }
            }]
          }]
        };

        await expect(whatsappService.processWebhookEvent(metaPayload)).resolves.not.toThrow();
      });
    });

    describe('Teleforce CRM Sync Integration', () => {
      it('should report CRM bridge status without exposing unmasked secrets', () => {
        const status = crmService.getStatus();
        expect(status).toHaveProperty('provider');
        expect(status).toHaveProperty('configured');
        expect(status).toHaveProperty('mode');
        if (status.apiUrl !== 'Not Set') {
          expect(status.apiUrl).toContain('***');
        }
      });

      it('should execute status synchronization safely without throwing', async () => {
        const syncResult = await crmService.syncLeadStatus('LEAD-001', 'In Production');
        expect(syncResult).toHaveProperty('success');
        expect(syncResult.success).toBe(true);
      });

      it('should return teleforceLeadId on lead creation and resolve it for transitions', async () => {
        const createResult = await crmService.createLead({
          name: 'Test Customer',
          phone: '+91 98765 43210',
          interest: 'Paper Plate Machine',
          budget: 150000
        });
        expect(createResult).toHaveProperty('success');
        expect(createResult.success).toBe(true);
        expect(createResult).toHaveProperty('teleforceLeadId');
      });

      it('should strictly format status updates with leadid (no underscore)', async () => {
        const syncResult = await crmService.syncLeadStatus('LEAD-001', 'Qualified', {
          teleforceLeadId: 'TF-9988'
        });
        expect(syncResult).toHaveProperty('leadid');
        expect(syncResult.leadid).toBe('TF-9988');
      });

      it('should sync CRM edits (phone, budget, notes) via updateLead', async () => {
        const editResult = await crmService.updateLead('LEAD-001', {
          name: 'Updated Customer Name',
          phone: '+91 99887 76655',
          budget: 250000,
          notes: 'Customer requested 10% advance invoice.'
        });
        expect(editResult).toHaveProperty('success');
        expect(editResult.success).toBe(true);
      });
    });
  });

  describe('Pillar 4: Architectural Scalability & Durability Contracts', () => {
    const { safeReadJson, safeWriteJson, SERVERLESS_STORAGE_DIR } = require('../utils/safeStorage');
    const dialerService = require('../services/dialerService');
    const { detectIntent, detectStage } = require('../services/a3/intentClassifier');
    const { getHistory, addToHistory, setLastResult, getLastResult } = require('../services/a3/sessionStore');
    const { detectRequestedFormat, buildStockExport } = require('../services/a3/reportBuilders');
    const path = require('path');
    const fs = require('fs');

    describe('Serverless-Safe Storage & Atomic Persistence', () => {
      it('should write and read data atomically without corruption', () => {
        const testFile = path.join(__dirname, '../../test_atomic.json');
        const testData = [{ id: 'test-1', value: 42, timestamp: Date.now() }];

        const writeOk = safeWriteJson(testFile, testData);
        expect(writeOk).toBe(true);

        const readBack = safeReadJson(testFile, []);
        expect(readBack).toEqual(testData);

        // Cleanup
        try { fs.unlinkSync(testFile); } catch {}
      });

      it('should declare a valid write-permitted serverless directory', () => {
        expect(SERVERLESS_STORAGE_DIR).toBeDefined();
        expect(typeof SERVERLESS_STORAGE_DIR).toBe('string');
      });
    });

    describe('Durable Priority Queue Engine', () => {
      it('should return queue entries prioritized with proper statuses', () => {
        const { queue, stats } = dialerService.getQueue();
        expect(Array.isArray(queue)).toBe(true);
        expect(stats).toHaveProperty('queued');
        expect(stats).toHaveProperty('active');
        expect(stats).toHaveProperty('completed');
      });

      it('should prioritize Hot leads ahead of Normal leads upon enqueue', () => {
        const normalEntry = dialerService.enqueue({ id: 'LEAD-NORM-1', name: 'Normal User', budget: 10000 }, 'Normal');
        const hotEntry = dialerService.enqueue({ id: 'LEAD-HOT-1', name: 'Hot User', budget: 90000 }, 'Hot');

        const { queue } = dialerService.getQueue();
        const hotIdx = queue.findIndex(c => c.leadId === 'LEAD-HOT-1');
        const normIdx = queue.findIndex(c => c.leadId === 'LEAD-NORM-1');

        expect(hotIdx).toBeLessThan(normIdx);
      });
    });

    describe('Modular A3 AI Subsystem Contracts', () => {
      it('should correctly classify intents via intentClassifier', () => {
        expect(detectIntent('Show warehouse inventory stock')).toBe('action_check_inventory');
        expect(detectIntent('Generate GST tax invoice for 50000')).toBe('invoice_generator');
        expect(detectIntent('Track factory job card assembly')).toBe('factory_tracker');
        expect(detectIntent('Give tasks to sales team')).toBe('assign_employee_tasks');
      });

      it('should accurately detect lead stages from conversational query', () => {
        expect(detectStage('Move to in production stage')).toBe('In Production');
        expect(detectStage('Mark as paid client')).toBe('Client (Paid)');
        expect(detectStage('Confirmed lead status')).toBe('Confirmed Lead');
      });

      it('should maintain multi-turn conversational session history and result snapshots', () => {
        const convId = 'test-session-scalability-' + Date.now();
        expect(getHistory(convId)).toEqual([]);

        addToHistory(convId, 'Show leads', 'Found 12 leads');
        const history = getHistory(convId);
        expect(history.length).toBe(2);
        expect(history[0].role).toBe('user');
        expect(history[1].role).toBe('assistant');

        setLastResult(convId, { text: 'Summary', table: [{ id: 1 }] });
        const snapshot = getLastResult(convId);
        expect(snapshot).toHaveProperty('table');
        expect(snapshot.table.length).toBe(1);
      });

      it('should build multi-format export files with appropriate MIME types', () => {
        const inventory = [{ id: 'INV-1', name: 'Dona Machine', category: 'Paper Plate', warehouse: 'Indore', stockUnits: 5, unitPrice: 100000, availableUnits: 5, reservedUnits: 0 }];
        const csvExport = buildStockExport(inventory, 'csv', '2026-10-17');
        expect(csvExport.fileFormat).toBe('CSV');
        expect(csvExport.mimeType).toBe('text/csv');
        expect(csvExport.content).toContain('Dona Machine');

        const pdfExport = buildStockExport(inventory, 'pdf', '2026-10-17');
        expect(pdfExport.fileFormat).toBe('PDF');
        expect(pdfExport.mimeType).toBe('application/pdf');

        const xmlExport = buildStockExport(inventory, 'xml', '2026-10-17');
        expect(xmlExport.fileFormat).toBe('XML');
        expect(xmlExport.mimeType).toBe('application/xml');
      });
    });
  });

});
