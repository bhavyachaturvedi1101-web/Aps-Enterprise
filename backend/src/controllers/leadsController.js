const { Lead, ActivityLog } = require('../models');
const { isValidTransition, executeTransition } = require('../stateMachine/leadStateMachine');
const { withDb, isStrictDbMode } = require('../utils/dbPolicy');
const crmService = require('../services/crmService');

// GET /api/leads — List all leads
const getLeads = async (req, res, next) => {
  try {
    const leads = await withDb(
      async () => {
        return await Lead.findAll({
          order: [['createdAt', 'DESC']]
        });
      },
      () => {
        const { mockLeads } = require('../config/inMemoryStore');
        return mockLeads || [];
      }
    );
    res.json({ leads });
  } catch (error) {
    next(error);
  }
};

// GET /api/leads/:id — Get single lead details
const getLeadById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await withDb(
      async () => {
        let found = await Lead.findByPk(id);
        if (!found) {
          const formattedId = `LEAD-${id.padStart(3, '0')}`;
          found = await Lead.findByPk(formattedId);
        }
        return found;
      },
      () => {
        const { mockLeads } = require('../config/inMemoryStore');
        if (!mockLeads) return null;
        const cleanId = String(id).replace(/^LEAD-/, '').padStart(3, '0');
        return mockLeads.find(l => l.id === id || l.id === `LEAD-${cleanId}` || String(l.id).endsWith(String(id))) || null;
      }
    );

    if (!lead) return res.status(404).json({ error: 'Lead not found', code: 'RESOURCE_NOT_FOUND' });
    res.json({ lead });
  } catch (error) {
    next(error);
  }
};

// POST /api/leads — Create new lead
const createLead = async (req, res, next) => {
  try {
    const { name, phone, company, interest, budget, notes, source, stage, priority } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const lead = await withDb(
      async () => {
        const totalLeads = await Lead.count();
        const newId = `LEAD-${String(totalLeads + 1).padStart(3, '0')}-${Date.now().toString().slice(-4)}`;

        const created = await Lead.create({
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
          leadId: created.id,
          employeeId: req.user?.id || 'e2',
          action: `New Lead "${created.name}" created in CRM Board (Stage: ${created.stage})`,
          fromStage: 'None',
          toStage: created.stage
        });

        return created;
      },
      () => {
        const { mockLeads, mockActivityLogs } = require('../config/inMemoryStore');
        const newId = `LEAD-${String((mockLeads ? mockLeads.length : 0) + 1).padStart(3, '0')}`;
        const mockLead = {
          id: newId,
          name,
          phone: phone || '+91 98765 43210',
          company: company || `${name} Corp`,
          interest: interest || 'Fully Automatic Double Die Dona Pattal Machine',
          budget: budget || 125000.00,
          stage: stage || 'Enquiry',
          priority: priority || 'Warm',
          notes: notes || 'Direct entry via APS Operating System.',
          crmSynced: true,
          erpBookingCreated: false,
          tallyPaymentVerified: false,
          source: source || 'Direct Web',
          assignedEmployeeId: 'e1',
          createdAt: new Date().toISOString()
        };
        if (mockLeads) mockLeads.unshift(mockLead);
        if (mockActivityLogs) {
          mockActivityLogs.unshift({
            id: `log${Date.now()}`,
            leadId: mockLead.id,
            employeeId: req.user?.id || 'e1',
            action: `New Lead "${mockLead.name}" registered in CRM Board (Stage: ${mockLead.stage})`,
            createdAt: new Date().toISOString()
          });
        }
        return mockLead;
      }
    );

    // Background push to Teleforce CRM API
    crmService.createLead(lead).catch(err => {
      console.warn('[CRM Push Error]', err.message);
    });

    res.status(201).json({ success: true, lead });
  } catch (error) {
    next(error);
  }
};

// PUT /api/leads/:id — Update existing lead
const updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, company, interest, budget, notes, source, stage, priority } = req.body;

    const lead = await withDb(
      async () => {
        let found = await Lead.findByPk(id);
        if (!found) found = await Lead.findByPk(`LEAD-${id.padStart(3, '0')}`);
        if (found) {
          await found.update({
            name: name !== undefined ? name : found.name,
            phone: phone !== undefined ? phone : found.phone,
            company: company !== undefined ? company : found.company,
            interest: interest !== undefined ? interest : found.interest,
            budget: budget !== undefined ? budget : found.budget,
            notes: notes !== undefined ? notes : found.notes,
            source: source !== undefined ? source : found.source,
            stage: stage !== undefined ? stage : found.stage,
            priority: priority !== undefined ? priority : found.priority
          });
        }
        return found;
      },
      () => {
        const { mockLeads } = require('../config/inMemoryStore');
        if (!mockLeads) return null;
        const cleanId = String(id).replace(/^LEAD-/, '').padStart(3, '0');
        const found = mockLeads.find(l => l.id === id || l.id === `LEAD-${cleanId}` || String(l.id).endsWith(String(id)));
        if (found) {
          if (name !== undefined) found.name = name;
          if (phone !== undefined) found.phone = phone;
          if (company !== undefined) found.company = company;
          if (interest !== undefined) found.interest = interest;
          if (budget !== undefined) found.budget = budget;
          if (notes !== undefined) found.notes = notes;
          if (source !== undefined) found.source = source;
          if (stage !== undefined) found.stage = stage;
          if (priority !== undefined) found.priority = priority;
        }
        return found;
      }
    );

    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ success: true, lead });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/leads/:id — Delete lead
const deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lead = await withDb(
      async () => {
        let found = await Lead.findByPk(id);
        if (!found) found = await Lead.findByPk(`LEAD-${id.padStart(3, '0')}`);
        if (found) {
          await found.destroy();
        }
        return found;
      },
      () => {
        const { mockLeads } = require('../config/inMemoryStore');
        if (!mockLeads) return null;
        const cleanId = String(id).replace(/^LEAD-/, '').padStart(3, '0');
        const index = mockLeads.findIndex(l => l.id === id || l.id === `LEAD-${cleanId}` || String(l.id).endsWith(String(id)));
        if (index !== -1) {
          const removed = mockLeads[index];
          mockLeads.splice(index, 1);
          return removed;
        }
        return null;
      }
    );

    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ success: true, message: `Lead "${lead.name}" deleted successfully`, lead });
  } catch (error) {
    next(error);
  }
};

// POST /api/leads/:id/transition — Submit status transition
const transitionLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { toStage, employeeId, countersignedBy, simulateError } = req.body;

    if (!toStage) {
      return res.status(400).json({ error: 'toStage is required in the request body.' });
    }

    // Step 1: Find the lead
    const lead = await withDb(
      async () => {
        let found = await Lead.findByPk(id);
        if (!found) found = await Lead.findByPk(`LEAD-${id.padStart(3, '0')}`);
        return found;
      },
      () => {
        const { mockLeads } = require('../config/inMemoryStore');
        if (!mockLeads) return null;
        const cleanId = String(id).replace(/^LEAD-/, '').padStart(3, '0');
        return mockLeads.find(l => l.id === id || l.id === `LEAD-${cleanId}` || String(l.id).endsWith(String(id))) || null;
      }
    );

    if (!lead) return res.status(404).json({ error: 'Lead not found', code: 'RESOURCE_NOT_FOUND' });

    // Step 2: Validate state machine transition rules
    if (!isValidTransition(lead.stage, toStage)) {
      return res.status(422).json({
        error: `Invalid transition: Cannot move lead from "${lead.stage}" to "${toStage}".`,
        code: 'INVALID_TRANSITION',
        validTransitions: require('../stateMachine/leadStateMachine').VALID_TRANSITIONS[lead.stage] || []
      });
    }

    // Step 3: Execute transition side effects (including Tally 10% payment gate and countersign check)
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

    let activityEntry = null;

    if (typeof lead.save === 'function') {
      const { sequelize } = require('../config/db');
      const t = await sequelize.transaction();
      try {
        await lead.save({ transaction: t });
        activityEntry = await ActivityLog.create({
          id: `log${Date.now()}`,
          leadId: lead.id,
          employeeId: employeeId || req.user?.id || 'e1',
          countersignedBy: countersignedBy || null,
          action: countersignedBy
            ? `Countersigned transition: ${oldStage} → ${toStage} by ${countersignedBy}`
            : `Transitioned Lead to ${toStage}`,
          fromStage: oldStage,
          toStage: toStage
        }, { transaction: t });
        await t.commit();
      } catch (e) {
        await t.rollback();
        if (isStrictDbMode()) {
          throw e;
        }
        console.warn('Postgres DB transition transaction rolled back:', e.message);
      }
    } else {
      // In-memory update for unit testing
      const { mockActivityLogs } = require('../config/inMemoryStore');
      if (mockActivityLogs) {
        activityEntry = {
          id: `log${Date.now()}`,
          leadId: lead.id,
          employeeId: employeeId || req.user?.id || 'e1',
          countersignedBy: countersignedBy || null,
          action: countersignedBy
            ? `Countersigned transition: ${oldStage} → ${toStage} by ${countersignedBy}`
            : `Transitioned Lead to ${toStage}`,
          fromStage: oldStage,
          toStage: toStage,
          createdAt: new Date().toISOString()
        };
        mockActivityLogs.unshift(activityEntry);
      }
    }

    res.json({
      success: true,
      message: `Lead "${lead.name}" successfully transitioned from "${oldStage}" to "${toStage}".`,
      integrationData: result.integrationData,
      activityLog: activityEntry
    });

    // Auto-trigger WhatsApp on key stage changes (non-blocking)
    try {
      const whatsappService = require('../services/whatsappService');
      await whatsappService.onLeadStageChange(lead, toStage);
    } catch (waErr) {
      console.warn('[WhatsApp Auto-trigger] Failed silently:', waErr.message);
    }
  } catch (error) {
    next(error);
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
