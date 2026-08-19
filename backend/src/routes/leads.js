const express = require('express');
const router = express.Router();
const { getLeads, getLeadById, createLead, updateLead, deleteLead, transitionLead } = require('../controllers/leadsController');

// GET all leads
router.get('/', getLeads);

// POST create new lead
router.post('/', createLead);

// GET single lead details
router.get('/:id', getLeadById);

// PUT update lead
router.put('/:id', updateLead);

// DELETE lead
router.delete('/:id', deleteLead);

// POST lead stage transition (state machine + integration triggers)
router.post('/:id/transition', transitionLead);

module.exports = router;
