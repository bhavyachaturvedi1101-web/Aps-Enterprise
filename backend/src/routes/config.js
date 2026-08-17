const express = require('express');
const router = express.Router();
const { systemConfig } = require('../config/inMemoryStore');

// GET /api/config — Get system configuration & business rules
router.get('/', (req, res) => {
  res.json({ config: systemConfig });
});

// POST /api/config/approval-policy — Update single-action vs countersign policy
router.post('/approval-policy', (req, res) => {
  const { policy } = req.body;
  if (!['single-action', 'countersign'].includes(policy)) {
    return res.status(400).json({
      error: 'Invalid policy option. Allowed values: "single-action", "countersign".'
    });
  }

  systemConfig.approvalPolicy = policy;
  console.log(`[SystemConfig] Business approval policy updated to: "${policy}".`);
  res.json({
    success: true,
    message: `System approval policy updated to "${policy}".`,
    config: systemConfig
  });
});

module.exports = router;
