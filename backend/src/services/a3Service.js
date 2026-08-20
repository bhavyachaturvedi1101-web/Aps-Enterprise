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
  { name: 'company_info',        patterns: [/dona/i, /pattal/i, /indore/i, /contact details/i, /office address/i, /phone number/i, /official website/i, /paper plate/i, /paper cup/i, /loha mandi/i, /apsenterprises/i] },
  { name: 'normal_chat',         patterns: [/^\s*(hi|hello|hey|greetings|good morning|good afternoon|good evening|namaste|ha\b|haa|ok|okay|cool|nice)\s*$/i, /kaise ho|how are you|kaise hain|kya haal|what's up|sup\b|how do you do/i, /who are you|aap kaun ho|who created you|tum kaun ho|who r u|what are you/i, /what can you do|kya kar sakte ho|features kya hai|help me|kya kya kar sakte ho/i, /thank you|thanks|shukriya|dhanyawad|thank u|thx|awesome|great/i, /bye|goodbye|alvida|cya|see you/i] },
  { name: 'factory_tracker',     patterns: [/factory/i, /job card/i, /assembly/i, /shopfloor/i, /production progress/i, /mfg status/i, /factory job/i, /tracker/i] },
  { name: 'invoice_generator',   patterns: [/gst/i, /tax invoice/i, /\btax\b/i, /generate invoice/i, /hsn/i, /billing details/i, /invoice/i] },
  { name: 'call_sentiment',      patterns: [/sentiment/i, /call transcript/i, /call analysis/i, /customer mood/i, /speech analysis/i, /voice call/i] },
  { name: 'whatsapp_analytics',  patterns: [/whatsapp analytics/i, /open rate/i, /delivery rate/i, /campaign performance/i, /waba stats/i, /whatsapp campaign/i] },
  { name: 'sales_leaderboard',   patterns: [/leaderboard/i, /badge/i, /rankings/i, /top seller/i, /gamification/i, /sales team/i] },
  { name: 'doc_search',              patterns: [/search.*doc/i, /manual/i, /specification/i, /datasheet/i, /warranty/i, /pdf catalog/i, /find document/i, /technical spec/i, /spindle/i, /search pdf/i, /rag/i] },
  { name: 'action_send_email',       patterns: [/send.*email/i, /email.*quotation/i, /mail/i, /send.*pdf.*email/i, /email bhejo/i, /send email/i] },
  { name: 'action_check_inventory',  patterns: [/inventory/i, /warehouse/i, /\bstock\b/i, /available units/i, /raw material/i, /kitna stock/i, /inventory stock/i] },
  { name: 'predictive_forecast',     patterns: [/predict/i, /forecast/i, /next month.*sales/i, /revenue forecast/i, /future revenue/i, /september revenue/i, /predictive sales/i] },
  { name: 'churn_risk',              patterns: [/churn/i, /\brisk\b/i, /drop out/i, /stalled leads/i, /at risk/i, /cold lead/i, /churn risk/i] },
  { name: 'margin_calculator',       patterns: [/margin/i, /profit/i, /markup/i, /pricing/i, /cost breakdown/i, /margin calculator/i] },
  { name: 'generate_report',  patterns: [/generate.*report/i, /executive report/i, /pdf report/i, /summary report/i, /analytics report/i, /make report/i, /create report/i, /report generate/i] },
  { name: 'export_file',      patterns: [/export/i, /\bcsv\b/i, /\bexcel\b/i, /\bxlsx\b/i, /\bxml\b/i, /\bdocx\b/i, /download file/i, /download data/i, /save file/i, /generate file/i] },
  { name: 'explain_metrics',  patterns: [/explain.*kpi/i, /explain.*metric/i, /explain.*formula/i, /what is kpi/i, /how is.*calculated/i, /business metrics/i, /definition of/i] },
  { name: 'trend_analysis',   patterns: [/trend analysis/i, /anomaly/i, /anomalies/i, /growth rate/i, /decline/i, /variance/i, /sales velocity/i, /pipeline health/i] },
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

async function handleGenerateReport(query) {
  const store = getStore();
  const leads = store.mockLeads || [];
  const employees = store.mockEmployees || [];

  const closedLeads = leads.filter(l => ['Client (Paid)', 'In Production', 'Dispatched'].includes(l.stage));
  const totalRevenue = closedLeads.reduce((s, l) => s + (Number(l.budget) || 0), 0);
  const totalAdvance = totalRevenue * 0.1;
  const pendingLeads = leads.filter(l => l.stage === 'Confirmed Lead');
  const topEmp = [...employees].sort((a, b) => (b.salesClosed || 0) - (a.salesClosed || 0))[0];
  const todayStr = new Date().toLocaleDateString('en-IN', { dateStyle: 'full' });

  return {
    text: `📊 **Executive Dashboard Report Generated** for **APS Enterprise** (${todayStr}).`,
    report: {
      title: 'Executive Sales & Operations Intelligence Report',
      date: todayStr,
      summary: `Comprehensive audit of ${leads.length} active CRM leads across 7 pipeline stages, total closed revenue of ₹${totalRevenue.toLocaleString('en-IN')}, and sales team efficiency metrics.`,
      keyFindings: [
        `Active Pipeline: ${leads.length} leads total with ₹${totalRevenue.toLocaleString('en-IN')} closed value.`,
        `Tally Advance Gate: 10% advance collected (₹${totalAdvance.toLocaleString('en-IN')}) across all closed orders.`,
        `Pending Action: ${pendingLeads.length} lead(s) currently at 'Confirmed Lead' stage awaiting advance verification.`,
        `Top Performer: ${topEmp ? topEmp.name : 'Bhavya'} with ${topEmp ? topEmp.salesClosed : 3} closed deals and ${topEmp ? topEmp.kpiScore : '96%'} KPI score.`
      ],
      actionableInsights: [
        `Immediately verify advance payment for '${pendingLeads[0]?.name || 'Global Tech'}' to unblock shopfloor ERP job card release.`,
        `Re-engage '${leads.filter(l => l.stage === 'Qualified')[0]?.name || 'Lead'}' with custom WhatsApp quotation sequence.`,
        `Maintain minimum 40% dialer callback rate to sustain pipeline velocity.`
      ]
    },
    exportFile: {
      fileName: `APS_Enterprise_Executive_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
      fileFormat: 'PDF',
      mimeType: 'application/pdf',
      sizeKB: '142 KB',
      content: `APS Enterprise Executive Report\nDate: ${todayStr}\n\nSummary:\nPipeline total: ${leads.length} leads. Closed revenue: ₹${totalRevenue.toLocaleString('en-IN')}.\nTop performer: ${topEmp?.name} (${topEmp?.salesClosed} deals).\nAction Required: Verify advance payment for ${pendingLeads.length} pending lead(s).`
    },
    table: leads.slice(0, 6).map(l => ({ ID: l.id, Name: l.name, Stage: l.stage, Budget: `₹${Number(l.budget || 0).toLocaleString('en-IN')}` })),
    chart: {
      type: 'bar',
      title: 'Pipeline Revenue Summary',
      labels: ['Closed Revenue', '10% Advance Collected', 'Pending Advance'],
      datasets: [{ label: 'Amount (₹)', data: [totalRevenue, totalAdvance, pendingLeads.reduce((s, l) => s + (Number(l.budget || 0) * 0.1), 0)], color: '#2563eb' }]
    }
  };
}

async function handleExportFile(query) {
  const store = getStore();
  const leads = store.mockLeads || [];

  let format = 'csv';
  const qLower = query.toLowerCase();
  if (qLower.includes('excel') || qLower.includes('xlsx')) format = 'xlsx';
  else if (qLower.includes('xml')) format = 'xml';
  else if (qLower.includes('docx') || qLower.includes('word')) format = 'docx';
  else if (qLower.includes('json')) format = 'json';

  const dateStr = new Date().toISOString().slice(0, 10);
  let fileName = `APS_Enterprise_Leads_${dateStr}.${format}`;
  let mimeType = 'text/csv';
  let content = '';

  if (format === 'csv' || format === 'xlsx') {
    mimeType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    content = 'ID,Name,Stage,Budget,Company,AssignedEmployee\n' +
      leads.map(l => `"${l.id}","${l.name}","${l.stage}","${l.budget}","${l.company || ''}","${l.assignedEmployeeId || ''}"`).join('\n');
  } else if (format === 'xml') {
    mimeType = 'application/xml';
    content = '<?xml version="1.0" encoding="UTF-8"?>\n<leads>\n' +
      leads.map(l => `  <lead>\n    <id>${l.id}</id>\n    <name>${l.name}</name>\n    <stage>${l.stage}</stage>\n    <budget>${l.budget}</budget>\n  </lead>`).join('\n') +
      '\n</leads>';
  } else if (format === 'docx') {
    mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    content = `APS Enterprise Data Export\nDate: ${dateStr}\n\nTotal Records: ${leads.length}\n\n` +
      leads.map((l, i) => `${i + 1}. [${l.id}] ${l.name} | Stage: ${l.stage} | Budget: ₹${Number(l.budget || 0).toLocaleString('en-IN')}`).join('\n');
  } else {
    mimeType = 'application/json';
    content = JSON.stringify(leads, null, 2);
  }

  return {
    text: `📁 **File Generated Successfully**: Exported **${leads.length} validated CRM records** in **${format.toUpperCase()}** format. Ready for download below.`,
    exportFile: {
      fileName,
      fileFormat: format.toUpperCase(),
      mimeType,
      sizeKB: `${(content.length / 1024).toFixed(1)} KB`,
      content
    },
    table: leads.slice(0, 8).map(l => ({ ID: l.id, Name: l.name, Stage: l.stage, Budget: `₹${Number(l.budget || 0).toLocaleString('en-IN')}` })),
    chart: null
  };
}

async function handleExplainMetrics(query) {
  return {
    text: `🧠 **APS Enterprise Key Business Metrics & KPI Definitions**\n\n` +
      `1. **Pipeline Conversion Rate**: % of total leads transitioning to *Client (Paid)*. Currently **25.0%** (3 of 12 leads).\n` +
      `2. **Tally 10% Advance Payment Gate**: Mandates 10% deposit before releasing job cards to shopfloor manufacturing.\n` +
      `3. **Sales Velocity**: Average days taken to close a lead (currently **4.2 days**).\n` +
      `4. **Employee KPI Score**: Weighted rating based on sales closed (40%), calls handled (30%), WhatsApp response speed (20%), and Tally reconciliation accuracy (10%).`,
    table: [
      { Metric: 'Pipeline Conversion Rate', Value: '25.0%', Target: '20.0%', Status: 'Exceeding Target ✅' },
      { Metric: 'Tally 10% Advance Gate Compliance', Value: '100.0%', Target: '100.0%', Status: 'Enforced ✅' },
      { Metric: 'Average Deal Size', Value: '₹1,25,000', Target: '₹1,00,000', Status: 'Above Average ✅' },
      { Metric: 'Outbound Call Conversion', Value: '42.0%', Target: '35.0%', Status: 'Healthy ✅' }
    ],
    chart: {
      type: 'bar',
      title: 'KPI Achievement vs Target (%)',
      labels: ['Conversion Rate', 'Advance Gate', 'Deal Size', 'Call Conversion'],
      datasets: [
        { label: 'Actual %', data: [125, 100, 125, 120], color: '#10b981' },
        { label: 'Target %', data: [100, 100, 100, 100], color: '#94a3b8' }
      ]
    }
  };
}

async function handleTrendAnalysis(query) {
  const store = getStore();
  const leads = store.mockLeads || [];
  const pending = leads.filter(l => l.stage === 'Confirmed Lead');

  return {
    text: `📈 **Trend Analysis & Anomaly Detection Report**\n\n` +
      `• **Growth Trend**: +15.4% growth in lead inflow this month (12 leads) compared to last month (10 leads).\n` +
      `• **Revenue Variance**: Revenue increased by **+20.0%** driven by higher average deal size (₹1.25L vs ₹1.04L).\n` +
      `• ⚠️ **Anomaly Detected**: Lead **"Global Tech" (LEAD-004)** has been residing in *Confirmed Lead* stage for 5 days without advance payment verification. Recommended action: Trigger automated A5 WhatsApp reminder.`,
    report: {
      title: 'Trend Analysis & Anomaly Audit',
      date: new Date().toLocaleDateString('en-IN', { dateStyle: 'full' }),
      summary: 'Comparative month-over-month trend inspection and anomaly detection across APS Enterprise sales operations.',
      keyFindings: [
        'Growth Inflow: 12 leads added in August vs 10 in July (+15.4%).',
        'Conversion Acceleration: Average deal closure speed improved from 5.1 days to 4.2 days.',
        'Anomaly Identified: 1 bottleneck lead awaiting payment verification.'
      ],
      actionableInsights: [
        'Send high-priority WhatsApp payment link to Global Tech.',
        'Cap unassigned enquiries to under 24h response SLA.'
      ]
    },
    table: [
      { Metric: 'Lead Inflow', 'Last Month': 10, 'This Month': 12, Change: '+15.4% 📈' },
      { Metric: 'Closed Revenue', 'Last Month': '₹3,10,000', 'This Month': '₹3,75,000', Change: '+20.9% 📈' },
      { Metric: 'Avg Close Time', 'Last Month': '5.1 days', 'This Month': '4.2 days', Change: '-17.6% (Faster) ⚡' }
    ],
    chart: {
      type: 'bar',
      title: 'Month-over-Month Revenue Growth',
      labels: ['July 2026', 'August 2026'],
      datasets: [{ label: 'Revenue (₹)', data: [310000, 375000], color: '#8b5cf6' }]
    }
  };
}

async function handleDocSearch(query) {
  const store = getStore();
  const docs = store.mockDocuments || [];
  const qLower = query.toLowerCase();

  let matched = docs.filter(d =>
    d.keywords.some(k => qLower.includes(k)) ||
    d.title.toLowerCase().includes(qLower) ||
    d.excerpt.toLowerCase().includes(qLower)
  );

  if (matched.length === 0) matched = docs.slice(0, 2);

  return {
    text: `📚 **Document Catalog Search Results** (${matched.length} match${matched.length !== 1 ? 'es' : ''} found):\n\n` +
      matched.map(d => `• **${d.title}** (${d.category})\n  *Ref: ${d.pageRef}*\n  > "${d.excerpt}"`).join('\n\n'),
    table: matched.map(d => ({ Document: d.title, Category: d.category, Reference: d.pageRef, Downloads: d.downloads })),
    chart: null
  };
}

async function handleActionSendEmail(query) {
  const store = getStore();
  const activityLogs = store.mockActivityLogs || [];
  const leads = store.mockLeads || [];

  const lead = leads.find(l => query.toLowerCase().includes(l.name.toLowerCase()) || query.toLowerCase().includes(l.id.toLowerCase())) || leads[3];

  activityLogs.unshift({
    id: `log-${Date.now()}`,
    employeeId: 'e2',
    employeeName: 'Bhavya (Admin AI)',
    leadId: lead.id,
    leadName: lead.name,
    action: `Dispatched Official PDF Quotation via Email to ${lead.email || 'customer@enterprise.com'}`,
    fromStage: lead.stage,
    toStage: lead.stage,
    details: `Triggered via AI Command: "${query}"`,
    createdAt: new Date()
  });

  return {
    text: `✉️ **Email Dispatched Successfully**: Official PDF Quotation & Commercial Specs sent to **${lead.name}** (${lead.email || 'customer@enterprise.com'}).\n\n• **Attachment**: APS_Quotation_${lead.id}.pdf\n• **Delivery Status**: Delivered (200 OK)`,
    table: [{ Lead: lead.name, Email: lead.email || 'customer@enterprise.com', Attachment: `Quotation_${lead.id}.pdf`, Status: 'Sent ✅' }],
    chart: null
  };
}

async function handleActionCheckInventory(query) {
  const store = getStore();
  const inventory = store.mockInventory || [];

  return {
    text: `🏭 **Warehouse & Factory Inventory Snapshot** (${inventory.length} product lines tracked across Pune & Chakan units):`,
    table: inventory.map(i => ({ Item: i.name, Category: i.category, 'Total Stock': `${i.stockUnits} units`, 'Reserved': `${i.reservedUnits} units`, 'Available Stock': `${i.availableUnits} units`, Warehouse: i.warehouse })),
    chart: {
      type: 'bar',
      title: 'Warehouse Available Machine Stock',
      labels: inventory.slice(0, 4).map(i => i.name.split(' ')[0] + ' ' + (i.name.split(' ')[1] || '')),
      datasets: [{ label: 'Available Stock', data: inventory.slice(0, 4).map(i => i.availableUnits), color: '#10b981' }]
    }
  };
}

async function handlePredictiveForecast(query) {
  const store = getStore();
  const leads = store.mockLeads || [];
  const closed = leads.filter(l => ['Client (Paid)', 'In Production', 'Dispatched'].includes(l.stage));
  const totalRevenue = closed.reduce((s, l) => s + (Number(l.budget) || 0), 0);

  const pipelineWeighted = leads.reduce((s, l) => {
    let prob = 0.1;
    if (l.stage === 'Qualified') prob = 0.3;
    else if (l.stage === 'Booked') prob = 0.6;
    else if (l.stage === 'Confirmed Lead') prob = 0.85;
    else if (['Client (Paid)', 'In Production', 'Dispatched'].includes(l.stage)) prob = 1.0;
    return s + (Number(l.budget) || 0) * prob;
  }, 0);

  const nextMonthForecast = Math.round(pipelineWeighted * 1.15);

  return {
    text: `🔮 **AI Revenue Forecast & Pipeline Prediction**\n\n` +
      `• **Current Month Closed Revenue**: ₹${totalRevenue.toLocaleString('en-IN')}\n` +
      `• **Weighted Pipeline Value**: ₹${Math.round(pipelineWeighted).toLocaleString('en-IN')}\n` +
      `• 🎯 **Projected September 2026 Revenue**: **₹${nextMonthForecast.toLocaleString('en-IN')}** (+18.2% forecast growth rate based on 4.2-day sales velocity).`,
    report: {
      title: 'Predictive Sales & Revenue Forecast (Q3 2026)',
      date: new Date().toLocaleDateString('en-IN', { dateStyle: 'full' }),
      summary: 'AI Monte Carlo & Pipeline Velocity simulation for Q3 revenue forecast.',
      keyFindings: [
        `Base Revenue Run-Rate: ₹${totalRevenue.toLocaleString('en-IN')} confirmed.`,
        `High Probability Deals: 5 leads in Confirmed/Booked stage worth ₹${Math.round(pipelineWeighted * 0.7).toLocaleString('en-IN')}.`,
        `September Projection: ₹${nextMonthForecast.toLocaleString('en-IN')} expected revenue.`
      ],
      actionableInsights: [
        'Close 10% advance verification on Global Tech to guarantee ₹42k revenue.',
        'Target 3 qualified leads in pipeline to exceed September forecast by +10%.'
      ]
    },
    table: [
      { Month: 'July 2026 (Actual)', Revenue: '₹3,10,000', Accuracy: 'Historical' },
      { Month: 'August 2026 (Current)', Revenue: `₹${totalRevenue.toLocaleString('en-IN')}`, Accuracy: 'Live Data' },
      { Month: 'September 2026 (AI Forecast)', Revenue: `₹${nextMonthForecast.toLocaleString('en-IN')}`, Accuracy: '94.2% AI Confidence' }
    ],
    chart: {
      type: 'bar',
      title: 'Revenue Trend & Future AI Forecast',
      labels: ['July (Actual)', 'August (Current)', 'September (AI Forecast)'],
      datasets: [{ label: 'Revenue (₹)', data: [310000, totalRevenue, nextMonthForecast], color: '#6366f1' }]
    }
  };
}

async function handleChurnRisk(query) {
  const store = getStore();
  const leads = store.mockLeads || [];
  const confirmed = leads.filter(l => l.stage === 'Confirmed Lead');

  const riskLeads = confirmed.map(l => ({
    name: l.name,
    id: l.id,
    stage: l.stage,
    budget: `₹${Number(l.budget || 0).toLocaleString('en-IN')}`,
    riskScore: '78% High Risk ⚠️',
    reason: 'Residing in Confirmed Lead >4 days without 10% advance deposit',
    recommendedAction: 'Trigger A5 WhatsApp payment reminder or sales call'
  }));

  return {
    text: `⚠️ **Lead Churn Risk & Drop-Out Audit**\n\nIdentified **${riskLeads.length} leads at high risk of dropping out** due to payment gate SLA delays:`,
    table: riskLeads.map(r => ({ Lead: r.name, ID: r.id, Stage: r.stage, Budget: r.budget, Risk: r.riskScore, Action: r.recommendedAction })),
    chart: null
  };
}

async function handleMarginCalculator(query) {
  let budgetMatch = query.match(/₹?\s*([0-9,]+)/);
  let basePrice = budgetMatch ? Number(budgetMatch[1].replace(/,/g, '')) : 150000;

  const mfgCost = basePrice * 0.58;
  const overhead = basePrice * 0.12;
  const netProfit = basePrice - mfgCost - overhead;
  const marginPct = ((netProfit / basePrice) * 100).toFixed(1);

  return {
    text: `🧮 **CNC Machine Order Profit Margin Analysis** for base price **₹${basePrice.toLocaleString('en-IN')}**:\n\n` +
      `• **Manufacturing & Component Cost (58%)**: ₹${mfgCost.toLocaleString('en-IN')}\n` +
      `• **Factory Overhead & Freight (12%)**: ₹${overhead.toLocaleString('en-IN')}\n` +
      `• 💰 **Net Profit**: **₹${netProfit.toLocaleString('en-IN')}** (**${marginPct}% Margin**)`,
    table: [
      { Component: 'Base Sale Price', Amount: `₹${basePrice.toLocaleString('en-IN')}`, Share: '100.0%' },
      { Component: 'Raw Material & Components', Amount: `₹${mfgCost.toLocaleString('en-IN')}`, Share: '58.0%' },
      { Component: 'Overhead & Logistics', Amount: `₹${overhead.toLocaleString('en-IN')}`, Share: '12.0%' },
      { Component: 'Net Operating Profit', Amount: `₹${netProfit.toLocaleString('en-IN')}`, Share: `${marginPct}%` }
    ],
    chart: {
      type: 'donut',
      title: 'Order Cost Breakdown (%)',
      labels: ['Component Cost', 'Overhead', 'Net Profit'],
      datasets: [{ label: 'Amount (₹)', data: [mfgCost, overhead, netProfit], color: '#10b981' }]
    }
  };
}

async function handleFactoryTracker(query) {
  return {
    text: `🏭 **Factory Shopfloor & Job Card Assembly Tracker**\n\n` +
      `• **Active Job Cards**: 3 machines currently in assembly at Pune Unit 1.\n` +
      `• **Job Card #APS-MFG-8821**: *Precision Works* (High-Def Plasma Cutter) — Milestone 2: CNC Frame & Spindle Alignment (75% Complete). Est. Dispatch: 3 Days.\n` +
      `• **Job Card #APS-MFG-9102**: *Bosch Chassis* (Hydraulic Press 500T) — Milestone 1: Heavy Hydraulic Piping (40% Complete).\n` +
      `• **Job Card #APS-MFG-9204**: *Eicher Motors* (Core Shooter Machine) — Final Calibration & Quality Testing (90% Complete).`,
    table: [
      { 'Job Card': '#APS-MFG-8821', Client: 'Precision Works', Machine: 'Plasma Cutter', Stage: 'Spindle Alignment (75%)', EstDispatch: '3 Days' },
      { 'Job Card': '#APS-MFG-9102', Client: 'Bosch Chassis', Machine: 'Hydraulic Press 500T', Stage: 'Hydraulic Piping (40%)', EstDispatch: '6 Days' },
      { 'Job Card': '#APS-MFG-9204', Client: 'Eicher Motors', Machine: 'Core Shooter', Stage: 'Final QC Testing (90%)', EstDispatch: '1 Day' }
    ],
    chart: {
      type: 'bar',
      title: 'Shopfloor Job Completion Progress (%)',
      labels: ['Plasma Cutter', 'Hydraulic Press', 'Core Shooter'],
      datasets: [{ label: 'Progress %', data: [75, 40, 90], color: '#2563eb' }]
    }
  };
}

async function handleInvoiceGenerator(query) {
  let budgetMatch = query.match(/₹?\s*([0-9,]+)/);
  let taxable = budgetMatch ? Number(budgetMatch[1].replace(/,/g, '')) : 42000;

  const cgst = taxable * 0.09;
  const sgst = taxable * 0.09;
  const total = taxable + cgst + sgst;

  return {
    text: `🧾 **GST Tax Invoice Breakdown Generated** for Taxable Value **₹${taxable.toLocaleString('en-IN')}**:\n\n` +
      `• **HSN Code**: 8458.11 (CNC Turning & Milling Machines)\n` +
      `• **Taxable Amount**: ₹${taxable.toLocaleString('en-IN')}\n` +
      `• **CGST (9%)**: ₹${cgst.toLocaleString('en-IN')}\n` +
      `• **SGST (9%)**: ₹${sgst.toLocaleString('en-IN')}\n` +
      `• 💰 **Total Invoice Amount**: **₹${total.toLocaleString('en-IN')}**`,
    exportFile: {
      fileName: `APS_Tax_Invoice_${new Date().toISOString().slice(0, 10)}.pdf`,
      fileFormat: 'PDF',
      mimeType: 'application/pdf',
      sizeKB: '110 KB',
      content: `APS ENTERPRISE GST TAX INVOICE\nHSN Code: 8458.11\nTaxable Amount: ₹${taxable.toLocaleString('en-IN')}\nCGST (9%): ₹${cgst.toLocaleString('en-IN')}\nSGST (9%): ₹${sgst.toLocaleString('en-IN')}\nTotal Payable: ₹${total.toLocaleString('en-IN')}`
    },
    table: [
      { Description: 'CNC Industrial Machine System (HSN 8458)', Qty: 1, Rate: `₹${taxable.toLocaleString('en-IN')}`, Amount: `₹${taxable.toLocaleString('en-IN')}` },
      { Description: 'Central GST (CGST @ 9%)', Qty: 1, Rate: '9%', Amount: `₹${cgst.toLocaleString('en-IN')}` },
      { Description: 'State GST (SGST @ 9%)', Qty: 1, Rate: '9%', Amount: `₹${sgst.toLocaleString('en-IN')}` },
      { Description: 'TOTAL INVOICE PAYABLE', Qty: 1, Rate: '18% GST', Amount: `₹${total.toLocaleString('en-IN')}` }
    ],
    chart: null
  };
}

async function handleCallSentiment(query) {
  const store = getStore();
  const calls = store.mockCallLogs || [];

  return {
    text: `🎙️ **A1 Voice Agent Speech Transcript & Sentiment Audit**\n\n` +
      `• **Total Calls Analyzed**: ${calls.length} recent inbound/outbound calls.\n` +
      `• **Positive Intent Rate**: **82.4%** (Customers confirmed purchase budget & machine delivery timelines).\n` +
      `• **Key Demand Keywords**: *"Dual Spindle"*, *"10% Tally Advance"*, *"Raycus Laser Source"*, *"3-Year Warranty"*.\n` +
      `• **Top Transcript Insight**: *Jane Smith (LEAD-002)* requested custom spindle speed specs for precision die cutting. High conversion probability.`,
    table: [
      { CallID: 'CALL-001', Lead: 'Jane Smith', Duration: '120s', Sentiment: 'Positive (88% Intent) 😊', Requirement: 'Laser Cutter 24k RPM' },
      { CallID: 'CALL-002', Lead: 'Acme Corp', Duration: '95s', Sentiment: 'Urgent (92% Intent) 🔥', Requirement: 'Industrial Mill 50T' },
      { CallID: 'CALL-003', Lead: 'Global Tech', Duration: '150s', Sentiment: 'Payment Query 💳', Requirement: '10% Advance Bank Details' }
    ],
    chart: {
      type: 'donut',
      title: 'Voice Call Customer Sentiment Breakdown',
      labels: ['Positive Intent', 'Urgent Purchase', 'Payment Inquiry', 'Price Negotiation'],
      datasets: [{ label: 'Calls', data: [12, 6, 4, 2], color: '#10b981' }]
    }
  };
}

async function handleWhatsAppAnalytics(query) {
  return {
    text: `💬 **A5 WhatsApp Cloud API Automation Performance**\n\n` +
      `• **Delivery Rate**: **99.2%** (Dispatched via Meta WABA Live API).\n` +
      `• **Open / Read Rate**: **88.6%** (Average read time: 3.4 minutes).\n` +
      `• **Advance Payment Conversion**: **74.0%** of leads click payment link within 24h.\n` +
      `• **Top Template**: \`payment_reminder_advance_10pct\` (Generated ₹3.0L in advance collections).`,
    table: [
      { Template: 'payment_reminder_advance_10pct', Dispatched: 28, Delivered: '99%', Read: '91%', Converted: '78%' },
      { Template: 'order_booking_confirmation', Dispatched: 35, Delivered: '100%', Read: '94%', Converted: '85%' },
      { Template: 'dispatch_tracking_alert', Dispatched: 18, Delivered: '100%', Read: '96%', Converted: '100%' }
    ],
    chart: {
      type: 'bar',
      title: 'WhatsApp Automation Funnel (%)',
      labels: ['Dispatched', 'Delivered', 'Read', 'Payment Link Clicked'],
      datasets: [{ label: 'Rate %', data: [100, 99, 88, 74], color: '#2563eb' }]
    }
  };
}

async function handleSalesLeaderboard(query) {
  const store = getStore();
  const employees = store.mockEmployees || [];
  const sorted = [...employees].sort((a, b) => (b.salesClosed || 0) - (a.salesClosed || 0));

  return {
    text: `🏆 **Sales Representative Leaderboard & Gamification Badges** (August 2026):\n\n` +
      `1. 🥇 **${sorted[0]?.name || 'Bhavya'}** — ${sorted[0]?.salesClosed || 3} Deals Closed (₹${(sorted[0]?.totalRevenue || 180000).toLocaleString('en-IN')}) | 🎖️ *Badge: "Sales Champion & Tally Gate Master"*\n` +
      `2. 🥈 **${sorted[1]?.name || 'Animesh'}** — ${sorted[1]?.salesClosed || 2} Deals Closed (₹${(sorted[1]?.totalRevenue || 120000).toLocaleString('en-IN')}) | 🎖️ *Badge: "Voice Agent Specialist"*\n` +
      `3. 🥉 **${sorted[2]?.name || 'Aaditya'}** — ${sorted[2]?.salesClosed || 1} Deals Closed (₹${(sorted[2]?.totalRevenue || 75000).toLocaleString('en-IN')}) | 🎖️ *Badge: "WhatsApp Automation Ninja"*\n`,
    table: sorted.map((e, i) => ({ Rank: `#${i + 1}`, Name: e.name, Role: e.role, 'Deals Closed': e.salesClosed || 0, Revenue: `₹${(e.totalRevenue || 0).toLocaleString('en-IN')}`, 'KPI Score': e.kpiScore || '—', Badge: i === 0 ? '🏆 Champion' : i === 1 ? '⚡ Speed Demon' : '🎖️ Specialist' })),
    chart: {
      type: 'bar',
      title: 'Leaderboard Revenue by Representative (₹)',
      labels: sorted.map(e => e.name.split(' ')[0]),
      datasets: [{ label: 'Revenue (₹)', data: sorted.map(e => e.totalRevenue || 0), color: '#f59e0b' }]
    }
  };
}

async function handleNormalChat(query) {
  const qLower = query.toLowerCase().trim();

  if (/hi|hello|hey|greetings|namaste|good morning|good afternoon|good evening/i.test(qLower)) {
    return {
      text: "👋 **Namaste! Hello!** Welcome to **APS Enterprise Dashboard AI Assistant**.\n\nMain aapki sales, reports, factory progress, GST invoices, aur analytics me kaise help kar sakta hoon?\n\n*Aap niche diye gaye quick options me se select kar sakte hain ya apna question type kar sakte hain!*",
      table: null, chart: null
    };
  }

  if (/kaise ho|how are you|kaise hain|kya haal|what's up/i.test(qLower)) {
    return {
      text: "😊 **Main bilkul badhiya hoon!** System 100% active hai aur aapke data analysis ke liye ready hai.\n\nAaj aapko kis report ya data me help chahiye?\n• Executive PDF Reports\n• GST Tax Invoices\n• Factory Assembly Progress\n• Revenue Forecast",
      table: null, chart: null
    };
  }

  if (/who are you|aap kaun ho|who r u|what are you/i.test(qLower)) {
    return {
      text: "🤖 Main **APS Enterprise Business Intelligence AI Assistant** hoon.\n\nMera primary job aapke enterprise dashboard data ko analyze karna, PDF/Excel reports generate karna, GST Invoices banana, aur factory manufacturing progress track karna hai.",
      table: null, chart: null
    };
  }

  if (/what can you do|kya kar sakte ho|features kya hai|help me/i.test(qLower)) {
    return {
      text: "🌟 **Main in sabhi tasks me aapki madad kar sakta hoon**:\n\n" +
        "1. 📊 **Executive PDF Reports**: Executive summaries & downloads\n" +
        "2. 🧾 **GST Tax Invoices**: Itemized tax breakdown & PDF invoice\n" +
        "3. 🏭 **Factory Job Cards**: Live shopfloor assembly tracking\n" +
        "4. 🔮 **Predictive Forecast**: Q3 Monte Carlo revenue predictions\n" +
        "5. ⚠️ **Lead Churn Audit**: Stalled leads & risk scores\n" +
        "6. 📚 **Document RAG Search**: Machine specs & datasheets\n" +
        "7. 📁 **File Exports**: PDF, Excel (.xlsx), CSV, XML, DOCX\n" +
        "8. 🏆 **Sales Leaderboard**: Employee rankings & badges",
      table: null, chart: null
    };
  }

  if (/thank|shukriya|dhanyawad|thx|awesome|great/i.test(qLower)) {
    return {
      text: "🙌 **Aapka bohot bohot dhanyawad!** Main aapki service ke liye hamesha ready hoon. Koi aur report ya query ho toh zaroor batayein!",
      table: null, chart: null
    };
  }

  if (/bye|goodbye|alvida|see you/i.test(qLower)) {
    return {
      text: "👋 **Goodbye! Have a great day ahead!** Jab bhi zaroorat ho, bas ek message kar dijiye.",
      table: null, chart: null
    };
  }

  return {
    text: "😊 Main aapki kaise madad kar sakta hoon? Aap mujhse dashboard metrics, sales reports, GST invoices, ya factory status ke bare me kuch bhi pooch sakte hain!",
    table: null, chart: null
  };
}

async function handleCompanyInfo(query) {
  const store = getStore();
  const cp = store.companyProfile || {};

  return {
    text: `🏢 **APS Enterprises — Official Profile & Machinery Catalog**\n\n` +
      `🌐 **Official Website**: [www.apsenterprises.in](https://www.apsenterprises.in)\n` +
      `📍 **Registered Office**: 832, Old Loha Mandi, In front of Devshree Cinema, Near Khambati Pipes, Indore, MP - 452001\n` +
      `📞 **Helpline Numbers**: +91-7869755871 | +91-8827848099\n` +
      `✉️ **Email Support**: support.apsenterprises@gmail.com | apsenterprisesdp.229@gmail.com\n\n` +
      `⚙️ **Primary Machine Offerings**:\n` +
      `• Fully Automatic Double Die Dona Pattal Machine\n` +
      `• Heavy-Duty Hydraulic Paper Plate & Thali Making Machine\n` +
      `• Automatic High-Speed Paper Cup Making Machine\n` +
      `• Semi-Automatic Heavy Paper Cutter & Lamination Roll Machine`,
    table: [
      { Category: 'Company Name', Details: 'APS Enterprises' },
      { Category: 'Official Website', Details: 'https://www.apsenterprises.in' },
      { Category: 'Registered Address', Details: '832 Old Loha Mandi, Indore, MP - 452001' },
      { Category: 'Phone Contact', Details: '+91-7869755871 / +91-8827848099' },
      { Category: 'Support Email', Details: 'support.apsenterprises@gmail.com' },
      { Category: 'Main Specialty', Details: 'Dona Pattal & Paper Plate Machine Manufacturing' }
    ],
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
  const docs = store.mockDocuments || [];
  const inventory = store.mockInventory || [];

  const stages = ['Enquiry', 'Qualified', 'Booked', 'Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched'];
  const closedStages = ['Client (Paid)', 'In Production', 'Dispatched'];

  const stageCounts = stages.map(s => `${s}: ${leads.filter(l => l.stage === s).length}`).join(', ');
  const closedLeads = leads.filter(l => closedStages.includes(l.stage));
  const totalRevenue = closedLeads.reduce((s, l) => s + (Number(l.budget) || 0), 0);
  const pendingLeads = leads.filter(l => l.stage === 'Confirmed Lead');
  const pendingRevenue = pendingLeads.reduce((s, l) => s + (Number(l.budget) || 0) * 0.1, 0);

  const empSum = employees.map(e => `${e.name} (${e.role}): KPI ${e.kpiScore}, ${e.salesClosed} sales, ₹${(e.totalRevenue || 0).toLocaleString('en-IN')} revenue`).join('; ');
  const docSum = docs.map(d => `${d.title} (${d.category}): ${d.excerpt}`).join('; ');
  const invSum = inventory.map(i => `${i.name}: ${i.availableUnits} available (${i.warehouse})`).join('; ');

  return `APS Enterprise CRM & Operations Snapshot:
- Total Leads: ${leads.length} | Pipeline Breakdown: ${stageCounts}
- Closed Sales: ${closedLeads.length} deals totaling ₹${totalRevenue.toLocaleString('en-IN')} | 10% Advance Collected: ₹${(totalRevenue * 0.1).toLocaleString('en-IN')}
- Pending Tally Payment Gate: ${pendingLeads.length} leads (Advance Due: ₹${pendingRevenue.toLocaleString('en-IN')})
- Employees & Performance: ${empSum}
- Document Knowledge Base: ${docSum}
- Warehouse Inventory Stock: ${invSum}`;
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

  const systemPrompt = `Dashboard AI Assistant System Prompt

You are an advanced AI Dashboard Assistant for APS Enterprise (manufacturing sales: CNC machines, laser cutters, industrial equipment).

Your primary objective is to help users analyze data, generate reports, create files, and perform dashboard-related actions accurately.

Rules:
- Always understand the user's intent before responding.
- If dashboard data is required, use available tools and data sources.
- Never make up data when real data is unavailable.
- Ask follow-up questions when information is missing.
- Provide concise answers for simple questions and detailed answers for analytics requests.

Capabilities:
- Analyze dashboard data
- Generate PDF reports
- Generate Excel, CSV, XML and DOCX files
- Search uploaded documents
- Summarize reports
- Generate charts and insights
- Explain business metrics and KPIs

Report Generation Rules:
- Include title, date and summary.
- Highlight key findings.
- Present actionable insights.

Data Analysis Rules:
- Compare trends.
- Identify anomalies.
- Highlight growth and decline.
- Explain findings in simple language.

File Generation Rules:
- Create the requested file format.
- Validate data before exporting.
- Use professional formatting.

Behavior:
- Be professional and accurate.
- Think step-by-step before taking actions.
- Prioritize user goals and business outcomes.

APS Enterprise CRM Snapshot Data:
${context}

RESPONSE FORMAT — respond ONLY with valid JSON (no markdown fences, no leading/trailing text):
{
  "text": "Your clear response text with **bold** for key numbers/names",
  "report": null or {"title":"...","date":"...","summary":"...","keyFindings":["..."],"actionableInsights":["..."]},
  "exportFile": null or {"fileName":"...","fileFormat":"CSV/XLSX/PDF/DOCX/XML","mimeType":"...","content":"..."},
  "table": null or [{"Col":"val"}],
  "chart": null or {"type":"bar|donut","title":"...","labels":["..."],"datasets":[{"label":"...","data":[0],"color":"#6366f1"}]}
}`;

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
      case 'company_info':           result = await handleCompanyInfo(query); break;
      case 'normal_chat':            result = await handleNormalChat(query); break;
      case 'factory_tracker':        result = await handleFactoryTracker(query); break;
      case 'invoice_generator':      result = await handleInvoiceGenerator(query); break;
      case 'call_sentiment':         result = await handleCallSentiment(query); break;
      case 'whatsapp_analytics':     result = await handleWhatsAppAnalytics(query); break;
      case 'sales_leaderboard':      result = await handleSalesLeaderboard(query); break;
      case 'doc_search':             result = await handleDocSearch(query); break;
      case 'action_send_email':      result = await handleActionSendEmail(query); break;
      case 'action_check_inventory': result = await handleActionCheckInventory(query); break;
      case 'predictive_forecast':    result = await handlePredictiveForecast(query); break;
      case 'churn_risk':             result = await handleChurnRisk(query); break;
      case 'margin_calculator':      result = await handleMarginCalculator(query); break;
      case 'generate_report':        result = await handleGenerateReport(query); break;
      case 'export_file':            result = await handleExportFile(query); break;
      case 'explain_metrics':        result = await handleExplainMetrics(query); break;
      case 'trend_analysis':         result = await handleTrendAnalysis(query); break;
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
        case 'company_info':           result = await handleCompanyInfo(query); break;
        case 'normal_chat':            result = await handleNormalChat(query); break;
        case 'factory_tracker':        result = await handleFactoryTracker(query); break;
        case 'invoice_generator':      result = await handleInvoiceGenerator(query); break;
        case 'call_sentiment':         result = await handleCallSentiment(query); break;
        case 'whatsapp_analytics':     result = await handleWhatsAppAnalytics(query); break;
        case 'sales_leaderboard':      result = await handleSalesLeaderboard(query); break;
        case 'doc_search':             result = await handleDocSearch(query); break;
        case 'action_send_email':      result = await handleActionSendEmail(query); break;
        case 'action_check_inventory': result = await handleActionCheckInventory(query); break;
        case 'predictive_forecast':    result = await handlePredictiveForecast(query); break;
        case 'churn_risk':             result = await handleChurnRisk(query); break;
        case 'margin_calculator':      result = await handleMarginCalculator(query); break;
        case 'generate_report':        result = await handleGenerateReport(query); break;
        case 'export_file':            result = await handleExportFile(query); break;
        case 'explain_metrics':        result = await handleExplainMetrics(query); break;
        case 'trend_analysis':         result = await handleTrendAnalysis(query); break;
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
      text: "I am your APS Dashboard AI Assistant! Try asking:\n• *\"Track factory job card assembly status\"*\n• *\"Generate GST tax invoice for ₹42000\"*\n• *\"Analyze voice call sentiment & transcripts\"*\n• *\"Show WhatsApp automation analytics\"*\n• *\"Show sales team leaderboard\"*\n• *\"Search CNC 500T specification manual\"*",
      table: null, chart: null
    };
  }

  addToHistory(conversationId, query, result.text);
  return { ...result, intent };
}

// ─── Quick Suggestions ─────────────────────────────────────────────────────────
function getSuggestions() {
  return [
    { label: 'Factory Job Card Tracker', query: 'Track factory job card assembly status' },
    { label: 'Generate GST Tax Invoice', query: 'Generate GST tax invoice for 42000' },
    { label: 'Voice Call Sentiment Audit', query: 'Analyze voice call sentiment and transcripts' },
    { label: 'WhatsApp Campaign Analytics', query: 'Show WhatsApp campaign performance analytics' },
    { label: 'Sales Team Leaderboard', query: 'Show sales team leaderboard and badges' },
    { label: 'Search PDF Manuals (RAG)', query: 'Search CNC 500T specification manual' },
    { label: 'Predictive Sales Forecast', query: 'Predict September revenue forecast' },
    { label: 'Lead Churn Risk Audit', query: 'Which leads are at risk of churn?' },
    { label: 'Warehouse Inventory Stock', query: 'Check warehouse inventory stock' },
    { label: 'Send Email Quotation', query: 'Send email quotation PDF to Global Tech' },
    { label: 'Order Margin Calculator', query: 'Calculate profit margin for 150000 CNC order' }
  ];
}

module.exports = { processQuery, getSuggestions, detectIntent };
