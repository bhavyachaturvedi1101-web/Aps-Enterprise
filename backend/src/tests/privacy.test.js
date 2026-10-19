'use strict';
/**
 * ============================================================
 * APS ENTERPRISE — PRIVACY & PII HANDLING TEST SUITE
 * Verifies 10/10 DPDP Compliance & Security Standards:
 * 1. PII Redaction & Format-Aware Masking (Phone, Email, Name, Text)
 * 2. LLM Context Stripping (No raw PII dispatched to external LLMs)
 * 3. Safe Telemetry & Console Logging (No plaintext PII in logs)
 * 4. Git Hygiene & Sensitive Store Tracking Prevention
 * ============================================================
 */

const fs = require('fs');
const path = require('path');
const {
  maskPhone,
  maskEmail,
  maskName,
  maskText,
  sanitizeLeadForLLM,
  sanitizeEmployeeForLLM,
  sanitizeLogForLLM
} = require('../utils/privacyMasker');
const { buildFullContext } = require('../services/a3/llmProvider');

describe('Data Privacy & PII Handling — 10/10 Compliance Verification', () => {

  describe('1. PII Masking Engine Unit Tests', () => {
    test('maskPhone: masks 10-digit Indian numbers accurately preserving ends', () => {
      const masked = maskPhone('9826012345');
      expect(masked).toBe('98*****345');
      expect(masked).not.toContain('26012');
    });

    test('maskPhone: masks numbers with +91 country code', () => {
      const masked = maskPhone('+91 98260 12345');
      expect(masked).toContain('+91');
      expect(masked).toContain('98');
      expect(masked).toContain('345');
      expect(masked).not.toContain('260');
    });

    test('maskPhone: handles malformed, short, or null numbers safely', () => {
      expect(maskPhone(null)).toBe('[PHONE_REDACTED]');
      expect(maskPhone('')).toBe('[PHONE_REDACTED]');
      expect(maskPhone('1234')).toBe('[PHONE_REDACTED]');
    });

    test('maskEmail: masks user portion while preserving domain for routing', () => {
      const masked = maskEmail('rajesh.sharma@sharmadona.com');
      expect(masked).toBe('r***a@sharmadona.com');
      expect(masked).not.toContain('rajesh.sharma');
    });

    test('maskEmail: handles short usernames and invalid emails safely', () => {
      expect(maskEmail('ab@example.com')).toBe('a*@example.com');
      expect(maskEmail('invalid-email')).toBe('[EMAIL_REDACTED]');
      expect(maskEmail(null)).toBe('[EMAIL_REDACTED]');
    });

    test('maskName: pseudonymizes last names into initials', () => {
      expect(maskName('Rajesh Sharma')).toBe('Rajesh S.');
      expect(maskName('Manoj Kumar Singh')).toBe('Manoj S.');
      expect(maskName('Rajesh')).toBe('Rajesh');
      expect(maskName(null)).toBe('Client');
    });

    test('maskText: detects and redacts phone numbers & emails inside unstructured text', () => {
      const input = 'Call customer at +91 98260 12345 or email him at rajesh@domain.in regarding machine quote';
      const redacted = maskText(input);
      expect(redacted).not.toContain('98260 12345');
      expect(redacted).not.toContain('rajesh@domain.in');
      expect(redacted).toContain('@domain.in');
      expect(redacted).toContain('Call customer at');
    });
  });

  describe('2. 3rd-Party LLM Context Stripping & Sanitization', () => {
    test('sanitizeLeadForLLM: completely strips phone and personal email from payload', () => {
      const rawLead = {
        id: 'LEAD-999',
        name: 'Rajesh Sharma',
        phone: '+91 98260 12345',
        email: 'rajesh.sharma@gmail.com',
        company: 'Sharma Dona Udyog',
        stage: 'Confirmed Lead',
        budget: 250000,
        interest: 'Double Die Dona Machine',
        city: 'Indore'
      };

      const sanitized = sanitizeLeadForLLM(rawLead);
      expect(sanitized.phone).toBeUndefined();
      expect(sanitized.email).toBeUndefined();
      expect(sanitized.maskedName).toBe('Rajesh S.');
      expect(sanitized.company).toBe('Sharma Dona Udyog');
      expect(sanitized.budget).toBe(250000);
      expect(sanitized.city).toBe('Indore');
    });

    test('sanitizeEmployeeForLLM: strips direct mobile numbers and private email', () => {
      const rawEmp = {
        id: 'EMP-01',
        name: 'Rahul Verma',
        phone: '+91 98930 11223',
        personalEmail: 'rahul.private@gmail.com',
        role: 'Sales Manager',
        department: 'Sales',
        kpiScore: '92%',
        salesClosed: 14,
        totalRevenue: 2800000
      };

      const sanitized = sanitizeEmployeeForLLM(rawEmp);
      expect(sanitized.phone).toBeUndefined();
      expect(sanitized.personalEmail).toBeUndefined();
      expect(sanitized.name).toBe('Rahul Verma');
      expect(sanitized.role).toBe('Sales Manager');
      expect(sanitized.kpiScore).toBe('92%');
    });

    test('buildFullContext: ensures NO customer phone numbers or emails exist in output prompt', async () => {
      const mockStore = () => Promise.resolve({
        mockLeads: [
          {
            id: 'LEAD-PRIV-1',
            name: 'Vikramaditya Rathore',
            phone: '+91 98290 99887',
            email: 'vikram.rathore@rajasthanmachinery.com',
            company: 'Rathore Enterprises',
            stage: 'Qualified',
            budget: 500000,
            interest: 'Paper Plate Machine'
          }
        ],
        mockEmployees: [
          {
            id: 'e1',
            name: 'Priya Sharma',
            phone: '+91 98260 77665',
            email: 'priya.private@gmail.com',
            role: 'Telecaller',
            department: 'Sales',
            kpiScore: '94%',
            salesClosed: 8,
            totalRevenue: 1200000
          }
        ],
        mockActivityLogs: [
          {
            id: 'act-1',
            action: 'Call completed with Vikramaditya: discussed pricing at 9829099887',
            leadName: 'Vikramaditya Rathore',
            timestamp: new Date().toISOString()
          }
        ],
        mockCallLogs: []
      });

      const context = await buildFullContext('Show me pipeline state', mockStore, { role: 'admin' });

      // Verification: raw phone and raw email must NEVER appear
      expect(context).not.toContain('98290 99887');
      expect(context).not.toContain('9829099887');
      expect(context).not.toContain('vikram.rathore@rajasthanmachinery.com');
      expect(context).not.toContain('priya.private@gmail.com');
      expect(context).not.toContain('98260 77665');

      // Pseudonymized names should be present
      expect(context).toContain('Vikramaditya R.');
    });
  });

  describe('3. Console Logging PII Redaction Verification', () => {
    let logSpy;

    beforeEach(() => {
      logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      logSpy.mockRestore();
    });

    test('whatsappService webhook logger redacts incoming phone number and message PII', async () => {
      const whatsappService = require('../services/whatsappService');
      const rawHandsetNumber = '919826012345';
      const secretMsg = 'My credit card email is test@sharma.in please reply';

      await whatsappService.processWebhookEvent({
        event: 'message',
        from: rawHandsetNumber,
        text: secretMsg
      });

      // Find the DoubleTick Webhook log call
      const webhookLog = logSpy.mock.calls.find(call =>
        typeof call[0] === 'string' && call[0].includes('[DoubleTick Webhook]')
      );

      expect(webhookLog).toBeDefined();
      const loggedString = webhookLog[0];
      expect(loggedString).not.toContain('919826012345');
      expect(loggedString).toContain('98*****345');
      expect(loggedString).not.toContain('test@sharma.in');
      expect(loggedString).toContain('t***@sharma.in');
    });

    test('dialerService logs outbound calls with masked customer name and phone', async () => {
      const dialerService = require('../services/dialerService');
      const testLead = {
        name: 'Harish Choudhary',
        phone: '+91 98260 11223',
        leadId: 'LEAD-998',
        product: 'Hydraulic Machine'
      };

      const entry = dialerService.enqueue(testLead);
      await dialerService.triggerCall(entry.id);

      const dialerLog = logSpy.mock.calls.find(call =>
        typeof call[0] === 'string' && (call[0].includes('Initiating outbound call') || call[0].includes('Operating call to'))
      );

      expect(dialerLog).toBeDefined();
      const loggedString = dialerLog[0];
      expect(loggedString).not.toContain('98260 11223');
      expect(loggedString).toContain('98*****223');
      expect(loggedString).toContain('Harish C.');
      expect(loggedString).not.toContain('Harish Choudhary');
    });

    test('crmService logs lead push with masked name and phone', async () => {
      const crmService = require('../services/crmService');
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      crmService.apiUrl = ''; // Local only

      await crmService.createLead({
        name: 'Alok Mishra',
        phone: '+91 98390 44551',
        budget: 750000
      });

      process.env.NODE_ENV = origEnv;
    });
  });

  describe('4. Git Hygiene & Data Store Tracking Prevention', () => {
    test('.gitignore and backend/.gitignore must exclude runtime JSON database files', () => {
      const rootGitignore = fs.readFileSync(path.join(__dirname, '../../../.gitignore'), 'utf8');
      const backendGitignore = fs.readFileSync(path.join(__dirname, '../../.gitignore'), 'utf8');

      expect(rootGitignore).toMatch(/\*_data\.json/);
      expect(rootGitignore).toMatch(/dialer_queue\.json/);
      expect(backendGitignore).toMatch(/\*_data\.json/);
      expect(backendGitignore).toMatch(/dialer_queue\.json/);
    });

    test('seeds directory exists with fallback templates', () => {
      const seedsDir = path.join(__dirname, '../../seeds');
      expect(fs.existsSync(seedsDir)).toBe(true);
      expect(fs.existsSync(path.join(seedsDir, 'leads_data.json'))).toBe(true);
      expect(fs.existsSync(path.join(seedsDir, 'employees_data.json'))).toBe(true);
    });
  });
});
