'use strict';
// A4 Dialer Service — Priority Queue Engine
const { Lead } = require('../models');
const { mockLeads } = require('../config/inMemoryStore');

// ─── Priority weights ─────────────────────────────────────────────────────────
const PRIORITY_WEIGHTS = { Hot: 3, High: 2, Normal: 1, Low: 0 };
const STATUS_PRIORITY = { Enquiry: 2, Qualified: 3, Booked: 1 };

// ─── In-memory queue ──────────────────────────────────────────────────────────
let callQueue = [];
let callStats = { queued: 0, active: 0, completed: 0, failed: 0 };

function rebuildStats() {
  callStats = {
    queued: callQueue.filter(c => c.status === 'Queued').length,
    active: callQueue.filter(c => c.status === 'In Progress').length,
    completed: callQueue.filter(c => c.status === 'Completed').length,
    failed: callQueue.filter(c => c.status === 'Failed').length
  };
}

// ─── Initialize queue from DB/mock leads ──────────────────────────────────────
async function initQueue() {
  try {
    let leads = [];
    try { leads = (await Lead.findAll({ where: { stage: ['Enquiry', 'Qualified'] } })).map(l => l.toJSON()); }
    catch { leads = (mockLeads || []).filter(l => ['Enquiry', 'Qualified'].includes(l.stage)); }

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

    // Sort by priority
    callQueue.sort((a, b) => (PRIORITY_WEIGHTS[b.priority] || 0) - (PRIORITY_WEIGHTS[a.priority] || 0));
    rebuildStats();
    console.log(`[Dialer] Queue initialized with ${callQueue.length} leads`);
  } catch (err) {
    console.warn('[Dialer] Queue init failed:', err.message);
  }
}

// Auto-init on load
initQueue().catch(() => {});

class DialerService {
  getQueue() {
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
    return entry;
  }

  async triggerCall(callId, agentPhone = null) {
    const call = callQueue.find(c => c.id === callId);
    if (!call) return { success: false, error: 'Call not found in queue' };
    if (call.status === 'In Progress') return { success: false, error: 'Call already in progress' };

    call.status = 'In Progress';
    call.startedAt = new Date();

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
      console.log(`[Dialer] Simulating call to ${call.name} (${call.phone}) — no Twilio config`);
      call.callSid = `SIM-${Date.now()}`;
    }

    rebuildStats();
    return { success: true, call, callSid: call.callSid };
  }

  updateStatus(callId, status, outcome = null) {
    const call = callQueue.find(c => c.id === callId);
    if (!call) return null;
    call.status = status;
    if (outcome) call.outcome = outcome;
    if (['Completed', 'Failed'].includes(status)) call.endedAt = new Date();
    rebuildStats();
    return call;
  }

  async refreshQueue() {
    await initQueue();
    return this.getQueue();
  }
}

module.exports = new DialerService();
