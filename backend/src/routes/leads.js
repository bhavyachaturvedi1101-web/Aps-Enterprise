const express = require('express');
const router = express.Router();
const { getLeads, getLeadById, createLead, updateLead, deleteLead, transitionLead } = require('../controllers/leadsController');
const { validateBody, createLeadSchema, transitionLeadSchema } = require('../middleware/validate');
const { authorize } = require('../middleware/rbacMiddleware');

// GET all leads
router.get('/', authorize(['admin', 'manager', 'accountant', 'employee']), getLeads);

// POST create new lead
router.post('/', authorize(['admin', 'manager', 'employee']), validateBody(createLeadSchema), createLead);

// GET single lead details
router.get('/:id', authorize(['admin', 'manager', 'accountant', 'employee']), getLeadById);

// PUT update lead
router.put('/:id', authorize(['admin', 'manager', 'employee']), updateLead);

// DELETE lead (Admin & Manager only)
router.delete('/:id', authorize(['admin', 'manager']), deleteLead);

// POST lead stage transition (state machine + integration triggers)
router.post('/:id/transition', authorize(['admin', 'manager', 'employee']), validateBody(transitionLeadSchema), transitionLead);

module.exports = router;
