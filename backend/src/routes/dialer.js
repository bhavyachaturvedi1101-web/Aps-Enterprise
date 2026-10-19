const express = require('express');
const router = express.Router();
const dialerService = require('../services/dialerService');
const { Lead } = require('../models');
const { authorize } = require('../middleware/rbacMiddleware');

// GET /api/dialer/queue — full priority queue with stats (Admin, Manager & Employee)
router.get('/queue', authorize(['admin', 'manager', 'employee']), async (req, res) => {
  try {
    const { queue, stats } = dialerService.getQueue();
    const user = req.user;
    const isEmployee = user && user.role === 'employee' && !['admin', 'manager'].includes((user.role || '').toLowerCase());
    const empId = user ? (user.employeeId || user.id) : null;

    let userQueue = queue;
    if (isEmployee) {
      userQueue = queue.filter(c => 
        !c.agent || 
        !c.assignedEmployeeId ||
        c.agent === user.name ||
        c.assignedEmployeeId === empId ||
        c.assignedEmployeeId === user.id
      );
    }

    const formattedQueue = userQueue.map((c, idx) => ({
      ...c,
      queueId: c.id,
      status: idx === 0 ? 'In Progress' : 'Pending'
    }));
    res.json({
      success: true,
      queue: formattedQueue,
      totalQueued: formattedQueue.length,
      activeCallsCount: stats.active || (formattedQueue.length > 0 ? 1 : 0),
      stats
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dialer queue' });
  }
});

// GET /api/dialer/stats — live stats only (Admin, Manager & Employee)
router.get('/stats', authorize(['admin', 'manager', 'employee']), (req, res) => {
  res.json(dialerService.getStats());
});

// POST /api/dialer/enqueue — add a lead to the queue (Admin / Manager / Employee)
router.post('/enqueue', authorize(['admin', 'manager', 'employee']), async (req, res) => {
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

// POST /api/dialer/call — trigger a call for a queue entry (Admin / Manager / Employee)
router.post('/call', authorize(['admin', 'manager', 'employee']), async (req, res) => {
  try {
    const { callId, leadId } = req.body;
    if (!leadId && !callId) {
      return res.status(400).json({ error: 'leadId is required' });
    }

    let targetLead = null;
    if (leadId) {
      try { targetLead = await Lead.findByPk(leadId); } catch {}
      if (!targetLead) {
        const { mockLeads } = require('../config/inMemoryStore');
        targetLead = (mockLeads || []).find(l => l.id === leadId);
      }
      if (!targetLead && !callId) {
        return res.status(404).json({ error: 'Lead not found' });
      }
    }

    let id = callId;
    if (!id && targetLead) {
      const { queue } = dialerService.getQueue();
      const existing = queue.find(q => q.leadId === targetLead.id || q.id === targetLead.id);
      if (existing) {
        id = existing.id;
      } else {
        const entry = dialerService.enqueue(targetLead, 'Normal');
        id = entry.id;
      }
    }

    if (!id) {
      return res.status(404).json({ error: 'Lead not found in queue' });
    }

    const callSessionId = `DIAL-SESS-${Date.now()}`;
    const result = await dialerService.triggerCall(id);

    return res.json({
      success: true,
      message: `Outbound call initiated for lead ${leadId || id}`,
      callSessionId,
      ...result
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to initiate call', message: err.message });
  }
});

// PATCH /api/dialer/call/:id/status — update call status (Admin / Manager / Employee)
router.patch('/call/:id/status', authorize(['admin', 'manager', 'employee']), (req, res) => {
  try {
    const { status, outcome } = req.body;
    const updated = dialerService.updateStatus(req.params.id, status, outcome);
    if (!updated) return res.status(404).json({ error: 'Call not found' });
    res.json({ success: true, call: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update call status' });
  }
});

// POST /api/dialer/refresh — rebuild queue from DB (Admin / Manager)
router.post('/refresh', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const result = await dialerService.refreshQueue();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to refresh queue' });
  }
});

module.exports = router;
