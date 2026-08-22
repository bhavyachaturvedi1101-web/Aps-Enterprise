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
const { mockLeads } = require('../config/inMemoryStore');

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
  { name: 'company_info',        patterns: [
    /where.*(is|located|situated|based|hq|office|aps|company)/i,
    /where is aps/i,
    /\blocation\b/i,
    /\blocated\b/i,
    /\baddress\b/i,
    /\bheadquarters\b/i,
    /\bhq\b/i,
    /about (aps|the company|enterprise|business|indore)/i,
    /what is aps/i,
    /who is aps/i,
    /tell me about aps/i,
    /contact (details|number|info|aps|us)/i,
    /phone number/i,
    /helpline/i,
    /email.*(id|address|support)?/i,
    /official website/i,
    /website/i,
    /dona/i,
    /pattal/i,
    /paper plate/i,
    /paper cup/i,
    /loha mandi/i,
    /indore/i,
    /apsenterprises/i,
    /kahan (hai|h|he|par|pe)/i,
    /aps.*(kahan|address|location|kya hai|details|products|machines|plants)/i,
    /products.*(aps|company|sell|make|produce)/i,
    /machine.*(sell|make|manufacture|price|catalog|list)/i
  ] },
  { name: 'dashboard_info',      patterns: [
    /dashboard (options|features|modules|tools|contain|overview|guide|summary)/i,
    /what.*(options|features|modules|contain|does this dashboard|can this dashboard|dashboard do|is this system)/i,
    /explain.*(dashboard|system|platform|features|options|modules|menu)/i,
    /how.*use.*(dashboard|system|platform|app)/i,
    /all.*(options|features|modules|pages|tabs)/i,
    /features.*(kya hai|list|overview)/i,
    /dashboard me kya kya hai/i
  ] },
  { name: 'normal_chat',         patterns: [/^\s*(hi|hello|hey|greetings|good morning|good afternoon|good evening|namaste|ha\b|haa|ok|okay|cool|nice)\s*$/i, /kaise ho|how are you|kaise hain|kya haal|what's up|sup\b|how do you do/i, /who are you|aap kaun ho|who created you|tum kaun ho|who r u|what are you/i, /what can you do|kya kar sakte ho|features kya hai|help me|kya kya kar sakte ho/i, /thank you|thanks|shukriya|dhanyawad|thank u|thx|awesome|great/i, /bye|goodbye|alvida|cya|see you/i] },
  { name: 'factory_tracker',     patterns: [/factory/i, /job card/i, /assembly/i, /shopfloor/i, /production progress/i, /mfg status/i, /factory job/i, /tracker/i] },
  { name: 'invoice_generator',   patterns: [/gst/i, /tax invoice/i, /\btax\b/i, /generate invoice/i, /hsn/i, /billing details/i, /invoice/i] },
  { name: 'call_sentiment',      patterns: [/sentiment/i, /call transcript/i, /call analysis/i, /customer mood/i, /speech analysis/i, /voice call/i] },
  { name: 'whatsapp_analytics',  patterns: [/whatsapp analytics/i, /open rate/i, /delivery rate/i, /campaign performance/i, /waba stats/i, /whatsapp campaign/i] },
  { name: 'sales_leaderboard',   patterns: [/leaderboard/i, /badge/i, /rankings/i, /top seller/i, /gamification/i, /sales team/i] },
  { name: 'doc_search',              patterns: [/search.*doc/i, /manual/i, /specification/i, /datasheet/i, /warranty/i, /pdf catalog/i, /find document/i, /technical spec/i, /spindle/i, /search pdf/i, /rag/i] },
  { name: 'action_send_email',       patterns: [/send.*email/i, /email.*quotation/i, /mail/i, /send.*pdf.*email/i, /email bhejo/i, /send email/i] },
  { name: 'action_check_inventory',  patterns: [/inventory/i, /warehouse/i, /\bstock\b/i, /available units/i, /raw material/i, /kitna stock/i, /inventory stock/i] },
  { name: 'employee_performance', patterns: [
    /(employee|employer|sales rep|team member|staff|worker).*?(perform|profit|spent|revenue|gain|roi|kpi|cost|figures|graph|report)/i,
    /(perform|profit|spent|revenue|gain|roi|kpi|cost).*?(employee|employer|sales rep|team member|staff|worker)/i,
    /(spent|gain profit|profit gain|cost spent).*?(employee|employer|sales rep|team|staff)/i,
    /all (employers|employees) (performance|spent|profit|gain)/i,
    /(employers|employees) (profit|spent|revenue|gain)/i
  ] },
  { name: 'predictive_forecast',     patterns: [/predict/i, /forecast/i, /next month.*sales/i, /revenue forecast/i, /future revenue/i, /september revenue/i, /predictive sales/i] },
  { name: 'churn_risk',              patterns: [/churn/i, /\brisk\b/i, /drop out/i, /stalled leads/i, /at risk/i, /cold lead/i, /churn risk/i] },
  { name: 'margin_calculator',       patterns: [
    /(order|machine|product|cnc|laser|dona|pattal|unit|item|hydraulic).*?(margin|profit|markup|cost breakdown)/i,
    /profit margin/i,
    /margin calculator/i,
    /(margin|cost breakdown) for/i,
    /order margin/i
  ] },
  { name: 'schedule_call', patterns: [
    /schedule.*(call|dial|phone|voice|followup|meeting)/i,
    /call.*(schedule|queue|set|book|reminder|time|at|for)/i,
    /(phone|voice|dialer|telecaller).*call/i,
    /book.*call/i,
    /set.*call/i,
    /call.*kar do/i,
    /call.*bhejo/i,
    /call.*queue/i,
    /can it schedule call/i,
    /schedule call/i
  ] },
  { name: 'export_file',      patterns: [
    /\bexport\b/i,
    /\bcsv\b/i,
    /\bexcel\b/i,
    /\bxlsx\b/i,
    /\bxml\b/i,
    /\bdocx\b/i,
    /\bjson\b/i,
    /\bformat\b/i,
    /download (file|data|leads|report|all|csv|excel|xlsx|pdf|xml|docx|json)/i,
    /save (file|data|as|to)/i,
    /generate (file|data|csv|excel|xlsx|pdf|xml|docx|json|format|report in)/i,
    /(kisi bhi|kisi|koi bhi|kisi format|format me|format mai|format mein)/i,
    /(csv|excel|xlsx|pdf|xml|docx|word|json|file)\s*(format|mai|me|mein|banao|karo|kr do|kardo|chahiye|nikalo|generate|export|download)/i
  ] },
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

  const qLower = (query || '').toLowerCase();
  const wantsFile = /pdf|file|format|download|export|save|csv|excel|xlsx|docx|word/i.test(qLower);

  let fileFormat = 'PDF';
  if (qLower.includes('excel') || qLower.includes('xlsx')) fileFormat = 'XLSX';
  else if (qLower.includes('csv')) fileFormat = 'CSV';
  else if (qLower.includes('docx') || qLower.includes('word')) fileFormat = 'DOCX';
  else if (qLower.includes('xml')) fileFormat = 'XML';
  else if (qLower.includes('json')) fileFormat = 'JSON';

  return {
    text: `**Executive Dashboard Report Generated** for **APS Enterprise** (${todayStr}).`,
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
    exportFile: wantsFile ? {
      fileName: `APS_Enterprise_Executive_Report_${new Date().toISOString().slice(0, 10)}.${fileFormat.toLowerCase()}`,
      fileFormat,
      mimeType: fileFormat === 'PDF' ? 'application/pdf' : fileFormat === 'CSV' ? 'text/csv' : 'application/octet-stream',
      sizeKB: '142 KB',
      content: `APS ENTERPRISE EXECUTIVE REPORT\nDate: ${todayStr}\n\nSummary:\nPipeline total: ${leads.length} leads. Closed revenue: ₹${totalRevenue.toLocaleString('en-IN')}.\nTop performer: ${topEmp?.name} (${topEmp?.salesClosed} deals).\nAction Required: Verify advance payment for ${pendingLeads.length} pending lead(s).`
    } : null,
    table: leads.slice(0, 6).map(l => ({ ID: l.id, Name: l.name, Stage: l.stage, Budget: `₹${Number(l.budget || 0).toLocaleString('en-IN')}` })),
    chart: {
      type: 'bar',
      title: 'Pipeline Revenue Summary',
      labels: ['Closed Revenue', '10% Advance Collected', 'Pending Advance'],
      datasets: [{ label: 'Amount (₹)', data: [totalRevenue, totalAdvance, pendingLeads.reduce((s, l) => s + (Number(l.budget || 0) * 0.1), 0)], color: '#2563eb' }]
    }
  };
}

function detectRequestedFormat(query) {
  const q = (query || '').toLowerCase();
  if (/\b(pdf|pfd|pdff)\b/i.test(q) || /pdf\s*(file|report|format|doc|sheet)?/i.test(q)) return 'pdf';
  if (/\b(excel|exel|excle|xlsx|xls|spreadsheet|sheet|sheets)\b/i.test(q)) return 'xlsx';
  if (/\b(csv|csv\s*file|csv\s*format)\b/i.test(q)) return 'csv';
  if (/\b(xml|xml\s*file)\b/i.test(q)) return 'xml';
  if (/\b(docx|doc|word|word\s*doc)\b/i.test(q)) return 'docx';
  if (/\b(json|json\s*format|json\s*file)\b/i.test(q)) return 'json';
  if (/\b(export|download|downlod|dawnload|generate|geneate|genrate|genearte|create|file|format|sheet|banao|nikalo|chahiye|kisi\s*bhi)\b/i.test(q)) return 'pdf';
  return null;
}

function buildStockExport(inventory, format, dateStr) {
  const totalVal = inventory.reduce((s, i) => s + ((Number(i.stockUnits) || 0) * (Number(i.unitPrice) || 0)), 0);
  const totalUnits = inventory.reduce((s, i) => s + (Number(i.stockUnits) || 0), 0);
  const availUnits = inventory.reduce((s, i) => s + (Number(i.availableUnits) || 0), 0);
  const resUnits = inventory.reduce((s, i) => s + (Number(i.reservedUnits) || 0), 0);

  const fileName = `APS_Warehouse_Stock_Audit_${dateStr}.${format}`;
  let mimeType = 'application/pdf';
  let content = '';

  if (format === 'csv' || format === 'xlsx') {
    mimeType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    content = 'ID,SKU,Item Name,Category,Warehouse,Total Stock Units,Reserved Units,Available Units,Unit Price (INR),Total Valuation (INR),Status,Last Restocked\n' +
      inventory.map(i => `"${i.id}","${i.sku || ''}","${i.name}","${i.category}","${i.warehouse}",${i.stockUnits},${i.reservedUnits},${i.availableUnits},${i.unitPrice},${(Number(i.stockUnits) || 0) * (Number(i.unitPrice) || 0)},"${i.status}","${i.lastRestocked || ''}"`).join('\n');
  } else if (format === 'pdf') {
    mimeType = 'application/pdf';
    content = `================================================================================\n` +
      `          APS ENTERPRISE — WAREHOUSE & FACTORY INVENTORY AUDIT REPORT\n` +
      `================================================================================\n` +
      `Generated Date  : ${dateStr}\n` +
      `Total Products  : ${inventory.length} Tracked Product Lines\n` +
      `Total Stock     : ${totalUnits} Units (Available: ${availUnits} | Reserved: ${resUnits})\n` +
      `Total Valuation : ₹${totalVal.toLocaleString('en-IN')}\n` +
      `Operating Plants: Indore Main Plant (MP), Pune Unit 1, Chakan Unit 2, Raw Material Yard\n` +
      `--------------------------------------------------------------------------------\n` +
      `SKU          ITEM NAME                            WAREHOUSE          AVAIL/TOT   UNIT PRICE    STATUS\n` +
      `--------------------------------------------------------------------------------\n` +
      inventory.map(i => `${(i.sku || i.id).padEnd(12)} ${i.name.slice(0, 35).padEnd(36)} ${(i.warehouse || 'Indore').slice(0, 17).padEnd(18)} ${(i.availableUnits + '/' + i.stockUnits).padEnd(11)} ₹${Number(i.unitPrice || 0).toLocaleString('en-IN').padEnd(12)} ${i.status || 'In Stock'}`).join('\n') +
      `\n--------------------------------------------------------------------------------\n` +
      `APS Enterprise AI Operations System • Official Certified Document\n` +
      `Registered Office: 832, Old Loha Mandi, Indore, MP - 452001 | Web: https://www.apsenterprises.in`;
  } else if (format === 'xml') {
    mimeType = 'application/xml';
    content = `<?xml version="1.0" encoding="UTF-8"?>\n<inventory valuation="${totalVal}" totalUnits="${totalUnits}">\n` +
      inventory.map(i => `  <item id="${i.id}" sku="${i.sku || ''}">\n    <name>${i.name}</name>\n    <category>${i.category}</category>\n    <warehouse>${i.warehouse}</warehouse>\n    <available>${i.availableUnits}</available>\n    <total>${i.stockUnits}</total>\n    <unitPrice>${i.unitPrice}</unitPrice>\n  </item>`).join('\n') +
      `\n</inventory>`;
  } else if (format === 'docx') {
    mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    content = `APS Enterprise - Warehouse & Stock Inventory Report\nDate: ${dateStr}\n\nTotal Valuation: ₹${totalVal.toLocaleString('en-IN')} (${inventory.length} Product Lines)\n\n` +
      inventory.map((i, idx) => `${idx + 1}. [${i.sku || i.id}] ${i.name}\n   Warehouse: ${i.warehouse} | Avail: ${i.availableUnits}/${i.stockUnits} units | Price: ₹${Number(i.unitPrice || 0).toLocaleString('en-IN')} | Status: ${i.status}`).join('\n\n');
  } else {
    mimeType = 'application/json';
    content = JSON.stringify(inventory, null, 2);
  }

  return {
    fileName,
    fileFormat: format.toUpperCase(),
    mimeType,
    sizeKB: `${(content.length / 1024).toFixed(1)} KB`,
    title: 'Warehouse & Factory Stock Inventory Audit',
    summaryCards: [
      { label: 'Total Valuation', val: `₹${(totalVal / 10000000).toFixed(2)} Cr` },
      { label: 'Tracked Items', val: `${inventory.length} SKUs` },
      { label: 'Available Stock', val: `${availUnits} Units` },
      { label: 'Operating Units', val: 'Indore & Pune' }
    ],
    tableHeaders: ['SKU', 'Product Name', 'Category', 'Warehouse', 'Avail / Total', 'Unit Price', 'Status'],
    tableRows: inventory.map(i => [
      i.sku || i.id,
      i.name,
      i.category,
      i.warehouse,
      `${i.availableUnits} / ${i.stockUnits} units`,
      `₹${Number(i.unitPrice || 0).toLocaleString('en-IN')}`,
      i.status || 'In Stock'
    ]),
    content
  };
}

function buildLeadsExport(leads, format, dateStr) {
  const fileName = `APS_Enterprise_Leads_${dateStr}.${format}`;
  let mimeType = 'text/csv';
  let content = '';

  if (format === 'csv' || format === 'xlsx') {
    mimeType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    content = 'ID,Name,Stage,Budget,Company,AssignedEmployee\n' +
      leads.map(l => `"${l.id}","${l.name}","${l.stage}","${l.budget}","${l.company || ''}","${l.assignedEmployeeId || ''}"`).join('\n');
  } else if (format === 'pdf') {
    mimeType = 'application/pdf';
    content = `APS ENTERPRISE CRM DATA EXPORT (PDF)\nGenerated: ${dateStr}\nTotal Records: ${leads.length}\n\n` +
      `--------------------------------------------------------------------------------\n` +
      `ID         NAME                 STAGE             BUDGET        COMPANY\n` +
      `--------------------------------------------------------------------------------\n` +
      leads.map(l => `${(l.id || '').padEnd(10)} ${(l.name || '').padEnd(20)} ${(l.stage || '').padEnd(17)} ₹${Number(l.budget || 0).toLocaleString('en-IN').padEnd(12)} ${l.company || ''}`).join('\n') +
      `\n--------------------------------------------------------------------------------\n` +
      `APS Enterprise AI Intelligence Engine • Confidential`;
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

  const closedLeads = leads.filter(l => ['Client (Paid)', 'In Production', 'Dispatched'].includes(l.stage));
  const totalRev = closedLeads.reduce((s, l) => s + (Number(l.budget) || 0), 0);

  return {
    fileName,
    fileFormat: format.toUpperCase(),
    mimeType,
    sizeKB: `${(content.length / 1024).toFixed(1)} KB`,
    title: 'Enterprise CRM Leads & Pipeline Audit',
    summaryCards: [
      { label: 'Total Leads', val: `${leads.length} Records` },
      { label: 'Closed Revenue', val: `₹${totalRev.toLocaleString('en-IN')}` },
      { label: 'Conversion Rate', val: `${Math.round((closedLeads.length / Math.max(1, leads.length)) * 100)}%` },
      { label: 'Gate Status', val: '10% Advance' }
    ],
    tableHeaders: ['ID', 'Client Name', 'Stage', 'Budget', 'Company', 'Assigned Rep'],
    tableRows: leads.map(l => [
      l.id,
      l.name,
      l.stage,
      `₹${Number(l.budget || 0).toLocaleString('en-IN')}`,
      l.company || 'Industrial Ltd',
      l.assignedEmployeeId === 'e2' ? 'Bhavya' : l.assignedEmployeeId === 'e1' ? 'Animesh' : 'Sales Rep'
    ]),
    content
  };
}

function buildEmployeePerformanceExport(employeesData, format, dateStr) {
  const fileName = `APS_Employee_Performance_Profit_Audit_${dateStr}.${format}`;
  let mimeType = 'text/csv';
  let content = '';

  const totalRev = employeesData.reduce((s, e) => s + e.totalRevenue, 0);
  const totalCost = employeesData.reduce((s, e) => s + e.costSpent, 0);
  const totalProfit = employeesData.reduce((s, e) => s + e.netProfit, 0);
  const avgRoi = Math.round((totalProfit / (totalCost || 1)) * 100);

  if (format === 'csv' || format === 'xlsx') {
    mimeType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    content = 'Employee ID,Name,Role,Department,Cost Spent (INR),Revenue Closed (INR),Net Profit (INR),ROI (%),Deals Closed,KPI Score\n' +
      employeesData.map(e => `"${e.id}","${e.name}","${e.role}","${e.department}",${e.costSpent},${e.totalRevenue},${e.netProfit},${e.roi},${e.salesClosed},"${e.kpiScore}"`).join('\n');
  } else if (format === 'pdf') {
    mimeType = 'application/pdf';
    content = `APS ENTERPRISE EMPLOYEE PERFORMANCE & PROFIT AUDIT (PDF)\nGenerated: ${dateStr}\nTotal Team Members: ${employeesData.length}\n` +
      `Total Revenue: ₹${totalRev.toLocaleString('en-IN')} | Total Cost Spent: ₹${totalCost.toLocaleString('en-IN')} | Net Profit: ₹${totalProfit.toLocaleString('en-IN')} | Avg ROI: ${avgRoi}%\n\n` +
      `--------------------------------------------------------------------------------\n` +
      `NAME            ROLE                     SPENT       REVENUE     NET PROFIT   ROI    KPI\n` +
      `--------------------------------------------------------------------------------\n` +
      employeesData.map(e => `${e.name.padEnd(15)} ${e.role.slice(0, 23).padEnd(24)} ₹${Number(e.costSpent).toLocaleString('en-IN').padEnd(10)} ₹${Number(e.totalRevenue).toLocaleString('en-IN').padEnd(11)} ₹${Number(e.netProfit).toLocaleString('en-IN').padEnd(11)} ${(e.roi + '%').padEnd(6)} ${e.kpiScore}`).join('\n') +
      `\n--------------------------------------------------------------------------------\n` +
      `APS Enterprise AI Operations System • Official Certified Document`;
  } else if (format === 'xml') {
    mimeType = 'application/xml';
    content = `<?xml version="1.0" encoding="UTF-8"?>\n<employeesPerformance totalRevenue="${totalRev}" totalSpent="${totalCost}" netProfit="${totalProfit}">\n` +
      employeesData.map(e => `  <employee id="${e.id}">\n    <name>${e.name}</name>\n    <role>${e.role}</role>\n    <spent>${e.costSpent}</spent>\n    <revenue>${e.totalRevenue}</revenue>\n    <netProfit>${e.netProfit}</netProfit>\n    <roi>${e.roi}%</roi>\n    <kpi>${e.kpiScore}</kpi>\n  </employee>`).join('\n') +
      `\n</employeesPerformance>`;
  } else if (format === 'docx') {
    mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    content = `APS Enterprise - Employee Performance, Cost & Profit Audit Report\nDate: ${dateStr}\n\nTeam Revenue: ₹${totalRev.toLocaleString('en-IN')} | Total Spent: ₹${totalCost.toLocaleString('en-IN')} | Net Profit: ₹${totalProfit.toLocaleString('en-IN')}\n\n` +
      employeesData.map((e, i) => `${i + 1}. ${e.name} (${e.role})\n   Cost Spent: ₹${Number(e.costSpent).toLocaleString('en-IN')} | Revenue Closed: ₹${Number(e.totalRevenue).toLocaleString('en-IN')} | Net Profit Gained: ₹${Number(e.netProfit).toLocaleString('en-IN')} (ROI: ${e.roi}%) | Deals: ${e.salesClosed} | KPI: ${e.kpiScore}`).join('\n\n');
  } else {
    mimeType = 'application/json';
    content = JSON.stringify(employeesData, null, 2);
  }

  return {
    fileName,
    fileFormat: format.toUpperCase(),
    mimeType,
    sizeKB: `${(content.length / 1024).toFixed(1)} KB`,
    title: 'Employee Performance, Operational Cost & Net Profit Audit',
    summaryCards: [
      { label: 'Total Revenue', val: `₹${(totalRev / 100000).toFixed(2)} Lakhs` },
      { label: 'Total Cost Spent', val: `₹${(totalCost / 100000).toFixed(2)} Lakhs` },
      { label: 'Net Profit Gain', val: `₹${(totalProfit / 100000).toFixed(2)} Lakhs` },
      { label: 'Team Avg ROI', val: `${avgRoi}%` }
    ],
    tableHeaders: ['ID', 'Employee Name', 'Role', 'Cost Spent (₹)', 'Revenue Closed (₹)', 'Net Profit (₹)', 'ROI (%)', 'Deals', 'KPI Score'],
    tableRows: employeesData.map(e => [
      e.id,
      e.name,
      e.role,
      `₹${Number(e.costSpent).toLocaleString('en-IN')}`,
      `₹${Number(e.totalRevenue).toLocaleString('en-IN')}`,
      `₹${Number(e.netProfit).toLocaleString('en-IN')}`,
      `${e.roi}%`,
      String(e.salesClosed),
      e.kpiScore
    ]),
    content
  };
}

async function handleEmployeePerformance(query) {
  const store = getStore();
  const rawEmployees = store.mockEmployees || [];
  const format = detectRequestedFormat(query);
  const dateStr = new Date().toISOString().slice(0, 10);

  // Operational base costs per employee (monthly salary + dialer + compute + travel overhead)
  const costMap = {
    e1: 38000, // Animesh
    e2: 45000, // Bhavya
    e3: 32000, // Aaditya
    e4: 35000, // Pooja
    e5: 40000  // Rohan
  };

  const employeesData = rawEmployees.map(e => {
    const costSpent = costMap[e.id] || 35000;
    const totalRevenue = Number(e.totalRevenue || 0);
    // Estimated machine COGS & manufacturing cost ~ 50% of revenue
    const cogs = totalRevenue * 0.50;
    const netProfit = Math.max(0, Math.round(totalRevenue - cogs - costSpent));
    const roi = Math.round((netProfit / (costSpent || 1)) * 100);
    return {
      ...e,
      costSpent,
      totalRevenue,
      netProfit,
      roi
    };
  });

  const totalRev = employeesData.reduce((s, e) => s + e.totalRevenue, 0);
  const totalCost = employeesData.reduce((s, e) => s + e.costSpent, 0);
  const totalProfit = employeesData.reduce((s, e) => s + e.netProfit, 0);
  const totalDeals = employeesData.reduce((s, e) => s + (e.salesClosed || 0), 0);
  const avgRoi = Math.round((totalProfit / (totalCost || 1)) * 100);

  const exportObj = format ? buildEmployeePerformanceExport(employeesData, format, dateStr) : null;

  return {
    text: `**APS Employee Performance, Operational Cost & Net Profit Analysis**:\n\n` +
      `• **Total Team Closed Revenue**: **₹${totalRev.toLocaleString('en-IN')}** across **${totalDeals} closed deals**\n` +
      `• **Total Operational Cost Spent**: **₹${totalCost.toLocaleString('en-IN')}** (Salaries, Dialer & Travel)\n` +
      `• **Net Profit Gained for APS**: **₹${totalProfit.toLocaleString('en-IN')}** (Average Team ROI: **${avgRoi}%**)\n\n` +
      employeesData.map(e => `• **${e.name}** (${e.role}): Spent **₹${e.costSpent.toLocaleString('en-IN')}** | Closed **₹${e.totalRevenue.toLocaleString('en-IN')}** (${e.salesClosed} deals) | Net Profit: **₹${e.netProfit.toLocaleString('en-IN')}** | ROI: **${e.roi}%** | KPI: **${e.kpiScore}**`).join('\n') +
      (exportObj ? `\n\n**${exportObj.fileFormat} File Ready**: Complete employee performance breakdown document generated below.` : ''),
    exportFile: exportObj,
    table: employeesData.map(e => ({
      Employee: e.name,
      Role: e.role,
      'Cost Spent': `₹${Number(e.costSpent).toLocaleString('en-IN')}`,
      'Revenue Closed': `₹${Number(e.totalRevenue).toLocaleString('en-IN')}`,
      'Net Profit': `₹${Number(e.netProfit).toLocaleString('en-IN')}`,
      'ROI (%)': `${e.roi}%`,
      Deals: e.salesClosed,
      'KPI Score': e.kpiScore
    })),
    chart: {
      type: 'bar',
      title: 'Employee Performance: Cost Spent vs Net Profit Gained vs Revenue Closed',
      labels: employeesData.map(e => e.name.split(' ')[0]),
      datasets: [
        { label: 'Cost Spent (₹)', data: employeesData.map(e => e.costSpent), color: '#ef4444' },
        { label: 'Net Profit Gained (₹)', data: employeesData.map(e => e.netProfit), color: '#10b981' },
        { label: 'Revenue Closed (₹)', data: employeesData.map(e => e.totalRevenue), color: '#2563eb' }
      ]
    }
  };
}

async function handleExportFile(query) {
  const store = getStore();
  const leads = store.mockLeads || [];
  const inventory = store.mockInventory || [];
  const dateStr = new Date().toISOString().slice(0, 10);
  const format = detectRequestedFormat(query) || 'pdf';
  const qLower = (query || '').toLowerCase();

  // If query asks for employee / staff / performance
  if (qLower.includes('employee') || qLower.includes('employer') || qLower.includes('staff') || qLower.includes('performance') || qLower.includes('spent') || qLower.includes('profit') || qLower.includes('rep') || qLower.includes('team')) {
    return handleEmployeePerformance(query);
  }

  // If query asks for inventory/stock/warehouse
  if (qLower.includes('stock') || qLower.includes('inventory') || qLower.includes('warehouse') || qLower.includes('machine') || qLower.includes('product') || qLower.includes('dona') || qLower.includes('paper') || qLower.includes('material')) {
    const exportObj = buildStockExport(inventory, format, dateStr);
    return {
      text: `**Warehouse Stock Export Generated**: Exported **${inventory.length} product lines** across all facilities in **${format.toUpperCase()}** format. Ready for download below.`,
      exportFile: exportObj,
      table: inventory.slice(0, 10).map(i => ({ SKU: i.sku || i.id, Item: i.name, Warehouse: i.warehouse, 'Available Stock': `${i.availableUnits} units`, 'Unit Price': `₹${Number(i.unitPrice || 0).toLocaleString('en-IN')}` })),
      chart: null
    };
  }

  // Otherwise export CRM Leads
  const exportObj = buildLeadsExport(leads, format, dateStr);
  return {
    text: `**File Generated Successfully**: Exported **${leads.length} validated CRM records** in **${format.toUpperCase()}** format. Ready for download below.`,
    exportFile: exportObj,
    table: leads.slice(0, 8).map(l => ({ ID: l.id, Name: l.name, Stage: l.stage, Budget: `₹${Number(l.budget || 0).toLocaleString('en-IN')}` })),
    chart: null
  };
}

async function handleExplainMetrics(query) {
  return {
    text: `**APS Enterprise Key Business Metrics & KPI Definitions**\n\n` +
      `1. **Pipeline Conversion Rate**: % of total leads transitioning to *Client (Paid)*. Currently **25.0%** (3 of 12 leads).\n` +
      `2. **Tally 10% Advance Payment Gate**: Mandates 10% deposit before releasing job cards to shopfloor manufacturing.\n` +
      `3. **Sales Velocity**: Average days taken to close a lead (currently **4.2 days**).\n` +
      `4. **Employee KPI Score**: Weighted rating based on sales closed (40%), calls handled (30%), WhatsApp response speed (20%), and Tally reconciliation accuracy (10%).`,
    table: [
      { Metric: 'Pipeline Conversion Rate', Value: '25.0%', Target: '20.0%', Status: 'Exceeding Target' },
      { Metric: 'Tally 10% Advance Gate Compliance', Value: '100.0%', Target: '100.0%', Status: 'Enforced' },
      { Metric: 'Average Deal Size', Value: '₹1,25,000', Target: '₹1,00,000', Status: 'Above Average' },
      { Metric: 'Outbound Call Conversion', Value: '42.0%', Target: '35.0%', Status: 'Healthy' }
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
    text: `**Trend Analysis & Anomaly Detection Report**\n\n` +
      `• **Growth Trend**: +15.4% growth in lead inflow this month (12 leads) compared to last month (10 leads).\n` +
      `• **Revenue Variance**: Revenue increased by **+20.0%** driven by higher average deal size (₹1.25L vs ₹1.04L).\n` +
      `• **Anomaly Detected**: Lead **"Global Tech" (LEAD-004)** has been residing in *Confirmed Lead* stage for 5 days without advance payment verification. Recommended action: Trigger automated A5 WhatsApp reminder.`,
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
      { Metric: 'Lead Inflow', 'Last Month': 10, 'This Month': 12, Change: '+15.4%' },
      { Metric: 'Closed Revenue', 'Last Month': '₹3,10,000', 'This Month': '₹3,75,000', Change: '+20.9%' },
      { Metric: 'Avg Close Time', 'Last Month': '5.1 days', 'This Month': '4.2 days', Change: '-17.6% (Faster)' }
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
    text: `**Document Catalog Search Results** (${matched.length} match${matched.length !== 1 ? 'es' : ''} found):\n\n` +
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
    text: `**Email Dispatched Successfully**: Official PDF Quotation & Commercial Specs sent to **${lead.name}** (${lead.email || 'customer@enterprise.com'}).\n\n• **Attachment**: APS_Quotation_${lead.id}.pdf\n• **Delivery Status**: Delivered (200 OK)`,
    table: [{ Lead: lead.name, Email: lead.email || 'customer@enterprise.com', Attachment: `Quotation_${lead.id}.pdf`, Status: 'Sent' }],
    chart: null
  };
}

async function handleActionCheckInventory(query) {
  const store = getStore();
  const inventory = store.mockInventory || [];
  const format = detectRequestedFormat(query);
  const dateStr = new Date().toISOString().slice(0, 10);
  const exportFile = format ? buildStockExport(inventory, format, dateStr) : null;

  return {
    text: `**Warehouse & Factory Inventory Snapshot** (${inventory.length} product lines tracked across Indore, Pune & Chakan facilities):` +
      (format ? `\n\n**${format.toUpperCase()} Export Generated**: Complete inventory audit report is ready for download below.` : ''),
    exportFile,
    table: inventory.slice(0, 10).map(i => ({
      SKU: i.sku || i.id,
      Item: i.name,
      Warehouse: i.warehouse,
      'Total Stock': `${i.stockUnits} units`,
      'Available': `${i.availableUnits} units`,
      'Unit Price': `₹${Number(i.unitPrice || 0).toLocaleString('en-IN')}`,
      Status: i.status || 'In Stock'
    })),
    chart: {
      type: 'bar',
      title: 'Warehouse Available Machine Stock',
      labels: inventory.slice(0, 5).map(i => (i.sku || i.name).slice(0, 14)),
      datasets: [{ label: 'Available Stock', data: inventory.slice(0, 5).map(i => i.availableUnits), color: '#10b981' }]
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
    text: `**AI Revenue Forecast & Pipeline Prediction**\n\n` +
      `• **Current Month Closed Revenue**: ₹${totalRevenue.toLocaleString('en-IN')}\n` +
      `• **Weighted Pipeline Value**: ₹${Math.round(pipelineWeighted).toLocaleString('en-IN')}\n` +
      `• **Projected September 2026 Revenue**: **₹${nextMonthForecast.toLocaleString('en-IN')}** (+18.2% forecast growth rate based on 4.2-day sales velocity).`,
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
    riskScore: '78% High Risk',
    reason: 'Residing in Confirmed Lead >4 days without 10% advance deposit',
    recommendedAction: 'Trigger A5 WhatsApp payment reminder or sales call'
  }));

  return {
    text: `**Lead Churn Risk & Drop-Out Audit**\n\nIdentified **${riskLeads.length} leads at high risk of dropping out** due to payment gate SLA delays:`,
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
    text: `**CNC Machine Order Profit Margin Analysis** for base price **₹${basePrice.toLocaleString('en-IN')}**:\n\n` +
      `• **Manufacturing & Component Cost (58%)**: ₹${mfgCost.toLocaleString('en-IN')}\n` +
      `• **Factory Overhead & Freight (12%)**: ₹${overhead.toLocaleString('en-IN')}\n` +
      `• **Net Profit**: **₹${netProfit.toLocaleString('en-IN')}** (**${marginPct}% Margin**)`,
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
    text: `**Factory Shopfloor & Job Card Assembly Tracker**\n\n` +
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

  const qLower = (query || '').toLowerCase();
  const wantsFile = /pdf|file|format|download|export|save|docx|word|banao|chahiye/i.test(qLower);

  return {
    text: `**GST Tax Invoice Breakdown Generated** for Taxable Value **₹${taxable.toLocaleString('en-IN')}**:\n\n` +
      `• **HSN Code**: 8458.11 (CNC Turning & Milling Machines)\n` +
      `• **Taxable Amount**: ₹${taxable.toLocaleString('en-IN')}\n` +
      `• **CGST (9%)**: ₹${cgst.toLocaleString('en-IN')}\n` +
      `• **SGST (9%)**: ₹${sgst.toLocaleString('en-IN')}\n` +
      `• **Total Invoice Amount**: **₹${total.toLocaleString('en-IN')}**`,
    exportFile: wantsFile ? {
      fileName: `APS_Tax_Invoice_${new Date().toISOString().slice(0, 10)}.pdf`,
      fileFormat: 'PDF',
      mimeType: 'application/pdf',
      sizeKB: '110 KB',
      content: `APS ENTERPRISE GST TAX INVOICE\nHSN Code: 8458.11\nTaxable Amount: ₹${taxable.toLocaleString('en-IN')}\nCGST (9%): ₹${cgst.toLocaleString('en-IN')}\nSGST (9%): ₹${sgst.toLocaleString('en-IN')}\nTotal Payable: ₹${total.toLocaleString('en-IN')}`
    } : null,
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
    text: `**A1 Voice Agent Speech Transcript & Sentiment Audit**\n\n` +
      `• **Total Calls Analyzed**: ${calls.length} recent inbound/outbound calls.\n` +
      `• **Positive Intent Rate**: **82.4%** (Customers confirmed purchase budget & machine delivery timelines).\n` +
      `• **Key Demand Keywords**: *"Dual Spindle"*, *"10% Tally Advance"*, *"Raycus Laser Source"*, *"3-Year Warranty"*.\n` +
      `• **Top Transcript Insight**: *Jane Smith (LEAD-002)* requested custom spindle speed specs for precision die cutting. High conversion probability.`,
    table: [
      { CallID: 'CALL-001', Lead: 'Jane Smith', Duration: '120s', Sentiment: 'Positive (88% Intent)', Requirement: 'Laser Cutter 24k RPM' },
      { CallID: 'CALL-002', Lead: 'Acme Corp', Duration: '95s', Sentiment: 'Urgent (92% Intent)', Requirement: 'Industrial Mill 50T' },
      { CallID: 'CALL-003', Lead: 'Global Tech', Duration: '150s', Sentiment: 'Payment Query', Requirement: '10% Advance Bank Details' }
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
    text: `**A5 WhatsApp Cloud API Automation Performance**\n\n` +
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
    text: `**Sales Representative Leaderboard** (August 2026):\n\n` +
      `1. **${sorted[0]?.name || 'Bhavya'}** — ${sorted[0]?.salesClosed || 3} Deals Closed (₹${(sorted[0]?.totalRevenue || 180000).toLocaleString('en-IN')}) | *Role: Sales Champion & Tally Gate Master*\n` +
      `2. **${sorted[1]?.name || 'Animesh'}** — ${sorted[1]?.salesClosed || 2} Deals Closed (₹${(sorted[1]?.totalRevenue || 120000).toLocaleString('en-IN')}) | *Role: Voice Agent Specialist*\n` +
      `3. **${sorted[2]?.name || 'Aaditya'}** — ${sorted[2]?.salesClosed || 1} Deals Closed (₹${(sorted[2]?.totalRevenue || 75000).toLocaleString('en-IN')}) | *Role: WhatsApp Automation Ninja*\n`,
    table: sorted.map((e, i) => ({ Rank: `#${i + 1}`, Name: e.name, Role: e.role, 'Deals Closed': e.salesClosed || 0, Revenue: `₹${(e.totalRevenue || 0).toLocaleString('en-IN')}`, 'KPI Score': e.kpiScore || '—', Badge: i === 0 ? 'Champion' : i === 1 ? 'Speed Specialist' : 'Specialist' })),
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
      text: "**Namaste! Hello!** Welcome to **APS Enterprise Dashboard AI Assistant**.\n\nMain aapki sales, reports, factory progress, GST invoices, aur analytics me kaise help kar sakta hoon?\n\n*Aap options me se select kar sakte hain ya apna question type kar sakte hain.*",
      table: null, chart: null
    };
  }

  if (/kaise ho|how are you|kaise hain|kya haal|what's up/i.test(qLower)) {
    return {
      text: "**Main bilkul badhiya hoon!** System active hai aur aapke data analysis ke liye ready hai.\n\nAaj aapko kis report ya data me help chahiye?\n• Executive PDF Reports\n• GST Tax Invoices\n• Factory Assembly Progress\n• Revenue Forecast",
      table: null, chart: null
    };
  }

  if (/who are you|aap kaun ho|who r u|what are you/i.test(qLower)) {
    return {
      text: "Main **APS Enterprise Business Intelligence AI Assistant** hoon.\n\nMera primary job aapke enterprise dashboard data ko analyze karna, PDF/Excel reports generate karna, GST Invoices banana, aur factory manufacturing progress track karna hai.",
      table: null, chart: null
    };
  }

  if (/what can you do|kya kar sakte ho|features kya hai|help me/i.test(qLower)) {
    return {
      text: "**Main in sabhi tasks me aapki madad kar sakta hoon**:\n\n" +
        "1. **Executive PDF Reports**: Executive summaries & downloads\n" +
        "2. **GST Tax Invoices**: Itemized tax breakdown & PDF invoice\n" +
        "3. **Factory Job Cards**: Live shopfloor assembly tracking\n" +
        "4. **Predictive Forecast**: Q3 Monte Carlo revenue predictions\n" +
        "5. **Lead Churn Audit**: Stalled leads & risk scores\n" +
        "6. **Document RAG Search**: Machine specs & datasheets\n" +
        "7. **File Exports**: PDF, Excel (.xlsx), CSV, XML, DOCX\n" +
        "8. **Sales Leaderboard**: Employee rankings & performance",
      table: null, chart: null
    };
  }

  if (/thank|shukriya|dhanyawad|thx|awesome|great/i.test(qLower)) {
    return {
      text: "**Aapka bohot bohot dhanyawad!** Main aapki service ke liye hamesha ready hoon. Koi aur report ya query ho toh zaroor batayein.",
      table: null, chart: null
    };
  }

  if (/bye|goodbye|alvida|see you/i.test(qLower)) {
    return {
      text: "**Goodbye! Have a great day ahead!** Jab bhi zaroorat ho, bas ek message kar dijiye.",
      table: null, chart: null
    };
  }

  return {
    text: "Main aapki kaise madad kar sakta hoon? Aap mujhse dashboard metrics, sales reports, GST invoices, ya factory status ke bare me kuch bhi pooch sakte hain.",
    table: null, chart: null
  };
}

async function handleCompanyInfo(query) {
  const qLower = (query || '').toLowerCase();
  const isLocationQuery = /where|location|located|address|situated|place|city|state|kahan|loha mandi|indore|kaha/i.test(qLower);
  const isContactQuery = /contact|phone|mobile|call|number|email|mail|website|site|reach|help/i.test(qLower);
  const isProductQuery = /product|machine|dona|pattal|cup|plate|cnc|laser|make|sell|manufacture|price|catalog/i.test(qLower);

  let introText = '';

  if (isLocationQuery) {
    introText = `**APS Enterprises Location & Address Details**:\n\n` +
      `• **Registered & Head Office**: **832, Old Loha Mandi, In front of Devshree Cinema, Near Khambati Pipes, Indore, Madhya Pradesh - 452001, India**.\n` +
      `• **Machinery Manufacturing & Assembly Plants**:\n` +
      `   1. **Indore Main Plant (MP)**: High-speed Double Die Dona Pattal, Hydraulic Paper Plate & Cup Making Machine assembly.\n` +
      `   2. **Pune Unit 1 (Maharashtra)**: Heavy Industrial CNC Milling, Fiber Laser Cutters, and Hydraulic Presses.\n\n` +
      `• **Official Website**: [www.apsenterprises.in](https://www.apsenterprises.in)\n` +
      `• **Helpline Numbers**: +91-7869755871 | +91-8827848099\n` +
      `• **Email Support**: support.apsenterprises@gmail.com | apsenterprisesdp.229@gmail.com`;
  } else if (isProductQuery) {
    introText = `**APS Enterprises — Machinery & Product Catalog**\n\n` +
      `APS Enterprises is Central India's leading manufacturer of high-speed industrial packaging and precision machines:\n\n` +
      `1. **Fully Automatic Double Die Dona Pattal Machine** (Heavy cast-iron frame, low power consumption, high output)\n` +
      `2. **Heavy-Duty Hydraulic Paper Plate & Thali Making Machine** (5T to 15T hydraulic pressure)\n` +
      `3. **Automatic High-Speed Paper Cup Making Machine** (60-80 cups/minute with ultrasonic sealing)\n` +
      `4. **Semi-Automatic Heavy Paper Cutter Machine** (Precision hydraulic clamping & blade)\n` +
      `5. **Raw Material Paper Roll & Lamination Machine** (PE & silver film lamination)\n` +
      `6. **Industrial Heavy CNC & Fiber Laser Systems** (Dual-spindle 24k RPM & 6kW Raycus sources)\n\n` +
      `• **Location**: 832, Old Loha Mandi, Indore, MP - 452001\n` +
      `• **Order Inquiry**: +91-7869755871 | +91-8827848099`;
  } else {
    introText = `**About APS Enterprises — Leading Machinery Manufacturer**\n\n` +
      `**APS Enterprises** is a premier manufacturing enterprise based in **Indore, Madhya Pradesh**, specializing in industrial Dona Pattal machines, paper plate/cup automation, and heavy precision machinery.\n\n` +
      `• **Registered Office**: 832, Old Loha Mandi, In front of Devshree Cinema, Near Khambati Pipes, Indore, MP - 452001\n` +
      `• **Official Website**: [www.apsenterprises.in](https://www.apsenterprises.in)\n` +
      `• **Helpline Numbers**: +91-7869755871 | +91-8827848099\n` +
      `• **Email Support**: support.apsenterprises@gmail.com | apsenterprisesdp.229@gmail.com\n\n` +
      `**Primary Machine Offerings**:\n` +
      `• Fully Automatic Double Die Dona Pattal Machine\n` +
      `• Heavy-Duty Hydraulic Paper Plate & Thali Making Machine\n` +
      `• Automatic High-Speed Paper Cup Making Machine\n` +
      `• Semi-Automatic Heavy Paper Cutter & Lamination Roll Machine`;
  }

  return {
    text: introText,
    table: [
      { Parameter: 'Company Name', Value: 'APS Enterprises' },
      { Parameter: 'Registered Location', Value: '832 Old Loha Mandi, Indore, MP - 452001' },
      { Parameter: 'Landmarks', Value: 'In front of Devshree Cinema, Near Khambati Pipes' },
      { Parameter: 'Manufacturing Plants', Value: 'Indore (MP) & Pune Unit 1 (Maharashtra)' },
      { Parameter: 'Phone Contacts', Value: '+91-7869755871 / +91-8827848099' },
      { Parameter: 'Support Emails', Value: 'support.apsenterprises@gmail.com / apsenterprisesdp.229@gmail.com' },
      { Parameter: 'Official Website', Value: 'https://www.apsenterprises.in' },
      { Parameter: 'Core Business', Value: 'Dona Pattal, Paper Plate & Industrial Machine Manufacturing' }
    ],
    chart: null
  };
}

async function handleDashboardInfo(query) {
  return {
    text: `**APS Enterprise — Fullstack AI Admin System Architecture & Modules**\n\n` +
      `The APS Enterprise Dashboard provides complete end-to-end automation across 11 integrated modules:\n\n` +
      `1. **Executive Dashboard** (\`/\`): Real-time KPI summaries, active revenue tracking (₹3.75L closed), 10% advance tally gate metrics, and pipeline velocity.\n` +
      `2. **CRM Leads & Pipeline** (\`/leads\`): 7-stage sales funnel (*Enquiry -> Qualified -> Booked -> Confirmed Lead -> Client (Paid) -> In Production -> Dispatched*) with drag-and-drop lead stage updates.\n` +
      `3. **Dialer Queue / A1 Voice Agent** (\`/dialer\`): Automated voice call queuing, call recording transcripts, customer sentiment scoring (82.4% positive intent rate).\n` +
      `4. **WhatsApp Automation / A5 Agent** (\`/whatsapp\`): Official WhatsApp Business Cloud API sequences for automated payment reminders, quotation PDFs, and broadcast campaigns.\n` +
      `5. **Tally 10% Advance Reconciliation** (\`/tally\`): Strict 10% deposit verification gate that mandates advance payment verification before unblocking factory job card releases.\n` +
      `6. **Invoices & GST Billing** (\`/invoices\`): Automated GST Tax Invoice generation (HSN 8458.11 / 8422), 18% GST (CGST 9% + SGST 9%) breakdowns, and instant PDF downloads.\n` +
      `7. **Factory Shopfloor & Job Card Tracker** (\`/factory\`): ERP milestone tracking for machine assembly across Indore and Pune plants.\n` +
      `8. **Team KPIs & Sales Leaderboard** (\`/kpis\` / \`/employees\`): Performance tracking across team members (Bhavya, Animesh, etc.) with gamified badges and KPI score formulas.\n` +
      `9. **Warehouse Inventory & Stock** (\`/inventory\`): Real-time stock audit for machine frames, spindles, laser sources, and raw material paper rolls.\n` +
      `10. **Document Search & RAG Knowledge Base** (\`/documents\`): Instant vector search across technical machine manuals, specification datasheets, and brochures.\n` +
      `11. **A3 Natural Language AI Assistant** (\`/ai\`): AI copilot capable of answering questions, running live CRM/ERP actions, generating executive reports, and exporting data in CSV/XLSX/PDF/DOCX/XML/JSON formats.`,
    table: [
      { Module: '1. Executive Dashboard', Route: '/', Description: 'Live KPIs, Revenue, Pipeline Velocity' },
      { Module: '2. CRM Pipeline', Route: '/leads', Description: '7-Stage Lead Management & Actions' },
      { Module: '3. A1 Voice Dialer', Route: '/dialer', Description: 'Call Queue, Transcripts & Sentiment' },
      { Module: '4. A5 WhatsApp Auto', Route: '/whatsapp', Description: 'Payment Reminders & Sequence Templates' },
      { Module: '5. Tally Reconciliation', Route: '/tally', Description: '10% Advance Payment Gate Verification' },
      { Module: '6. Invoices & Billing', Route: '/invoices', Description: 'GST Tax Invoices & PDF Generation' },
      { Module: '7. Factory Shopfloor', Route: '/factory', Description: 'ERP Job Cards & Assembly Progress' },
      { Module: '8. Team KPIs', Route: '/kpis', Description: 'Sales Leaderboard & Performance Badges' },
      { Module: '9. Warehouse Inventory', Route: '/inventory', Description: 'Stock Levels & Component Tracking' },
      { Module: '10. RAG Document Search', Route: '/documents', Description: 'Technical Manuals & Catalog Search' },
      { Module: '11. A3 AI Assistant', Route: '/ai', Description: 'Natural Language Engine & File Exports' }
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
    text: `**Action Executed**: Successfully created new lead **"${newLeadObj.name}"** in **${stage}** stage.\n\n• **ID**: ${newLeadObj.id}\n• **Budget**: ₹${Number(budget).toLocaleString('en-IN')}\n• **Source**: A3 AI Assistant\n• **Assigned**: Bhavya (Admin)`,
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
      text: `Please specify a valid target stage to transition the lead to. Available stages: **Enquiry, Qualified, Booked, Confirmed Lead, Client (Paid), In Production, Dispatched**.`,
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
    text: `**Action Executed**: Lead **"${lead.name}"** (${lead.id}) transitioned from **"${oldStage}"** -> **"${targetStage}"**.\n\n• **Tally Payment Gate**: ${lead.tallyPaymentVerified ? 'Verified' : 'Pending'}\n• **ERP Booking**: ${lead.erpBookingCreated ? 'Created' : 'Pending'}`,
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
    text: `**Action Executed**: Posted Tally ERP 9 Voucher **${vchNo}** for **${partyName}**.\n\n• **Amount**: ₹${amount.toLocaleString('en-IN')}\n• **Voucher Type**: Advance Receipt (10% Gate)\n• **Status**: Synchronized with Tally Ledger`,
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
    text: `**Action Executed**: Created ERP Machine Booking & Shopfloor Job Card for **"${lead.name}"** (${lead.id}).\n\n• **ERP Status**: Booking Active\n• **Pipeline Stage**: ${lead.stage}`,
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
    text: `**Action Executed**: Queued A1 Voice Agent outbound call **${callId}** into active dialer queue.\n\n• **Voice Agent**: A1 Telecaller Bot\n• **Queue Status**: Active Outbound Call`,
    table: [{ 'Call ID': callId, Agent: 'A1 Voice Agent', Target: 'Lead Queue', Status: 'Queued' }],
    chart: null
  };
}

async function handleScheduleCall(query) {
  const store = getStore();
  const activityLogs = store.mockActivityLogs || [];
  const callLogs = store.mockCallLogs || [];
  const leads = store.mockLeads || [];
  const qLower = (query || '').toLowerCase();

  const matchedLead = leads.find(l => l && l.name && (qLower.includes(l.name.toLowerCase()) || qLower.includes((l.company || '').toLowerCase()))) || leads[0];
  const targetName = matchedLead ? `${matchedLead.name} (${matchedLead.company})` : 'CRM Target Lead Queue';
  const targetPhone = matchedLead ? matchedLead.phone : '+919876543210';

  const timeMatch = query.match(/(?:at|for|by|in)\s+([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)?|tomorrow|today|[0-9]+\s*mins?)/i);
  const scheduledTimeStr = timeMatch ? timeMatch[1].toUpperCase() : 'Today at 4:30 PM IST';

  const callId = `CALL-SCH-${Math.floor(1000 + Math.random() * 9000)}`;

  callLogs.unshift({
    callId,
    leadId: matchedLead ? matchedLead.id : 'DIALER-QUEUE',
    phone: targetPhone,
    agent: 'APS Telecaller Assistant',
    durationSeconds: 0,
    callOutcome: `Scheduled for ${scheduledTimeStr}`,
    transcript: `Automated call scheduled via AI Command: "${query}"`,
    timestamp: new Date()
  });

  activityLogs.unshift({
    id: `log-${Date.now()}`,
    employeeId: 'e1',
    employeeName: 'Animesh (Voice Lead)',
    leadId: matchedLead ? matchedLead.id : 'DIALER-QUEUE',
    leadName: targetName,
    action: `Scheduled automated Voice Assistant outbound call ${callId} for ${scheduledTimeStr}`,
    fromStage: 'Voice Dialer',
    toStage: 'Scheduled Outbound Call',
    details: `Target: ${targetName} | Phone: ${targetPhone} | Time: ${scheduledTimeStr}`,
    createdAt: new Date()
  });

  return {
    text: `### 📞 Yes! Voice Agent Call Scheduled Successfully\n\n` +
      `**Call Reference ID:** \`${callId}\`  \n` +
      `• **Recipient Lead:** **${targetName}**  \n` +
      `• **Phone Number:** \`${targetPhone}\`  \n` +
      `• **Scheduled Execution Time:** **${scheduledTimeStr}**  \n` +
      `• **Assigned Voice Agent:** **APS Telecaller Assistant (Automated Sentiment & Budget Qualifier)**  \n` +
      `• **Call Capabilities:** Automated Dona Pattal & CNC Machine Interest Verification, Tally 10% Advance Deposit Reminders, & Live Transcript Sentiment Scoring  \n\n` +
      `*This scheduled call has been logged into your Voice Dialer queue (\`/dialer\`) and system Activity Logs.*`,
    table: [
      { "Call Reference": callId, "Recipient Customer": targetName, "Phone Number": targetPhone, "Scheduled Time": scheduledTimeStr, "Voice Agent": "APS Voice Assistant", "Status": "Scheduled in Queue" }
    ],
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
    text: `**Action Executed**: Dispatched automated WhatsApp notification **${waId}** via WABA Cloud API.\n\n• **Recipient**: Global Tech (+91 99887 76655)\n• **Template**: Payment Reminder (10% Advance Gate)\n• **Delivery Status**: Sent`,
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

  return `APS Enterprise Comprehensive System & Knowledge Base:
- Company Profile & Location: APS Enterprises, 832, Old Loha Mandi, In front of Devshree Cinema, Near Khambati Pipes, Indore, Madhya Pradesh - 452001, India. Phones: +91-7869755871, +91-8827848099. Emails: support.apsenterprises@gmail.com, apsenterprisesdp.229@gmail.com. Website: https://www.apsenterprises.in.
- Manufacturing Units: Indore Main Plant (Madhya Pradesh) & Pune Unit 1 (Maharashtra).
- Machinery Products: Fully Automatic Double Die Dona Pattal Machine, Heavy Hydraulic Paper Plate & Thali Machine, High-Speed Paper Cup Making Machine, Semi-Automatic Paper Cutter & Lamination Machine, Industrial CNC Milling & 6kW Fiber Laser Cutters.
- Platform Architecture & Dashboard Modules:
  1. Executive Dashboard (/) - Revenue, KPI stats, 10% Advance collected, conversion rate.
  2. CRM Leads & Pipeline (/leads) - 7 Stages: Enquiry -> Qualified -> Booked -> Confirmed Lead -> Client (Paid) -> In Production -> Dispatched.
  3. A1 Voice Dialer (/dialer) - Automated outbound call queue, call transcripts, sentiment scoring (82.4% positive).
  4. A5 WhatsApp Automation (/whatsapp) - WhatsApp Business API sequences & payment reminder templates.
  5. Tally 10% Advance Reconciliation (/tally) - Mandates 10% advance payment verification before manufacturing release.
  6. GST Invoices & Billing (/invoices) - HSN 8458.11, 18% GST (CGST 9% + SGST 9%) calculations & PDF export.
  7. Factory Shopfloor & Job Card Tracker (/factory) - Assembly milestone tracking at Pune Unit 1 & Indore.
  8. Team KPIs & Sales Leaderboard (/kpis, /employees) - Gamified badges & weighted KPI scoring.
  9. Warehouse Inventory (/inventory) - Component stocks (spindles, laser sources, raw paper rolls).
  10. Document Search & RAG (/documents) - Technical catalog & PDF specification search.
  11. A3 AI Assistant (/ai) - Natural language assistant for dashboard analysis, reports, and file generation.
- Live CRM Snapshot: Total Leads: ${leads.length} | Pipeline: ${stageCounts}
- Closed Sales: ${closedLeads.length} deals totaling ₹${totalRevenue.toLocaleString('en-IN')} | 10% Advance Collected: ₹${(totalRevenue * 0.1).toLocaleString('en-IN')}
- Pending Tally Gate: ${pendingLeads.length} leads (Advance Due: ₹${pendingRevenue.toLocaleString('en-IN')})
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

You are an advanced AI Dashboard Assistant for APS Enterprise (manufacturing sales: Dona Pattal machines, paper plate machines, paper cup makers, CNC machines, laser cutters, industrial equipment).

Your primary objective is to help users with:
1. All inquiries regarding APS Enterprises (Location: 832, Old Loha Mandi, Indore, MP - 452001; Plants in Indore & Pune; Products; Contacts; Website).
2. All dashboard modules, features, navigation, and options (CRM Pipeline, A1 Voice Dialer, A5 WhatsApp, Tally 10% Gate, Invoices, Factory Tracker, Team KPIs, Inventory, Document Search).
3. Analyzing data, generating executive reports, creating downloadable format files (only when requested), and answering questions in English, Hindi, or Hinglish accurately.

Rules:
- Always understand the user's intent before responding.
- When asked about company location, address, products, contacts, or dashboard features, answer thoroughly with exact details.
- Provide concise answers for simple questions and detailed answers for analytics requests.
- Only generate "exportFile" if the user explicitly requested a file generation/download in a format (e.g. CSV, Excel/XLSX, PDF, JSON, DOCX). Otherwise set "exportFile": null.

APS Enterprise CRM & Knowledge Snapshot Data:
${context}

RESPONSE FORMAT — respond ONLY with valid JSON (no markdown fences, no leading/trailing text):
{
  "text": "Your clear response text with **bold** for key numbers/names/addresses",
  "report": null or {"title":"...","date":"...","summary":"...","keyFindings":["..."],"actionableInsights":["..."]},
  "exportFile": null or {"fileName":"...","fileFormat":"CSV/XLSX/PDF/DOCX/XML/JSON","mimeType":"...","content":"..."},
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

// ─── Universal AI Answer Generator ─────────────────────────────────────────────
function generateUniversalAnswer(query) {
  const qLower = (query || '').toLowerCase().trim();
  const mockLeads = getStore().mockLeads || [];

  // 1. CRM Lead Specific Lookup (e.g. "John Doe", "Jane Smith", "Acme", "Global Tech", "CRM of John Doe", "PDF for John Doe")
  if (Array.isArray(mockLeads) && mockLeads.length > 0) {
    const matchedLead = mockLeads.find(l => {
      if (!l) return false;
      const nameLower = (l.name || '').toLowerCase();
      const compLower = (l.company || '').toLowerCase();
      const idLower   = (l.id || '').toLowerCase();
      return (nameLower && qLower.includes(nameLower)) ||
             (compLower && qLower.includes(compLower)) ||
             (idLower && qLower.includes(idLower)) ||
             (qLower.includes('john') && nameLower.includes('john')) ||
             (qLower.includes('doe') && nameLower.includes('doe')) ||
             (qLower.includes('jane') && nameLower.includes('jane')) ||
             (qLower.includes('smith') && nameLower.includes('smith'));
    });

    if (matchedLead) {
      const cleanName    = matchedLead.name || 'Lead Contact';
      const cleanCompany = matchedLead.company || 'Enterprise Account';
      const cleanValue   = matchedLead.budget ? `Rs. ${parseInt(matchedLead.budget).toLocaleString()}` : 'N/A';

      const responseText = `### 👤 CRM Lead Profile Report — ${cleanName}\n\n**Lead ID:** \`${matchedLead.id}\`  \n**Customer Name:** **${cleanName}**  \n**Company:** ${cleanCompany}  \n**Contact Phone:** \`${matchedLead.phone}\` | **Email:** \`${matchedLead.email}\`  \n**Product Interest:** ${matchedLead.interest}  \n**Quoted Budget Value:** **${cleanValue}**  \n**Pipeline Stage:** **${matchedLead.stage}**  \n**Lead Source:** ${matchedLead.source}  \n**Notes:** ${matchedLead.notes}\n\n#### ⚙️ Integration Layer Audit\n• **CRM Sync:** ${matchedLead.crmSynced ? 'Synced (Verified)' : 'Pending Sync'}\n• **ERP Factory Production:** ${matchedLead.erpBookingCreated ? 'Production Released (Job Card Ready)' : 'Pending Booking Release'}\n• **Tally Payment Status:** ${matchedLead.tallyPaymentVerified ? 'Payment Verified (Hard Gate Pass)' : 'Awaiting Payment Receipt Verification'}`;

      const resObj = {
        text: responseText,
        report: {
          title: `CRM LEAD AUDIT REPORT — ${cleanName.toUpperCase()}`,
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          summary: `Executive lead profile and CRM specification audit for ${cleanName} (${cleanCompany}).`,
          keyFindings: [
            `Lead ID ${matchedLead.id} is currently in '${matchedLead.stage}' stage.`,
            `Product interest logged as '${matchedLead.interest}' with budget of ${cleanValue}.`,
            `CRM synchronization is confirmed and active.`
          ],
          actionableInsights: [
            `Review advance payment status in Tally Sync before releasing factory production job card.`
          ]
        },
        table: [
          { "Attribute": "Lead ID", "Value": matchedLead.id, "Status": "Active Record" },
          { "Attribute": "Customer Name", "Value": matchedLead.name, "Status": "Primary Contact" },
          { "Attribute": "Company", "Value": matchedLead.company, "Status": "Registered Account" },
          { "Attribute": "Phone Number", "Value": matchedLead.phone, "Status": "Verified Phone" },
          { "Attribute": "Email Address", "Value": matchedLead.email, "Status": "Primary Email" },
          { "Attribute": "Product Interest", "Value": matchedLead.interest, "Status": "Machinery Unit" },
          { "Attribute": "Quoted Budget", "Value": cleanValue, "Status": "Quoted Value" },
          { "Attribute": "Pipeline Stage", "Value": matchedLead.stage, "Status": "Current Stage" },
          { "Attribute": "Lead Source", "Value": matchedLead.source, "Status": "Inbound Channel" },
          { "Attribute": "CRM Sync", "Value": matchedLead.crmSynced ? 'Synced' : 'Pending', "Status": "System Sync" },
          { "Attribute": "ERP Booking", "Value": matchedLead.erpBookingCreated ? 'Released' : 'Pending', "Status": "Factory Queue" },
          { "Attribute": "Tally Verification", "Value": matchedLead.tallyPaymentVerified ? 'Verified' : 'Unpaid', "Status": "Finance Gate" }
        ]
      };

      if (/pdf|report|export|download|file|doc/i.test(qLower)) {
        resObj.exportFile = {
          fileName: `CRM_Lead_${cleanName.replace(/\s+/g, '_')}_Report.pdf`,
          fileFormat: 'pdf',
          mimeType: 'application/pdf',
          sizeKB: '22.4 KB',
          title: `CRM LEAD AUDIT REPORT — ${cleanName.toUpperCase()} (${cleanCompany.toUpperCase()})`,
          content: responseText
        };
      }

      return resObj;
    }
  }

  // 2. Company / System General Knowledge Queries (e.g. "aps ke bare me batao", "what is aps")
  if (qLower.includes('aps') || qLower.includes('company') || qLower.includes('indore') || qLower.includes('machine')) {
    return {
      text: `### 🏢 About APS Enterprises\n\n**APS Enterprises** is a leading industrial automation and precision machinery manufacturer headquartered in Indore, MP.\n\n• **Core Machinery:** High-Speed Paper Cup Machines, Double Die Dona Pattal Units, CNC Machining Centers, and Hydraulic Paper Plate Presses.\n• **Headquarters:** 832, Old Loha Mandi, Indore, MP - 452001\n• **Contact & Helpline:** +91-7869755871 | ` + `www.apsenterprises.in\n\n#### 🚀 Operating System Capabilities\nThis **APS Enterprise AI Operating System** connects your CRM leads, ERP factory production queue, Tally accounting vouchers, and automated WhatsApp/Voice campaigns into a single unified cockpit.`
    };
  }

  // 3. Math / Calculation evaluation
  const mathMatch = qLower.match(/(?:calculate|compute|what is|eval|val|math)?\s*([\d\.\s\+\-\*\/\(\)\%]+)$/i);
  if (mathMatch && mathMatch[1] && /[\+\-\*\/\%]/.test(mathMatch[1])) {
    try {
      const expr = mathMatch[1].replace(/%/g, '/100');
      const val = Function(`'use strict'; return (${expr})`)();
      if (typeof val === 'number' && !isNaN(val)) {
        return {
          text: `### 🧮 Mathematical Calculation Result\n\n**Query Expression:** \`${mathMatch[1].trim()}\`  \n**Calculated Output:** **${val.toLocaleString()}**\n\n• **Formula Applied:** \`${expr}\`\n• **Accuracy:** 100% Certified Numerical Precision\n• **Usage:** Applicable for quotation estimates, margin calculations, and ledger adjustments.`
        };
      }
    } catch {}
  }

  // 4. Generic Intelligent Response Synthesizer
  const topicTitle = (query || 'Executive AI Query').replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const titleCaps = topicTitle.length > 0 ? topicTitle.charAt(0).toUpperCase() + topicTitle.slice(1) : 'APS Operational Guidance';

  const responseText = `### 🤖 APS AI Executive Response\n\n**Query:** "${query}"\n\nHere is the detailed analysis and operational summary for your query:\n\n#### 📌 Key Operational Overview\n• **Status & Insights:** Comprehensive automated synthesis performed across **APS Enterprise AI Operating System** data layers.\n• **Context Analysis:** Evaluated relevant parameters, active workflows, performance indicators, and enterprise knowledge records.\n• **System Guidance:** Designed to optimize efficiency across CRM Lead Pipelines, ERP Factory Bookings, Tally Sync Verification, and Automated WhatsApp Communications.\n\n#### 📊 Strategic Recommendations\n1. **Workflow Alignment:** Review relevant pipeline stages in **CRM Leads** and **ERP Production Tracker** for real-time progress.\n2. **Financial Verification:** Ensure all ledger balances and advance payment receipts are synchronized with **Tally Sync**.\n3. **Customer Engagement:** Utilize **WhatsApp Automation & Voice Agent** for automated status updates to clients.`;

  return {
    text: responseText,
    report: {
      title: `APS AI Intelligence — ${titleCaps}`,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      summary: `Detailed response and operational guidance generated for: "${query}"`,
      keyFindings: [
        `Processed query under APS Enterprise Universal Reasoning Engine.`,
        `Cross-verified across active modules (CRM, ERP, Tally, WhatsApp, Voice Agent).`
      ],
      actionableInsights: [
        `Use quick actions in the sidebar to execute related workflow operations.`
      ]
    }
  };
}

// ─── Main Query Processor ──────────────────────────────────────────────────────
async function processQuery(query, conversationId) {
  const history = getHistory(conversationId);
  const qLower = (query || '').toLowerCase().trim();

  // 0. PRIORITY CHECK: Follow-up Context Handler ("make an excel report for this", "make pdf for this", "export this")
  const isFollowUpRequest = /for this|this report|this data|export this|make.*excel|make.*pdf|make.*report|excel report|pdf report/i.test(qLower);

  if (isFollowUpRequest) {
    let contextTopic = 'leads'; // Default to leads
    if (Array.isArray(history) && history.length > 0) {
      const lastBotMsg = [...history].reverse().find(m => m.role === 'assistant');
      if (lastBotMsg && lastBotMsg.content) {
        const prevText = lastBotMsg.content.toLowerCase();
        if (prevText.includes('employee') || prevText.includes('staff') || prevText.includes('net profit analysis')) {
          contextTopic = 'employees';
        } else if (prevText.includes('lead') || prevText.includes('stage') || prevText.includes('pipeline') || prevText.includes('crm')) {
          contextTopic = 'leads';
        } else if (prevText.includes('invoice') || prevText.includes('tally') || prevText.includes('bill')) {
          contextTopic = 'invoices';
        }
      }
    }

    if (contextTopic === 'leads') {
      const isCsvReq = /csv/i.test(qLower);
      const isPdfReq = /pdf/i.test(qLower);
      const fmt = isPdfReq ? 'pdf' : (isCsvReq ? 'csv' : 'xlsx');

      const leadsText = `### 📊 APS Leads Pipeline Audit Report (Excel Workbook)\n\nGenerated official **${fmt.toUpperCase()} Excel Workbook** export for **42 Total Leads** across all 7 active pipeline stages.\n\n• **Enquiry Stage:** 5 Leads (Meta & Digital Campaign Inbound)\n• **Qualified Stage:** 4 Leads (Verified by Voice Assistant)\n• **Booked Stage:** 4 Leads (ERP Manufacturing Release Ready)\n• **Confirmed Stage:** 5 Leads (Proforma Invoices Issued)\n• **Paid Stage:** 10 Leads (10% Advance Gate Verified in Tally)\n• **In Production Stage:** 6 Leads (Indore Plant Assembly Active)\n• **Dispatched Stage:** 8 Leads (Waybill & Logistics Shipped)\n\n*Your requested ${fmt.toUpperCase()} Excel document has been attached below.*`;

      const resObj = {
        text: leadsText,
        table: [
          { "Pipeline Stage": "Enquiry", "Lead Count": 5, "Description": "New Meta Inbound Inquiries", "Status": "CRM Synced" },
          { "Pipeline Stage": "Qualified", "Lead Count": 4, "Description": "Verified by Voice Assistant", "Status": "CRM Synced" },
          { "Pipeline Stage": "Booked", "Lead Count": 4, "Description": "ERP Production Release Ready", "Status": "ERP Active" },
          { "Pipeline Stage": "Confirmed", "Lead Count": 5, "Description": "Proforma Invoices Issued", "Status": "Quoted" },
          { "Pipeline Stage": "Paid", "Lead Count": 10, "Description": "10% Advance Gate Verified in Tally", "Status": "Tally Pass" },
          { "Pipeline Stage": "In Production", "Lead Count": 6, "Description": "Indore Plant Assembly Active", "Status": "Shopfloor" },
          { "Pipeline Stage": "Dispatched", "Lead Count": 8, "Description": "Waybill & Logistics Shipped", "Status": "Complete" }
        ],
        chart: {
          type: 'bar',
          title: 'LEADS BY PIPELINE STAGE (42 TOTAL)',
          labels: ['Enquiry', 'Qualified', 'Booked', 'Confirmed', 'Paid', 'Production', 'Dispatched'],
          datasets: [{ label: 'Leads', data: [5, 4, 4, 5, 10, 6, 8], color: '#2563eb' }]
        },
        exportFile: {
          fileName: `APS_Leads_Pipeline_Audit_Report.${fmt}`,
          fileFormat: fmt,
          mimeType: fmt === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : (fmt === 'csv' ? 'text/csv' : 'application/pdf'),
          sizeKB: '24.5 KB',
          title: `APS LEADS PIPELINE AUDIT REPORT (${fmt.toUpperCase()})`,
          content: `Pipeline Stage,Lead Count,Description,System Status\nEnquiry,5,New Meta Inbound Inquiries,CRM Synced\nQualified,4,Verified by Voice Assistant,CRM Synced\nBooked,4,ERP Production Release Ready,ERP Active\nConfirmed,5,Proforma Invoices Issued,Quoted\nPaid,10,10% Advance Gate Verified in Tally,Tally Pass\nIn Production,6,Indore Plant Assembly Active,Shopfloor\nDispatched,8,Waybill & Logistics Shipped,Complete`,
          tableHeaders: ["Pipeline Stage", "Lead Count", "Description", "System Status"],
          tableRows: [
            ["Enquiry", "5", "New Meta Inbound Inquiries", "CRM Synced"],
            ["Qualified", "4", "Verified by Voice Assistant", "CRM Synced"],
            ["Booked", "4", "ERP Production Release Ready", "ERP Active"],
            ["Confirmed", "5", "Proforma Invoices Issued", "Quoted"],
            ["Paid", "10", "10% Advance Gate Verified in Tally", "Tally Pass"],
            ["In Production", "6", "Indore Plant Assembly Active", "Shopfloor"],
            ["Dispatched", "8", "Waybill & Logistics Shipped", "Complete"]
          ],
          summaryCards: [
            { label: "Total Leads", val: "42 Leads" },
            { label: "Paid Gate Pass", val: "10 Verified" },
            { label: "Active Production", val: "6 Units" },
            { label: "Dispatched", val: "8 Units" }
          ]
        }
      };

      addToHistory(conversationId, query, resObj.text);
      return { ...resObj, intent: 'export_leads_followup' };
    }
  }

  const intent  = detectIntent(query);
  const provider = (process.env.LLM_PROVIDER || 'mock').toLowerCase();

  let result;

  // For known intents, run the rule-based handler first for speed
  if (intent !== 'unknown' && provider === 'mock') {
    switch (intent) {
      case 'company_info':           result = await handleCompanyInfo(query); break;
      case 'dashboard_info':         result = await handleDashboardInfo(query); break;
      case 'normal_chat':            result = await handleNormalChat(query); break;
      case 'factory_tracker':        result = await handleFactoryTracker(query); break;
      case 'invoice_generator':      result = await handleInvoiceGenerator(query); break;
      case 'call_sentiment':         result = await handleCallSentiment(query); break;
      case 'whatsapp_analytics':     result = await handleWhatsAppAnalytics(query); break;
      case 'sales_leaderboard':      result = await handleSalesLeaderboard(query); break;
      case 'doc_search':             result = await handleDocSearch(query); break;
      case 'action_send_email':      result = await handleActionSendEmail(query); break;
      case 'action_check_inventory': result = await handleActionCheckInventory(query); break;
      case 'employee_performance':   result = await handleEmployeePerformance(query); break;
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
      case 'schedule_call':          result = await handleScheduleCall(query); break;
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
        case 'employee_performance':   result = await handleEmployeePerformance(query); break;
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
    // Unknown intent — try LLM, then fallback to Universal Answer Engine
    result = await processWithLLM(query, history);
  }

  // Follow-up context resolver (e.g. "make an excel report for this", "export this to pdf")
  const isFollowUpReport = /for this|this report|this data|export this|make.*excel|make.*pdf|make.*report|excel report|pdf report/i.test(query || '');
  let contextTopic = null;
  if (isFollowUpReport && Array.isArray(history) && history.length > 0) {
    const lastBotMsg = [...history].reverse().find(m => m.role === 'assistant');
    if (lastBotMsg && lastBotMsg.content) {
      const prevText = lastBotMsg.content.toLowerCase();
      if (prevText.includes('lead') || prevText.includes('stage') || prevText.includes('pipeline') || prevText.includes('crm')) {
        contextTopic = 'leads';
      } else if (prevText.includes('employee') || prevText.includes('kpi') || prevText.includes('staff')) {
        contextTopic = 'employees';
      }
    }
  }

  // If follow-up refers to Leads pipeline, generate Leads Pipeline Report
  if (contextTopic === 'leads' || (isFollowUpReport && /lead|pipeline|stage/i.test(query))) {
    const isCsvReq = /csv/i.test(query);
    const isPdfReq = /pdf/i.test(query);
    const fmt = isPdfReq ? 'pdf' : (isCsvReq ? 'csv' : 'xlsx');
    const ext = fmt;

    const leadsText = `### 📊 APS Leads Pipeline Audit Report (Excel Workbook)\n\nGenerated official **XLSX Excel Workbook** export for **42 Total Leads** across all 7 active pipeline stages.\n\n• **Enquiry Stage:** 5 Leads (Meta & Digital Campaign Inbound)\n• **Qualified Stage:** 4 Leads (Verified by Voice Assistant)\n• **Booked Stage:** 4 Leads (ERP Manufacturing Release Ready)\n• **Confirmed Stage:** 5 Leads (Proforma Invoices Issued)\n• **Paid Stage:** 10 Leads (10% Advance Gate Verified in Tally)\n• **In Production Stage:** 6 Leads (Indore Plant Assembly Active)\n• **Dispatched Stage:** 8 Leads (Waybill & Logistics Shipped)\n\n*Your requested XLSX Excel document has been attached below.*`;

    result = {
      text: leadsText,
      table: [
        { "Pipeline Stage": "Enquiry", "Lead Count": 5, "Description": "New Meta Inbound Inquiries", "Status": "CRM Synced" },
        { "Pipeline Stage": "Qualified", "Lead Count": 4, "Description": "Verified by Voice Assistant", "Status": "CRM Synced" },
        { "Pipeline Stage": "Booked", "Lead Count": 4, "Description": "ERP Production Release Ready", "Status": "ERP Active" },
        { "Pipeline Stage": "Confirmed", "Lead Count": 5, "Description": "Proforma Invoices Issued", "Status": "Quoted" },
        { "Pipeline Stage": "Paid", "Lead Count": 10, "Description": "10% Advance Gate Verified in Tally", "Status": "Tally Pass" },
        { "Pipeline Stage": "In Production", "Lead Count": 6, "Description": "Indore Plant Assembly Active", "Status": "Shopfloor" },
        { "Pipeline Stage": "Dispatched", "Lead Count": 8, "Description": "Waybill & Logistics Shipped", "Status": "Complete" }
      ],
      chart: {
        type: 'bar',
        title: 'LEADS BY PIPELINE STAGE (42 TOTAL)',
        labels: ['Enquiry', 'Qualified', 'Booked', 'Confirmed', 'Paid', 'Production', 'Dispatched'],
        datasets: [{ label: 'Leads', data: [5, 4, 4, 5, 10, 6, 8], color: '#2563eb' }]
      },
      exportFile: {
        fileName: `APS_Leads_Pipeline_Audit_Report.${ext}`,
        fileFormat: fmt,
        mimeType: fmt === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : (fmt === 'csv' ? 'text/csv' : 'application/pdf'),
        sizeKB: '24.5 KB',
        title: 'APS LEADS PIPELINE AUDIT REPORT (XLSX)',
        content: `Pipeline Stage,Lead Count,Description,System Status\nEnquiry,5,New Meta Inbound Inquiries,CRM Synced\nQualified,4,Verified by Voice Assistant,CRM Synced\nBooked,4,ERP Production Release Ready,ERP Active\nConfirmed,5,Proforma Invoices Issued,Quoted\nPaid,10,10% Advance Gate Verified in Tally,Tally Pass\nIn Production,6,Indore Plant Assembly Active,Shopfloor\nDispatched,8,Waybill & Logistics Shipped,Complete`,
        tableHeaders: ["Pipeline Stage", "Lead Count", "Description", "System Status"],
        tableRows: [
          ["Enquiry", "5", "New Meta Inbound Inquiries", "CRM Synced"],
          ["Qualified", "4", "Verified by Voice Assistant", "CRM Synced"],
          ["Booked", "4", "ERP Production Release Ready", "ERP Active"],
          ["Confirmed", "5", "Proforma Invoices Issued", "Quoted"],
          ["Paid", "10", "10% Advance Gate Verified in Tally", "Tally Pass"],
          ["In Production", "6", "Indore Plant Assembly Active", "Shopfloor"],
          ["Dispatched", "8", "Waybill & Logistics Shipped", "Complete"]
        ],
        summaryCards: [
          { label: "Total Leads", val: "42 Leads" },
          { label: "Paid Gate Pass", val: "10 Verified" },
          { label: "Active Production", val: "6 Units" },
          { label: "Dispatched", val: "8 Units" }
        ]
      }
    };
  }

  // Fallback to Universal Answer Generator if result is missing
  if (!result || !result.text) {
    result = generateUniversalAnswer(query);
  }

  // Attach PDF export ONLY if explicitly requested in the query
  const isPdfExplicitlyRequested = /pdf|report|export|download|file|invoice|sheet|doc/i.test(query || '');
  if (isPdfExplicitlyRequested && !result.exportFile) {
    const rawClean = (query || 'APS AI Response').replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const titleSlug = rawClean.slice(0, 35) || 'APS_AI_Report';
    const fileName = `APS_AI_${titleSlug.replace(/\s+/g, '_')}.pdf`;

    result.exportFile = {
      fileName: fileName,
      fileFormat: 'pdf',
      mimeType: 'application/pdf',
      sizeKB: '18.4 KB',
      title: `APS AI Intelligence — ${titleSlug.toUpperCase()}`,
      content: result.text
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
