const express = require('express');
const router = express.Router();
const { processQuery } = require('../services/a3Service');

const { authorize } = require('../middleware/rbacMiddleware');

// POST /api/chat/query — AI Assistant Query Route (delegates to a3Service)
router.post('/query', authorize(['admin', 'manager', 'accountant', 'employee']), async (req, res, next) => {
  try {
    const { query, conversationId } = req.body;
    const q = (query || '').trim();
    if (!q) {
      return res.status(400).json({ error: 'query is required' });
    }
    const t0 = Date.now();
    const result = await processQuery(q, conversationId, req.user);
    const processingMs = Date.now() - t0;
    return res.json({
      ...result,
      answer: result.text,
      query: q,
      processingMs
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
