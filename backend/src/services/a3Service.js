'use strict';
/**
 * A3 Service — Internal NL Query Engine
 * ──────────────────────────────────────
 * LLM_PROVIDER = 'mock'   → rule-based engine (default)
 * LLM_PROVIDER = 'groq'   → Llama 3.3 70B via Groq (fast & free)
 * LLM_PROVIDER = 'gemini' → Gemini 1.5 Flash
 * LLM_PROVIDER = 'openai' → GPT-4o-mini
 */

const https = require('https');

// ─── In-Memory Conversation Store ─────────────────────────────────────────────
const conversationStore = new Map();

function getHistory(conversationId) {
  if (!conversationId) return [];
  const entry = conversationStore.get(conversationId);
  if (!entry) return [];
  if (Date.now() - entry.lastAccess > 30 * 60 * 1000) {
    conversationStore.delete(conversationId);
    return [];
  }
  entry.lastAccess = Date.now();
  return entry.messages;
}

function addToHistory(conversationId, userMsg, botMsg) {
  if (!conversationId) return;
  if (!conversationStore.has(conversationId)) {
    conversationStore.set(conversationId, { messages: [], lastAccess: Date.now() });
  }
  const entry = conversationStore.get(conversationId);
  const cleanUser = (typeof userMsg === 'string' ? userMsg : '').slice(0, 250);
  const cleanBot = (typeof botMsg === 'string' ? botMsg : (botMsg?.text || '')).slice(0, 350);
  entry.messages.push({ role: 'user', content: cleanUser });
  entry.messages.push({ role: 'assistant', content: cleanBot });
  if (entry.messages.length > 6) entry.messages = entry.messages.slice(-6);
  entry.lastAccess = Date.now();
}

// ─── Intent Recognition ────────────────────────────────────────────────────────
const INTENTS = [
  { name: 'action_create_lead',     patterns: [/add.*lead/i, /create.*lead/i, /new lead/i, /register lead/i, /naya lead/i, /lead add/i, /nayi entry/i, /lead banao/i] },
  { name: 'action_transition_lead', patterns: [/move.*lead/i, /transition.*lead/i, /change.*stage/i, /update.*stage/i, /set.*stage/i, /mark.*as/i, /promote.*lead/i, /stage badlo/i, /stage change/i, /move karo/i, /paid mark/i] },
  { name: 'action_post_tally',      patterns: [/post.*tally/i, /add.*tally/i, /create.*voucher/i, /post.*voucher/i, /reconcile.*tally/i, /verify.*payment/i, /tally voucher/i, /tally entry/i, /paisa receive/i] },
  { name: 'action_erp_booking',     patterns: [/create.*erp/i, /erp.*booking/i, /release.*factory/i, /release.*production/i, /start.*production/i, /factory release/i, /job card/i, /production queue/i] },
  { name: 'action_queue_dialer',    patterns: [/queue.*call/i, /add.*dialer/i, /trigger.*call/i, /call.*lead/i, /dialer me daalo/i, /call karo/i, /voice call/i] },
  { name: 'action_send_whatsapp',   patterns: [/send.*whatsapp/i, /whatsapp.*reminder/i, /trigger.*sequence/i, /send.*reminder/i, /whatsapp bhejo/i, /reminder bhejo/i, /msg karo/i] },
  { name: 'leads_by_stage',   patterns: [/confirmed lead/i, /qualified lead/i, /enquir/i, /in production/i, /dispatched/i, /booked lead/i, /client.*paid/i, /paid.*client/i] },
  { name: 'lead_count',       patterns: [/how many lead/i, /total lead/i, /count.*lead/i, /lead.*count/i, /number of lead/i, /kitne lead/i, /total kitne/i] },
  { name: 'pending_payment',  patterns: [/pending payment/i, /awaiting payment/i, /payment.*pending/i, /not.*paid/i, /unpaid/i, /due payment/i, /advance.*due/i, /kiska payment/i, /paise baki/i, /advance baaki/i] },
  { name: 'top_performer',    patterns: [/top perform/i, /top employee/i, /best.*employee/i, /highest.*sales/i, /most.*lead/i, /who.*sold/i, /best.*agent/i, /who.*best/i, /highest.*kpi/i, /sabse achha/i, /kaun top/i, /best seller/i] },
  { name: 'compare_period',   patterns: [/this month.*last month/i, /compare.*month/i, /vs last month/i, /month.*comparison/i, /trend/i, /month.*month/i, /growth/i] },
  { name: 'recent_activity',  patterns: [/recent activity/i, /latest.*activity/i, /what happened/i, /activity log/i, /last.*action/i, /recent.*update/i, /kya hua/i, /recent audit/i] },
  { name: 'pipeline_summary', patterns: [/pipeline/i, /overview/i, /summary/i, /all stage/i, /breakdown/i, /distribution/i, /status.*lead/i, /lead.*status/i, /pipeline summary/i] },
  { name: 'revenue_summary',  patterns: [/revenue/i, /total.*payment/i, /payment.*total/i, /money.*collect/i, /collect.*money/i, /saved/i, /earned/i, /sales of/i, /sale.*month/i, /income/i, /earning/i, /how much.*made/i, /how much.*earn/i, /what.*sales/i, /total.*sale/i, /sale.*august/i, /august.*sale/i, /this month.*sale/i, /kitna revenue/i, /kitni sale/i, /kitna kamaya/i, /paisa kitna/i] },
  { name: 'employee_list',    patterns: [/list.*employee/i, /all employee/i, /\bteam\b/i, /\bstaff\b/i, /who.*work/i, /show.*employee/i, /our.*team/i, /kaun kaun kaam/i, /saare employee/i] },
  { name: 'hot_leads',        patterns: [/hot lead/i, /priority lead/i, /urgent/i, /follow.*up.*today/i, /today.*lead/i, /needs.*attention/i, /important.*lead/i, /kaunsa lead/i, /urgent lead/i] },
  { name: 'kpi_stats',        patterns: [/kpi/i, /\bperformance\b/i, /\bscore\b/i, /\btarget\b/i, /conversion rate/i, /calls handled/i, /how.*doing/i, /team.*perform/i, /kpi score/i] },
  { name: 'invoices',         patterns: [/invoice/i, /billing/i, /tally/i, /\bsync\b/i, /ledger/i] },
  { name: 'dialer',           patterns: [/dialer/i, /call queue/i, /voice agent/i, /\ba1\b/i, /calls made/i, /call log/i] },
  { name: 'whatsapp',         patterns: [/whatsapp/i, /reminder/i, /message sent/i, /\ba5\b/i, /automation/i, /template/i] },
];

function detectIntent(query) {
  for (const intent of INTENTS) {
    for (const pat of intent.patterns) {
      if (pat.test(query)) return intent.name;
    }
  }
  return 'unknown';
}

function detectStage(query) {
  const lower = query.toLowerCase();
  if (lower.includes('confirmed'))  return 'Confirmed Lead';
  if (lower.includes('qualified'))  return 'Qualified';
  if (lower.includes('enquir'))     return 'Enquiry';
  if (lower.includes('production')) return 'In Production';
  if (lower.includes('dispatch'))   return 'Dispatched';
  if (lower.includes('booked'))     return 'Booked';
  if (lower.includes('paid'))       return 'Client (Paid)';
  return null;
}

// ─── In-memory data store ─────────────────────────────────────────────────────
let _store = null;
function getStore() {
  if (!_store) {
    try { _store = require('../config/inMemoryStore'); } catch { _store = {}; }
  }
  return _store;
}

// ─── Data Handlers ─────────────────────────────────────────────────────────────
async function handleLeadsByStage(query) {
  const stage = detectStage(query);
  const store = getStore();
  let leads = store.mockLeads || [];
  if (stage) leads = leads.filter(l => l.stage === stage);
  return {
    text: `Found **${leads.length}** lead${leads.length !== 1 ? 's' : ''} ${stage ? `in stage: **${stage}**` : 'across all stages'}.`,
    table: leads.slice(0, 20).map(l => ({
      Name: l.name, Stage: l.stage,
      Budget: l.budget ? `₹${Number(l.budget).toLocaleString('en-IN')}` : '—',
      Assigned: l.assignedEmployeeId || 'Unassigned'
    })),
    chart: null
  };
}

async function handleLeadCount() {
  const store = getStore();
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
  const store = getStore();
  const leads = (store.mockLeads || []).filter(l => l.stage === 'Confirmed Lead');
  return {
    text: `**${leads.length}** lead${leads.length !== 1 ? 's are' : ' is'} at **Confirmed Lead** stage awaiting the 10% advance payment.`,
    table: leads.map(l => ({
      Name: l.name,
      Budget: l.budget ? `₹${Number(l.budget).toLocaleString('en-IN')}` : '—',
      'Advance Due': l.budget ? `₹${(Number(l.budget) * 0.1).toLocaleString('en-IN')}` : '—',
      Assigned: l.assignedEmployeeId || 'Unassigned'
    })),
    chart: null
  };
}

async function handleTopPerformer() {
  const store = getStore();
  const employees = store.mockEmployees || [];
  const ranked = employees.map(e => ({
    name: e.name, role: e.role,
    salesClosed: e.salesClosed || 0,
    revenue: e.totalRevenue || 0,
    kpi: e.kpiScore || '—',
    calls: e.callsHandled || 0
  })).sort((a, b) => b.salesClosed - a.salesClosed);
  const top = ranked[0];
  return {
    text: top
      ? `**${top.name}** is the top performer with **${top.salesClosed} closed deals** and ₹${(top.revenue || 0).toLocaleString('en-IN')} revenue. KPI Score: **${top.kpi}**.`
      : 'No performance data available.',
    table: ranked.map(r => ({ Name: r.name, Role: r.role || '—', 'Closed Deals': r.salesClosed, 'Revenue': `₹${(r.revenue || 0).toLocaleString('en-IN')}`, KPI: r.kpi, Calls: r.calls })),
    chart: {
      type: 'bar', title: 'Closed Deals by Employee',
      labels: ranked.map(r => r.name.split(' ')[0]),
      datasets: [{ label: 'Closed Deals', data: ranked.map(r => r.salesClosed), color: '#10b981' }]
    }
  };
}

async function handleComparePeriod() {
  const store = getStore();
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
  const store = getStore();
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

async function handlePipelineSummary() {
  const store = getStore();
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
      datasets: [{ label: 'Leads', data: counts, color: '#aa3bff' }]
    }
  };
}

async function handleRevenueSummary() {
  const store = getStore();
  const leads = store.mockLeads || [];
  const closed = ['Client (Paid)', 'In Production', 'Dispatched'];
  const closedLeads = leads.filter(l => closed.includes(l.stage));
  const total = closedLeads.reduce((sum, l) => sum + (Number(l.budget) || 0), 0);
  const advance = total * 0.1;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthClosed = closedLeads.filter(l => new Date(l.createdAt) >= startOfMonth);
  const thisMonthRevenue = thisMonthClosed.reduce((sum, l) => sum + (Number(l.budget) || 0), 0);
  return {
    text: `**${closedLeads.length} closed deals** with total pipeline value of **₹${total.toLocaleString('en-IN')}**. Advance collected (10%): **₹${advance.toLocaleString('en-IN')}**. This month: **${thisMonthClosed.length} deals** worth **₹${thisMonthRevenue.toLocaleString('en-IN')}**.`,
    table: null,
    chart: {
      type: 'bar', title: 'Revenue Breakdown',
      labels: ['Total Pipeline Value', 'Advance Collected (10%)', 'Balance Pending'],
      datasets: [{ label: '₹ Amount', data: [total, advance, total - advance], color: '#f59e0b' }]
    }
  };
}

async function handleEmployeeList() {
  const store = getStore();
  const employees = store.mockEmployees || [];
  return {
    text: `**${employees.length} employees** are registered in the system.`,
    table: employees.map(e => ({ Name: e.name, Role: e.role || '—', KPI: e.kpiScore || '—', 'Sales Closed': e.salesClosed || 0, Revenue: `₹${(e.totalRevenue || 0).toLocaleString('en-IN')}`, Status: e.status || 'Active' })),
    chart: null
  };
}

async function handleHotLeads() {
  const store = getStore();
  const leads = (store.mockLeads || []).filter(l => ['Qualified', 'Confirmed Lead'].includes(l.stage)).slice(0, 15);
  return {
    text: `**${leads.length} hot leads** require immediate follow-up (Qualified or Confirmed but not yet paid).`,
    table: leads.map(l => ({
      Name: l.name, Stage: l.stage,
      Budget: l.budget ? `₹${Number(l.budget).toLocaleString('en-IN')}` : '—',
      'Last Updated': new Date(l.updatedAt || l.createdAt || Date.now()).toLocaleDateString('en-IN'),
      Assigned: l.assignedEmployeeId || 'Unassigned'
    })),
    chart: null
  };
}

async function handleKpiStats() {
  const store = getStore();
  const employees = store.mockEmployees || [];
  const sorted = [...employees].sort((a, b) => (b.kpiScoreNum || 0) - (a.kpiScoreNum || 0));
  return {
    text: `Team KPI overview: **${sorted[0]?.name}** leads with **${sorted[0]?.kpiScore}**. Average team KPI: **${Math.round(employees.reduce((s, e) => s + (e.kpiScoreNum || 0), 0) / (employees.length || 1))}%**.`,
    table: sorted.map(e => ({ Name: e.name, KPI: e.kpiScore || '—', 'Sales Closed': e.salesClosed || 0, 'Calls Handled': e.callsHandled || 0, 'Conversion Rate': e.conversionRate || '—', Revenue: `₹${(e.totalRevenue || 0).toLocaleString('en-IN')}` })),
    chart: {
      type: 'bar', title: 'Team KPI Scores',
      labels: sorted.map(e => e.name.split(' ')[0]),
      datasets: [{ label: 'KPI Score %', data: sorted.map(e => e.kpiScoreNum || 0), color: '#6366f1' }]
    }
  };
}

async function handleDialer() {
  const store = getStore();
  const calls = store.mockCallLogs || [];
  return {
    text: `**${calls.length} calls** logged in the A1 Voice Agent dialer. Total call time: **${Math.round(calls.reduce((s, c) => s + (c.durationSeconds || 0), 0) / 60)} minutes**.`,
    table: calls.map(c => ({ ID: c.callId, Lead: c.leadId, Agent: c.agent, Duration: `${c.durationSeconds}s`, Outcome: c.callOutcome, Time: new Date(c.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) })),
    chart: null
  };
}

async function handleWhatsApp() {
  const store = getStore();
  const templates = store.mockWhatsAppTemplates || [];
  return {
    text: `**${templates.length} WhatsApp templates** configured for A5 automation. These are auto-triggered based on lead stage transitions.`,
    table: templates.map(t => ({ Name: t.name, Status: t.status || '—', Trigger: t.triggerStage || '—', Category: t.category || '—' })),
    chart: null
  };
}

// ─── ADMIN ACTION HANDLERS (CRM, TALLY, ERP, DIALER, WHATSAPP) ────────────────

async function handleActionCreateLead(query) {
  const store = getStore();
  const leads = store.mockLeads || [];
  const activityLogs = store.mockActivityLogs || [];

  let nameMatch = query.match(/(?:add|create|new)\s+lead\s+(?:for\s+)?([a-zA-Z0-9\s]+?)(?=\s+budget|\s+stage|\s+source|$)/i);
  let name = nameMatch ? nameMatch[1].trim() : `New Lead ${leads.length + 1}`;
  
  let budgetMatch = query.match(/budget\s+([0-9kK,]+)/i) || query.match(/₹?\s*([0-9]+000)/);
  let budget = budgetMatch ? budgetMatch[1].replace(/,/g, '') : '50000';
  if (budget.toLowerCase().endsWith('k')) budget = String(parseFloat(budget) * 1000);

  let stage = detectStage(query) || 'Enquiry';

  const newLeadObj = {
    id: `LEAD-${String(leads.length + 1).padStart(3, '0')}`,
    name,
    company: `${name} Industrial Ltd`,
    phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@enterprise.com`,
    interest: 'CNC Machine System',
    budget,
    stage,
    notes: `Created directly via A3 Admin AI Assistant. Command: "${query}"`,
    crmSynced: true,
    erpBookingCreated: ['Booked', 'Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched'].includes(stage),
    tallyPaymentVerified: ['Client (Paid)', 'In Production', 'Dispatched'].includes(stage),
    source: 'A3 AI Assistant',
    assignedEmployeeId: 'e2',
    createdAt: new Date()
  };

  leads.unshift(newLeadObj);
  activityLogs.unshift({
    id: `log-${Date.now()}`,
    employeeId: 'e2',
    employeeName: 'Bhavya (Admin AI)',
    leadId: newLeadObj.id,
    leadName: newLeadObj.name,
    action: `Created new lead "${newLeadObj.name}" via A3 AI Assistant (Stage: ${stage})`,
    fromStage: 'None',
    toStage: stage,
    details: `Budget: ₹${Number(budget).toLocaleString('en-IN')}`,
    createdAt: new Date()
  });

  return {
    text: `✅ **Action Executed**: Successfully created new lead **"${newLeadObj.name}"** in **${stage}** stage.\n\n• **ID**: ${newLeadObj.id}\n• **Budget**: ₹${Number(budget).toLocaleString('en-IN')}\n• **Source**: A3 AI Assistant\n• **Assigned**: Bhavya (Admin)`,
    table: [{ ID: newLeadObj.id, Name: newLeadObj.name, Stage: newLeadObj.stage, Budget: `₹${Number(budget).toLocaleString('en-IN')}`, Action: 'Created via AI' }],
    chart: null
  };
}

async function handleActionTransitionLead(query) {
  const store = getStore();
  const leads = store.mockLeads || [];
  const activityLogs = store.mockActivityLogs || [];

  const targetStage = detectStage(query);
  if (!targetStage) {
    return {
      text: `⚠️ Please specify a valid target stage to transition the lead to. Available stages: **Enquiry, Qualified, Booked, Confirmed Lead, Client (Paid), In Production, Dispatched**.`,
      table: null, chart: null
    };
  }

  let lead = leads.find(l => query.toLowerCase().includes(l.id.toLowerCase()) || query.toLowerCase().includes(l.name.toLowerCase()));
  if (!lead) {
    lead = leads.find(l => l.stage !== targetStage) || leads[0];
  }

  const oldStage = lead.stage;
  lead.stage = targetStage;
  if (targetStage === 'Client (Paid)') lead.tallyPaymentVerified = true;
  if (targetStage === 'In Production') lead.erpBookingCreated = true;

  const activityEntry = {
    id: `log-${Date.now()}`,
    employeeId: 'e2',
    employeeName: 'Bhavya (Admin AI)',
    leadId: lead.id,
    leadName: lead.name,
    action: `Lead status transitioned from "${oldStage}" to "${targetStage}" via A3 AI Assistant`,
    fromStage: oldStage,
    toStage: targetStage,
    details: `Executed via AI command: "${query}"`,
    createdAt: new Date()
  };
  activityLogs.unshift(activityEntry);

  return {
    text: `⚡ **Action Executed**: Lead **"${lead.name}"** (${lead.id}) transitioned from **"${oldStage}"** ➔ **"${targetStage}"**.\n\n• **Tally Payment Gate**: ${lead.tallyPaymentVerified ? 'Verified ✅' : 'Pending'}\n• **ERP Booking**: ${lead.erpBookingCreated ? 'Created ✅' : 'Pending'}`,
    table: [{ ID: lead.id, Name: lead.name, 'Previous Stage': oldStage, 'New Stage': targetStage, Status: 'Updated in DB' }],
    chart: null
  };
}

async function handleActionPostTally(query) {
  const store = getStore();
  const activityLogs = store.mockActivityLogs || [];

  let amountMatch = query.match(/₹?\s*([0-9,]+)/);
  let amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : 28000;
  let partyMatch = query.match(/(?:for|party|client)\s+([a-zA-Z0-9\s]+?)(?=\s+amount|\s+rs|\s+₹|$)/i);
  let partyName = partyMatch ? partyMatch[1].trim() : 'Kirloskar Forge & Stampings';

  const vchNo = `VCH-2026-0${Math.floor(100 + Math.random() * 900)}`;

  activityLogs.unshift({
    id: `log-${Date.now()}`,
    employeeId: 'e2',
    employeeName: 'Bhavya (Admin AI)',
    leadId: 'TALLY-SYNC',
    leadName: partyName,
    action: `Posted Tally ERP 9 Voucher ${vchNo} for ₹${amount.toLocaleString('en-IN')}`,
    fromStage: 'Tally',
    toStage: 'Reconciled',
    details: `Voucher Type: Advance Receipt (10% Gate)`,
    createdAt: new Date()
  });

  return {
    text: `🧾 **Action Executed**: Posted Tally ERP 9 Voucher **${vchNo}** for **${partyName}**.\n\n• **Amount**: ₹${amount.toLocaleString('en-IN')}\n• **Voucher Type**: Advance Receipt (10% Gate)\n• **Status**: Synchronized with Tally Ledger`,
    table: [{ 'Voucher No': vchNo, 'Party Name': partyName, Type: 'Advance Receipt (10%)', Amount: `₹${amount.toLocaleString('en-IN')}`, Status: 'Posted to Tally' }],
    chart: null
  };
}

async function handleActionErpBooking(query) {
  const store = getStore();
  const leads = store.mockLeads || [];
  const activityLogs = store.mockActivityLogs || [];

  let lead = leads.find(l => query.toLowerCase().includes(l.id.toLowerCase()) || query.toLowerCase().includes(l.name.toLowerCase())) || leads[0];
  lead.erpBookingCreated = true;
  if (lead.stage === 'Enquiry' || lead.stage === 'Qualified') lead.stage = 'Booked';

  activityLogs.unshift({
    id: `log-${Date.now()}`,
    employeeId: 'e5',
    employeeName: 'Rohan Mehta (ERP)',
    leadId: lead.id,
    leadName: lead.name,
    action: `Created ERP Manufacturing Booking & Job Card for "${lead.name}"`,
    fromStage: lead.stage,
    toStage: 'Booked',
    details: `Triggered shopfloor ERP booking webhook`,
    createdAt: new Date()
  });

  return {
    text: `🏭 **Action Executed**: Created ERP Machine Booking & Shopfloor Job Card for **"${lead.name}"** (${lead.id}).\n\n• **ERP Status**: Booking Active ✅\n• **Pipeline Stage**: ${lead.stage}`,
    table: [{ ID: lead.id, Name: lead.name, Product: lead.interest || 'CNC Machine', 'ERP Status': 'Booking Created' }],
    chart: null
  };
}

async function handleActionQueueDialer(query) {
  const store = getStore();
  const callLogs = store.mockCallLogs || [];
  const activityLogs = store.mockActivityLogs || [];

  const callId = `CALL-0${Math.floor(100 + Math.random() * 900)}`;
  callLogs.unshift({
    callId,
    leadId: 'DIALER-QUEUE',
    phone: '+919823456789',
    agent: 'A1 Voice Agent',
    durationSeconds: 120,
    callOutcome: 'Queued for Outbound Call',
    transcript: 'Automated outbound call queued via A3 AI Command.',
    timestamp: new Date()
  });

  activityLogs.unshift({
    id: `log-${Date.now()}`,
    employeeId: 'e1',
    employeeName: 'Animesh (Voice Lead)',
    leadId: 'A1-DIALER',
    leadName: 'Outbound Queue',
    action: `Queued automated A1 Voice Agent batch call ${callId}`,
    fromStage: 'Dialer',
    toStage: 'Active Call',
    details: `Command: "${query}"`,
    createdAt: new Date()
  });

  return {
    text: `📞 **Action Executed**: Queued A1 Voice Agent outbound call **${callId}** into active dialer queue.\n\n• **Voice Agent**: A1 Telecaller Bot\n• **Queue Status**: Active Outbound Call`,
    table: [{ 'Call ID': callId, Agent: 'A1 Voice Agent', Target: 'Lead Queue', Status: 'Queued' }],
    chart: null
  };
}

async function handleActionSendWhatsApp(query) {
  const store = getStore();
  const waMsgs = store.mockWhatsAppMessages || [];
  const activityLogs = store.mockActivityLogs || [];

  const waId = `WA-0${Math.floor(100 + Math.random() * 900)}`;
  waMsgs.unshift({
    messageId: waId,
    leadId: 'LEAD-004',
    leadName: 'Global Tech',
    phone: '+91 99887 76655',
    template: 'payment_reminder_advance_10pct',
    sequenceType: 'PAYMENT_REMINDER',
    product: 'Hydraulic Press 200T',
    advanceAmount: '4,200',
    totalBudget: '42,000',
    status: 'Sent',
    sentAt: new Date(),
    preview: 'Hello Global Tech, your booking for Hydraulic Press 200T is approved! Please confirm 10% advance.',
    lastEvent: 'Sent via WABA Cloud API'
  });

  activityLogs.unshift({
    id: `log-${Date.now()}`,
    employeeId: 'e3',
    employeeName: 'Aaditya (WhatsApp Lead)',
    leadId: 'A5-WHATSAPP',
    leadName: 'Global Tech',
    action: `Dispatched automated WhatsApp template message ${waId}`,
    fromStage: 'A5 Automation',
    toStage: 'Delivered',
    details: `Triggered payment_reminder_advance_10pct`,
    createdAt: new Date()
  });

  return {
    text: `💬 **Action Executed**: Dispatched automated WhatsApp notification **${waId}** via WABA Cloud API.\n\n• **Recipient**: Global Tech (+91 99887 76655)\n• **Template**: Payment Reminder (10% Advance Gate)\n• **Delivery Status**: Sent (✓)`,
    table: [{ 'Message ID': waId, Recipient: 'Global Tech', Template: 'Payment Reminder (10%)', Status: 'Sent' }],
    chart: null
  };
}

// ─── Full context builder for LLM (Compact & High Density) ───────────────────
function buildFullContext() {
  const store = getStore();
  const leads = store.mockLeads || [];
  const employees = store.mockEmployees || [];
  const stages = ['Enquiry', 'Qualified', 'Booked', 'Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched'];
  const closedStages = ['Client (Paid)', 'In Production', 'Dispatched'];

  const stageCounts = stages.map(s => `${s}: ${leads.filter(l => l.stage === s).length}`).join(', ');
  const closedLeads = leads.filter(l => closedStages.includes(l.stage));
  const totalRevenue = closedLeads.reduce((s, l) => s + (Number(l.budget) || 0), 0);
  const pendingLeads = leads.filter(l => l.stage === 'Confirmed Lead');
  const pendingRevenue = pendingLeads.reduce((s, l) => s + (Number(l.budget) || 0) * 0.1, 0);

  const empSum = employees.map(e => `${e.name} (${e.role}): KPI ${e.kpiScore}, ${e.salesClosed} sales, ₹${(e.totalRevenue || 0).toLocaleString('en-IN')} revenue`).join('; ');

  return `APS Enterprise CRM Snapshot (August 2026):
- Total Leads: ${leads.length} | Pipeline Breakdown: ${stageCounts}
- Closed Sales (August): ${closedLeads.length} deals totaling ₹${totalRevenue.toLocaleString('en-IN')} | 10% Advance Collected: ₹${(totalRevenue * 0.1).toLocaleString('en-IN')}
- Pending Tally Payment Gate: ${pendingLeads.length} leads (Advance Due: ₹${pendingRevenue.toLocaleString('en-IN')})
- Employees & Performance: ${empSum}
- Hot Leads Requiring Follow-Up: ${leads.filter(l => ['Qualified', 'Confirmed Lead'].includes(l.stage)).map(l => `${l.name} (₹${l.budget || 0})`).join(', ')}`;
}

// ─── HTTPS helper ─────────────────────────────────────────────────────────────
function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      { hostname, path, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        let raw = '';
        res.on('data', c => raw += c);
        res.on('end', () => {
          try { resolve(JSON.parse(raw)); }
          catch (e) { reject(new Error(`Parse error: ${raw.slice(0, 300)}`)); }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ─── LLM Callers ──────────────────────────────────────────────────────────────
async function callGroq(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');
  const result = await httpsPost(
    'api.groq.com', '/openai/v1/chat/completions',
    { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    { model: 'groq/compound', messages, temperature: 0.15, max_tokens: 800 }
  );
  if (result.error) throw new Error(`Groq error: ${result.error.message}`);
  return result?.choices?.[0]?.message?.content || '';
}

async function callOpenAI(messages) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  const result = await httpsPost(
    'api.openai.com', '/v1/chat/completions',
    { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    { model: 'gpt-4o-mini', messages, temperature: 0.15, max_tokens: 1500 }
  );
  return result?.choices?.[0]?.message?.content || '';
}

async function callGemini(systemPrompt, history, userQuery) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood.' }] },
    ...history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: userQuery }] }
  ];
  const result = await httpsPost(
    'generativelanguage.googleapis.com',
    `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    { 'Content-Type': 'application/json' },
    { contents, generationConfig: { temperature: 0.15, maxOutputTokens: 1500 } }
  );
  return result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ─── JSON parser — handles markdown fences AND raw JSON ───────────────────────
function parseLLMResponse(raw) {
  if (!raw || !raw.trim()) return null;

  // Strip markdown code fences
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Try full parse first
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed.text === 'string') return parsed;
  } catch {}

  // Try extracting JSON object with regex
  const match = cleaned.match(/\{[\s\S]*"text"\s*:\s*"[\s\S]*"\s*[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed && typeof parsed.text === 'string') return parsed;
    } catch {}
  }

  // If the raw response is readable text (not JSON), wrap it
  if (cleaned.length > 10 && !cleaned.startsWith('{')) {
    return { text: cleaned, table: null, chart: null };
  }

  return null;
}

// ─── Main LLM processor ──────────────────────────────────────────────────────
async function processWithLLM(query, history) {
  const provider = (process.env.LLM_PROVIDER || 'mock').toLowerCase();
  if (provider === 'mock') return null;

  const context = buildFullContext();

  const systemPrompt = `You are A3, the AI intelligence assistant embedded inside the APS Enterprise Admin Dashboard.
APS Enterprise is a manufacturing sales company selling CNC machines, laser cutters, and industrial equipment.

You have access to the COMPLETE live dashboard data below. Answer any question about leads, revenue, employees, KPIs, activity, pipeline, payments, WhatsApp, dialer, bookings, invoices, or any other admin dashboard topic.

${context}

RESPONSE FORMAT — respond ONLY with this JSON (no extra text, no markdown fences):
{"text":"Your answer here with **bold** for important numbers","table":[{"Col":"val"}],"chart":{"type":"bar","title":"...","labels":["..."],"datasets":[{"label":"...","data":[0],"color":"#6366f1"}]}}

Rules:
- "text" is required and should use **bold** for key numbers/names
- "table" is optional array of row objects (null if not needed), max 10 rows
- "chart" is optional (null if not needed), type is "bar" or "donut"
- Answer ONLY about APS Enterprise business data
- Be concise and specific with actual numbers from the data`;

  try {
    let raw = '';
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: query }
    ];

    if      (provider === 'groq')   raw = await callGroq(messages);
    else if (provider === 'openai') raw = await callOpenAI(messages);
    else if (provider === 'gemini') raw = await callGemini(systemPrompt, history, query);

    console.log(`[A3 ${provider.toUpperCase()}] Query: "${query.slice(0, 60)}" | Response length: ${raw.length}`);

    const parsed = parseLLMResponse(raw);
    if (parsed) return parsed;

    console.warn('[A3] JSON parse failed, raw response:', raw.slice(0, 200));
    return null;
  } catch (err) {
    console.error('[A3 LLM Error]', err.message);
    return null;
  }
}

// ─── Main Query Processor ──────────────────────────────────────────────────────
async function processQuery(query, conversationId) {
  const history = getHistory(conversationId);
  const intent  = detectIntent(query);
  const provider = (process.env.LLM_PROVIDER || 'mock').toLowerCase();

  let result;

  // For known intents, run the rule-based handler first for speed
  // But if provider is not mock, ALWAYS also send to LLM for richer context-aware answers
  if (intent !== 'unknown' && provider === 'mock') {
    switch (intent) {
      case 'action_create_lead':     result = await handleActionCreateLead(query); break;
      case 'action_transition_lead': result = await handleActionTransitionLead(query); break;
      case 'action_post_tally':      result = await handleActionPostTally(query); break;
      case 'action_erp_booking':     result = await handleActionErpBooking(query); break;
      case 'action_queue_dialer':    result = await handleActionQueueDialer(query); break;
      case 'action_send_whatsapp':   result = await handleActionSendWhatsApp(query); break;
      case 'leads_by_stage':   result = await handleLeadsByStage(query); break;
      case 'lead_count':       result = await handleLeadCount(); break;
      case 'pending_payment':  result = await handlePendingPayment(); break;
      case 'top_performer':    result = await handleTopPerformer(); break;
      case 'compare_period':   result = await handleComparePeriod(); break;
      case 'recent_activity':  result = await handleRecentActivity(); break;
      case 'pipeline_summary': result = await handlePipelineSummary(); break;
      case 'revenue_summary':  result = await handleRevenueSummary(); break;
      case 'employee_list':    result = await handleEmployeeList(); break;
      case 'hot_leads':        result = await handleHotLeads(); break;
      case 'kpi_stats':        result = await handleKpiStats(); break;
      case 'dialer':           result = await handleDialer(); break;
      case 'whatsapp':         result = await handleWhatsApp(); break;
    }
  } else if (intent !== 'unknown') {
    // When LLM is active: use rule-based for known intents as fallback only
    result = await processWithLLM(query, history);
    if (!result) {
      switch (intent) {
        case 'action_create_lead':     result = await handleActionCreateLead(query); break;
        case 'action_transition_lead': result = await handleActionTransitionLead(query); break;
        case 'action_post_tally':      result = await handleActionPostTally(query); break;
        case 'action_erp_booking':     result = await handleActionErpBooking(query); break;
        case 'action_queue_dialer':    result = await handleActionQueueDialer(query); break;
        case 'action_send_whatsapp':   result = await handleActionSendWhatsApp(query); break;
        case 'leads_by_stage':   result = await handleLeadsByStage(query); break;
        case 'lead_count':       result = await handleLeadCount(); break;
        case 'pending_payment':  result = await handlePendingPayment(); break;
        case 'top_performer':    result = await handleTopPerformer(); break;
        case 'compare_period':   result = await handleComparePeriod(); break;
        case 'recent_activity':  result = await handleRecentActivity(); break;
        case 'pipeline_summary': result = await handlePipelineSummary(); break;
        case 'revenue_summary':  result = await handleRevenueSummary(); break;
        case 'employee_list':    result = await handleEmployeeList(); break;
        case 'hot_leads':        result = await handleHotLeads(); break;
        case 'kpi_stats':        result = await handleKpiStats(); break;
        case 'dialer':           result = await handleDialer(); break;
        case 'whatsapp':         result = await handleWhatsApp(); break;
      }
    }
  } else {
    // Unknown intent — try LLM, then fallback
    result = await processWithLLM(query, history);
  }

  if (!result) {
    result = {
      text: "I can help you with anything on the APS admin dashboard! Try asking:\n• *\"What's our revenue this month?\"*\n• *\"Show me hot leads\"*\n• *\"Who is the top performer?\"*\n• *\"Pipeline breakdown\"*\n• *\"Which leads are awaiting payment?\"*\n• *\"Show KPI scores\"*",
      table: null, chart: null
    };
  }

  addToHistory(conversationId, query, result.text);
  return { ...result, intent };
}

// ─── Quick Suggestions ─────────────────────────────────────────────────────────
function getSuggestions() {
  return [
    { label: 'Hot leads today', query: 'Show me hot leads' },
    { label: 'Payments pending', query: 'Which leads are awaiting payment?' },
    { label: 'Pipeline overview', query: 'Give me a pipeline breakdown' },
    { label: 'This month vs last', query: 'Compare this month vs last month' },
    { label: 'Top performer', query: 'Who is the top performing employee?' },
    { label: 'Team KPIs', query: 'Show team KPI scores' },
    { label: 'Revenue summary', query: 'What is the total revenue?' },
    { label: 'Team list', query: 'List all employees' },
  ];
}

module.exports = { processQuery, getSuggestions, detectIntent };
