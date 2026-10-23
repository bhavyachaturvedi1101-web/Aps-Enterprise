'use strict';
const { Router } = require('express');
const { query, suggestions, exportFile, getMemories, addMemory, deleteMemory, clearMemories } = require('../controllers/a3Controller');
const { processQuery } = require('../services/a3Service');

const router = Router();

// POST /api/a3/query — main NL query endpoint
router.post('/query', query);

// GET /api/a3/suggestions — quick-access chip suggestions for the UI
router.get('/suggestions', suggestions);

// GET & POST /api/a3/export — export reports & dataset files (CSV, Excel, XML, PDF, DOCX)
router.get('/export', exportFile);
router.post('/export', exportFile);

// Persistent AI Memory endpoints
router.get('/memory', getMemories);
router.post('/memory', addMemory);
router.delete('/memory/:id', deleteMemory);
router.delete('/memory', clearMemories);

// POST /api/a3/stream — Server-Sent Events streaming response
router.post('/stream', async (req, res) => {
  try {
    const { query: userQuery, conversationId, userRole, userName, employeeId } = req.body;
    if (!userQuery || !userQuery.trim()) {
      return res.status(400).json({ error: 'query is required' });
    }

    const effectiveRole = (userRole || req.user?.role || '').toLowerCase().trim();
    const effectiveName = userName || req.user?.name || 'User';
    const effectiveEmpId = employeeId || req.user?.employeeId || req.user?.id || null;

    const rawUserScope = `${effectiveRole || 'user'}_${String(effectiveEmpId || effectiveName).toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;
    const safeConvId = conversationId && conversationId.includes(rawUserScope)
      ? conversationId
      : `conv_${rawUserScope}_${conversationId || Date.now()}`;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const sendEvent = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const result = await processQuery(userQuery.trim(), safeConvId, {
        userRole: effectiveRole,
        userName: effectiveName,
        employeeId: effectiveEmpId
      });
      const text = result.text || '';

      // Stream words with slight delay for typewriter effect
      const words = text.split(' ');
      for (let i = 0; i < words.length; i++) {
        sendEvent({ type: 'token', token: (i === 0 ? '' : ' ') + words[i] });
        await new Promise(r => setTimeout(r, 18));
      }

      // Send full result at the end (table, chart, intent)
      sendEvent({
        type: 'done',
        table: result.table || null,
        chart: result.chart || null,
        intent: result.intent || 'unknown',
        processingMs: result.processingMs || 0
      });
    } catch (err) {
      sendEvent({ type: 'error', message: err.message });
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.status(500).json({ error: 'Stream failed' });
  }
});

module.exports = router;
