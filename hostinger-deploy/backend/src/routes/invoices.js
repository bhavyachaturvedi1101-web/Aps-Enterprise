const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invoiceController');
const { validateBody, createInvoiceSchema } = require('../middleware/validate');
const { authorize } = require('../middleware/rbacMiddleware');

// GET  /api/invoices          — list all invoices
router.get('/', ctrl.getInvoices);

// POST /api/invoices          — create new invoice
router.post('/', authorize(['admin', 'manager', 'accountant']), validateBody(createInvoiceSchema), ctrl.createInvoice);

// PATCH /api/invoices/:id/status — update status (Draft/Sent/Paid/Overdue)
router.patch('/:id/status', authorize(['admin', 'manager', 'accountant']), ctrl.updateStatus);

// GET /api/invoices/:id/pdf   — stream real GST PDF
router.get('/:id/pdf', ctrl.downloadPdf);

// POST /api/invoices/:id/dispatch — dispatch PDF via WhatsApp
router.post('/:id/dispatch', authorize(['admin', 'manager', 'accountant']), ctrl.dispatchWhatsApp);

module.exports = router;
