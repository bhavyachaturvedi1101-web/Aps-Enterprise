const express = require('express');
const router = express.Router();
const { mockLeads, mockEmployees } = require('../config/inMemoryStore');

// POST /api/chat/query — AI Assistant Query Route
router.post('/query', (req, res) => {
  const { query } = req.body;
  const input = (query || '').toLowerCase().trim();

  let answer = "";
  let chartData = null;
  let actionSuggestions = [];

  if (['hi', 'hello', 'hiii', 'hey', 'hii', 'greetings'].some(w => input.startsWith(w) || input === w)) {
    answer = `Hello! I am your APS Enterprise AI Assistant. Currently, you have ${mockLeads.length} active leads across 7 pipeline stages. How can I help you manage operations today?`;
    actionSuggestions = ['Show Leads Summary', 'Check Payment Gates', 'View Team KPIs'];
  } else if (input.includes('payment') || input.includes('tally') || input.includes('gate') || input.includes('advance')) {
    const pendingVerify = mockLeads.filter(l => l.stage === 'Confirmed Lead');
    if (pendingVerify.length > 0) {
      answer = `Tally Gate Alert: ${pendingVerify.length} lead(s) require 10% advance verification: ${pendingVerify.map(l => `${l.name} (₹${parseFloat(l.budget).toLocaleString('en-IN')})`).join(', ')}. Recommend verifying via the Payment Gate.`;
    } else {
      answer = "All payment gates are verified. 0 leads pending Tally 10% advance verification.";
    }
    actionSuggestions = ['Go to Payment Gate', 'Send WhatsApp Reminder'];
  } else if (input.includes('lead') || input.includes('pipeline') || input.includes('stage')) {
    answer = `Pipeline Summary (${mockLeads.length} Total Leads):\n` +
      `• Enquiry: ${mockLeads.filter(l => l.stage === 'Enquiry').length}\n` +
      `• Qualified: ${mockLeads.filter(l => l.stage === 'Qualified').length}\n` +
      `• Booked: ${mockLeads.filter(l => l.stage === 'Booked').length}\n` +
      `• Confirmed Lead: ${mockLeads.filter(l => l.stage === 'Confirmed Lead').length}\n` +
      `• Client (Paid): ${mockLeads.filter(l => l.stage === 'Client (Paid)').length}\n` +
      `• In Production: ${mockLeads.filter(l => l.stage === 'In Production').length}\n` +
      `• Dispatched: ${mockLeads.filter(l => l.stage === 'Dispatched').length}`;
    actionSuggestions = ['View CRM Leads', 'Add New Lead'];
  } else if (input.includes('crm')) {
    answer = `CRM Connector is active. All ${mockLeads.length} leads are synchronized in real-time with state machine enforcement.`;
  } else if (input.includes('erp') || input.includes('factory') || input.includes('order')) {
    const booked = mockLeads.filter(l => ['Booked', 'Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched'].includes(l.stage)).length;
    const inProd = mockLeads.filter(l => l.stage === 'In Production').length;
    answer = `ERP Layer Status: ${booked} bookings created, ${inProd} released to manufacturing floor.`;
  } else if (input.includes('dialer') || input.includes('call') || input.includes('voice')) {
    answer = "A1 Voice Agent & Dialer: 7 callbacks queued for today. Average call conversion rate is 42%.";
  } else if (input.includes('employee') || input.includes('team') || input.includes('kpi')) {
    answer = `Team KPIs: ${mockEmployees.length} active operators. Bhavya (A2 Admin) leading at 96% KPI score.`;
  } else {
    answer = `I have analyzed your query "${query}". The A2 Operating System is fully synchronized with ${mockLeads.length} active leads. You can check CRM pipeline, ERP bookings, or Tally payment gates anytime.`;
  }

  res.json({
    answer,
    chartData,
    actionSuggestions
  });
});

module.exports = router;
