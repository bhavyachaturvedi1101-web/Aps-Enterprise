// A1 Voice Agent Service — Call Structured Ingestion & Processing
const { mockCallLogs, mockLeads, mockActivityLogs } = require('../config/inMemoryStore');
const { Lead, ActivityLog } = require('../models');

class CallsService {
  async processCallOutcome(callData) {
    const { name, phone, interest, budget, timeline, callOutcome, durationSeconds, notes } = callData;

    const callList = mockCallLogs || [];
    const callId = `CALL-${String(callList.length + 1).padStart(3, '0')}`;
    
    let lead = null;
    let isNewLead = false;

    // Check DB first if connected
    try {
      if (name) {
        const dbLeads = await Lead.findAll({ where: { name } });
        if (dbLeads && dbLeads.length > 0) lead = dbLeads[0];
      }
    } catch {}

    // Fall back to mockLeads
    if (!lead && name && mockLeads) {
      lead = mockLeads.find(l => l.name && l.name.toLowerCase() === name.toLowerCase());
    }

    if (!lead) {
      isNewLead = true;
      const count = mockLeads ? mockLeads.length : 1;
      const newId = `LEAD-${String(count + 1).padStart(3, '0')}-${Date.now().toString().slice(-4)}`;

      lead = {
        id: newId,
        name: name || 'Inbound Voice Prospect',
        phone: phone || '+91 98765 43210',
        interest: interest || 'General Machine Enquiry',
        budget: budget ? parseFloat(budget) : 20000.00,
        stage: 'Qualified', // A1 call outcome auto-qualifies interested leads
        notes: notes || `Call completed by A1 Voice Agent. Outcome: ${callOutcome || 'Interested'}`,
        crmSynced: true,
        erpBookingCreated: false,
        tallyPaymentVerified: false,
        source: 'A1 Voice Agent',
        assignedEmployeeId: 'e1',
        createdAt: new Date().toISOString()
      };

      try {
        await Lead.create(lead);
      } catch {}

      if (mockLeads) {
        mockLeads.unshift(lead);
      }
    } else {
      lead.stage = 'Qualified';
      lead.notes = (lead.notes || '') + ` | A1 Call: ${callOutcome || 'Interested'}`;
      try {
        if (typeof lead.save === 'function') await lead.save();
      } catch {}
    }

    const callRecord = {
      callId,
      leadId: lead.id,
      phone: phone || lead.phone || '+919876543210',
      agent: 'A1 Voice Agent',
      durationSeconds: parseInt(durationSeconds || 120, 10),
      callOutcome: callOutcome || 'Interested',
      transcript: notes || `Customer: Interested in ${lead.interest}. Timeline: ${timeline || 'Within 30 days'}.`,
      timestamp: new Date()
    };

    if (mockCallLogs) {
      mockCallLogs.unshift(callRecord);
    }

    const logEntry = {
      id: `log-${Date.now()}`,
      employeeId: 'e1', // A1 Voice Agent system employee
      leadId: lead.id,
      action: isNewLead 
        ? `A1 Voice Agent created new lead "${lead.name}" (Stage: Qualified)` 
        : `A1 Voice Agent updated call outcome for "${lead.name}"`,
      fromStage: isNewLead ? 'Enquiry' : 'Qualified',
      toStage: 'Qualified',
      createdAt: new Date().toISOString()
    };

    try {
      await ActivityLog.create(logEntry);
    } catch {}

    if (mockActivityLogs) {
      mockActivityLogs.unshift(logEntry);
    }

    console.log(`[A1 Voice Agent] Call outcome ingested for ${lead.name} (${callId}).`);
    return { success: true, callId, lead };
  }

  async getCalls() {
    return mockCallLogs;
  }
}

module.exports = new CallsService();
