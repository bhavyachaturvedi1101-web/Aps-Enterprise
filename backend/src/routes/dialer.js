const express = require('express');
const router = express.Router();
const dialerService = require('../services/dialerService');
const { Lead } = require('../models');

// GET /api/dialer/queue — full priority queue with stats
router.get('/queue', async (req, res) => {
  try {
    const { queue, stats } = dialerService.getQueue();
    res.json({ ...stats, queue });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dialer queue' });
  }
});

// GET /api/dialer/stats — live stats only
router.get('/stats', (req, res) => {
  res.json(dialerService.getStats());
});

// POST /api/dialer/enqueue — add a lead to the queue
router.post('/enqueue', async (req, res) => {
  try {
    const { leadId, priority, agent } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId is required' });

    let lead = null;
    try { lead = await Lead.findByPk(leadId); } catch {}
    if (!lead) {
      const { mockLeads } = require('../config/inMemoryStore');
      lead = (mockLeads || []).find(l => l.id === leadId);
    }
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const entry = dialerService.enqueue(lead, priority || 'Normal', agent);
    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to enqueue lead' });
  }
});

// POST /api/dialer/call — trigger a call for a queue entry
router.post('/call', async (req, res) => {
  try {
    const { callId, leadId } = req.body;
    let id = callId;

    // If only leadId provided, find or enqueue
    if (!id && leadId) {
      const { queue } = dialerService.getQueue();
      const entry = queue.find(c => c.leadId === leadId);
      id = entry?.id;
      if (!id) {
        let lead = null;
        try { lead = await Lead.findByPk(leadId); } catch {}
        if (lead) {
          const enqueued = dialerService.enqueue(lead.toJSON(), 'High');
          id = enqueued.id;
        }
      }
    }

    if (!id) return res.status(400).json({ error: 'callId or leadId required' });

    const result = await dialerService.triggerCall(id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to initiate call', message: err.message });
  }
});

// PATCH /api/dialer/call/:id/status — update call status
router.patch('/call/:id/status', (req, res) => {
  try {
    const { status, outcome } = req.body;
    const updated = dialerService.updateStatus(req.params.id, status, outcome);
    if (!updated) return res.status(404).json({ error: 'Call not found' });
    res.json({ success: true, call: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update call status' });
  }
});

// POST /api/dialer/refresh — rebuild queue from DB
router.post('/refresh', async (req, res) => {
  try {
    const result = await dialerService.refreshQueue();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to refresh queue' });
  }
});

module.exports = router;
