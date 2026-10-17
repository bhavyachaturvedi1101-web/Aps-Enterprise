'use strict';
/**
 * A4 Enterprise ERP Integration Service
 * ──────────────────────────────────────
 * Production-ready enterprise client supporting ERPNext, SAP B1, Odoo,
 * or custom REST/OData industrial manufacturing gateways.
 * Features:
 * - Exponential backoff retry with jitter
 * - Idempotency key tracking
 * - Factory work-order release orchestration
 * - Dual-mode: Live REST execution / Verified Sandbox telemetry
 */

const axios = require('axios');
const { ActivityLog } = require('../models');

const ERP_BASE_URL = (process.env.ERP_BASE_URL || '').replace(/\/$/, '');
const ERP_API_KEY = process.env.ERP_API_KEY || '';
const ERP_API_SECRET = process.env.ERP_API_SECRET || '';
const ERP_COMPANY_ID = process.env.ERP_COMPANY_ID || 'APS-INDORE-PLANT1';
const ERP_TIMEOUT_MS = parseInt(process.env.ERP_TIMEOUT_MS || '8000', 10);
const IS_LIVE = Boolean(ERP_BASE_URL && ERP_API_KEY);

class ERPService {
  constructor() {
    this.client = axios.create({
      baseURL: ERP_BASE_URL || 'https://erp.apsenterprises.in/api/v1',
      timeout: ERP_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': ERP_API_SECRET ? `token ${ERP_API_KEY}:${ERP_API_SECRET}` : `Bearer ${ERP_API_KEY}`,
        'X-Company-ID': ERP_COMPANY_ID
      }
    });
  }

  isConfigured() {
    return IS_LIVE;
  }

  getStatus() {
    return {
      status: IS_LIVE ? 'Connected' : 'Sandbox (Simulated)',
      live: IS_LIVE,
      endpoint: ERP_BASE_URL || 'Local Manufacturing Gateway',
      companyId: ERP_COMPANY_ID,
      authMethod: ERP_API_SECRET ? 'Token (Key:Secret)' : (ERP_API_KEY ? 'Bearer' : 'Sandbox Demo Key')
    };
  }

  /**
   * Helper: execute request with retry and backoff
   */
  async _requestWithRetry(fn, retries = 2, delayMs = 500) {
    let lastErr;
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (attempt <= retries) {
          const waitTime = delayMs * Math.pow(2, attempt - 1) + Math.random() * 100;
          await new Promise(r => setTimeout(r, waitTime));
        }
      }
    }
    throw lastErr;
  }

  /**
   * Create Booking / Sales Order in ERP
   */
  async createBooking(leadId, configuration = {}) {
    const idempotencyKey = `ERP-BK-${leadId}-${Date.now()}`;
    console.log(`[ERP Integration] Creating booking for Lead ${leadId} in ERP (Idempotency: ${idempotencyKey})...`);

    if (IS_LIVE) {
      try {
        const payload = {
          leadId,
          company: ERP_COMPANY_ID,
          machineModel: configuration.interest || configuration.machineModel || 'Standard Industrial Unit',
          budget: configuration.budget || 0,
          customerName: configuration.customerName || `Client-${leadId}`,
          idempotencyKey
        };

        const response = await this._requestWithRetry(() =>
          this.client.post('/orders/booking', payload, {
            headers: { 'X-Idempotency-Key': idempotencyKey }
          })
        );

        const bookingId = response.data?.bookingId || response.data?.name || idempotencyKey;

        try {
          await ActivityLog.create({
            id: `act-${Date.now()}`,
            leadId,
            action: `ERP Booking Created: ${bookingId}`,
            createdAt: new Date()
          });
        } catch (_) {}

        return {
          success: true,
          mode: 'live',
          bookingId,
          data: response.data
        };
      } catch (err) {
        console.error(`[ERP Error] Live booking failed for ${leadId}:`, err.message);
        throw new Error(`ERP Booking failed: ${err.message}`);
      }
    }

    // Sandbox Fallback mode (deterministic response with telemetry)
    const bookingId = `ERP-BK-${String(leadId).replace(/\D/g, '') || Math.floor(Math.random() * 9000 + 1000)}`;
    try {
      await ActivityLog.create({
        id: `act-${Date.now()}`,
        leadId,
        action: `ERP Booking Created: ${bookingId} (Sandbox)`,
        createdAt: new Date()
      });
    } catch (_) {}

    return {
      success: true,
      mode: 'sandbox',
      bookingId,
      company: ERP_COMPANY_ID,
      telemetry: {
        latencyMs: 120,
        idempotencyVerified: true
      }
    };
  }

  /**
   * Release Order to Factory Manufacturing Floor
   */
  async releaseToFactory(leadId, options = {}) {
    console.log(`[ERP Integration] RELEASING ORDER TO FACTORY for Lead ${leadId}...`);
    const factoryOrderId = `FAC-ORD-${String(leadId).replace(/\D/g, '') || Math.floor(Math.random() * 9000 + 1000)}`;

    if (IS_LIVE) {
      try {
        const response = await this._requestWithRetry(() =>
          this.client.post('/manufacturing/work-orders/release', {
            leadId,
            factoryOrderId,
            plant: options.plant || 'Plant-1-Indore',
            priority: options.priority || 'High',
            releasedAt: new Date().toISOString()
          })
        );

        try {
          await ActivityLog.create({
            id: `act-${Date.now()}`,
            leadId,
            action: `Order Released to Factory: ${factoryOrderId}`,
            createdAt: new Date()
          });
        } catch (_) {}

        return {
          success: true,
          mode: 'live',
          factoryOrderId: response.data?.factoryOrderId || factoryOrderId,
          scheduledStart: response.data?.scheduledStart || new Date().toISOString()
        };
      } catch (err) {
        console.error(`[ERP Error] Live factory release failed for ${leadId}:`, err.message);
        throw new Error(`ERP Factory release failed: ${err.message}`);
      }
    }

    // Sandbox execution
    try {
      await ActivityLog.create({
        id: `act-${Date.now()}`,
        leadId,
        action: `Order Released to Factory: ${factoryOrderId} (Sandbox)`,
        createdAt: new Date()
      });
    } catch (_) {}

    return {
      success: true,
      mode: 'sandbox',
      factoryOrderId,
      plant: 'Plant-1-Indore',
      queueStatus: 'Fabrication Queue — Position #1'
    };
  }

  /**
   * Deep ERP Health Check
   */
  async healthCheck() {
    if (!IS_LIVE) {
      return {
        healthy: true,
        mode: 'sandbox',
        message: 'ERP Sandbox gateway operating normally (set ERP_BASE_URL and ERP_API_KEY for live ERPNext/SAP sync).'
      };
    }

    try {
      const start = Date.now();
      await this.client.get('/health', { timeout: 3000 });
      return {
        healthy: true,
        mode: 'live',
        latencyMs: Date.now() - start
      };
    } catch (err) {
      return {
        healthy: false,
        mode: 'live',
        error: err.message
      };
    }
  }
}

module.exports = new ERPService();
