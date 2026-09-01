const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invoiceController');

// GET  /api/invoices          — list all invoices
router.get('/', ctrl.getInvoices);

// POST /api/invoices          — create new invoice
router.post('/', ctrl.createInvoice);

// PATCH /api/invoices/:id/status — update status (Draft/Sent/Paid/Overdue)
router.patch('/:id/status', ctrl.updateStatus);

// GET /api/invoices/:id/pdf   — stream real GST PDF
router.get('/:id/pdf', ctrl.downloadPdf);

// POST /api/invoices/:id/dispatch — dispatch PDF via WhatsApp
router.post('/:id/dispatch', ctrl.dispatchWhatsApp);

module.exports = router;
