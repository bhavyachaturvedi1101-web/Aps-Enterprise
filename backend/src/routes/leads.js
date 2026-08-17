const express = require('express');
const router = express.Router();
const { getLeads, getLeadById, createLead, transitionLead } = require('../controllers/leadsController');

// GET all leads
router.get('/', getLeads);

// POST create new lead
router.post('/', createLead);

// GET single lead details
router.get('/:id', getLeadById);

// POST lead stage transition (state machine + integration triggers)
router.post('/:id/transition', transitionLead);

module.exports = router;
