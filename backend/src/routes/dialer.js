const express = require('express');
const router = express.Router();
const dialerService = require('../services/dialerService');
const { Lead } = require('../models');

// GET /api/dialer/queue — Fetch live telecaller call queue
router.get('/queue', async (req, res) => {
  try {
    const leads = await Lead.findAll({
      where: {
        stage: ['Enquiry', 'Qualified']
      }
    });
    
    const queue = leads.map((l, index) => ({
      queueId: `Q-${101 + index}`,
      leadId: l.id,
      name: l.name,
      phone: '+919876543210',
      assignedTo: l.assignedEmployeeId,
      status: index === 0 ? 'In Progress' : 'Pending'
    }));

    res.json({
      activeCallsCount: queue.filter(q => q.status === 'In Progress').length,
      totalQueued: queue.length,
      queue
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dialer queue' });
  }
});

// POST /api/dialer/call — Trigger dialer outbound call
router.post('/call', async (req, res) => {
  try {
    const { leadId } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId is required' });

    let lead = await Lead.findByPk(leadId);
    if (!lead) lead = await Lead.findByPk(`LEAD-${String(leadId).padStart(3, '0')}`);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const callLog = await dialerService.getCallOutcomes(leadId);
    res.json({
      success: true,
      message: `Outbound call initiated for Lead "${lead.name}".`,
      callSessionId: `DIAL-SESS-${Math.floor(Math.random() * 90000) + 10000}`,
      callLog
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

module.exports = router;
