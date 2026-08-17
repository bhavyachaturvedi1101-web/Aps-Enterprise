const express = require('express');
const router = express.Router();
const dialerService = require('../services/dialerService');
const { mockLeads } = require('../config/inMemoryStore');

// GET /api/dialer/queue — Fetch live telecaller call queue
router.get('/queue', async (req, res) => {
  const queue = mockLeads
    .filter(l => l.stage === 'Enquiry' || l.stage === 'Qualified')
    .map((l, index) => ({
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
});

// POST /api/dialer/call — Trigger dialer outbound call
router.post('/call', async (req, res) => {
  const { leadId } = req.body;
  if (!leadId) return res.status(400).json({ error: 'leadId is required' });

  const lead = mockLeads.find(l => l.id === leadId);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const callLog = await dialerService.getCallOutcomes(leadId);
  res.json({
    success: true,
    message: `Outbound call initiated for Lead "${lead.name}".`,
    callSessionId: `DIAL-SESS-${Math.floor(Math.random() * 90000) + 10000}`,
    callLog
  });
});

module.exports = router;
