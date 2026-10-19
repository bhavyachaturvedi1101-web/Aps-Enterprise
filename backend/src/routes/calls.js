const express = require('express');
const router = express.Router();
const callsService = require('../services/callsService');
const { authorize } = require('../middleware/rbacMiddleware');

// POST /api/calls/outcome — Ingest structured call result from A1 Voice Agent
router.post('/outcome', authorize(['admin', 'manager', 'employee']), async (req, res) => {
  try {
    const result = await callsService.processCallOutcome(req.body);
    res.status(201).json(result);
  } catch (err) {
    console.error('[Calls API Error]', err);
    res.status(500).json({ error: 'Failed to ingest call outcome', message: err.message });
  }
});

// GET /api/calls — Fetch voice call logs (Admin, Manager & Employee)
router.get('/', authorize(['admin', 'manager', 'employee']), async (req, res) => {
  const calls = await callsService.getCalls();
  const user = req.user;
  const isEmployee = user && user.role === 'employee' && !['admin', 'manager'].includes((user.role || '').toLowerCase());
  const empId = user ? (user.employeeId || user.id) : null;

  if (isEmployee) {
    const userCalls = (calls || []).filter(c =>
      !c.agent ||
      !c.employeeId ||
      c.agent === user.name ||
      c.employeeId === empId ||
      c.employeeId === user.id
    );
    return res.json({ calls: userCalls });
  }

  res.json({ calls });
});

module.exports = router;
