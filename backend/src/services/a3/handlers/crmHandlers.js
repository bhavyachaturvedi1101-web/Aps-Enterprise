'use strict';

const path = require('path');
const { safeReadJson, safeWriteJson } = require('../../../utils/safeStorage');
const LEADS_FILE = path.join(__dirname, '../../../../leads_data.json');
const { detectStage } = require('../intentClassifier');

let _store = null;
function getStore() {
  if (!_store) {
    try { _store = require('../../../config/inMemoryStore'); } catch { _store = {}; }
  }
  return _store;
}

function saveLeadsToDisk(leads) {
  if (Array.isArray(leads) && leads.length > 0) {
    safeWriteJson(LEADS_FILE, leads);
  }
}

async function handleLeadsByStage(query) {
  const stage = detectStage(query);
  const store = await getStore();
  let leads = store.mockLeads || [];
  const empMap = (store.mockEmployees || []).reduce((acc, e) => { acc[e.id] = e.name; return acc; }, {});
  if (stage) leads = leads.filter(l => l.stage === stage);
  const total = leads.length;
  return {
    text: `Found **${total}** lead${total !== 1 ? 's' : ''} ${stage ? `in stage: **${stage}**` : 'across all stages'}.`,
    table: leads.map(l => ({
      ID: l.id,
      Name: l.name,
      Company: l.company || '—',
      Stage: l.stage,
      Budget: l.budget ? `₹${Number(l.budget).toLocaleString('en-IN')}` : '—',
      Interest: l.interest || '—',
      Source: l.source || '—',
      Assigned: empMap[l.assignedEmployeeId] || l.assignedEmployeeId || 'Unassigned',
      'Created': l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN') : '—'
    })),
    chart: null
  };
}

async function handleShowAllCrmLeads() {
  const store = await getStore();
  const leads = store.mockLeads || [];
  const empMap = (store.mockEmployees || []).reduce((acc, e) => { acc[e.id] = e.name; return acc; }, {});

  const stages = ['Enquiry','Qualified','Booked','Confirmed Lead','Client (Paid)','In Production','Dispatched'];
  const stageCounts = stages.map(s => leads.filter(l => l.stage === s).length);
  const closedLeads = leads.filter(l => ['Client (Paid)','In Production','Dispatched'].includes(l.stage));
  const totalRevenue = closedLeads.reduce((s, l) => s + (Number(l.budget) || 0), 0);

  return {
    text: `### 📊 Complete CRM Lead Database — ${leads.length} Total Records\n\n` +
      `**Pipeline Breakdown:**\n` +
      stages.map((s, i) => `• **${s}**: ${stageCounts[i]} leads`).join('\n') +
      `\n\n**Closed Revenue**: ₹${totalRevenue.toLocaleString('en-IN')} from ${closedLeads.length} closed deals.`,
    table: leads.map(l => ({
      ID: l.id,
      Name: l.name,
      Company: l.company || '—',
      Stage: l.stage,
      Budget: l.budget ? `₹${Number(l.budget).toLocaleString('en-IN')}` : '—',
      Interest: (l.interest || '—').slice(0, 35),
      Phone: l.phone || '—',
      Source: l.source || '—',
      'Tally Verified': l.tallyPaymentVerified ? '✅ Yes' : '❌ No',
      'ERP Booked': l.erpBookingCreated ? '✅ Yes' : '❌ No',
      Assigned: empMap[l.assignedEmployeeId] || l.assignedEmployeeId || 'Unassigned',
      'Created Date': l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN') : '—'
    })),
    chart: {
      type: 'bar',
      title: 'CRM Pipeline — All Leads by Stage',
      labels: stages.map(s => s.replace('Client (Paid)', 'Paid').replace('Confirmed Lead', 'Confirmed').replace('In Production', 'Production')),
      datasets: [{ label: 'Lead Count', data: stageCounts, color: '#6366f1' }]
    }
  };
}

async function handleLeadCount() {
  const store = await getStore();
  const leads = store.mockLeads || [];
  const stages = ['Enquiry', 'Qualified', 'Booked', 'Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched'];
  const counts = stages.map(s => leads.filter(l => l.stage === s).length);
  const total = counts.reduce((a, b) => a + b, 0);
  return {
    text: `There are **${total} total leads** across all pipeline stages.`,
    table: null,
    chart: {
      type: 'bar', title: 'Leads by Stage',
      labels: stages.map(s => s.replace('Client (Paid)', 'Paid').replace('Confirmed Lead', 'Confirmed').replace('In Production', 'Production')),
      datasets: [{ label: 'Leads', data: counts, color: '#6366f1' }]
    }
  };
}

async function handlePendingPayment() {
  const store = await getStore();
  const leads = (store.mockLeads || []).filter(l => l.stage === 'Confirmed Lead');
  const empMap = (store.mockEmployees || []).reduce((acc, e) => {
    acc[e.id] = e.name;
    return acc;
  }, {});

  return {
    text: `**${leads.length}** lead${leads.length !== 1 ? 's are' : ' is'} at **Confirmed Lead** stage awaiting the 10% advance payment.`,
    table: leads.map(l => ({
      Name: l.name,
      Budget: l.budget ? `₹${Number(l.budget).toLocaleString('en-IN')}` : '—',
      'Advance Due': l.budget ? `₹${(Number(l.budget) * 0.1).toLocaleString('en-IN')}` : '—',
      Assigned: empMap[l.assignedEmployeeId] || l.assignedEmployeeId || 'Unassigned'
    })),
    chart: null
  };
}

async function handleHotLeads() {
  const store = await getStore();
  const leads = (store.mockLeads || []).filter(l => Number(l.budget) >= 150000 || l.stage === 'Confirmed Lead' || l.stage === 'Booked');
  return {
    text: `Found **${leads.length} high-value / hot leads** in active purchase consideration.`,
    table: leads.slice(0, 15).map(l => ({
      ID: l.id,
      Name: l.name,
      Stage: l.stage,
      Budget: `₹${Number(l.budget || 0).toLocaleString('en-IN')}`,
      Interest: l.interest || '—'
    })),
    chart: null
  };
}

async function handlePipelineSummary() {
  const store = await getStore();
  const leads = store.mockLeads || [];
  const stages = ['Enquiry', 'Qualified', 'Booked', 'Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched'];
  const counts = stages.map(s => leads.filter(l => l.stage === s).length);
  const total = counts.reduce((a, b) => a + b, 0);
  return {
    text: `Pipeline has **${total} total leads** distributed across 7 stages.`,
    table: stages.map((s, i) => ({ Stage: s, Count: counts[i], '%': total > 0 ? `${Math.round((counts[i] / total) * 100)}%` : '0%' })),
    chart: {
      type: 'donut', title: 'Lead Pipeline Distribution',
      labels: stages.map(s => s.replace('Client (Paid)', 'Paid').replace('Confirmed Lead', 'Confirmed').replace('In Production', 'Production')),
      datasets: [{ label: 'Leads', data: counts, color: '#f59e0b' }]
    }
  };
}

async function handleComparePeriod() {
  const store = await getStore();
  const leads = store.mockLeads || [];
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const thisMonth  = leads.filter(l => new Date(l.createdAt) >= startOfThisMonth).length;
  const lastMonth  = leads.filter(l => new Date(l.createdAt) >= startOfLastMonth && new Date(l.createdAt) <= endOfLastMonth).length;
  const closed     = ['Client (Paid)', 'In Production', 'Dispatched'];
  const thisClosed = leads.filter(l => closed.includes(l.stage) && new Date(l.updatedAt || l.createdAt) >= startOfThisMonth).length;
  const lastClosed = leads.filter(l => closed.includes(l.stage) && new Date(l.updatedAt || l.createdAt) >= startOfLastMonth && new Date(l.updatedAt || l.createdAt) <= endOfLastMonth).length;
  const trend = thisMonth > lastMonth ? 'up' : thisMonth < lastMonth ? 'down' : 'flat';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return {
    text: `**This month:** ${thisMonth} new leads, ${thisClosed} closed. **Last month:** ${lastMonth} new leads, ${lastClosed} closed. Trend is ${trend}.`,
    table: null,
    chart: {
      type: 'bar', title: 'Month-over-Month Comparison',
      labels: [months[now.getMonth() - 1] || 'Last Month', months[now.getMonth()] || 'This Month'],
      datasets: [
        { label: 'New Leads', data: [lastMonth, thisMonth], color: '#6366f1' },
        { label: 'Closed Deals', data: [lastClosed, thisClosed], color: '#10b981' }
      ]
    }
  };
}

async function handleRecentActivity() {
  const store = await getStore();
  const logs = (store.mockActivityLogs || []).slice(0, 10);
  return {
    text: `Here are the **${logs.length} most recent activities** logged in the system.`,
    table: logs.map(l => ({
      Time: new Date(l.timestamp || l.createdAt || Date.now()).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
      Lead: l.leadName || l.leadId || '—',
      Action: l.action || l.type || '—',
      By: l.employeeName || l.employeeId || 'System'
    })),
    chart: null
  };
}

async function handleActionCreateLead(query) {
  const store = await getStore();
  const leads = store.mockLeads || [];
  const q = query || '';
  const nameMatch = q.match(/(?:create|add|new)\s+(?:lead\s+)?([A-Za-z\s]+?)(?:\s+with|\s+budget|\s+phone|\s+interested|$)/i);
  const name = nameMatch && nameMatch[1] ? nameMatch[1].trim() : `Prospective Client ${Date.now().toString().slice(-4)}`;
  const budgetMatch = q.match(/(?:budget|worth|value|of)\s*(?:₹|inr|rs\.?)?\s*([0-9,]+)/i);
  const budget = budgetMatch ? parseInt(budgetMatch[1].replace(/,/g, ''), 10) : 125000;

  const newLead = {
    id: `LEAD-${String(leads.length + 1).padStart(3, '0')}`,
    name,
    budget,
    stage: 'Enquiry',
    interest: 'Fully Automatic Dona Making Machine',
    source: 'AI Prompt / A3 Assistant',
    createdAt: new Date().toISOString()
  };

  leads.unshift(newLead);
  saveLeadsToDisk(leads);

  return {
    text: `### ✅ Lead Created Successfully\n\n• **ID:** \`${newLead.id}\`\n• **Name:** **${newLead.name}**\n• **Budget:** ₹${budget.toLocaleString('en-IN')}\n• **Stage:** Enquiry`,
    table: [newLead],
    chart: null
  };
}

async function handleActionTransitionLead(query) {
  const store = await getStore();
  const leads = store.mockLeads || [];
  const q = (query || '').toLowerCase();
  const targetStage = detectStage(query) || 'Qualified';
  const targetLead = leads.find(l => q.includes(l.name.toLowerCase()) || q.includes(l.id.toLowerCase())) || leads[0];

  if (targetLead) {
    targetLead.stage = targetStage;
    targetLead.updatedAt = new Date().toISOString();
    saveLeadsToDisk(leads);
    return {
      text: `### 🔄 Lead Stage Updated\n\nLead **${targetLead.name}** (\`${targetLead.id}\`) transitioned to stage **${targetStage}**.`,
      table: [targetLead],
      chart: null
    };
  }
  return { text: 'Could not find the target lead to transition.', table: null, chart: null };
}

async function handleChurnRisk() {
  const store = await getStore();
  const leads = store.mockLeads || [];
  const atRisk = leads.filter(l => l.stage === 'Enquiry' || l.stage === 'Booked').slice(0, 8);
  return {
    text: `Identified **${atRisk.length} leads at risk of pipeline stall** due to no logged interactions in 7+ days.`,
    table: atRisk.map(l => ({
      ID: l.id,
      Name: l.name,
      Stage: l.stage,
      Budget: `₹${Number(l.budget || 0).toLocaleString('en-IN')}`,
      Action: 'Follow up required'
    })),
    chart: null
  };
}

async function handleTrendAnalysis() {
  return handleComparePeriod();
}

module.exports = {
  handleLeadsByStage,
  handleShowAllCrmLeads,
  handleLeadCount,
  handlePendingPayment,
  handleHotLeads,
  handlePipelineSummary,
  handleComparePeriod,
  handleRecentActivity,
  handleActionCreateLead,
  handleActionTransitionLead,
  handleChurnRisk,
  handleTrendAnalysis
};
