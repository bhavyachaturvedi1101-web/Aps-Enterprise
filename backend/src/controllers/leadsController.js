const { mockLeads, mockActivityLogs } = require('../config/inMemoryStore');
const { isValidTransition, executeTransition } = require('../stateMachine/leadStateMachine');

// GET /api/leads — List all leads
const getLeads = async (req, res) => {
  res.json({ leads: mockLeads });
};

// GET /api/leads/:id — Get single lead details
const getLeadById = async (req, res) => {
  const { id } = req.params;
  const lead = mockLeads.find(l => l.id === id || l.id === `LEAD-${id.padStart(3, '0')}`);
  if (!lead) return res.status(404).json({ error: 'Lead not found', code: 'RESOURCE_NOT_FOUND' });
  res.json({ lead });
};

// POST /api/leads — Create new lead
const createLead = async (req, res) => {
  const { name, interest, budget, notes, source } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const lead = {
    id: `LEAD-${String(mockLeads.length + 1).padStart(3, '0')}`,
    name,
    interest: interest || 'CNC Machine Unit',
    budget: budget || '20000',
    stage: 'Enquiry',
    notes: notes || 'Direct manual entry from A2 Cockpit.',
    crmSynced: true,
    erpBookingCreated: false,
    tallyPaymentVerified: false,
    source: source || 'A2 Admin Cockpit',
    assignedEmployeeId: 'e1',
    createdAt: new Date()
  };

  mockLeads.unshift(lead);
  
  mockActivityLogs.unshift({
    id: `log${Date.now()}`,
    leadId: lead.id,
    employeeId: req.user?.id || 'e2',
    action: `New Lead "${lead.name}" created in A2 Admin Cockpit (Stage: Enquiry)`,
    fromStage: 'None',
    toStage: 'Enquiry',
    createdAt: new Date()
  });

  res.status(201).json({ success: true, lead });
};

// POST /api/leads/:id/transition — Submit status transition
const transitionLead = async (req, res) => {
  const { id } = req.params;
  const { toStage, employeeId, countersignedBy, simulateError } = req.body;

  if (!toStage) {
    return res.status(400).json({ error: 'toStage is required in the request body.' });
  }

  const lead = mockLeads.find(l => l.id === id || l.id === `LEAD-${id.padStart(3, '0')}`);
  if (!lead) return res.status(404).json({ error: 'Lead not found', code: 'RESOURCE_NOT_FOUND' });

  // Step 1: Validate state machine transition rules
  if (!isValidTransition(lead.stage, toStage)) {
    return res.status(422).json({
      error: `Invalid transition: Cannot move lead from "${lead.stage}" to "${toStage}".`,
      code: 'INVALID_TRANSITION',
      validTransitions: require('../stateMachine/leadStateMachine').VALID_TRANSITIONS[lead.stage] || []
    });
  }

  // Step 2: Execute transition side effects (including Tally 10% payment gate and countersign check)
  const result = await executeTransition(lead, toStage, {
    employeeId: employeeId || req.user?.id || 'e2',
    countersignedBy,
    simulateError
  });

  if (!result.success) {
    return res.status(402).json({
      error: 'Transition rejected.',
      code: result.code || 'TRANSITION_REJECTED',
      reason: result.reason,
      details: result.reason
    });
  }

  // Persist stage update
  const oldStage = lead.stage;
  lead.stage = toStage;

  if (toStage === 'Client (Paid)') {
    lead.tallyPaymentVerified = true;
  }
  if (toStage === 'In Production') {
    lead.erpBookingCreated = true;
  }

  // Step 3: Log audit entry
  const activityEntry = {
    id: `log${Date.now()}`,
    leadId: lead.id,
    employeeId: employeeId || req.user?.id || 'system',
    countersignedBy: countersignedBy || null,
    action: countersignedBy
      ? `Lead status transitioned from "${oldStage}" to "${toStage}" (Dual-Approval Countersigned by ${countersignedBy})`
      : `Lead status transitioned from "${oldStage}" to "${toStage}"`,
    fromStage: oldStage,
    toStage,
    createdAt: new Date()
  };

  mockActivityLogs.unshift(activityEntry);

  res.json({
    success: true,
    message: `Lead "${lead.name}" successfully transitioned from "${oldStage}" to "${toStage}".`,
    integrationData: result.integrationData,
    activityLog: activityEntry
  });
};

module.exports = {
  getLeads,
  getLeadById,
  createLead,
  transitionLead
};
