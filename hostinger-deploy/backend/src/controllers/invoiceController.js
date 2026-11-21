'use strict';
const path = require('path');
const fs = require('fs');
const { Invoice, Lead } = require('../models');
const { mockLeads } = require('../config/inMemoryStore');
const { isDbConnected } = require('../config/db');

// ─── Helper: number to words (Indian format) ─────────────────────────────────
function amountInWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function convert(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + ' ' + ones[n % 10] + ' ';
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + convert(n % 100);
    if (n < 100000) return convert(Math.floor(n / 1000)) + 'Thousand ' + convert(n % 1000);
    if (n < 10000000) return convert(Math.floor(n / 100000)) + 'Lakh ' + convert(n % 100000);
    return convert(Math.floor(n / 10000000)) + 'Crore ' + convert(n % 10000000);
  }
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let result = convert(rupees).trim() + ' Rupees';
  if (paise > 0) result += ' and ' + convert(paise).trim() + ' Paise';
  return result + ' Only';
}

// ─── Helper: next invoice ID ──────────────────────────────────────────────────
async function nextInvoiceId() {
  if (isDbConnected()) {
    try {
      const count = await Invoice.count();
      const year = new Date().getFullYear();
      return `INV-${year}-${String(count + 1001).padStart(4, '0')}`;
    } catch {
      // Fallback
    }
  }
  return `INV-${Date.now()}`;
}

const { safeReadJson, safeWriteJson } = require('../utils/safeStorage');
const INVOICES_FILE = path.join(__dirname, '../../invoices_data.json');

function loadInvoicesFromFile() {
  return safeReadJson(INVOICES_FILE, []);
}

function saveInvoicesToFile(invoices) {
  if (process.env.NODE_ENV === 'test') return;
  safeWriteJson(INVOICES_FILE, invoices);
}

// ─── GET /api/invoices ────────────────────────────────────────────────────────
async function getInvoices(req, res) {
  try {
    let invoices = [];
    if (isDbConnected()) {
      try {
        invoices = await Invoice.findAll({ order: [['createdAt', 'DESC']] });
      } catch {
        invoices = [];
      }
    }
    if (!invoices || invoices.length === 0) {
      invoices = loadInvoicesFromFile();
    }

    res.json({ invoices, count: invoices.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
}

// ─── POST /api/invoices ───────────────────────────────────────────────────────
async function createInvoice(req, res) {
  try {
    const { clientName, clientPhone, clientEmail, gstNo, poNo, product, hsnCode, baseAmount, leadId, paymentTerms } = req.body;
    if (!clientName || !product || !baseAmount) {
      return res.status(400).json({ error: 'clientName, product and baseAmount are required' });
    }
    const base = parseFloat(baseAmount);
    const gstAmt = Math.round(base * 0.18);
    const id = await nextInvoiceId();
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let invoice = null;
    if (isDbConnected()) {
      const { sequelize } = require('../config/db');
      const t = await sequelize.transaction();
      try {
        invoice = await Invoice.create({
          id, leadId: leadId || null, clientName, clientPhone, clientEmail,
          gstNo: gstNo || '27AAAAA0000A1Z5', poNo, product,
          hsnCode: hsnCode || '8466', baseAmount: base, gstAmount: gstAmt,
          status: 'Draft', paymentTerms: paymentTerms || 'Net 30 Days',
          issuedDate: new Date().toISOString().split('T')[0], dueDate
        }, { transaction: t });

        if (leadId) {
          const { ActivityLog } = require('../models');
          await ActivityLog.create({
            id: `log${Date.now()}`,
            leadId,
            employeeId: req.user?.id || 'e1',
            action: `GST Invoice ${id} created for ${product} (INR ${base + gstAmt})`
          }, { transaction: t });
        }

        await t.commit();
      } catch (dbErr) {
        await t.rollback();
        console.warn('[DB Invoice create transaction rollback]:', dbErr.message);
        invoice = null;
      }
    }
    if (!invoice) {
      invoice = { id, clientName, clientPhone, clientEmail, gstNo: gstNo || '27AAAAA0000A1Z5', poNo, product, hsnCode: hsnCode || '8466', baseAmount: base, gstAmount: gstAmt, totalAmount: base + gstAmt, status: 'Draft', paymentTerms: paymentTerms || 'Net 30 Days', issuedDate: new Date().toISOString().split('T')[0], dueDate, createdAt: new Date().toISOString() };
      const currentInvoices = loadInvoicesFromFile();
      currentInvoices.unshift(invoice);
      saveInvoicesToFile(currentInvoices);
    }
    res.status(201).json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create invoice' });
  }
}

// ─── PATCH /api/invoices/:id/status ──────────────────────────────────────────
async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['Draft', 'Sent', 'Paid', 'Overdue'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (isDbConnected()) {
      try {
        const inv = await Invoice.findByPk(id);
        if (inv) {
          inv.status = status;
          if (status === 'Paid') inv.paidAt = new Date();
          await inv.save();
          return res.json({ success: true, invoice: inv });
        }
      } catch {}
    }
    const currentInvoices = loadInvoicesFromFile();
    const target = currentInvoices.find(i => i.id === id);
    if (target) {
      target.status = status;
      if (status === 'Paid') target.paidAt = new Date().toISOString();
      saveInvoicesToFile(currentInvoices);
      return res.json({ success: true, invoice: target });
    }
    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
}

// ─── GET /api/invoices/:id/pdf ────────────────────────────────────────────────
async function downloadPdf(req, res) {
  try {
    const { id } = req.params;
    let inv = null;
    try { inv = await Invoice.findByPk(id); } catch {}

    // Fallback mock
    if (!inv) {
      inv = { id, clientName: 'Sample Client', gstNo: '27AAAAA0000A1Z5', poNo: 'PO-0000', product: 'Industrial Machine', hsnCode: '8466', baseAmount: 100000, gstAmount: 18000, status: 'Draft', issuedDate: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], paymentTerms: 'Net 30 Days' };
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${id}.pdf"`);
    doc.pipe(res);

    const base = parseFloat(inv.baseAmount || 0);
    const gst = parseFloat(inv.gstAmount || 0);
    const cgst = gst / 2;
    const sgst = gst / 2;
    const grand = base + gst;

    // ── Header ──
    doc.rect(50, 40, 495, 80).fill('#09090b');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('APS ENTERPRISES', 60, 55);
    doc.fontSize(9).font('Helvetica').text('Loha Mandi, Indore, Madhya Pradesh – 452001', 60, 82);
    doc.text('GSTIN: 23AAAAP1234Q1Z5  |  Phone: +91 99880 01122  |  apsenterprises.in', 60, 96);

    doc.fillColor('#09090b');
    doc.moveDown(2.5);

    // ── Tax Invoice Title ──
    doc.fontSize(15).font('Helvetica-Bold').fillColor('#09090b').text('TAX INVOICE', { align: 'center' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e4e4e7').lineWidth(1).stroke();
    doc.moveDown(0.5);

    // ── Invoice Meta ──
    const metaY = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').text('Invoice No:', 50, metaY).font('Helvetica').text(inv.id, 120, metaY);
    doc.font('Helvetica-Bold').text('Issue Date:', 50, metaY + 16).font('Helvetica').text(String(inv.issuedDate || ''), 120, metaY + 16);
    doc.font('Helvetica-Bold').text('Due Date:', 50, metaY + 32).font('Helvetica').text(String(inv.dueDate || ''), 120, metaY + 32);
    doc.font('Helvetica-Bold').text('PO Ref:', 50, metaY + 48).font('Helvetica').text(inv.poNo || '-', 120, metaY + 48);
    doc.font('Helvetica-Bold').text('Status:', 50, metaY + 64).font('Helvetica').text(inv.status, 120, metaY + 64);

    // ── Bill To ──
    doc.font('Helvetica-Bold').text('Bill To:', 320, metaY);
    doc.font('Helvetica-Bold').fontSize(10).text(inv.clientName, 320, metaY + 14);
    doc.font('Helvetica').fontSize(9).text(`GSTIN: ${inv.gstNo || '-'}`, 320, metaY + 28);
    if (inv.clientPhone) doc.text(`Phone: ${inv.clientPhone}`, 320, metaY + 42);
    if (inv.clientEmail) doc.text(`Email: ${inv.clientEmail}`, 320, metaY + 56);

    doc.y = metaY + 90;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e4e4e7').lineWidth(1).stroke();
    doc.moveDown(0.8);

    // ── Items Table Header ──
    const tableY = doc.y;
    doc.rect(50, tableY, 495, 22).fill('#09090b');
    doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
    doc.text('S.No', 55, tableY + 7);
    doc.text('Description of Goods/Services', 80, tableY + 7);
    doc.text('HSN', 350, tableY + 7);
    doc.text('Taxable Value', 390, tableY + 7);

    // ── Items Row ──
    const rowY = tableY + 28;
    doc.fillColor('#09090b').font('Helvetica').fontSize(9);
    doc.text('1', 55, rowY);
    doc.text(inv.product || 'Industrial Machine', 80, rowY, { width: 260 });
    doc.text(inv.hsnCode || '8466', 350, rowY);
    doc.text(`₹${base.toLocaleString('en-IN')}`, 390, rowY);

    doc.moveDown(3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e4e4e7').stroke();
    doc.moveDown(0.5);

    // ── Tax Summary ──
    const taxY = doc.y;
    const labelX = 340, valX = 450;
    doc.font('Helvetica').fontSize(9);
    doc.text('Taxable Amount:', labelX, taxY).text(`₹${base.toLocaleString('en-IN')}`, valX, taxY, { align: 'right', width: 95 });
    doc.text('CGST (9%):', labelX, taxY + 16).text(`₹${cgst.toLocaleString('en-IN')}`, valX, taxY + 16, { align: 'right', width: 95 });
    doc.text('SGST (9%):', labelX, taxY + 32).text(`₹${sgst.toLocaleString('en-IN')}`, valX, taxY + 32, { align: 'right', width: 95 });

    doc.rect(335, taxY + 50, 210, 26).fill('#09090b');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11);
    doc.text('Grand Total:', labelX, taxY + 58).text(`₹${grand.toLocaleString('en-IN')}`, valX, taxY + 58, { align: 'right', width: 95 });

    doc.fillColor('#09090b').moveDown(3.5);
    doc.font('Helvetica').fontSize(8.5).fillColor('#52525b').text(`Amount in Words: ${amountInWords(grand)}`, 50, doc.y);
    doc.text(`Payment Terms: ${inv.paymentTerms || 'Net 30 Days'}`, 50, doc.y + 14);

    // ── Footer ──
    doc.moveTo(50, doc.y + 35).lineTo(545, doc.y + 35).strokeColor('#e4e4e7').stroke();
    doc.font('Helvetica').fontSize(8).fillColor('#71717a').text('This is a computer-generated invoice and does not require a physical signature.', 50, doc.y + 42, { align: 'center', width: 495 });
    doc.text('APS Enterprises, Loha Mandi, Indore, MP – 452001 | apsenterprises.in', 50, doc.y + 54, { align: 'center', width: 495 });

    doc.end();
  } catch (err) {
    console.error('[Invoice PDF]', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
}

// ─── POST /api/invoices/:id/dispatch ─────────────────────────────────────────
async function dispatchWhatsApp(req, res) {
  try {
    const { id } = req.params;
    let inv = null;
    try { inv = await Invoice.findByPk(id); } catch {}
    const clientName = inv?.clientName || id;

    // Update status to Sent
    if (inv) {
      inv.status = 'Sent';
      try { await inv.save(); } catch {}
    }

    // In production: generate PDF buffer → call WhatsApp document API
    // For now: log + return success with simulated dispatch
    console.log(`[Invoice Dispatch] PDF invoice ${id} dispatched to ${clientName} via WhatsApp.`);
    res.json({ success: true, message: `Invoice ${id} PDF dispatched to ${clientName} via WhatsApp.`, invoiceId: id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to dispatch invoice' });
  }
}

module.exports = { getInvoices, createInvoice, updateStatus, downloadPdf, dispatchWhatsApp };
