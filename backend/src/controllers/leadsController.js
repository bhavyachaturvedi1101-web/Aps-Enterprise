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
    interest: interest || 'Machine Unit',
    budget: budget || '20000',
    stage: 'Enquiry',
    notes: notes || 'Direct manual entry.',
    crmSynced: true,
    erpBookingCreated: false,
    tallyPaymentVerified: false,
    source: source || 'Manual Entry',
    assignedEmployeeId: 'e1',
    createdAt: new Date()
  };

  mockLeads.unshift(lead);
  res.status(201).json({ success: true, lead });
};

// POST /api/leads/:id/transition — Submit status transition
const transitionLead = async (req, res) => {
  const { id } = req.params;
  const { toStage, employeeId, simulateError } = req.body;

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

  // Step 2: Execute transition side effects (including Tally 10% payment verification gate)
  const result = await executeTransition(lead, toStage, { simulateError });

  if (!result.success) {
    return res.status(402).json({
      error: 'Payment Gate: Transition rejected.',
      code: 'PAYMENT_VERIFICATION_FAILED',
      reason: result.reason,
      details: 'The 10% advance payment could not be verified against Tally ledger. Please confirm payment before retrying.'
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
    action: `Lead status transitioned from "${oldStage}" to "${toStage}"`,
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
