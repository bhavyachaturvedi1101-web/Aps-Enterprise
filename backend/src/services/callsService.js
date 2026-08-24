// A1 Voice Agent Service — Call Structured Ingestion & Processing
const { mockCallLogs } = require('../config/inMemoryStore');
const { Lead, ActivityLog } = require('../models');

class CallsService {
  async processCallOutcome(callData) {
    const { name, phone, interest, budget, timeline, callOutcome, durationSeconds, notes } = callData;

    const callId = `CALL-${String(mockCallLogs.length + 1).padStart(3, '0')}`;
    
    // Check if lead already exists by name
    let leads = await Lead.findAll({
      where: { name: name || '' }
    });
    let lead = leads.length > 0 ? leads[0] : null;
    
    let isNewLead = false;
    if (!lead) {
      isNewLead = true;
      const totalLeads = await Lead.count();
      const newId = `LEAD-${String(totalLeads + 1).padStart(3, '0')}-${Date.now().toString().slice(-4)}`;

      lead = await Lead.create({
        id: newId,
        name: name || 'Inbound Voice Prospect',
        interest: interest || 'General Machine Enquiry',
        budget: budget || 20000.00,
        stage: 'Qualified', // A1 call outcome auto-qualifies interested leads
        notes: notes || `Call completed by A1 Voice Agent. Outcome: ${callOutcome}`,
        crmSynced: true,
        erpBookingCreated: false,
        tallyPaymentVerified: false,
        source: 'A1 Voice Agent',
        assignedEmployeeId: 'e1'
      });
    } else if (lead.stage === 'Enquiry') {
      lead.stage = 'Qualified';
      lead.notes = (lead.notes || '') + ` | A1 Call: ${callOutcome}`;
      await lead.save();
    }

    const callRecord = {
      callId,
      leadId: lead.id,
      phone: phone || '+919876543210',
      agent: 'A1 Voice Agent',
      durationSeconds: parseInt(durationSeconds || 120, 10),
      callOutcome: callOutcome || 'Interested',
      transcript: notes || `Customer: Interested in ${lead.interest}. Timeline: ${timeline || 'Within 30 days'}.`,
      timestamp: new Date()
    };

    mockCallLogs.unshift(callRecord);

    await ActivityLog.create({
      id: `log-${Date.now()}`,
      employeeId: 'e1', // A1 Voice Agent system employee
      leadId: lead.id,
      action: isNewLead 
        ? `A1 Voice Agent created new lead "${lead.name}" (Stage: Qualified)` 
        : `A1 Voice Agent updated call outcome for "${lead.name}"`,
      fromStage: isNewLead ? 'Enquiry' : 'Qualified',
      toStage: 'Qualified'
    });

    console.log(`[A1 Voice Agent] Call outcome ingested for ${lead.name} (${callId}).`);
    return { success: true, callId, lead };
  }

  async getCalls() {
    return mockCallLogs;
  }
}

module.exports = new CallsService();
