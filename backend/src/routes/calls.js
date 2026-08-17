const express = require('express');
const router = express.Router();
const callsService = require('../services/callsService');

// POST /api/calls/outcome — Ingest structured call result from A1 Voice Agent
router.post('/outcome', async (req, res) => {
  try {
    const result = await callsService.processCallOutcome(req.body);
    res.status(201).json(result);
  } catch (err) {
    console.error('[Calls API Error]', err);
    res.status(500).json({ error: 'Failed to ingest call outcome', message: err.message });
  }
});

// GET /api/calls — Fetch all voice call logs
router.get('/', async (req, res) => {
  const calls = await callsService.getCalls();
  res.json({ calls });
});

module.exports = router;
