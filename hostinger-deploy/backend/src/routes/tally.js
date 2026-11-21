const express = require('express');
const router = express.Router();
const tallyService = require('../services/tallyService');
const { authorize } = require('../middleware/rbacMiddleware');

// GET /api/tally/status — ping Tally server health
router.get('/status', async (req, res) => {
  try {
    const status = await tallyService.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Failed to check Tally status', online: false });
  }
});

// GET /api/tally/vouchers — fetch vouchers (Tally or cached)
router.get('/vouchers', async (req, res) => {
  try {
    const { from, to } = req.query;
    const vouchers = await tallyService.fetchVouchers(from, to);
    const syncInfo = tallyService.getLastSync();
    res.json({ vouchers, count: vouchers.length, ...syncInfo });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vouchers' });
  }
});

// POST /api/tally/vouchers — create/insert a new voucher record
router.post('/vouchers', authorize(['admin', 'manager', 'accountant']), async (req, res) => {
  try {
    const newVoucher = tallyService.addVoucher(req.body);
    res.status(201).json({ success: true, voucher: newVoucher });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create voucher', message: err.message });
  }
});

// GET /api/tally/sync — trigger immediate sync
router.get('/sync', authorize(['admin', 'manager', 'accountant']), async (req, res) => {
  try {
    const result = await tallyService.syncVouchers();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Sync failed', message: err.message });
  }
});

// GET /api/tally/verify/:leadId — verify 10% advance for a lead
router.get('/verify/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { budget } = req.query;
    const result = await tallyService.verify10PercentPayment(leadId, budget || 20000);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Verification failed', message: err.message });
  }
});

module.exports = router;
