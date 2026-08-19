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
  const { name, phone, company, interest, budget, notes, source, stage, priority } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const lead = {
    id: `LEAD-${String(mockLeads.length + 1).padStart(3, '0')}`,
    name,
    phone: phone || '+91 98765 43210',
    company: company || `${name} Corp`,
    interest: interest || 'CNC Machine Unit',
    budget: budget || '20000',
    stage: stage || 'Enquiry',
    priority: priority || 'Warm',
    notes: notes || 'Direct manual entry from CRM Board.',
    crmSynced: true,
    erpBookingCreated: false,
    tallyPaymentVerified: false,
    source: source || 'Direct Web',
    assignedEmployeeId: 'e1',
    createdAt: new Date()
  };

  mockLeads.unshift(lead);
  
  mockActivityLogs.unshift({
    id: `log${Date.now()}`,
    leadId: lead.id,
    employeeId: req.user?.id || 'e2',
    action: `New Lead "${lead.name}" created in CRM Board (Stage: ${lead.stage})`,
    fromStage: 'None',
    toStage: lead.stage,
    createdAt: new Date()
  });

  res.status(201).json({ success: true, lead });
};

// PUT /api/leads/:id — Update existing lead
const updateLead = async (req, res) => {
  const { id } = req.params;
  const leadIndex = mockLeads.findIndex(l => l.id === id || l.id === `LEAD-${id.padStart(3, '0')}`);
  if (leadIndex === -1) return res.status(404).json({ error: 'Lead not found' });

  const current = mockLeads[leadIndex];
  const { name, phone, company, interest, budget, notes, source, stage, priority } = req.body;

  mockLeads[leadIndex] = {
    ...current,
    name: name !== undefined ? name : current.name,
    phone: phone !== undefined ? phone : current.phone,
    company: company !== undefined ? company : current.company,
    interest: interest !== undefined ? interest : current.interest,
    budget: budget !== undefined ? budget : current.budget,
    notes: notes !== undefined ? notes : current.notes,
    source: source !== undefined ? source : current.source,
    stage: stage !== undefined ? stage : current.stage,
    priority: priority !== undefined ? priority : current.priority
  };

  res.json({ success: true, lead: mockLeads[leadIndex] });
};

// DELETE /api/leads/:id — Delete lead
const deleteLead = async (req, res) => {
  const { id } = req.params;
  const leadIndex = mockLeads.findIndex(l => l.id === id || l.id === `LEAD-${id.padStart(3, '0')}`);
  if (leadIndex === -1) return res.status(404).json({ error: 'Lead not found' });

  const deleted = mockLeads.splice(leadIndex, 1)[0];
  res.json({ success: true, message: `Lead "${deleted.name}" deleted successfully`, lead: deleted });
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
  updateLead,
  deleteLead,
  transitionLead
};
