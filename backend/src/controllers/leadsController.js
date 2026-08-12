const { Lead, Booking, Payment, ActivityLog } = require('../models');
const { isValidTransition, executeTransition } = require('../stateMachine/leadStateMachine');

// ─────────────────────────────────────────────────
//  GET /api/leads — List all leads
// ─────────────────────────────────────────────────
const getLeads = async (req, res) => {
  // Return mock data for development since no DB is connected yet
  const mockLeads = [
    { id: '1', name: 'John Doe', interest: 'CNC Machine v2', budget: '15000', stage: 'Enquiry', assignedEmployeeId: 'e1' },
    { id: '2', name: 'Jane Smith', interest: 'Laser Cutter Pro', budget: '25000', stage: 'Qualified', assignedEmployeeId: 'e2' },
    { id: '3', name: 'Acme Corp', interest: 'Industrial Mill', budget: '50000', stage: 'Booked', assignedEmployeeId: 'e1' },
    { id: '4', name: 'Global Tech', interest: 'Hydraulic Press', budget: '42000', stage: 'Confirmed Lead', assignedEmployeeId: 'e3' },
    { id: '5', name: 'Elite Builders', interest: 'CNC Router', budget: '18000', stage: 'Client (Paid)', assignedEmployeeId: 'e2' }
  ];
  res.json({ leads: mockLeads });
};

// ─────────────────────────────────────────────────
//  GET /api/leads/:id — Get single lead details
// ─────────────────────────────────────────────────
const getLeadById = async (req, res) => {
  const { id } = req.params;

  const mockLeads = {
    '1': { id: '1', name: 'John Doe', interest: 'CNC Machine v2', budget: '15000', stage: 'Enquiry', notes: 'Inquired via Meta Ads campaign.', crmSynced: true, erpBookingCreated: false, tallyPaymentVerified: false },
    '2': { id: '2', name: 'Jane Smith', interest: 'Laser Cutter Pro', budget: '25000', stage: 'Qualified', notes: 'Called by A1 agent, confirmed interest.', crmSynced: true, erpBookingCreated: false, tallyPaymentVerified: false },
    '3': { id: '3', name: 'Acme Corp', interest: 'Industrial Mill', budget: '50000', stage: 'Booked', notes: 'ERP booking created, awaiting approval.', crmSynced: true, erpBookingCreated: true, tallyPaymentVerified: false },
    '4': { id: '4', name: 'Global Tech', interest: 'Hydraulic Press', budget: '42000', stage: 'Confirmed Lead', notes: 'Booking approved. Awaiting payment gate.', crmSynced: true, erpBookingCreated: true, tallyPaymentVerified: false },
    '5': { id: '5', name: 'Elite Builders', interest: 'CNC Router', budget: '18000', stage: 'Client (Paid)', notes: '10% advance verified. Order in production.', crmSynced: true, erpBookingCreated: true, tallyPaymentVerified: true }
  };

  const lead = mockLeads[id];
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

  // Use mock lead data for development
  const mockLeads = {
    '1': { id: '1', name: 'John Doe', stage: 'Enquiry', budget: '15000' },
    '2': { id: '2', name: 'Jane Smith', stage: 'Qualified', budget: '25000' },
    '3': { id: '3', name: 'Acme Corp', stage: 'Booked', budget: '50000' },
    '4': { id: '4', name: 'Global Tech', stage: 'Confirmed Lead', budget: '42000' },
    '5': { id: '5', name: 'Elite Builders', stage: 'Client (Paid)', budget: '18000' }
  };

  const lead = mockLeads[id];
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

  // Step 3: Log the activity
  const activityEntry = {
    leadId: id,
    employeeId: employeeId || 'system',
    action: `Lead status transitioned from "${lead.stage}" to "${toStage}"`,
    fromStage: lead.stage,
    toStage,
    timestamp: new Date()
  };

  console.log('[ActivityLog]', activityEntry);

  res.json({
    success: true,
    message: `Lead "${lead.name}" successfully transitioned from "${lead.stage}" to "${toStage}".`,
    integrationData: result.integrationData,
    activityLog: activityEntry
  });
};

module.exports = {
  getLeads,
  getLeadById,
  transitionLead
};
