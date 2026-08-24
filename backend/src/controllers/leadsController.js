const { Lead, ActivityLog } = require('../models');
const { isValidTransition, executeTransition } = require('../stateMachine/leadStateMachine');

// GET /api/leads — List all leads
const getLeads = async (req, res) => {
  try {
    const leads = await Lead.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json({ leads });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
};

// GET /api/leads/:id — Get single lead details
const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    let lead = await Lead.findByPk(id);
    if (!lead) {
      // Fallback for short ids like '001'
      const formattedId = `LEAD-${id.padStart(3, '0')}`;
      lead = await Lead.findByPk(formattedId);
    }
    
    if (!lead) return res.status(404).json({ error: 'Lead not found', code: 'RESOURCE_NOT_FOUND' });
    res.json({ lead });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
};

// POST /api/leads — Create new lead
const createLead = async (req, res) => {
  try {
    const { name, phone, company, interest, budget, notes, source, stage, priority } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    // Generate a simple ID if we want to stick to LEAD-xxx format
    const totalLeads = await Lead.count();
    const newId = `LEAD-${String(totalLeads + 1).padStart(3, '0')}-${Date.now().toString().slice(-4)}`;

    const lead = await Lead.create({
      id: newId,
      name,
      phone: phone || '+91 98765 43210',
      company: company || `${name} Corp`,
      interest: interest || 'CNC Machine Unit',
      budget: budget || 20000.00,
      stage: stage || 'Enquiry',
      priority: priority || 'Warm',
      notes: notes || 'Direct manual entry from CRM Board.',
      crmSynced: true,
      erpBookingCreated: false,
      tallyPaymentVerified: false,
      source: source || 'Direct Web',
      assignedEmployeeId: 'e1'
    });
    
    await ActivityLog.create({
      id: `log${Date.now()}`,
      leadId: lead.id,
      employeeId: req.user?.id || 'e2',
      action: `New Lead "${lead.name}" created in CRM Board (Stage: ${lead.stage})`,
      fromStage: 'None',
      toStage: lead.stage
    });

    res.status(201).json({ success: true, lead });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
};

// PUT /api/leads/:id — Update existing lead
const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    let lead = await Lead.findByPk(id);
    if (!lead) lead = await Lead.findByPk(`LEAD-${id.padStart(3, '0')}`);
    
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const { name, phone, company, interest, budget, notes, source, stage, priority } = req.body;

    await lead.update({
      name: name !== undefined ? name : lead.name,
      phone: phone !== undefined ? phone : lead.phone,
      company: company !== undefined ? company : lead.company,
      interest: interest !== undefined ? interest : lead.interest,
      budget: budget !== undefined ? budget : lead.budget,
      notes: notes !== undefined ? notes : lead.notes,
      source: source !== undefined ? source : lead.source,
      stage: stage !== undefined ? stage : lead.stage,
      priority: priority !== undefined ? priority : lead.priority
    });

    res.json({ success: true, lead });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
};

// DELETE /api/leads/:id — Delete lead
const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    let lead = await Lead.findByPk(id);
    if (!lead) lead = await Lead.findByPk(`LEAD-${id.padStart(3, '0')}`);
    
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    await lead.destroy();
    res.json({ success: true, message: `Lead "${lead.name}" deleted successfully`, lead });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
};

// POST /api/leads/:id/transition — Submit status transition
const transitionLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { toStage, employeeId, countersignedBy, simulateError } = req.body;

    if (!toStage) {
      return res.status(400).json({ error: 'toStage is required in the request body.' });
    }

    let lead = await Lead.findByPk(id);
    if (!lead) lead = await Lead.findByPk(`LEAD-${id.padStart(3, '0')}`);
    
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
    // NOTE: executeTransition might still expect plain object or mock array interactions.
    // It should be refactored to work with DB independently, but for now we pass the Sequelize instance.
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
    await lead.save();

    // Step 3: Log audit entry
    const activityEntry = await ActivityLog.create({
      id: `log${Date.now()}`,
      leadId: lead.id,
      employeeId: employeeId || req.user?.id || 'e1',
      countersignedBy: countersignedBy || null,
      action: countersignedBy
        ? `Lead status transitioned from "${oldStage}" to "${toStage}" (Dual-Approval Countersigned by ${countersignedBy})`
        : `Lead status transitioned from "${oldStage}" to "${toStage}"`,
      fromStage: oldStage,
      toStage
    });

    res.json({
      success: true,
      message: `Lead "${lead.name}" successfully transitioned from "${oldStage}" to "${toStage}".`,
      integrationData: result.integrationData,
      activityLog: activityEntry
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to transition lead' });
  }
};

module.exports = {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  transitionLead
};
