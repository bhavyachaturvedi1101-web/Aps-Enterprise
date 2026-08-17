const { mockLeads, mockActivityLogs } = require('../config/inMemoryStore');
const { isValidTransition, executeTransition } = require('../stateMachine/leadStateMachine');

// ─────────────────────────────────────────────────
//  GET /api/leads — List all leads
// ─────────────────────────────────────────────────
const getLeads = async (req, res) => {
  res.json({ leads: mockLeads });
};

// ─────────────────────────────────────────────────
//  GET /api/leads/:id — Get single lead details
// ─────────────────────────────────────────────────
const getLeadById = async (req, res) => {
  const { id } = req.params;
  const lead = mockLeads.find(l => l.id === id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json({ lead });
};

// ─────────────────────────────────────────────────
//  POST /api/leads/:id/transition — Submit status transition
// ─────────────────────────────────────────────────
const transitionLead = async (req, res) => {
  const { id } = req.params;
  const { toStage, employeeId, simulateError } = req.body;

  if (!toStage) {
    return res.status(400).json({ error: 'toStage is required in the request body.' });
  }

  const lead = mockLeads.find(l => l.id === id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  // Step 1: Validate the transition is legal
  if (!isValidTransition(lead.stage, toStage)) {
    return res.status(422).json({
      error: `Invalid transition: Cannot move lead from "${lead.stage}" to "${toStage}".`,
      validTransitions: require('../stateMachine/leadStateMachine').VALID_TRANSITIONS[lead.stage] || []
    });
  }

  // Step 2: Execute transition (run integration side effects + payment gate if applicable)
  const result = await executeTransition(lead, toStage, { simulateError });

  if (!result.success) {
    return res.status(402).json({
      error: 'Payment Gate: Transition rejected.',
      reason: result.reason,
      details: 'The 10% advance payment could not be verified against Tally ledger. Please confirm payment before retrying.'
    });
  }

  // Save the state transition in our shared memory
  const oldStage = lead.stage;
  lead.stage = toStage;

  if (toStage === 'Client (Paid)') {
    lead.tallyPaymentVerified = true;
  }
  if (toStage === 'In Production') {
    lead.erpBookingCreated = true;
  }

  // Step 3: Log the activity
  const activityEntry = {
    id: `log${Date.now()}`,
    leadId: id,
    employeeId: employeeId || 'system',
    action: `Lead status transitioned from "${oldStage}" to "${toStage}"`,
    fromStage: oldStage,
    toStage,
    createdAt: new Date()
  };

  mockActivityLogs.unshift(activityEntry);
  console.log('[ActivityLog]', activityEntry);

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
  transitionLead
};

