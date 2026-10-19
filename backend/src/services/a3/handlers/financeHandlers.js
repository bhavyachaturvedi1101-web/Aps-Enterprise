'use strict';

let _store = null;
function getStore() {
  if (!_store) {
    try { _store = require('../../../config/inMemoryStore'); } catch { _store = {}; }
  }
  return _store;
}

async function handleInvoicesOptions() {
  return {
    text: `### Financial Billing Controls\nSelect invoicing operation:`,
    options: [
      'Generate GST tax invoice for lead deposit',
      'Review pending 10% payment vouchers in Tally',
      'Export financial billing ledger summary'
    ]
  };
}

async function handleInvoices() {
  const store = await getStore();
  const invoices = store.mockInvoices || [];
  return {
    text: `### 🧾 Customer Invoice Ledger\nFound **${invoices.length} invoices** recorded in system.`,
    table: invoices.slice(0, 10).map(i => ({
      Invoice: i.invoiceNumber,
      Customer: i.customerName,
      Total: `₹${Number(i.totalAmount || 0).toLocaleString('en-IN')}`,
      Status: i.status
    })),
    chart: null
  };
}

async function handleInvoiceGenerator(query) {
  const amountMatch = (query || '').match(/([0-9,]+)/);
  const rawAmt = amountMatch ? parseInt(amountMatch[1].replace(/,/g, ''), 10) : 42000;
  const gst = Math.round(rawAmt * 0.18);
  const total = rawAmt + gst;
  const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    text: `### 🧾 GST Tax Invoice Generated\n\n• **Invoice #:** \`${invNumber}\`\n• **Subtotal:** ₹${rawAmt.toLocaleString('en-IN')}\n• **GST (18%):** ₹${gst.toLocaleString('en-IN')}\n• **Total Payable:** **₹${total.toLocaleString('en-IN')}**`,
    table: [
      { Field: 'Invoice Number', Value: invNumber },
      { Field: 'Taxable Amount', Value: `₹${rawAmt.toLocaleString('en-IN')}` },
      { Field: 'IGST @ 18%', Value: `₹${gst.toLocaleString('en-IN')}` },
      { Field: 'Grand Total', Value: `₹${total.toLocaleString('en-IN')}` }
    ],
    chart: null
  };
}

async function handleMarginCalculator(query) {
  const amountMatch = (query || '').match(/([0-9,]+)/);
  const revenue = amountMatch ? parseInt(amountMatch[1].replace(/,/g, ''), 10) : 150000;
  const cost = Math.round(revenue * 0.68);
  const profit = revenue - cost;
  const marginPct = Math.round((profit / revenue) * 100);

  return {
    text: `### 💰 Machine Order Profit Margin Analysis\n\n• **Order Revenue:** ₹${revenue.toLocaleString('en-IN')}\n• **Manufacturing Cost:** ₹${cost.toLocaleString('en-IN')}\n• **Net Profit:** **₹${profit.toLocaleString('en-IN')}** (${marginPct}% margin)`,
    table: [
      { Metric: 'Revenue', Value: `₹${revenue.toLocaleString('en-IN')}` },
      { Metric: 'Estimated Cost', Value: `₹${cost.toLocaleString('en-IN')}` },
      { Metric: 'Gross Profit', Value: `₹${profit.toLocaleString('en-IN')}` },
      { Metric: 'Margin %', Value: `${marginPct}%` }
    ],
    chart: null
  };
}

async function handleActionPostTally(query) {
  const tallyService = require('../../tallyService');
  const res = await tallyService.postVoucher({
    ledger: 'Advance Payments',
    amount: 25000,
    narration: '10% Advance Deposit via A3 AI command'
  });
  return {
    text: `### 🏛️ Tally ERP Voucher Created\n\nVoucher posted to Tally Prime bridge: ${res.voucherNumber || 'VCH-TALLY-SYNCED'}.`,
    table: [res],
    chart: null
  };
}

async function handleExplainMetrics() {
  return {
    text: `### 📊 Enterprise Metrics Guide\n\n• **10% Payment Gate:** Mandatory hard gate preventing factory production release prior to customer financial commitment.\n• **KPI Score:** Weighted index of deals closed, outbound dialer connection rate, and customer satisfaction.\n• **On-Time Assembly:** Factory floor delivery adherence against committed job card date.`,
    table: null,
    chart: null
  };
}

module.exports = {
  handleInvoicesOptions,
  handleInvoices,
  handleInvoiceGenerator,
  handleMarginCalculator,
  handleActionPostTally,
  handleExplainMetrics
};
