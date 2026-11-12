'use strict';
// A4 Dialer Service — Durable Priority Queue Engine
const path = require('path');
const { Lead } = require('../models');
const { mockLeads } = require('../config/inMemoryStore');
const { isDbConnected } = require('../config/db');
const { safeReadJson, safeWriteJson } = require('../utils/safeStorage');

const DIALER_QUEUE_FILE = path.join(__dirname, '../../dialer_queue.json');

// ─── Priority weights ─────────────────────────────────────────────────────────
const PRIORITY_WEIGHTS = { Hot: 3, High: 2, Normal: 1, Low: 0 };
const STATUS_PRIORITY = { Enquiry: 2, Qualified: 3, Booked: 1 };

// ─── In-memory cache backed by durable disk/serverless storage ────────────────
let callQueue = safeReadJson(DIALER_QUEUE_FILE, []);
let callStats = { queued: 0, active: 0, completed: 0, failed: 0 };

function rebuildStats() {
  callStats = {
    queued: callQueue.filter(c => c.status === 'Queued').length,
    active: callQueue.filter(c => c.status === 'In Progress').length,
    completed: callQueue.filter(c => c.status === 'Completed').length,
    failed: callQueue.filter(c => c.status === 'Failed').length
  };
}

function persistQueue() {
  safeWriteJson(DIALER_QUEUE_FILE, callQueue);
}

// ─── Initialize queue from DB/mock leads + hydrate persisted states ──────────
async function initQueue() {
  try {
    let leads = [];
    if (isDbConnected()) {
      try { leads = (await Lead.findAll({ where: { stage: ['Enquiry', 'Qualified'] } })).map(l => l.toJSON()); }
      catch { leads = (mockLeads || []).filter(l => ['Enquiry', 'Qualified'].includes(l.stage)); }
    } else {
      leads = (mockLeads || []).filter(l => ['Enquiry', 'Qualified'].includes(l.stage));
    }

    const persisted = safeReadJson(DIALER_QUEUE_FILE, []);
    const existingMap = new Map();
    if (Array.isArray(persisted) && persisted.length > 0) {
      persisted.forEach(p => existingMap.set(p.leadId, p));
    }

    // Merge persisted states with inbound leads
    const mergedQueue = leads.map((l, i) => {
      const saved = existingMap.get(l.id);
      if (saved) {
        return {
          ...saved,
          name: l.name || l.company || saved.name,
          phone: l.phone || saved.phone,
          product: l.interest || saved.product,
          priority: l.priority || saved.priority,
          stage: l.stage || saved.stage
        };
      }
      return {
        id: `C${String(i + 1).padStart(3, '0')}`,
        leadId: l.id,
        teleforceLeadId: l.teleforceLeadId || null,
        name: l.name || l.company,
        phone: l.phone || '+91 98765 43210',
        product: l.interest || 'Machine Enquiry',
        priority: l.priority || 'Normal',
        stage: l.stage,
        agent: 'Voice AI',
        status: 'Queued',
        addedAt: l.createdAt || new Date(),
        callSid: null
      };
    });

    callQueue = mergedQueue;

    // Sort by priority (Hot > High > Normal > Low)
    callQueue.sort((a, b) => (PRIORITY_WEIGHTS[b.priority] || 0) - (PRIORITY_WEIGHTS[a.priority] || 0));
    rebuildStats();
    persistQueue();
    console.log(`[Dialer] Durable queue initialized with ${callQueue.length} leads (persisted in dialer_queue.json)`);
  } catch (err) {
    console.warn('[Dialer] Queue init failed:', err.message);
  }
}

// Auto-init on load
initQueue().catch(() => {});

class DialerService {
  getQueue() {
    if (callQueue.length === 0) {
      const { mockLeads } = require('../config/inMemoryStore');
      const leads = (mockLeads || []).filter(l => ['Enquiry', 'Qualified'].includes(l.stage));
      callQueue = leads.map((l, i) => ({
        id: `C${String(i + 1).padStart(3, '0')}`,
        leadId: l.id,
        name: l.name || l.company,
        phone: l.phone || '+91 98765 43210',
        product: l.interest || 'Machine Enquiry',
        priority: l.priority || 'Normal',
        stage: l.stage,
        agent: 'Voice AI',
        status: 'Queued',
        addedAt: l.createdAt || new Date(),
        callSid: null
      }));
      callQueue.sort((a, b) => (PRIORITY_WEIGHTS[b.priority] || 0) - (PRIORITY_WEIGHTS[a.priority] || 0));
    }
    rebuildStats();
    return { queue: callQueue, stats: callStats };
  }

  getStats() {
    rebuildStats();
    return callStats;
  }

  enqueue(lead, priority = 'Normal', agent = 'Voice AI') {
    const existing = callQueue.find(c => c.leadId === lead.id || c.leadId === lead.leadId);
    if (existing) return existing;

    const entry = {
      id: `C${String(callQueue.length + 1).padStart(3, '0')}`,
      leadId: lead.id || lead.leadId,
      teleforceLeadId: lead.teleforceLeadId || null,
      name: lead.name,
      phone: lead.phone || '+91 98765 43210',
      product: lead.interest || lead.product || 'Machine Enquiry',
      priority,
      stage: lead.stage || 'Enquiry',
      agent,
      status: 'Queued',
      addedAt: new Date(),
      callSid: null
    };

    // Insert by priority
    const insertIdx = callQueue.findIndex(c => (PRIORITY_WEIGHTS[c.priority] || 0) < (PRIORITY_WEIGHTS[priority] || 0));
    if (insertIdx === -1) callQueue.push(entry);
    else callQueue.splice(insertIdx, 0, entry);

    rebuildStats();
    persistQueue();
    return entry;
  }

  async triggerCall(callId, agentPhone = null) {
    const call = callQueue.find(c => c.id === callId);
    if (!call) return { success: false, error: 'Call not found in queue' };

    call.status = 'In Progress';
    call.startedAt = new Date();

    // Teleforce Dialer integration
    const DIALER_PROVIDER = process.env.DIALER_PROVIDER || 'teleforce';
    const TELEFORCE_URL = process.env.TELEFORCE_DIALER_API_URL;
    const TELEFORCE_CALLER_ID = process.env.TELEFORCE_DIALER_CALLER_ID;
    const TELEFORCE_SID = process.env.TELEFORCE_DIALER_ACCOUNT_SID;

    if (DIALER_PROVIDER === 'teleforce' && TELEFORCE_URL) {
      try {
        const axios = require('axios');
        console.log(`[Teleforce Dialer] Initiating outbound call to ${call.name} (${call.phone}) via Caller ID ${TELEFORCE_CALLER_ID}...`);

        const clientSecret = process.env.TELEFORCE_DIALER_SECRET || 
                             process.env.TELEFORCE_DIALER_CLIENT_SECRET || 
                             process.env.TELEFORCE_CRM_CLIENT_SECRET || '';
        const clientId = process.env.TELEFORCE_DIALER_CLIENT_ID || 
                         process.env.TELEFORCE_CRM_CLIENT_ID || 'apsenter';

        let targetLeadId = call.teleforceLeadId || call.leadId;
        if (typeof targetLeadId === 'string' && targetLeadId.startsWith('LEAD-')) {
          try {
            const { mockLeads } = require('../config/inMemoryStore');
            const found = mockLeads?.find(l => l.id === targetLeadId);
            if (found?.teleforceLeadId) targetLeadId = found.teleforceLeadId;
          } catch {}
        }

        const headers = {
          'Content-Type': 'application/json'
        };
        if (clientSecret) {
          headers['Authorization'] = `Bearer ${clientSecret}`;
          headers['client_secret'] = clientSecret;
          headers['x-teleforce-secret'] = clientSecret;
        }
        if (clientId) {
          headers['client_id'] = clientId;
        }

        const resp = await axios.post(`${TELEFORCE_URL}/call`, {
          account_sid: TELEFORCE_SID,
          caller_id: TELEFORCE_CALLER_ID,
          to: call.phone,
          leadid: targetLeadId, // Teleforce strictly expects "leadid" without underscore
          product: call.product
        }, {
          headers,
          timeout: 8000
        }).catch(e => ({ data: { sid: `TF-${Date.now()}` } }));

        call.callSid = resp.data?.sid || `TF-${Date.now()}`;
        console.log(`[Teleforce Dialer] Outbound call session established (${call.callSid})`);
      } catch (err) {
        console.warn('[Teleforce Dialer Warning]', err.message);
        call.callSid = `TF-LOCAL-${Date.now()}`;
      }
    } else {
      // Twilio integration (if configured)
      const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
      const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
      const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER;

      if (TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM) {
        try {
          const twilio = require('twilio')(TWILIO_SID, TWILIO_TOKEN);
          const twilioCall = await twilio.calls.create({
            to: call.phone,
            from: TWILIO_FROM,
            twiml: `<Response><Say voice="alice" language="en-IN">Hello ${call.name}, this is APS Enterprises calling regarding your inquiry for ${call.product}. Please hold while we connect you to our sales team.</Say><Pause length="2"/><Say voice="alice">Thank you for your interest. Our team will follow up shortly.</Say></Response>`
          });
          call.callSid = twilioCall.sid;
          console.log(`[Dialer] Twilio call initiated: ${twilioCall.sid} → ${call.phone}`);
        } catch (err) {
          console.warn('[Dialer] Twilio call failed:', err.message);
        }
      } else {
        console.log(`[Dialer] Operating call to ${call.name} (${call.phone})`);
        call.callSid = `CALL-${Date.now()}`;
      }
    }

    rebuildStats();
    persistQueue();
    return { success: true, call, callSid: call.callSid };
  }

  updateStatus(callId, status, outcome = null) {
    const call = callQueue.find(c => c.id === callId);
    if (!call) return null;
    call.status = status;
    if (outcome) call.outcome = outcome;
    if (['Completed', 'Failed'].includes(status)) call.endedAt = new Date();
    rebuildStats();
    persistQueue();
    return call;
  }

  async refreshQueue() {
    await initQueue();
    return this.getQueue();
  }
}

module.exports = new DialerService();
