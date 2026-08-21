'use strict';
const { Router } = require('express');
const { query, suggestions, exportFile } = require('../controllers/a3Controller');

const router = Router();

// POST /api/a3/query — main NL query endpoint
router.post('/query', query);

// GET /api/a3/suggestions — quick-access chip suggestions for the UI
router.get('/suggestions', suggestions);

// GET & POST /api/a3/export — export reports & dataset files (CSV, Excel, XML, PDF, DOCX)
router.get('/export', exportFile);
router.post('/export', exportFile);

module.exports = router;
