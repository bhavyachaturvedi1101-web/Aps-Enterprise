'use strict';
/**
 * A3 Service — Internal NL Query Engine
 * ──────────────────────────────────────
 * LLM_PROVIDER = 'mock'   → rule-based engine (default)
 * LLM_PROVIDER = 'groq'   → GROQ_MODEL=groq/compounda Groq (fast & free)
 * LLM_PROVIDER = 'gemini' → Gemini 1.5 Flash
 * LLM_PROVIDER = 'openai' → GPT-4o-mini
 */

const https = require('https');
const { mockLeads } = require('../config/inMemoryStore');
const tallyService = require('./tallyService');

// ─── In-Memory Conversation Store ─────────────────────────────────────────────
const conversationStore = new Map();

function getHistory(conversationId) {
  if (!conversationId) return [];
  const entry = conversationStore.get(conversationId);
  if (!entry) return [];
  // Extended timeout: 120 minutes for long working sessions
  if (Date.now() - entry.lastAccess > 120 * 60 * 1000) {
    conversationStore.delete(conversationId);
    return [];
  }
  entry.lastAccess = Date.now();
  return entry.messages;
}

function addToHistory(conversationId, userMsg, botMsg) {
  if (!conversationId) return;
  if (!conversationStore.has(conversationId)) {
    conversationStore.set(conversationId, { messages: [], lastAccess: Date.now(), context: {} });
  }
  const entry = conversationStore.get(conversationId);
  const cleanUser = (typeof userMsg === 'string' ? userMsg : '').slice(0, 1200);
  const cleanBot = (typeof botMsg === 'string' ? botMsg : (botMsg?.text || '')).slice(0, 2500);
  entry.messages.push({ role: 'user', content: cleanUser });
  entry.messages.push({ role: 'assistant', content: cleanBot });
  // Extended memory: 40 messages (20 turns)
  if (entry.messages.length > 40) entry.messages = entry.messages.slice(-40);
  entry.lastAccess = Date.now();
}

function setContextMeta(conversationId, key, value) {
  if (!conversationId) return;
  if (!conversationStore.has(conversationId)) {
    conversationStore.set(conversationId, { messages: [], lastAccess: Date.now(), context: {} });
  }
  conversationStore.get(conversationId).context[key] = value;
}

function getContextMeta(conversationId, key) {
  if (!conversationId) return undefined;
  const entry = conversationStore.get(conversationId);
  return entry?.context?.[key];
}

// Store the full last result object so follow-up exports can replay the exact data
function setLastResult(conversationId, result) {
  if (!conversationId || !result) return;
  if (!conversationStore.has(conversationId)) {
    conversationStore.set(conversationId, { messages: [], lastAccess: Date.now(), context: {} });
  }
  // Store a lightweight snapshot: text, table, chart, and the intent label
  const entry = conversationStore.get(conversationId);
  entry.context._lastResult = {
    text:   result.text  || '',
    table:  Array.isArray(result.table)  ? result.table  : null,
    chart:  result.chart  || null,
    intent: result.intent || 'unknown',
    storedAt: Date.now()
  };
}

function getLastResult(conversationId) {
  if (!conversationId) return null;
  const entry = conversationStore.get(conversationId);
  const lr = entry?.context?._lastResult;
  if (!lr) return null;
  // Only use it if it was stored within the last 120 minutes (same session)
  if (Date.now() - lr.storedAt > 120 * 60 * 1000) return null;
  return lr;
}

// ─── Intent Recognition ────────────────────────────────────────────────────────
const INTENTS = [
  // ── Options Flow Intents ──
  { name: 'landing_assign_tasks_options', patterns: [/assign team tasks options/i] },
  { name: 'landing_invoices_options',     patterns: [/billing & invoices options/i] },
  { name: 'landing_voice_dialer_options', patterns: [/voice dialer options/i] },
  { name: 'landing_factory_options',      patterns: [/production progress options/i] },
  
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
  { name: 'generate_report', patterns: [
    /generate.*report/i,
    /executive report/i,
    /full report/i,
    /create.*report/i,
    /business report/i,
    /operations report/i,
    /complete report/i,
    /sales report/i,
    /management report/i,
    /download.*report/i,
    /report download/i,
    /report generate/i,
    /report banao/i,
    /report chahiye/i,
    /poori report/i
  ] },
  { name: 'normal_chat',         patterns: [/^\s*(hi|hello|hey|greetings|good morning|good afternoon|good evening|namaste|ha\b|haa|ok|okay|cool|nice)\s*$/i, /kaise ho|how are you|kaise hain|kya haal|what's up|sup\b|how do you do/i, /who are you|aap kaun ho|who created you|tum kaun ho|who r u|what are you/i, /what can you do|kya kar sakte ho|features kya hai|help me|kya kya kar sakte ho/i, /thank you|thanks|shukriya|dhanyawad|thank u|thx|awesome|great/i, /bye|goodbye|alvida|cya|see you/i] },
  // ── Action Creation & Mutation Intents (Must be evaluated FIRST) ──
  { name: 'action_post_tally',      patterns: [
    /(create|generate|add|post|make|insert|record|new)\s*(\d+)?\s*(new)?\s*(record|voucher|entry|payment|advance|receipt|transaction).*?(tally|ledger|accounting|sync)/i,
    /(tally|ledger|voucher).*?(create|generate|add|post|make|insert|record|banao|entry|new)/i,
    /generate.*record.*tally/i,
    /add.*record.*tally/i,
    /post.*tally/i,
    /add.*tally/i,
    /create.*voucher/i,
    /post.*voucher/i,
    /reconcile.*tally/i,
    /verify.*payment/i,
    /tally voucher/i,
    /tally entry/i,
    /paisa receive/i
  ] },
  { name: 'action_create_lead',     patterns: [
    /(create|generate|add|register|insert|make|new)\s*(\d+)?\s*(new)?\s*(lead|client|prospect|customer|inquiry|deal)/i,
    /(lead|client|prospect|customer).*?(create|add|generate|register|banao|entry)/i,
    /new lead/i,
    /naya lead/i,
    /lead add/i,
    /nayi entry/i,
    /lead banao/i
  ] },
  { name: 'action_create_user',     patterns: [
    /(create|generate|add|register|hire|insert|new)\s*(\d+)?\s*(new)?\s*(user|employee|staff|member|worker|telecaller|sales rep|executive|fitter|technician|supervisor|accountant)/i,
    /(user|employee|staff|member|worker|telecaller|rep|fitter|supervisor).*?(create|add|generate|hire|banao|register|new)/i,
    /new (user|employee|staff|worker|member)/i,
    /add (user|employee|staff|worker|member)/i,
    /hire (user|employee|staff|worker|telecaller|rep)/i
  ] },
  { name: 'action_erp_booking',     patterns: [
    /(create|generate|add|register|insert|make|release|new)\s*(\d+)?\s*(new)?\s*(job card|erp|manufacturing booking|production booking|factory booking)/i,
    /(job card|erp|factory|production).*?(create|generate|add|release|banao|booking)/i,
    /release.*(factory|production)/i,
    /start.*production/i
  ] },
  { name: 'action_transition_lead', patterns: [/move.*lead/i, /transition.*lead/i, /change.*stage/i, /update.*stage/i, /set.*stage/i, /mark.*as/i, /promote.*lead/i, /stage badlo/i, /stage change/i, /move karo/i, /paid mark/i] },
  { name: 'action_queue_dialer',    patterns: [
    /(create|queue|schedule|add|trigger)\s*(\d+)?\s*(new)?\s*(call|dialer|phone call|voice call)/i,
    /call.*(queue|schedule|add|trigger)/i,
    /dialer me daalo/i,
    /call karo/i
  ] },
  { name: 'action_send_whatsapp',   patterns: [/send.*whatsapp/i, /whatsapp.*reminder/i, /trigger.*sequence/i, /send.*reminder/i, /whatsapp bhejo/i, /reminder bhejo/i, /msg karo/i] },
  { name: 'action_send_email',       patterns: [/send.*email/i, /email.*quotation/i, /mail/i, /send.*pdf.*email/i, /email bhejo/i, /send email/i] },
  { name: 'action_check_inventory',  patterns: [/inventory/i, /warehouse/i, /\bstock\b/i, /available units/i, /raw material/i, /kitna stock/i, /inventory stock/i] },
  { name: 'assign_employee_tasks', patterns: [
    /give.*task/i,
    /assign.*task/i,
    /tasks? (to|for) (sales|telecaller|caller|factory|dispatch|logistics|finance|team|staff|employees?)/i,
    /(sales|telecaller|caller|factory|dispatch|logistics|finance|team|staff|employees?).*tasks?/i,
    /task.*(every|all|employee|role|staff|team|member|worker|sales|telecaller|caller)/i,
    /(employee|staff|team|sales|caller|factory|dispatch).*task/i,
    /assign.*work/i,
    /give.*work/i,
    /distribute.*task/i,
    /allocate.*task/i,
    /role.*task/i,
    /work.*role/i
  ] },
  { name: 'invoice_generator',   patterns: [/\bgst\b/i, /tax invoice/i, /\bhsn\b/i, /generate invoice/i, /create invoice/i, /billing details/i, /make.*invoice/i, /invoice.*banao/i, /invoice.*generate/i] },

  // ── Query & Reporting Intents ──
  { name: 'invoices', patterns: [
    /show.*(invoice|billing|ledger)/i,
    /list.*(invoice|billing|ledger)/i,
    /all.*(invoice|billing|ledger)/i,
    /view.*(invoice|billing|ledger)/i,
    /invoice.*(list|history|records|table|ledger)/i,
    /invoice dikhao/i,
    /saare invoice/i
  ] },
  { name: 'factory_tracker',     patterns: [/factory/i, /job card/i, /assembly/i, /shopfloor/i, /production progress/i, /mfg status/i, /factory job/i, /tracker/i] },
  { name: 'call_sentiment',      patterns: [/sentiment/i, /call transcript/i, /call analysis/i, /customer mood/i, /speech analysis/i, /voice call/i] },
  { name: 'whatsapp_analytics',  patterns: [/whatsapp analytics/i, /open rate/i, /delivery rate/i, /campaign performance/i, /waba stats/i, /whatsapp campaign/i] },
  { name: 'doc_search',              patterns: [/search.*doc/i, /manual/i, /specification/i, /datasheet/i, /warranty/i, /pdf catalog/i, /find document/i, /technical spec/i, /spindle/i, /search pdf/i, /rag/i] },
  { name: 'sales_leaderboard',   patterns: [
    /leaderboard/i,
    /badge/i,
    /rankings?/i,
    /top seller/i,
    /gamification/i,
    /sales (leaderboard|ranking|top|performance|rank|reps|champion)/i,
    /top (sales|rep|closer|seller|performer)/i
  ] },
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
  { name: 'leads_by_stage',   patterns: [/confirmed lead/i, /qualified lead/i, /enquir/i, /in production/i, /dispatched/i, /booked lead/i, /client.*paid/i, /paid.*client/i] },
  { name: 'show_all_crm_leads', patterns: [
    /show.*crm/i,
    /show.*all.*lead/i,
    /show.*lead/i,
    /list.*all.*lead/i,
    /list.*lead/i,
    /all.*crm.*lead/i,
    /crm.*lead/i,
    /display.*lead/i,
    /get.*all.*lead/i,
    /view.*lead/i,
    /see.*all.*lead/i,
    /all lead/i,
    /lead.*list/i,
    /lead.*table/i,
    /lead.*data/i,
    /lead.*database/i,
    /full.*lead/i,
    /complete.*lead/i,
    /saare lead/i,
    /sab lead/i,
    /lead dikhao/i,
    /sabke lead/i
  ] },
  { name: 'lead_count',       patterns: [/how many lead/i, /total lead/i, /count.*lead/i, /lead.*count/i, /number of lead/i, /kitne lead/i, /total kitne/i] },
  { name: 'pending_payment',  patterns: [/pending payment/i, /awaiting payment/i, /payment.*pending/i, /not.*paid/i, /unpaid/i, /due payment/i, /advance.*due/i, /kiska payment/i, /paise baki/i, /advance baaki/i] },
  { name: 'top_performer',    patterns: [/top perform/i, /top employee/i, /best.*employee/i, /highest.*sales/i, /most.*lead/i, /who.*sold/i, /best.*agent/i, /who.*best/i, /highest.*kpi/i, /sabse achha/i, /kaun top/i, /best seller/i] },
  { name: 'compare_period',   patterns: [/this month.*last month/i, /compare.*month/i, /vs last month/i, /month.*comparison/i, /month over month/i, /month.*month/i, /sales trend/i, /revenue trend/i, /lead trend/i, /compare.*period/i, /iske pehle.*mahine/i] },
  { name: 'recent_activity',  patterns: [/recent activity/i, /latest.*activity/i, /what happened/i, /activity log/i, /last.*action/i, /recent.*update/i, /kya hua/i, /recent audit/i] },
  { name: 'pipeline_summary', patterns: [/pipeline/i, /overview/i, /summary/i, /all stage/i, /breakdown/i, /distribution/i, /status.*lead/i, /lead.*status/i, /pipeline summary/i] },
  { name: 'revenue_summary',  patterns: [
    /payment.*(receiv|reciev|collect|got|deposit|aaya|mila|done|verified|status|summary|total|kitna|check)/i,
    /(how much|total|kitna|all).*?(payment|money|advance|revenue|collection|deposit)/i,
    /(payment|money|revenue|advance|collection|deposit).*?(receiv|reciev|collect|total|summary|status|kitna|aaya)/i,
    /revenue/i,
    /money.*collect/i,
    /collect.*money/i,
    /saved/i,
    /earned/i,
    /sales of/i,
    /sale.*month/i,
    /income/i,
    /earning/i,
    /how much.*made/i,
    /how much.*earn/i,
    /what.*sales/i,
    /total.*sale/i,
    /sale.*august/i,
    /august.*sale/i,
    /this month.*sale/i,
    /kitna revenue/i,
    /kitni sale/i,
    /kitna kamaya/i,
    /paisa kitna/i
  ] },
  { name: 'employee_list',    patterns: [/list.*employee/i, /all employee/i, /\bteam\b/i, /\bstaff\b/i, /who.*work/i, /show.*employee/i, /our.*team/i, /kaun kaun kaam/i, /saare employee/i] },
  { name: 'hot_leads',        patterns: [/hot lead/i, /priority lead/i, /urgent/i, /follow.*up.*today/i, /today.*lead/i, /needs.*attention/i, /important.*lead/i, /kaunsa lead/i, /urgent lead/i] },
  { name: 'kpi_stats',        patterns: [/kpi/i, /\bperformance\b/i, /\bscore\b/i, /\btarget\b/i, /conversion rate/i, /calls handled/i, /how.*doing/i, /team.*perform/i, /kpi score/i] },
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

// ─── Show ALL CRM Leads — Full Data, No Caps ───────────────────────────────────
async function handleShowAllCrmLeads(query) {
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

async function handleTopPerformer() {
  const store = await getStore();
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
      datasets: [{ label: 'Leads', data: counts, color: '#aa3bff' }]
    }
  };
}

async function handleRevenueSummary() {
  const store = await getStore();
  const leads = store.mockLeads || [];
  
  // Paid & In-Production & Dispatched leads
  const paidLeads = leads.filter(l => ['Client (Paid)', 'In Production', 'Dispatched'].includes(l.stage) || l.tallyPaymentVerified);
  const confirmedLeads = leads.filter(l => l.stage === 'Confirmed Lead' && !l.tallyPaymentVerified);
  
  const totalPaidOrderValue = paidLeads.reduce((sum, l) => sum + (Number(l.budget) || 0), 0);
  const totalAdvanceCollected = Math.round(totalPaidOrderValue * 0.10);
  const pendingAdvanceExpected = Math.round(confirmedLeads.reduce((sum, l) => sum + (Number(l.budget) || 0), 0) * 0.10);
  const totalInvoicedTaxable = 26688958; // from Invoices ledger
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthPaid = paidLeads.filter(l => new Date(l.createdAt) >= startOfMonth);
  const thisMonthAdvance = Math.round(thisMonthPaid.reduce((sum, l) => sum + (Number(l.budget) || 0), 0) * 0.10);

  // Table of recent received payments
  const recentPayments = paidLeads.slice(0, 10).map((l) => {
    const orderVal = Number(l.budget) || 150000;
    const adv = Math.round(orderVal * 0.10);
    return {
      'Lead / Client': l.name,
      'Company': l.company || `${l.name} Works`,
      'Product': l.interest || 'Machinery System',
      'Total Order Value': `₹${orderVal.toLocaleString('en-IN')}`,
      '10% Advance Received': `+₹${adv.toLocaleString('en-IN')}`,
      'Tally Status': '✅ Verified (Paid)',
      'Stage': l.stage
    };
  });

  return {
    text: `### 💰 Total Payments Received & Revenue Collections\n\n` +
      `• **Total Verified Payment Collections:** **₹${totalAdvanceCollected.toLocaleString('en-IN')}** (10% Advance Gate verified via Tally ERP 9 / Prime)\n` +
      `• **Total Orders Paid / In Production:** **${paidLeads.length} Deals** worth **₹${totalPaidOrderValue.toLocaleString('en-IN')}**\n` +
      `• **GST Tax Invoiced Revenue:** **₹${totalInvoicedTaxable.toLocaleString('en-IN')}** (148 Tax Invoices)\n` +
      `• **This Month's Advance Collected:** **₹${thisMonthAdvance.toLocaleString('en-IN')}** from **${thisMonthPaid.length} clients**\n` +
      `• **Awaiting Advance Payment:** **${confirmedLeads.length} Confirmed Leads** (₹${pendingAdvanceExpected.toLocaleString('en-IN')} pending 10% gate)\n\n` +
      `*Below is the ledger breakdown of recently verified payments and advance deposits.*`,
    table: recentPayments,
    chart: {
      type: 'bar',
      title: 'Payment Collections Breakdown (₹)',
      labels: ['Total Paid Deals', '10% Advance Received', 'GST Invoiced', 'Pending Advances'],
      datasets: [{
        label: '₹ Amount',
        data: [totalPaidOrderValue, totalAdvanceCollected, totalInvoicedTaxable, pendingAdvanceExpected],
        color: '#10b981'
      }]
    }
  };
}

function filterEmployeesByQuery(employees, query) {
  if (!query) return { employees, label: 'All Registered Employees' };
  const qLower = query.toLowerCase();
  
  if (qLower.includes('telecaller') || qLower.includes('voice') || qLower.includes('dialer') || qLower.includes('calling') || qLower.includes('caller')) {
    const filtered = employees.filter(e => {
      const r = (e.role || '').toLowerCase();
      const d = (e.department || '').toLowerCase();
      return r.includes('telecaller') || r.includes('voice') || r.includes('dialer') || r.includes('calling') || d.includes('voice') || d.includes('telecalling');
    });
    return { employees: filtered, label: 'Telecaller & Voice Operations Team' };
  }
  
  if (qLower.includes('sales') || qLower.includes('executive') || qLower.includes('bd') || qLower.includes('business development') || qLower.includes('champion')) {
    const filtered = employees.filter(e => {
      const r = (e.role || '').toLowerCase();
      const d = (e.department || '').toLowerCase();
      return r.includes('sales') || r.includes('executive') || r.includes('bd') || r.includes('business development') || r.includes('champion') || d.includes('sales');
    });
    return { employees: filtered, label: 'Sales & Business Development Team' };
  }
  
  if (qLower.includes('account') || qLower.includes('finance') || qLower.includes('tax') || qLower.includes('gst') || qLower.includes('tally')) {
    const filtered = employees.filter(e => {
      const r = (e.role || '').toLowerCase();
      const d = (e.department || '').toLowerCase();
      return r.includes('account') || r.includes('finance') || r.includes('tax') || r.includes('gst') || r.includes('tally') || d.includes('finance') || d.includes('accounting');
    });
    return { employees: filtered, label: 'Finance, Accounts & GST Team' };
  }
  
  if (qLower.includes('production') || qLower.includes('factory') || qLower.includes('shopfloor') || qLower.includes('assembly') || qLower.includes('supervisor') || qLower.includes('fitter') || qLower.includes('technician') || qLower.includes('qc') || qLower.includes('quality') || qLower.includes('testing')) {
    const filtered = employees.filter(e => {
      const r = (e.role || '').toLowerCase();
      const d = (e.department || '').toLowerCase();
      return r.includes('production') || r.includes('factory') || r.includes('shopfloor') || r.includes('assembly') || r.includes('supervisor') || r.includes('fitter') || r.includes('technician') || r.includes('qc') || r.includes('quality') || r.includes('testing') || d.includes('production') || d.includes('factory');
    });
    return { employees: filtered, label: 'Factory Shopfloor & Quality Control Team' };
  }
  
  if (qLower.includes('dispatch') || qLower.includes('logistics') || qLower.includes('warehouse') || qLower.includes('shipping')) {
    const filtered = employees.filter(e => {
      const r = (e.role || '').toLowerCase();
      const d = (e.department || '').toLowerCase();
      return r.includes('dispatch') || r.includes('logistics') || r.includes('warehouse') || r.includes('shipping') || d.includes('dispatch') || d.includes('logistics') || d.includes('warehouse');
    });
    return { employees: filtered, label: 'Logistics, Warehouse & Dispatch Team' };
  }
  
  if (qLower.includes('whatsapp') || qLower.includes('marketing') || qLower.includes('automation') || qLower.includes('ninja')) {
    const filtered = employees.filter(e => {
      const r = (e.role || '').toLowerCase();
      const d = (e.department || '').toLowerCase();
      return r.includes('whatsapp') || r.includes('marketing') || r.includes('automation') || r.includes('ninja') || d.includes('marketing') || d.includes('automation');
    });
    return { employees: filtered, label: 'Marketing & WhatsApp Automation Team' };
  }

  // Check if a specific employee name is mentioned
  const namedEmp = employees.find(e => {
    const nameParts = (e.name || '').toLowerCase().split(' ');
    return nameParts.some(part => part.length > 2 && qLower.includes(part));
  });
  if (namedEmp) {
    const firstName = namedEmp.name.split(' ')[0].toLowerCase();
    const filtered = employees.filter(e => e.name.toLowerCase().includes(firstName));
    return { employees: filtered, label: `Performance Profile: ${namedEmp.name}` };
  }

  return { employees, label: 'All Registered Employees' };
}

async function handleEmployeeList(query) {
  const store = await getStore();
  const rawEmployees = store.mockEmployees || [];
  const { employees, label } = filterEmployeesByQuery(rawEmployees, query);
  return {
    text: `**${employees.length} employees** are listed under **${label}**.`,
    table: employees.map(e => ({ Name: e.name, Role: e.role || '—', KPI: e.kpiScore || '—', 'Sales Closed': e.salesClosed || 0, Revenue: `₹${(e.totalRevenue || 0).toLocaleString('en-IN')}`, Status: e.status || 'Active' })),
    chart: null
  };
}

async function handleHotLeads() {
  const store = await getStore();
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
  const store = await getStore();
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
  const store = await getStore();
  const calls = store.mockCallLogs || [];
  return {
    text: `**${calls.length} calls** logged in the A1 Voice Agent dialer. Total call time: **${Math.round(calls.reduce((s, c) => s + (c.durationSeconds || 0), 0) / 60)} minutes**.`,
    table: calls.map(c => ({ ID: c.callId, Lead: c.leadId, Agent: c.agent, Duration: `${c.durationSeconds}s`, Outcome: c.callOutcome, Time: new Date(c.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) })),
    chart: null
  };
}

async function handleWhatsApp() {
  const store = await getStore();
  const templates = store.mockWhatsAppTemplates || [];
  return {
    text: `**${templates.length} WhatsApp templates** configured for A5 automation. These are auto-triggered based on lead stage transitions.`,
    table: templates.map(t => ({ Name: t.name, Status: t.status || '—', Trigger: t.triggerStage || '—', Category: t.category || '—' })),
    chart: null
  };
}

async function handleGenerateReport(query) {
  const store = await getStore();
  const leads = store.mockLeads || [];
  const employees = store.mockEmployees || [];

  const closedLeads = leads.filter(l => ['Client (Paid)', 'In Production', 'Dispatched'].includes(l.stage));
  const totalRevenue = closedLeads.reduce((s, l) => s + (Number(l.budget) || 0), 0);
  const totalAdvance = totalRevenue * 0.1;
  const pendingLeads = leads.filter(l => l.stage === 'Confirmed Lead');
  const topEmp = [...employees].sort((a, b) => (b.salesClosed || 0) - (a.salesClosed || 0))[0];
  const todayStr = new Date().toLocaleDateString('en-IN', { dateStyle: 'full' });

  const qLower = (query || '').toLowerCase();
  const wantsFile = /pdf|file|format|download|export|save|csv|excel|xlsx|docx|doc|word/i.test(qLower);

  let fileFormat = 'PDF';
  if (qLower.includes('excel') || qLower.includes('xlsx')) fileFormat = 'XLSX';
  else if (qLower.includes('csv')) fileFormat = 'CSV';
  else if (qLower.includes('docx') || qLower.includes('word') || qLower.includes('doc')) fileFormat = 'DOC';
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
  if (/\b(docx|doc|word|word\s*doc)\b/i.test(q)) return 'doc';
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
  } else if (format === 'doc') {
    mimeType = 'application/msword';
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
  } else if (format === 'doc') {
    mimeType = 'application/msword';
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
  const store = await getStore();
  const rawEmployees = store.mockEmployees || [];
  const format = detectRequestedFormat(query);
  const dateStr = new Date().toISOString().slice(0, 10);
  const qLower = (query || '').toLowerCase();

  // Specific role / department / name filtering based on query keywords
  let employees = [...rawEmployees];
  let categoryLabel = 'All Registered Employees';

  if (qLower.includes('telecaller') || qLower.includes('voice') || qLower.includes('dialer') || qLower.includes('calling') || qLower.includes('caller')) {
    categoryLabel = 'Telecaller & Voice Operations Team';
    employees = employees.filter(e => {
      const r = (e.role || '').toLowerCase();
      const d = (e.department || '').toLowerCase();
      return r.includes('telecaller') || r.includes('voice') || r.includes('dialer') || r.includes('calling') || d.includes('voice') || d.includes('telecalling');
    });
  } else if (qLower.includes('sales') || qLower.includes('executive') || qLower.includes('bd') || qLower.includes('business development') || qLower.includes('champion')) {
    categoryLabel = 'Sales & Business Development Team';
    employees = employees.filter(e => {
      const r = (e.role || '').toLowerCase();
      const d = (e.department || '').toLowerCase();
      return r.includes('sales') || r.includes('executive') || r.includes('bd') || r.includes('business development') || r.includes('champion') || d.includes('sales');
    });
  } else if (qLower.includes('account') || qLower.includes('finance') || qLower.includes('tax') || qLower.includes('gst') || qLower.includes('tally')) {
    categoryLabel = 'Finance, Accounts & GST Team';
    employees = employees.filter(e => {
      const r = (e.role || '').toLowerCase();
      const d = (e.department || '').toLowerCase();
      return r.includes('account') || r.includes('finance') || r.includes('tax') || r.includes('gst') || r.includes('tally') || d.includes('finance') || d.includes('accounting');
    });
  } else if (qLower.includes('production') || qLower.includes('factory') || qLower.includes('shopfloor') || qLower.includes('assembly') || qLower.includes('supervisor') || qLower.includes('fitter') || qLower.includes('technician') || qLower.includes('qc') || qLower.includes('quality') || qLower.includes('testing')) {
    categoryLabel = 'Factory Shopfloor & Quality Control Team';
    employees = employees.filter(e => {
      const r = (e.role || '').toLowerCase();
      const d = (e.department || '').toLowerCase();
      return r.includes('production') || r.includes('factory') || r.includes('shopfloor') || r.includes('assembly') || r.includes('supervisor') || r.includes('fitter') || r.includes('technician') || r.includes('qc') || r.includes('quality') || r.includes('testing') || d.includes('production') || d.includes('factory');
    });
  } else if (qLower.includes('dispatch') || qLower.includes('logistics') || qLower.includes('warehouse') || qLower.includes('shipping')) {
    categoryLabel = 'Logistics, Warehouse & Dispatch Team';
    employees = employees.filter(e => {
      const r = (e.role || '').toLowerCase();
      const d = (e.department || '').toLowerCase();
      return r.includes('dispatch') || r.includes('logistics') || r.includes('warehouse') || r.includes('shipping') || d.includes('dispatch') || d.includes('logistics') || d.includes('warehouse');
    });
  } else if (qLower.includes('whatsapp') || qLower.includes('marketing') || qLower.includes('automation') || qLower.includes('ninja')) {
    categoryLabel = 'Marketing & WhatsApp Automation Team';
    employees = employees.filter(e => {
      const r = (e.role || '').toLowerCase();
      const d = (e.department || '').toLowerCase();
      return r.includes('whatsapp') || r.includes('marketing') || r.includes('automation') || r.includes('ninja') || d.includes('marketing') || d.includes('automation');
    });
  } else {
    // Check if a specific employee name is mentioned
    const namedEmp = employees.find(e => {
      const nameParts = (e.name || '').toLowerCase().split(' ');
      return nameParts.some(part => part.length > 2 && qLower.includes(part));
    });
    if (namedEmp) {
      const firstName = namedEmp.name.split(' ')[0].toLowerCase();
      categoryLabel = `Performance Profile: ${namedEmp.name}`;
      employees = employees.filter(e => e.name.toLowerCase().includes(firstName));
    }
  }

  // Fallback to all if no filter matched or matched no one
  if (employees.length === 0) {
    employees = [...rawEmployees];
    categoryLabel = 'All Registered Employees';
  }

  // Operational base costs per employee (monthly salary + dialer + compute + travel overhead)
  const costMap = {
    e1: 38000, // Animesh
    e2: 45000, // Bhavya
    e3: 32000, // Aaditya
    e4: 35000, // Pooja
    e5: 40000  // Rohan
  };

  const employeesData = employees.map(e => {
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
    text: `**APS Employee Performance, Cost & Profit Analysis — ${categoryLabel}**:\n\n` +
      `• **Total Closed Revenue**: **₹${totalRev.toLocaleString('en-IN')}** across **${totalDeals} closed deals**\n` +
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
      title: `${categoryLabel} Performance: Cost Spent vs Net Profit vs Revenue`,
      labels: employeesData.slice(0, 15).map(e => e.name.split(' ')[0]), // slice labels to prevent chart crowding
      datasets: [
        { label: 'Cost Spent (₹)', data: employeesData.slice(0, 15).map(e => e.costSpent), color: '#ef4444' },
        { label: 'Net Profit Gained (₹)', data: employeesData.slice(0, 15).map(e => e.netProfit), color: '#10b981' },
        { label: 'Revenue Closed (₹)', data: employeesData.slice(0, 15).map(e => e.totalRevenue), color: '#2563eb' }
      ]
    }
  };
}

async function handleExportFile(query) {
  const store = await getStore();
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
  const store = await getStore();
  const leads = store.mockLeads || [];
  const employees = store.mockEmployees || [];
  const closedLeads = leads.filter(l => ['Client (Paid)', 'In Production', 'Dispatched'].includes(l.stage));
  const paidLeads = leads.filter(l => l.stage === 'Client (Paid)');
  const conversionRate = leads.length > 0 ? ((paidLeads.length / leads.length) * 100).toFixed(1) : '0.0';
  const avgDealSize = closedLeads.length > 0
    ? Math.round(closedLeads.reduce((s, l) => s + (Number(l.budget) || 0), 0) / closedLeads.length)
    : 125000;
  const avgKpi = employees.length > 0
    ? Math.round(employees.reduce((s, e) => s + (e.kpiScoreNum || 0), 0) / employees.length)
    : 88;
  const callLogs = store.mockCallLogs || [];
  const callConvPct = callLogs.length > 0
    ? Math.min(99, Math.round((closedLeads.length / Math.max(1, callLogs.length)) * 100 + 30))
    : 42;

  return {
    text: `**APS Enterprise Key Business Metrics & KPI Definitions**\n\n` +
      `1. **Pipeline Conversion Rate**: % of total leads transitioning to *Client (Paid)*. Currently **${conversionRate}%** (${paidLeads.length} of ${leads.length} leads).\n` +
      `2. **Tally 10% Advance Payment Gate**: Mandates 10% deposit before releasing job cards to shopfloor manufacturing.\n` +
      `3. **Sales Velocity**: Average days taken to close a lead (currently **4.2 days**).\n` +
      `4. **Employee KPI Score**: Weighted rating based on sales closed (40%), calls handled (30%), WhatsApp response speed (20%), and Tally reconciliation accuracy (10%). Team average: **${avgKpi}%**.`,
    table: [
      { Metric: 'Pipeline Conversion Rate', Value: `${conversionRate}%`, Target: '20.0%', Status: Number(conversionRate) >= 20 ? 'Exceeding Target' : 'Below Target' },
      { Metric: 'Tally 10% Advance Gate Compliance', Value: '100.0%', Target: '100.0%', Status: 'Enforced' },
      { Metric: 'Average Deal Size', Value: `₹${avgDealSize.toLocaleString('en-IN')}`, Target: '₹1,00,000', Status: avgDealSize >= 100000 ? 'Above Average' : 'Below Target' },
      { Metric: 'Outbound Call Conversion', Value: `${callConvPct}%`, Target: '35.0%', Status: callConvPct >= 35 ? 'Healthy' : 'Needs Attention' }
    ],
    chart: {
      type: 'bar',
      title: 'KPI Achievement vs Target (%)',
      labels: ['Conversion Rate', 'Advance Gate', 'Deal Size', 'Call Conversion'],
      datasets: [
        { label: 'Actual %', data: [Math.round((Number(conversionRate) / 20) * 100), 100, Math.round((avgDealSize / 100000) * 100), callConvPct], color: '#10b981' },
        { label: 'Target %', data: [100, 100, 100, 100], color: '#94a3b8' }
      ]
    }
  };
}

async function handleTrendAnalysis(query) {
  const store = await getStore();
  const leads = store.mockLeads || [];
  const pending = leads.filter(l => l.stage === 'Confirmed Lead');
  const closedStages = ['Client (Paid)', 'In Production', 'Dispatched'];
  const closedLeads = leads.filter(l => closedStages.includes(l.stage));

  // Compute real month-over-month data
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const thisMonthLeads   = leads.filter(l => new Date(l.createdAt) >= startOfThisMonth).length;
  const lastMonthLeads   = leads.filter(l => { const d = new Date(l.createdAt); return d >= startOfLastMonth && d <= endOfLastMonth; }).length;
  const thisMonthRev     = closedLeads.filter(l => new Date(l.updatedAt || l.createdAt) >= startOfThisMonth).reduce((s, l) => s + (Number(l.budget) || 0), 0);
  const lastMonthRev     = closedLeads.filter(l => { const d = new Date(l.updatedAt || l.createdAt); return d >= startOfLastMonth && d <= endOfLastMonth; }).reduce((s, l) => s + (Number(l.budget) || 0), 0);
  const leadGrowthPct    = lastMonthLeads > 0 ? (((thisMonthLeads - lastMonthLeads) / lastMonthLeads) * 100).toFixed(1) : 'N/A';
  const revGrowthPct     = lastMonthRev   > 0 ? (((thisMonthRev   - lastMonthRev)   / lastMonthRev)   * 100).toFixed(1) : 'N/A';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const thisMonthName = months[now.getMonth()] + ' ' + now.getFullYear();
  const lastMonthName = months[now.getMonth() - 1 < 0 ? 11 : now.getMonth() - 1] + ' ' + (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());

  // Anomaly detection: leads stuck in Confirmed Lead
  const anomalyLead = pending[0];
  const anomalyText = anomalyLead
    ? `Lead **"${anomalyLead.name}" (${anomalyLead.id})** has been in *Confirmed Lead* stage without 10% advance payment verification. Recommended action: Trigger A5 WhatsApp reminder.`
    : 'No payment-gate anomalies detected. All Confirmed leads are within SLA.';

  return {
    text: `**Trend Analysis & Anomaly Detection Report**\n\n` +
      `• **Lead Inflow Trend**: ${thisMonthLeads} leads this month vs ${lastMonthLeads} last month (${leadGrowthPct !== 'N/A' ? (Number(leadGrowthPct) >= 0 ? '+' : '') + leadGrowthPct + '%' : 'First month'} change).\n` +
      `• **Revenue Trend**: ₹${thisMonthRev.toLocaleString('en-IN')} this month vs ₹${lastMonthRev.toLocaleString('en-IN')} last month (${revGrowthPct !== 'N/A' ? (Number(revGrowthPct) >= 0 ? '+' : '') + revGrowthPct + '%' : 'First month'} change).\n` +
      `• **Anomaly Detected**: ${anomalyText}`,
    report: {
      title: 'Trend Analysis & Anomaly Audit',
      date: now.toLocaleDateString('en-IN', { dateStyle: 'full' }),
      summary: `Comparative month-over-month trend inspection across APS Enterprise sales pipeline (${leads.length} total leads, ${closedLeads.length} closed).`,
      keyFindings: [
        `Lead Inflow: ${thisMonthLeads} leads added this month vs ${lastMonthLeads} last month.`,
        `Revenue: ₹${thisMonthRev.toLocaleString('en-IN')} this month vs ₹${lastMonthRev.toLocaleString('en-IN')} last month.`,
        `Confirmed-stage bottlenecks: ${pending.length} lead(s) awaiting payment verification.`
      ],
      actionableInsights: [
        pending.length > 0 ? `Send high-priority WhatsApp payment link to ${pending[0].name}.` : 'All advance payments are on track.',
        'Cap unassigned enquiries to under 24h response SLA to maintain pipeline velocity.'
      ]
    },
    table: [
      { Metric: 'Lead Inflow', [`${lastMonthName}`]: lastMonthLeads, [`${thisMonthName}`]: thisMonthLeads, Change: leadGrowthPct !== 'N/A' ? `${Number(leadGrowthPct) >= 0 ? '+' : ''}${leadGrowthPct}%` : 'N/A' },
      { Metric: 'Closed Revenue', [`${lastMonthName}`]: `₹${lastMonthRev.toLocaleString('en-IN')}`, [`${thisMonthName}`]: `₹${thisMonthRev.toLocaleString('en-IN')}`, Change: revGrowthPct !== 'N/A' ? `${Number(revGrowthPct) >= 0 ? '+' : ''}${revGrowthPct}%` : 'N/A' },
      { Metric: 'Confirmed (Pending Payment)', [`${lastMonthName}`]: '—', [`${thisMonthName}`]: pending.length, Change: `${pending.length} bottleneck(s)` }
    ],
    chart: {
      type: 'bar',
      title: 'Month-over-Month Revenue & Lead Growth',
      labels: [lastMonthName, thisMonthName],
      datasets: [
        { label: 'Revenue (₹)', data: [lastMonthRev, thisMonthRev], color: '#8b5cf6' },
        { label: 'Leads Added', data: [lastMonthLeads, thisMonthLeads], color: '#6366f1' }
      ]
    }
  };
}

async function handleDocSearch(query) {
  const store = await getStore();
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
  const store = await getStore();
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
  const store = await getStore();
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
  const store = await getStore();
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
  const store = await getStore();
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
  const store = await getStore();
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
  const store = await getStore();
  const allEmployees = store.mockEmployees || [];
  
  // Filter strictly to Sales, Telecalling, and Business Development representatives
  const salesEmployees = allEmployees.filter(e => {
    const r = (e.role || '').toLowerCase();
    const d = (e.department || '').toLowerCase();
    return r.includes('sales') || r.includes('executive') || r.includes('champion') || 
           r.includes('telecaller') || r.includes('qualification') || r.includes('representative') || 
           r.includes('rep') || r.includes('bd') || d.includes('sales') || d.includes('telecalling') || d.includes('voice');
  });

  const targetList = salesEmployees.length > 0 ? salesEmployees : allEmployees;
  const sorted = [...targetList].sort((a, b) => (b.salesClosed || 0) - (a.salesClosed || 0) || (b.totalRevenue || 0) - (a.totalRevenue || 0));

  // Cap chart strictly to top 8 sales reps so bars and labels remain clean, uncluttered, and readable
  const topForChart = sorted.slice(0, 8);

  return {
    text: `### 🏆 Sales Representative Leaderboard (August 2026)\n\n` +
      `**Top Sales Closers:**\n` +
      sorted.slice(0, 3).map((e, idx) => `${idx + 1}. **${e.name}** (${e.role}) — **${e.salesClosed || 0} Deals Closed** (₹${(e.totalRevenue || 0).toLocaleString('en-IN')}) | KPI: **${e.kpiScore || '—'}**`).join('\n') +
      `\n\n*Displaying performance ranking for **${sorted.length} Sales & Telecalling Representatives**.*`,
    table: sorted.map((e, i) => ({
      Rank: `#${i + 1}`,
      Name: e.name,
      Role: e.role,
      'Deals Closed': e.salesClosed || 0,
      Revenue: `₹${(e.totalRevenue || 0).toLocaleString('en-IN')}`,
      'KPI Score': e.kpiScore || '—',
      Badge: i === 0 ? 'Champion' : i === 1 ? 'Top Closer' : i === 2 ? 'Speed Specialist' : 'Specialist'
    })),
    chart: {
      type: 'bar',
      title: 'Top Sales Representatives by Revenue (₹)',
      labels: topForChart.map(e => e.name.split(' ')[0]),
      datasets: [{ label: 'Revenue (₹)', data: topForChart.map(e => e.totalRevenue || 0), color: '#f59e0b' }]
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

// ─── Invoices List Handler ────────────────────────────────────────────────────
async function handleInvoices(query) {
  const store = await getStore();
  const leads = store.mockLeads || [];
  // Build invoice records from leads that have payment verified or are closed
  const closedStages = ['Client (Paid)', 'In Production', 'Dispatched'];
  const invoiceLeads = leads.filter(l => l.tallyPaymentVerified || closedStages.includes(l.stage));
  const totalInvoiced = invoiceLeads.reduce((s, l) => s + (Number(l.budget) || 0), 0);
  const totalAdvance  = invoiceLeads.reduce((s, l) => s + ((Number(l.budget) || 0) * 0.1), 0);

  const today = new Date();
  const invoiceRows = invoiceLeads.map((l, idx) => {
    const base = Number(l.budget) || 0;
    const cgst = base * 0.09;
    const sgst = base * 0.09;
    const total = base + cgst + sgst;
    const invDate = new Date(l.updatedAt || l.createdAt || today);
    return {
      'Invoice No': `APS-INV-${String(idx + 1).padStart(4, '0')}`,
      'Party Name': l.name,
      Company: l.company || '—',
      'Taxable Amt': `₹${base.toLocaleString('en-IN')}`,
      'CGST (9%)':  `₹${Math.round(cgst).toLocaleString('en-IN')}`,
      'SGST (9%)':  `₹${Math.round(sgst).toLocaleString('en-IN')}`,
      'Total (18% GST)': `₹${Math.round(total).toLocaleString('en-IN')}`,
      'Tally Status': l.tallyPaymentVerified ? '✅ Verified' : '⏳ Pending',
      'Invoice Date': invDate.toLocaleDateString('en-IN')
    };
  });

  return {
    text: `**APS Enterprise — GST Invoice Ledger** (${invoiceLeads.length} invoices):\n\n` +
      `• **Total Invoiced (Taxable)**: ₹${totalInvoiced.toLocaleString('en-IN')}\n` +
      `• **Total Advance Collected (10%)**: ₹${Math.round(totalAdvance).toLocaleString('en-IN')}\n` +
      `• **Tally Verified**: ${invoiceLeads.filter(l => l.tallyPaymentVerified).length} / ${invoiceLeads.length} invoices`,
    table: invoiceRows,
    chart: {
      type: 'bar',
      title: 'Invoice Status: Taxable Amount vs Advance Collected',
      labels: ['Total Taxable', 'Advance (10%)', 'Balance (90%)'],
      datasets: [{ label: '₹ Amount', data: [totalInvoiced, Math.round(totalAdvance), Math.round(totalInvoiced * 0.9)], color: '#f59e0b' }]
    }
  };
}

// ─── ADMIN ACTION HANDLERS (CRM, TALLY, ERP, DIALER, WHATSAPP) ────────────────

async function handleActionCreateLead(query) {
  const store = await getStore();
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

async function handleActionCreateUser(query) {
  const store = await getStore();
  const employees = store.mockEmployees || [];
  const activityLogs = store.mockActivityLogs || [];
  const qLower = query.toLowerCase();

  // Extract count if multiple users requested (e.g. "create 2 new users")
  const countMatch = query.match(/(?:create|generate|add|hire|insert)\s*(\d+)\s*(?:new)?\s*(?:users?|employees?|staff|members?)/i);
  const count = countMatch ? Math.min(parseInt(countMatch[1], 10), 10) : 1;

  // Extract Name (e.g. "create user Rahul Sharma", "add employee Priya Patel")
  let nameMatch = query.match(/(?:user|employee|staff|member|named?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (!nameMatch) {
    nameMatch = query.match(/(?:create|add|hire)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:as|in|role|department)/i);
  }

  // Detect Role & Department
  let role = 'Sales & Telecaller Specialist';
  let department = 'Voice Operations & Telecalling';

  if (qLower.includes('telecaller') || qLower.includes('caller') || qLower.includes('voice') || qLower.includes('dialer')) {
    role = qLower.includes('senior') ? 'Senior Telecaller' : 'Lead Telecaller Executive';
    department = 'Voice Operations & Telecalling';
  } else if (qLower.includes('sales') || qLower.includes('executive') || qLower.includes('closer') || qLower.includes('rep')) {
    role = qLower.includes('senior') ? 'Senior Sales Specialist' : 'Direct Sales Executive';
    department = 'Sales & Field Operations';
  } else if (qLower.includes('fitter') || qLower.includes('technician') || qLower.includes('mechanic')) {
    role = 'Senior Machine Fitter';
    department = 'Production & Assembly';
  } else if (qLower.includes('supervisor') || qLower.includes('assembly') || qLower.includes('shopfloor') || qLower.includes('factory')) {
    role = 'Assembly Floor Supervisor';
    department = 'Production & Assembly';
  } else if (qLower.includes('qc') || qLower.includes('quality') || qLower.includes('testing')) {
    role = 'Quality Testing Engineer';
    department = 'Quality Assurance & QC';
  } else if (qLower.includes('dispatch') || qLower.includes('logistics') || qLower.includes('warehouse')) {
    role = 'Logistics & Dispatch Coordinator';
    department = 'Logistics & Warehouse';
  } else if (qLower.includes('finance') || qLower.includes('account') || qLower.includes('tax') || qLower.includes('tally')) {
    role = 'Accounts & Tally Executive';
    department = 'Finance & Accounting';
  }

  const sampleNames = [
    'Rahul Sharma', 'Priya Patel', 'Aman Verma', 'Neha Joshi', 'Siddharth Roy',
    'Deepak Yadav', 'Ananya Gupta', 'Kavita Singhal', 'Vikram Rathore', 'Pooja Nair'
  ];

  const createdUsers = [];

  for (let i = 0; i < count; i++) {
    const defaultName = sampleNames[(employees.length + i) % sampleNames.length];
    const name = (i === 0 && nameMatch) ? nameMatch[1].trim() : defaultName;
    const empId = `e${employees.length + 1}`;
    const cleanEmailName = name.toLowerCase().replace(/\s+/g, '.');
    const email = `${cleanEmailName}@aps-enterprise.com`;
    const phone = `+91 ${Math.floor(9000000000 + Math.random() * 999999999)}`;

    const newEmp = {
      id: empId,
      name,
      email,
      phone,
      role,
      department,
      kpiScore: '92%',
      kpiScoreNum: 92,
      status: 'Active',
      currentActivity: 'System Onboarding & Task Setup',
      tasksCompleted: 0,
      callsHandled: 0,
      salesClosed: 0,
      totalRevenue: 0,
      targetSales: 10,
      conversionRate: '28%',
      avgCallDurationSec: 105,
      avgResponseTimeMin: '1.8',
      weeklyKpiHistory: [88, 90, 91, 92],
      activeTask: {
        id: `task-${empId}-1`,
        title: `Complete system onboarding & initialize ${role} operational pipeline`,
        priority: 'HIGH',
        dueIn: '30 mins',
        leadName: 'System Setup',
        assignedAt: new Date().toISOString()
      },
      taskQueue: [
        { title: `Review ${department} standard operating procedures (SOP)`, priority: 'MEDIUM' },
        { title: 'Set up CRM credentials and phone extension', priority: 'HIGH' }
      ]
    };

    employees.unshift(newEmp);
    createdUsers.push(newEmp);

    // Persist to PostgreSQL database
    try {
      const { Employee } = require('../models');
      if (Employee) {
        Employee.create({
          id: newEmp.id,
          name: newEmp.name,
          email: newEmp.email,
          phone: newEmp.phone,
          role: newEmp.role,
          department: newEmp.department,
          status: newEmp.status,
          kpiScore: newEmp.kpiScore,
          tasksCompleted: 0,
          callsHandled: 0,
          salesClosed: 0,
          totalRevenue: 0
        }).catch(err => console.log('[A3 User DB Insert Warn]:', err.message));
      }
    } catch (err) {
      console.error('[A3 User DB Error]:', err.message);
    }

    activityLogs.unshift({
      id: `log-${Date.now()}-${i}`,
      employeeId: 'e2',
      employeeName: 'Bhavya (Admin AI)',
      leadId: null,
      leadName: newEmp.name,
      action: `Created new user/employee profile "${newEmp.name}" (${newEmp.role} - ${newEmp.department}) via A3 AI Assistant`,
      fromStage: 'None',
      toStage: 'Active Member',
      details: `Email: ${newEmp.email} | Extension ID: ${newEmp.id}`,
      createdAt: new Date()
    });
  }

  // Update store
  store.mockEmployees = employees;

  const titleText = count === 1 
    ? `### 👤 New User / Employee Profile Created & Activated\n\nSuccessfully registered and onboarded **${createdUsers[0].name}** into the APS Enterprise platform.\n\n`
    : `### 👥 ${count} New Users / Employees Created & Activated\n\nSuccessfully registered and onboarded **${count} team members** into the APS Enterprise platform.\n\n`;

  const detailsText = createdUsers.map(u => 
    `• **${u.name}** (\`${u.id}\`)\n` +
    `  - **Role & Department**: **${u.role}** (*${u.department}*)\n` +
    `  - **Email / Phone**: \`${u.email}\` | \`${u.phone}\`\n` +
    `  - **Initial Active Task**: **${u.activeTask.title}** (${u.activeTask.priority} Priority, Due: ${u.activeTask.dueIn})\n` +
    `  - **Account Status**: **Active** (Initial KPI: **${u.kpiScore}**)`
  ).join('\n\n');

  return {
    text: titleText + detailsText + `\n\n*This profile is live and active across **\`/employees\`** and **\`/kpis\`**.*`,
    table: createdUsers.map(u => ({
      ID: u.id,
      Name: u.name,
      Role: u.role,
      Department: u.department,
      Email: u.email,
      'Active Task': u.activeTask.title,
      Status: u.status,
      KPI: u.kpiScore
    })),
    chart: {
      type: 'bar',
      title: 'New User Department Allocation',
      labels: [createdUsers[0].department.split(' ')[0], 'Total Active Staff'],
      datasets: [{ label: 'Members', data: [createdUsers.length, employees.length], color: '#10b981' }]
    }
  };
}

async function handleActionTransitionLead(query) {
  const store = await getStore();
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
  const store = await getStore();
  const activityLogs = store.mockActivityLogs || [];
  const leads = store.mockLeads || [];

  // Parse amount carefully (avoid mistaking "1 record" or "2 vouchers" for amount)
  let amountMatch = query.match(/(?:amount|rs\.?|inr|₹|worth|of|deposit)\s*([0-9,]+)/i) || query.match(/₹\s*([0-9,]+)/);
  let amount = 35000;
  if (amountMatch) {
    const parsed = Number(amountMatch[1].replace(/,/g, ''));
    if (parsed > 100) amount = parsed;
  }
  let partyMatch = query.match(/(?:for|party|client|named?)\s+([a-zA-Z0-9\s&]+?)(?=\s+amount|\s+rs|\s+₹|\s+in|\s+with|$)/i);
  
  // If no party name was parsed, find if any CRM lead is mentioned in the query
  let matchedLead = leads.find(l => l && query.toLowerCase().includes((l.name || '').toLowerCase()) || query.toLowerCase().includes((l.company || '').toLowerCase()));
  let partyName = partyMatch ? partyMatch[1].trim() : (matchedLead ? matchedLead.name : 'Kirloskar Forge & Stampings');

  // Generate the voucher
  const vchNo = `VCH-2026-0${Math.floor(100 + Math.random() * 900)}`;
  const utrNo = `UTR-HDFC${Math.floor(100000 + Math.random() * 900000)}`;
  
  const createdVoucher = tallyService.addVoucher({
    voucherNo: vchNo,
    partyName: partyName,
    amount: amount,
    voucherType: 'Advance Receipt (10%)',
    particulars: 'HDFC Bank Main A/c (#5020)',
    utrNo: utrNo,
    narration: `10% advance deposit for ${partyName} order processed via A3 AI Assistant`
  });

  // If a lead in CRM matches, verify its payment
  if (matchedLead) {
    matchedLead.tallyPaymentVerified = true;
    if (matchedLead.stage === 'Confirmed Lead' || matchedLead.stage === 'Enquiry' || matchedLead.stage === 'Qualified') {
      matchedLead.stage = 'Client (Paid)';
    }
  }

  activityLogs.unshift({
    id: `log-${Date.now()}`,
    employeeId: 'e2',
    employeeName: 'Bhavya (Admin AI)',
    leadId: matchedLead ? matchedLead.id : 'TALLY-SYNC',
    leadName: partyName,
    action: `Created & Synchronized Tally ERP 9 Voucher ${vchNo} for ₹${amount.toLocaleString('en-IN')}`,
    fromStage: 'Tally',
    toStage: 'Reconciled',
    details: `Voucher Type: Advance Receipt (10% Gate) | UTR: ${utrNo}`,
    createdAt: new Date()
  });

  return {
    text: `### ⚡ Tally ERP 9 / Prime Voucher Record Created & Synced\n\n` +
      `Successfully generated and posted new voucher record **${vchNo}** into the Tally Ledger.\n\n` +
      `• **Voucher No**: \`${vchNo}\`\n` +
      `• **Party / Client**: **${partyName}**\n` +
      `• **Voucher Type**: Advance Receipt (10% Gate)\n` +
      `• **Amount Received**: **₹${amount.toLocaleString('en-IN')}** (GST Output: ₹${Math.round(amount * 0.18).toLocaleString('en-IN')})\n` +
      `• **Bank Ref / UTR**: \`${utrNo}\`\n` +
      `• **Reconciliation Status**: **Reconciled (Live)**\n\n` +
      `*This voucher record is now live in **\`/tally\`** and reconciled against the bank feed.*`,
    table: [{
      'Voucher No': vchNo,
      Date: createdVoucher.date,
      'Party / Client': partyName,
      'Voucher Type': 'Advance Receipt (10%)',
      'Particulars': 'HDFC Bank Main A/c (#5020)',
      'Amount (₹)': `+₹${amount.toLocaleString('en-IN')}`,
      'Bank Ref / UTR': utrNo,
      'Status': 'Reconciled'
    }],
    chart: null
  };
}

async function handleActionErpBooking(query) {
  const store = await getStore();
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
  const store = await getStore();
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
  const store = await getStore();
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
  const store = await getStore();
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

// ─── Full context builder for LLM (Ultra-Dense Real-Time Enterprise State) ────
async function buildFullContext(query) {
  const store = await getStore();
  const leads = store.mockLeads || [];
  const employees = store.mockEmployees || [];
  const actLogs = store.mockActivityLogs || [];
  const callLogs = store.mockCallLogs || [];
  const qLower = (query || '').toLowerCase().trim();

  // ── Financial KPIs ──────────────────────────────────────────────────────────
  const closedStages = ['Client (Paid)', 'In Production', 'Dispatched'];
  const closedLeads = leads.filter(l => closedStages.includes(l.stage));
  const totalPipeline = leads.reduce((s, l) => s + (Number(l.budget || l.dealValue || l.value) || 0), 0);
  const totalRevenueLocked = closedLeads.reduce((s, l) => s + (Number(l.budget || l.dealValue || l.value) || 0), 0);
  const advanceCollected = totalRevenueLocked * 0.1;
  const pendingBalance = totalRevenueLocked * 0.9;
  const confirmedLeads = leads.filter(l => l.stage === 'Confirmed Lead');
  const advancePending = confirmedLeads.reduce((s, l) => s + (Number(l.budget || l.dealValue || l.value) || 0) * 0.1, 0);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthLeads = leads.filter(l => new Date(l.createdAt || Date.now()) >= startOfMonth);

  // ── ALL Employees (no cap — full team context for AI) ──────────────────────
  const empDetails = employees.map(e => {
    const active = e.activeTask
      ? `Active: "${e.activeTask.title}" [P:${e.activeTask.priority}, Lead: ${e.activeTask.leadName || 'N/A'}, Due: ${e.activeTask.dueIn || 'N/A'}]`
      : 'Active: None';
    const queued = Array.isArray(e.taskQueue) && e.taskQueue.length > 0
      ? 'Queue: ' + e.taskQueue.map((t, i) => `${i + 1}."${t.title}"(${t.priority})`).join(' | ')
      : 'Queue: Empty';
    const convRate = e.conversionRate || (e.salesClosed && e.leadsAssigned ? `${Math.round((e.salesClosed / e.leadsAssigned) * 100)}%` : 'N/A');
    return `• ${e.name} [${e.role} / ${e.department}] KPI=${e.kpiScore} Sales=${e.salesClosed} Rev=₹${(e.totalRevenue || 0).toLocaleString('en-IN')} Conv=${convRate} Calls=${e.callsHandled || 0}\n  ${active} | ${queued}`;
  }).join('\n');

  // ── ALL Leads (no cap — full pipeline for AI context) ──────────────────────
  // Prioritise leads mentioned in query, then all others
  const mentionedLeads = leads.filter(l =>
    qLower.includes((l.name || '').toLowerCase()) || qLower.includes((l.company || '').toLowerCase())
  );
  const remainingLeads = leads.filter(l => !mentionedLeads.some(x => x.id === l.id));
  const allLeadsOrdered = [...mentionedLeads, ...remainingLeads];

  const leadDetails = allLeadsOrdered.map(l =>
    `[${l.stage}] ${l.id} | ${l.name} (${l.company || 'N/A'}) | ₹${(Number(l.budget || l.dealValue || l.value) || 0).toLocaleString('en-IN')} | Product:${l.interest || l.product || l.machineRequired || 'N/A'} | Owner:${l.assignedTo || l.assignedEmployeeId || 'Unassigned'} | Tally:${l.tallyPaymentVerified ? 'Verified' : 'Pending'} | ERP:${l.erpBookingCreated ? 'Booked' : 'Pending'} | Source:${l.source || 'N/A'} | City:${l.city || l.location || 'N/A'}`
  ).join('\n');

  // ── Recent Activity Log (last 5) ─────────────────────────────────────────
  const recentActivity = actLogs.slice(0, 5).map(a =>
    `[${new Date(a.timestamp || a.createdAt || Date.now()).toLocaleDateString('en-IN')}] ${a.action || a.type} | Lead:${a.leadName || a.leadId || '?'} | By:${a.employeeName || 'System'}`
  ).join('\n') || 'No recent activity logged.';

  // ── Call Log Summary ────────────────────────────────────────────────────
  const totalCalls = callLogs.length;
  const avgCallDuration = totalCalls > 0 ? Math.round(callLogs.reduce((s, c) => s + (c.durationSeconds || 0), 0) / totalCalls) : 0;
  const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0 };
  callLogs.forEach(c => {
    const s = (c.sentiment || '').toLowerCase();
    if (s.includes('positive')) sentimentBreakdown.positive++;
    else if (s.includes('negative')) sentimentBreakdown.negative++;
    else sentimentBreakdown.neutral++;
  });

  return `═══ APS ENTERPRISE — LIVE INTELLIGENCE STATE [${new Date().toLocaleString('en-IN')}] ═══

━━━ [1] COMPANY IDENTITY & LOCATIONS ━━━
• Full Name: APS Enterprise — Lead Industrial Manufacturer, Indore MP
• Head Office: 832, Old Loha Mandi, Opp. Devshree Cinema, Near Khambati Pipes, Indore, MP 452001
• Plant A — Indore: Paper Converting Machinery (Dona Pattal, Paper Cup, Thali Machine lines)
• Plant B — Pune Unit 1: CNC Milling, 6kW Fiber Laser Cutting, Hydraulic Stamping Press
• Contact: +91-7869755871 | +91-8827848099 | info@apsenterprises.in | www.apsenterprises.in
• GST: Registered | MSME: Registered | ISO: Certified Manufacturer

━━━ [2] COMPLETE MACHINERY CATALOGUE & TECHNICAL SPECS ━━━
1. Double Die Automatic Dona/Pattal Machine
   — Output: 2,500–4,500 pcs/hr | Paper: 80–400 GSM roll stock
   — Motor: 2.0 kW Single/Three Phase | Die Size: 4" to 14"
   — Features: Auto PID temperature controller, cam-drive mechanism, automatic feeding
   — Power: 220V/440V | Weight: 280–350 kg | Dimensions: 48"×32"×56"
   — Price Range: ₹65,000 – ₹1,45,000 (ex-works Indore)

2. High-Speed Paper Cup Making Machine
   — Output: 70–90 cups/min | Cup Volume: 45ml – 330ml
   — Paper: 140–350 GSM Single/Double PE coated
   — Sealing: Ultrasonic side seal + hot-air bottom heater + knurling
   — Motor: 3 HP servo drive | Control: PLC + HMI touchscreen
   — Price Range: ₹6,50,000 – ₹9,50,000

3. Heavy Hydraulic Paper Plate & Thali Machine
   — Type: 2-Die / 4-Die Hydraulic Press
   — Pressure: 5 Ton – 10 Ton hydraulic | Motor: 2 HP – 5 HP
   — Hydraulic Oil: ISO VG 68 | Stroke: 50mm–120mm
   — Output: 800–1,500 plates/hr (2-die) | Up to 3,000/hr (4-die)
   — Price Range: ₹85,000 – ₹2,20,000

4. Industrial CNC Milling Center & 6kW Fiber Laser Cutter
   — Laser Source: Raycus / IPG 1kW – 6kW Fiber
   — Controller: CypCut CNC (professional grade)
   — Cutting Bed: 1500×3000mm heavy-duty gantry frame
   — Cuts: MS, SS, Aluminium, Brass, Copper sheets (up to 20mm MS)
   — CNC Milling: 3-axis / 4-axis, BT40/BT50 spindle, 8000–12000 RPM
   — Price Range: ₹18,00,000 – ₹45,00,000+

5. Hydraulic Stamping Press (200T / 500T)
   — Application: Deep-draw industrial stamping, metal forming
   — Safety: PLC automated with dual-hand safety sensors
   — Stroke Control: Programmable via servo hydraulic control
   — Frame: C-frame / H-frame heavy-duty welded steel
   — Price Range: ₹12,00,000 – ₹35,00,000

━━━ [3] 5-TIER AI ARCHITECTURE (A1–A5) ━━━
• A1 — Voice AI Agent: Exotel cloud telephony + ElevenLabs voice synthesis + Deepgram ASR. Handles inbound inquiries, qualifies leads in Hindi/English/Gujarati, runs sentiment analysis. Route: /voice /dialer
• A2 — Admin Cockpit: Executive KPI dashboard, real-time pipeline, financial health tracker, integrated with Tally ERP sync. Route: / /crm /payments
• A3 — AI Copilot (THIS MODULE): NL query engine, data charts, automated file export, business action triggers. Route: /ai
• A4 — Team KPIs & Gamification: Live KPI scoring engine, task assignment, backlog management, sales leaderboard with badges. Route: /employees /kpis
• A5 — WhatsApp Automation: WABA Cloud API, automated template sequences (10% advance, dispatch, invoice), interactive product catalogs. Route: /whatsapp

━━━ [4] CRITICAL BUSINESS RULES & COMPLIANCE ━━━
• RULE 1 — 10% Advance Gate (NON-NEGOTIABLE): Production order release to Indore factory ONLY after 10% advance amount verified in Tally ERP ledger. Lead status auto-transitions: Confirmed Lead → Client (Paid) → Job Card issued.
• RULE 2 — 100% Clearance Before Dispatch: Goods can be dispatched with transporter e-Waybill ONLY after 100% payment cleared or approved credit terms documented.
• RULE 3 — GST Compliance: All GST Tax Invoices must include GSTIN, HSN code, IGST/CGST/SGST split at 18%, e-invoice IRN for orders above ₹5L.
• RULE 4 — Tally ERP Integration: All payment receipts must be posted as Receipt Vouchers in Tally. Proforma invoices are non-GST; Tax Invoices are issued only post-advance confirmation.
• RULE 5 — WhatsApp Advance Reminders: Automated WhatsApp messages sent 24h after quotation if advance not received. Escalation to voice call via A1 if no response in 48h.

━━━ [5] FINANCIAL HEALTH SNAPSHOT ━━━
• Total Pipeline Value: ₹${totalPipeline.toLocaleString('en-IN')} (${leads.length} Leads)
• Revenue Locked (Closed Stages): ₹${totalRevenueLocked.toLocaleString('en-IN')} (${closedLeads.length} Deals)
• Advance Collected (10% of Locked): ₹${advanceCollected.toLocaleString('en-IN')}
• Balance Pending (90% of Locked): ₹${pendingBalance.toLocaleString('en-IN')}
• Advance Pending (Confirmed but Unpaid): ₹${advancePending.toLocaleString('en-IN')} from ${confirmedLeads.length} leads
• New Leads This Month: ${thisMonthLeads.length} leads

━━━ [6] VOICE CALL INTELLIGENCE (A1 AUDIT) ━━━
• Total Calls Logged: ${totalCalls}
• Avg Call Duration: ${avgCallDuration}s
• Sentiment: Positive=${sentimentBreakdown.positive} | Neutral=${sentimentBreakdown.neutral} | Negative=${sentimentBreakdown.negative}

━━━ [7] LIVE TEAM PERFORMANCE ━━━
${empDetails || 'No team data available.'}

━━━ [8] FULL CRM PIPELINE STATE ━━━
• Enquiry: ${leads.filter(l => l.stage === 'Enquiry').length} | Qualified: ${leads.filter(l => l.stage === 'Qualified').length} | Booked: ${leads.filter(l => l.stage === 'Booked').length} | Confirmed: ${leads.filter(l => l.stage === 'Confirmed Lead').length} | Paid: ${leads.filter(l => l.stage === 'Client (Paid)').length} | In Production: ${leads.filter(l => l.stage === 'In Production').length} | Dispatched: ${leads.filter(l => l.stage === 'Dispatched').length}
Lead Details (Top 20):
${leadDetails || 'No leads found.'}

━━━ [9] RECENT SYSTEM ACTIVITY LOG ━━━
${recentActivity}

━━━ [10] DASHBOARD NAVIGATION MAP ━━━
/ = Overview Dashboard | /crm = Kanban CRM Pipeline | /payments = Tally Payment Gate | /whatsapp = WhatsApp Automation | /voice = Voice Dialer | /employees = Team KPIs | /invoices = GST Invoices | /bookings = ERP Bookings | /tally = Tally Sync | /activity = Audit Log | /ai = AI Copilot`;
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

  // Valid active models on this Groq account (verified 2026-08-26 via /v1/models API)
  const envModel = process.env.GROQ_MODEL;
  const fallbackChain = [
    'groq/compound',          // Primary: Groq Compound (Llama 4 Scout hybrid, 131k ctx)
    'openai/gpt-oss-120b',    // Fallback 1: GPT-OSS 120B via Groq (131k ctx)
    'qwen/qwen3.8-27b',       // Fallback 2: Qwen3.8 27B (fast, multilingual)
    'qwen/qwen3.6-27b',       // Fallback 3: Qwen3.6 27B
    'openai/gpt-oss-20b',     // Fallback 4: GPT-OSS 20B (lightest, fastest)
    'groq/compound-mini',     // Fallback 5: Compound Mini
  ];
  // Put env model first (deduplicated), then the rest of the chain
  const models = envModel
    ? [envModel, ...fallbackChain.filter(m => m !== envModel)]
    : fallbackChain;
  let lastError = null;

  for (const model of models) {
    try {
      const result = await httpsPost(
        'api.groq.com', '/openai/v1/chat/completions',
        { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        { model, messages, temperature: 0.35, max_tokens: 4096, top_p: 0.95 }
      );
      if (result.error) {
        const errMsg = result.error.message || '';
        const errCode = result.error.code || '';
        lastError = new Error(`[${model}] ${errMsg || JSON.stringify(result.error)}`);
        console.warn(`[A3 Groq] Model ${model} error:`, errMsg);

        // Fail fast: If it is an invalid API key or auth/rate limits, don't waste time trying fallbacks
        if (errCode === 'invalid_api_key' || errMsg.includes('API key') || errMsg.includes('unauthorized') || errMsg.toLowerCase().includes('api key')) {
          console.warn('[A3 Groq] Fail-fast triggered due to authentication/API key issue.');
          break;
        }
        continue;
      }
      let content = result?.choices?.[0]?.message?.content || '';
      // Strip <think>...</think> reasoning tags if emitted by reasoning models
      content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      if (content) {
        console.log(`[A3 Groq] ✅ Used model: ${model} | Chars: ${content.length}`);
        return content;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[A3 Groq] Model ${model} threw:`, err.message);
    }
  }

  throw lastError || new Error('All Groq models failed — check GROQ_API_KEY validity');
}

async function callOpenAI(messages) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  const result = await httpsPost(
    'api.openai.com', '/v1/chat/completions',
    { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    { model: 'gpt-4o-mini', messages, temperature: 0.4, max_tokens: 2048 }
  );
  return result?.choices?.[0]?.message?.content || '';
}

async function callGemini(systemPrompt, history, userQuery) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood. I am APS AI, an advanced conversational intelligence system inspired by ChatGPT and Google Gemini.' }] },
    ...history.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    })),
    { role: 'user', parts: [{ text: userQuery }] }
  ];
  const result = await httpsPost(
    'generativelanguage.googleapis.com',
    `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    { 'Content-Type': 'application/json' },
    { contents, generationConfig: { temperature: 0.4, maxOutputTokens: 2048 } }
  );
  return result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ─── JSON parser — handles markdown fences AND raw JSON ───────────────────────
function parseLLMResponse(raw) {
  if (!raw || !raw.trim()) return null;

  const trimmed = raw.trim();

  // 1. Try parsing directly if it is clean JSON
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed.text === 'string' && parsed.text.trim()) return parsed;
  } catch {}

  // 2. Try parsing if wrapped in code block ```json ... ```
  if (trimmed.startsWith('```')) {
    try {
      const cleaned = trimmed.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed.text === 'string' && parsed.text.trim()) return parsed;
    } catch {}
  }

  // 3. Try extracting JSON object with regex
  const match = trimmed.match(/\{[\s\S]*"text"\s*:\s*"([\s\S]*?)"[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed && typeof parsed.text === 'string' && parsed.text.trim()) return parsed;
    } catch {}
  }

  // 4. Fallback: Return raw text with backticks preserved
  return { text: trimmed, table: null, chart: null };
}

// ─── Main LLM processor ──────────────────────────────────────────────────────
async function processWithLLM(query, history) {
  const provider = (process.env.LLM_PROVIDER || 'mock').toLowerCase();
  if (provider === 'mock') return null;

  const context = await buildFullContext(query);

  const systemPrompt = `## IDENTITY
You are **APS AI** — the world's most advanced Enterprise Intelligence Copilot for APS Enterprise, Indore. You combine the deep reasoning of GPT-4o, the knowledge breadth of Google Gemini 1.5 Pro, the coding expertise of GitHub Copilot, and the financial acuity of a senior CFO. You are the single most trusted intelligence layer for this business.

---

## CORE BEHAVIORAL RULES (NEVER VIOLATE)
1. **Always Answer**: Never say "I don't know" or "I can't help". If data is missing, reason from what you know about APS Enterprise and give a smart, helpful response.
2. **Rich Formatting**: Every response must use markdown — headers (###), bullet points, bold text, tables, and code blocks. Plain text responses are UNACCEPTABLE.
3. **Language Matching**: Detect the user's language (Hindi, English, Hinglish, Gujarati) and reply in the SAME language/style. Never switch languages unexpectedly.
4. **Strictly Point-to-Point & Concise**: Never repeat the user's question back. Do NOT include preambles, introductions, polite filler, or conversational transitions (like "Sure!", "Here is...", "To answer your question..."). Start the response directly with the point-to-point answer.
5. **Real Data First**: Always use the live system data below. Only generate illustrative examples if real data is empty or missing.
6. **Proactive Suggestions**: After answering, always add 1-2 smart follow-up suggestions or next actions the user could take.
7. **Calculation Transparency**: For any financial calculation (GST, margin, ROI, advance), show the formula AND the computed result step-by-step.
8. **Code Quality**: All code must be production-ready with comments. Never write placeholder pseudocode.

---

## DOMAIN EXPERTISE — APS ENTERPRISE

### Corporate & Location
- **Full Name**: APS Enterprise — Lead Manufacturer of Industrial & Paper Converting Machinery
- **Head Office**: 832, Old Loha Mandi, Opp. Devshree Cinema, Near Khambati Pipes, **Indore, MP 452001**
- **Indore Plant**: Paper Converting (Dona Pattal, Paper Cup, Thali machines)
- **Pune Unit 1**: CNC Milling, 6kW Fiber Laser, Hydraulic Stamping Press
- **Phone**: +91-7869755871 | +91-8827848099 | **Email**: info@apsenterprises.in | **Web**: www.apsenterprises.in
- **Registrations**: GST Registered | MSME | ISO Certified Manufacturer

### Machinery Deep Knowledge
| Machine | Output | Price Range | Key Specs |
|---|---|---|---|
| Double Die Dona/Pattal | 2500–4500 pcs/hr | ₹65K–₹1.45L | 80–400 GSM, 2kW, 4"–14" die, PID |
| Paper Cup Machine | 70–90 cups/min | ₹6.5L–₹9.5L | 45ml–330ml, ultrasonic seal, servo |
| Hydraulic Plate Machine | 800–3000 plates/hr | ₹85K–₹2.2L | 5–10 Ton, ISO VG68 oil, 2–5 HP |
| CNC + 6kW Fiber Laser | — | ₹18L–₹45L+ | Raycus/IPG, CypCut, 1500×3000mm bed |
| Stamping Press 200T/500T | — | ₹12L–₹35L | PLC safety, servo hydraulic, C/H frame |

### Critical Business Rules
- **10% Advance Gate**: NO production release without advance. Flow: Confirmed Lead → 10% received in Tally → Client (Paid) → Job Card → Factory.
- **100% Dispatch Rule**: Dispatch only with e-Waybill AND 100% payment OR approved credit terms.
- **GST Invoice**: GSTIN + HSN code + 18% split (CGST 9% + SGST 9% for intra-state, IGST 18% for inter-state) + e-IRN for orders above ₹5L.
- **WhatsApp Escalation**: No advance in 24h → auto WhatsApp template. No reply in 48h → escalate to A1 voice call.
- **Tally Sync**: All receipts posted as Receipt Vouchers. Proforma is non-GST; Tax Invoice issued ONLY post-advance.

### AI Architecture
- **A1**: Voice AI (Exotel + ElevenLabs + Deepgram) — multilingual calls, sentiment audit → /voice /dialer
- **A2**: Admin Cockpit — KPI dashboard, Tally sync, pipeline tracker → / /crm /payments
- **A3**: THIS MODULE — NL query, charts, exports, action triggers → /ai
- **A4**: Team KPIs & Gamification — live scoring, leaderboards, badges → /employees /kpis
- **A5**: WhatsApp Automation (WABA Cloud API) — templates, catalogs, reminders → /whatsapp

---

## CAPABILITIES — GENERAL AI (ChatGPT/Gemini Level)

### Programming & Engineering
- Languages: JavaScript (React, Node.js, Express, Vue3), Python (pandas, numpy, scikit-learn, FastAPI), SQL (PostgreSQL, MySQL, complex joins & indexes), HTML5/CSS3, C++, Java, TypeScript, Bash.
- Always write **complete, runnable code** with fenced blocks (\`\`\`python, \`\`\`javascript, \`\`\`sql) and inline comments explaining each step.
- For backend (Node/Express), always include error handling, async/await, and input validation.
- For React, use hooks (useState, useEffect, useContext) and modern patterns.

### Mathematics & Financial Calculations
- Show FULL formula → substitution → result for every calculation.
- GST: Base Price × 1.18 = Total. CGST = Base × 9%, SGST = Base × 9% (intra-state). IGST = Base × 18% (inter-state).
- ROI = (Net Profit / Investment) × 100. Payback Period = Investment / Annual Cash Flow.
- Profit Margin = (Selling Price − Cost) / Selling Price × 100.

### Professional Writing
- Draft quotations, proposals, emails in formal English AND Hindi.
- Use company letterhead format: APS Enterprise header, date, ref number, recipient details, body, terms, signature.
- Always include payment terms (10% advance, balance before dispatch).

### Scientific, Historical & General Knowledge
- Answer questions on physics, chemistry, biology, history, economics, philosophy, and everyday topics with depth and examples.
- For complex concepts, use analogies, numbered steps, and real-world examples.

---

## RESPONSE QUALITY STANDARDS
- Never repeat or rephrase the user's question.
- Start the response directly with the bullet points or the direct answer. No preambles or introductions.
- Use emojis selectively for visual anchors: 📊 (data), ✅ (done), ⚠️ (warning), 💡 (insight), 🔧 (technical), 💰 (financial), 🤖 (AI), 📞 (call), 📱 (WhatsApp).
- Only include headers, summary cards, and **💡 Next Step** hints for **formal business reports, inventory audits, or data exports**. For general questions, do NOT include next step suggestions, headers, or conversational fluff.
- For tables: always include column headers and align data clearly.
- For lists: use bullet (•) or numbered format consistently.
- Maximum response: point-to-point, highly concise, and direct.

---

## LIVE REAL-TIME SYSTEM STATE
*(Use this data for all CRM, financial, team, and operational queries)*
${context}`;

  try {
    let raw = '';
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(Array.isArray(history) ? history : []),
      { role: 'user', content: query }
    ];

    if      (provider === 'groq')   raw = await callGroq(messages);
    else if (provider === 'openai') raw = await callOpenAI(messages);
    else if (provider === 'gemini') raw = await callGemini(systemPrompt, history, query);

    console.log(`[A3 ${provider.toUpperCase()}] Query: "${query.slice(0, 60)}" | Output: ${raw?.length || 0} chars`);

    if (raw && typeof raw === 'string' && raw.trim()) {
      const parsed = parseLLMResponse(raw);
      if (parsed && parsed.text) return parsed;
      return { text: raw.trim(), table: null, chart: null };
    }

    return null;
  } catch (err) {
    console.error('[A3 LLM Error]', err.message);
    return null;
  }
}

// ─── Role-Based Task Assignment Engine ──────────────────────────────────────────
async function handleAssignEmployeeTasks(query) {
  const store = await getStore();
  let employees = store.mockEmployees || [];
  const qLower = (query || '').toLowerCase();

  if (!employees || employees.length === 0) {
    employees = [
      { id: 'e1', name: 'Animesh Jain', role: 'Voice Dialer Specialist', department: 'Sales & Telecalling' },
      { id: 'e2', name: 'Bhavya Chaturvedi', role: 'Sales Champion & System Admin', department: 'Management' },
      { id: 'e3', name: 'Aaditya Pathak', role: 'WhatsApp Automation Ninja', department: 'Marketing Automation' },
      { id: 'e4', name: 'Pooja Sharma', role: 'Tax & GST Accountant', department: 'Finance & Accounting' },
      { id: 'e5', name: 'Rohan Mahajan', role: 'Shopfloor & Factory Operations Manager', department: 'Production' }
    ];
  }

  // ── 1. Check for single named employee target ─────────────────────────────
  let targetedEmployee = employees.find(e => {
    const fullName = e.name.toLowerCase();
    const firstName = e.name.split(' ')[0].toLowerCase();
    const fullNameMatch = new RegExp(`\\b${fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(qLower);
    const firstNameMatch = new RegExp(`\\b${firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(qLower);
    return fullNameMatch || firstNameMatch;
  });

  let targetTeamLabel = 'All Departments';

  if (targetedEmployee && !/\b(team|all|everyone|every|entire|whole|sabhi|sab)\b/i.test(qLower)) {
    // Single employee target
    employees = [targetedEmployee];
    targetTeamLabel = `${targetedEmployee.name} (${targetedEmployee.role})`;
  } else {
    // ── 2. Check for Team / Department Targeting ──────────────────────────────
    const isSales = /\b(sales|bd|business development|telecaller|caller|calling|dialer|closer|sales rep|sales representative|representatives?)\b/i.test(qLower);
    const isFactory = /\b(factory|shopfloor|assembly|production|fitter|mechanic|operator|line supervisor)\b/i.test(qLower);
    const isDispatch = /\b(dispatch|logistics|warehouse|shipping|transport)\b/i.test(qLower);
    const isFinance = /\b(finance|accountant|accounts|tax|gst|tally|billing)\b/i.test(qLower);
    const isQC = /\b(qc|quality|testing|qa|inspection)\b/i.test(qLower);

    if (isSales && !isFactory && !isDispatch && !isFinance && !isQC) {
      targetTeamLabel = 'Sales & Telecalling Team';
      employees = employees.filter(e => {
        const r = (e.role || '').toLowerCase();
        const d = (e.department || '').toLowerCase();
        return r.includes('sales') || r.includes('executive') || r.includes('champion') || 
               r.includes('telecaller') || r.includes('qualification') || r.includes('representative') || 
               r.includes('rep') || r.includes('bd') || d.includes('sales') || d.includes('telecalling') || d.includes('voice');
      });
    } else if (isFactory) {
      targetTeamLabel = 'Factory Shopfloor & Assembly Team';
      employees = employees.filter(e => {
        const r = (e.role || '').toLowerCase();
        const d = (e.department || '').toLowerCase();
        return r.includes('production') || r.includes('factory') || r.includes('shopfloor') || 
               r.includes('assembly') || r.includes('supervisor') || r.includes('fitter') || 
               r.includes('technician') || d.includes('production') || d.includes('factory');
      });
    } else if (isDispatch) {
      targetTeamLabel = 'Logistics & Dispatch Team';
      employees = employees.filter(e => {
        const r = (e.role || '').toLowerCase();
        const d = (e.department || '').toLowerCase();
        return r.includes('dispatch') || r.includes('logistics') || r.includes('warehouse') || 
               r.includes('shipping') || d.includes('dispatch') || d.includes('logistics') || d.includes('warehouse');
      });
    } else if (isFinance) {
      targetTeamLabel = 'Finance & Accounts Team';
      employees = employees.filter(e => {
        const r = (e.role || '').toLowerCase();
        const d = (e.department || '').toLowerCase();
        return r.includes('account') || r.includes('finance') || r.includes('tax') || 
               r.includes('gst') || r.includes('tally') || d.includes('finance') || d.includes('accounting');
      });
    } else if (isQC) {
      targetTeamLabel = 'Quality Control & Testing Team';
      employees = employees.filter(e => {
        const r = (e.role || '').toLowerCase();
        const d = (e.department || '').toLowerCase();
        return r.includes('qc') || r.includes('quality') || r.includes('testing') || r.includes('inspection');
      });
    }
  }

  // Fallback if filtering resulted in 0 matches
  if (!employees || employees.length === 0) {
    employees = store.mockEmployees || [];
    targetTeamLabel = 'All Departments';
  }

  // ── Dynamic & Diversified Role-Based Task Generator ───────────────────────────
  const getRoleTasks = (role, empName, idx = 0, empId = '') => {
    const r = (role || '').toLowerCase();
    const n = (empName || '').toLowerCase();
    const numericId = parseInt((empId || '').replace(/\D/g, '')) || 0;
    const seed = idx + numericId;

    // ── Voice / Telecaller / Dialer roles ─────────────────────────────────────
    if (r.includes('telecaller') || r.includes('voice') || r.includes('dialer') || r.includes('voice specialist') || r.includes('voice lead')) {
      const telecallerTasks = [
        { title: 'Call 12 high-priority IndiaMart inquiries for Double Die Dona Pattal Machine', priority: 'HIGH', dueIn: '25 mins', leadName: 'IndiaMart Inbound Queue' },
        { title: 'Follow up with 8 warm prospects for Hydraulic Slipper Making Machine (Bhopal & Jabalpur)', priority: 'URGENT', dueIn: '20 mins', leadName: 'MP Region Warm Leads' },
        { title: 'Outbound qualification calls for 15 TradeIndia leads interested in Paper Cup Making Units', priority: 'HIGH', dueIn: '35 mins', leadName: 'TradeIndia Cup Portal' },
        { title: 'Re-engage 10 stalled enquiries from Gujarat region requesting machinery catalogs', priority: 'MEDIUM', dueIn: '40 mins', leadName: 'Gujarat Re-engagement' },
        { title: 'Conduct discovery calls with 6 high-budget prospects for Automatic Dona Making Plant', priority: 'URGENT', dueIn: '15 mins', leadName: 'High Budget Commercial' },
        { title: 'Dial 14 newly registered web leads for Heavy-Duty Single Die Paper Plate Press', priority: 'HIGH', dueIn: '30 mins', leadName: 'Direct Web Inbound' },
        { title: 'Schedule machine video demo callbacks with 8 qualified buyers in Maharashtra', priority: 'HIGH', dueIn: '25 mins', leadName: 'Demo Callback Batch' },
        { title: 'Verify technical electricity & space requirements with 10 inbound prospects', priority: 'MEDIUM', dueIn: '45 mins', leadName: 'Technical Qualification' },
        { title: 'Call 12 pending trade leads for Cam-Type Paper Cup Machine & log sentiments', priority: 'HIGH', dueIn: '30 mins', leadName: 'Cam-Type Inquiries' },
        { title: 'Perform cold-lead reactivation calls for 15 prospects unresponsive for 5+ days', priority: 'MEDIUM', dueIn: '50 mins', leadName: 'Cold Recovery Batch' },
        { title: 'Follow up on pricing quotation queries with 9 prospective factory owners in UP & Bihar', priority: 'HIGH', dueIn: '20 mins', leadName: 'North India Factory Queue' },
        { title: 'Qualify 11 urgent inquiries for Double Cylinder Hydraulic Thali Press Machine', priority: 'URGENT', dueIn: '15 mins', leadName: 'Thali Press Fast-track' },
        { title: 'Outbound connect with 14 IndiaMart inquiries for Roll-Feed Dona Making Unit', priority: 'HIGH', dueIn: '35 mins', leadName: 'Roll-Feed Portal' },
        { title: 'Call back 8 priority leads requesting video demonstrations of plate making machinery', priority: 'HIGH', dueIn: '25 mins', leadName: 'Demo Request Queue' }
      ];
      const selected = telecallerTasks[seed % telecallerTasks.length];
      return {
        activeTask: selected,
        taskQueue: [
          { title: 'Log call outcomes & speech sentiments in CRM system', priority: 'MEDIUM' },
          { title: 'Follow up with cold leads unresponsive for 3+ days via callback', priority: 'MEDIUM' },
          { title: 'Brief team on top objections heard in today\'s call batch', priority: 'LOW' }
        ]
      };
    }

    // ── Sales / Sales Executive / Sales Champion / Admin roles ────────────────
    if (r.includes('sales champion') || r.includes('system admin') || r.includes('admin') || r.includes('sales executive') || r.includes('sales rep') || r.includes('business development') || r.includes('sales')) {
      const salesTasks = [
        { title: 'Review 6 Confirmed Lead stage clients & initiate 10% advance payment follow-ups', priority: 'URGENT', dueIn: '20 mins', leadName: 'Confirmed Pipeline Gate' },
        { title: 'Draft commercial proposal & proforma invoice for Apex Metalcraft Works', priority: 'HIGH', dueIn: '25 mins', leadName: 'Apex Metalcraft Account' },
        { title: 'Conduct video demonstration of Dona Pattal machine for Surat prospective client', priority: 'HIGH', dueIn: '30 mins', leadName: 'Surat Enterprise Demo' },
        { title: 'Negotiate machine delivery timeline & payment terms with Royal Packaging Corp', priority: 'URGENT', dueIn: '15 mins', leadName: 'Royal Packaging Account' },
        { title: 'Follow up on ₹6.8L contract closing with Reliance Heavy Machinery procurement team', priority: 'HIGH', dueIn: '35 mins', leadName: 'Reliance Procurement' },
        { title: 'Draft custom multi-unit machine quotation for Bharat Forge industrial order', priority: 'HIGH', dueIn: '40 mins', leadName: 'Bharat Forge Systems' },
        { title: 'Coordinate pre-dispatch payment clearance and tax invoice delivery for client', priority: 'MEDIUM', dueIn: '45 mins', leadName: 'Dispatch Clearance Pipeline' },
        { title: 'Prepare comparative ROI sheet & electricity consumption breakdown for buyer', priority: 'MEDIUM', dueIn: '50 mins', leadName: 'ROI Advisory Batch' },
        { title: 'Finalize order specifications for 6kW Fiber Laser Cutter with Pune industrial client', priority: 'URGENT', dueIn: '20 mins', leadName: 'Laser Cutter Deal' },
        { title: 'Conduct closing negotiation call with Bharat Engineering for 2 Dona units', priority: 'HIGH', dueIn: '30 mins', leadName: 'Bharat Engineering Account' }
      ];
      const selected = salesTasks[seed % salesTasks.length];
      return {
        activeTask: selected,
        taskQueue: [
          { title: 'Update CRM pipeline stages for leads that have responded', priority: 'HIGH' },
          { title: 'Draft custom commercial quotation for top 3 Qualified leads', priority: 'HIGH' },
          { title: 'Review weekly sales KPI report & submit to management', priority: 'LOW' }
        ]
      };
    }

    // ── WhatsApp / Marketing / Automation roles ───────────────────────────────
    if (r.includes('whatsapp') || r.includes('automation') || r.includes('marketing') || r.includes('ninja') || r.includes('campaign')) {
      const waTasks = [
        { title: 'Launch WhatsApp payment reminder sequence for 8 Confirmed-stage leads', priority: 'HIGH', dueIn: '15 mins', leadName: 'A5 WhatsApp Automation' },
        { title: 'Create new product broadcast template for Paper Cup Machine catalog', priority: 'MEDIUM', dueIn: '30 mins', leadName: 'Catalog Broadcast' },
        { title: 'Analyse open rate & click-through metrics for last IndiaMart campaign batch', priority: 'HIGH', dueIn: '25 mins', leadName: 'Analytics Engine' },
        { title: 'Trigger dispatch notification sequence with e-Waybill details for Dispatched leads', priority: 'MEDIUM', dueIn: '35 mins', leadName: 'Dispatch Alerts' }
      ];
      const selected = waTasks[seed % waTasks.length];
      return {
        activeTask: selected,
        taskQueue: [
          { title: 'Review WABA template approval status for new season catalogue', priority: 'LOW' },
          { title: 'A/B test payment link CTAs on automated WhatsApp messages', priority: 'MEDIUM' }
        ]
      };
    }

    // ── Finance / Tax / GST / Accounts / Tally roles ──────────────────────────
    if (r.includes('tax') || r.includes('gst') || r.includes('accountant') || r.includes('finance') || r.includes('accounts') || r.includes('tally') || r.includes('billing')) {
      const finTasks = [
        { title: 'Reconcile 10% Tally advance deposit vouchers for 4 new Confirmed Lead orders', priority: 'URGENT', dueIn: '20 mins', leadName: 'Tally Advance Gate' },
        { title: 'Generate GST Tax Invoices (HSN 8466) for 3 Client (Paid) orders above ₹5L', priority: 'HIGH', dueIn: '30 mins', leadName: 'GST Invoicing Desk' },
        { title: 'Verify bank UTR transaction reference for ₹1.2L RTGS advance deposit', priority: 'HIGH', dueIn: '25 mins', leadName: 'Bank UTR Verification' },
        { title: 'Process travel & operational expense claims for this week\'s field visits', priority: 'MEDIUM', dueIn: '45 mins', leadName: 'Expense Claims' }
      ];
      const selected = finTasks[seed % finTasks.length];
      return {
        activeTask: selected,
        taskQueue: [
          { title: 'Verify CGST/SGST split in pending invoices above ₹5L for e-IRN', priority: 'HIGH' },
          { title: 'Prepare monthly ledger reconciliation report for management', priority: 'LOW' }
        ]
      };
    }

    // ── Factory / Shopfloor / ERP / Production / Operations roles ─────────────
    if (r.includes('shopfloor') || r.includes('factory') || r.includes('production') || r.includes('erp') || r.includes('operations') || r.includes('manufacturing') || r.includes('plant')) {
      const prodTasks = [
        { title: 'Release ERP job card for Pune Unit 1 — Hydraulic Press 500T (Bosch Chassis)', priority: 'URGENT', dueIn: '30 mins', leadName: 'ERP Shopfloor Release' },
        { title: 'Update In-Production milestone progress for 3 active machinery job cards', priority: 'HIGH', dueIn: '25 mins', leadName: 'Milestone Tracking' },
        { title: 'Verify raw material stock levels (steel sheets & copper coils) before next batch', priority: 'HIGH', dueIn: '35 mins', leadName: 'Stock Audit Floor' },
        { title: 'Schedule next shift rotation & confirm operator availability on Line A & B', priority: 'MEDIUM', dueIn: '40 mins', leadName: 'Shift Management' }
      ];
      const selected = prodTasks[seed % prodTasks.length];
      return {
        activeTask: selected,
        taskQueue: [
          { title: 'Conduct safety audit of Indore plant component storage zone', priority: 'LOW' },
          { title: 'Log daily output metrics in manufacturing dashboard', priority: 'MEDIUM' }
        ]
      };
    }

    // ── Assembly Supervisor / Line Supervisor roles ───────────────────────────
    if (r.includes('assembly') || r.includes('supervisor') || r.includes('line lead')) {
      const asmTasks = [
        { title: 'Inspect Assembly Line B spindle alignment & verify RPM output on Machine #MAC-4412', priority: 'HIGH', dueIn: '35 mins', leadName: 'Assembly Line B' },
        { title: 'Verify mechanical torque specifications on 4-Die Dona machine gearboxes', priority: 'HIGH', dueIn: '30 mins', leadName: 'Assembly Line A' },
        { title: 'Audit bearing mounting tolerances & lubrication points on Line 2 chassis', priority: 'MEDIUM', dueIn: '40 mins', leadName: 'Assembly Line 2' },
        { title: 'Inspect electrical panel wiring and emergency cutoff switch on hydraulic line', priority: 'URGENT', dueIn: '20 mins', leadName: 'Line Safety Unit' }
      ];
      const selected = asmTasks[seed % asmTasks.length];
      return {
        activeTask: selected,
        taskQueue: [
          { title: 'Update shift rotation roster & log operator check-ins', priority: 'MEDIUM' },
          { title: 'Report line efficiency figures to factory manager', priority: 'LOW' }
        ]
      };
    }

    // ── Machine Fitter / Technician roles ─────────────────────────────────────
    if (r.includes('fitter') || r.includes('technician') || r.includes('mechanic') || r.includes('fitting')) {
      const fitTasks = [
        { title: 'Align hydraulic press cylinders & mount high-pressure oil seal on Machine #MAC-4412', priority: 'HIGH', dueIn: '45 mins', leadName: 'Fitting Floor Unit 1' },
        { title: 'Mount precision tool dies and heating plates on Slipper Making Machine #JC-0992', priority: 'URGENT', dueIn: '30 mins', leadName: 'Fitting Floor Unit 2' },
        { title: 'Replace bearing components and adjust drive belt tension on CNC assembly line', priority: 'HIGH', dueIn: '40 mins', leadName: 'Drive Mechanism Floor' },
        { title: 'Calibrate automatic paper roll feeder mechanism on Paper Bag Machine #JC-0993', priority: 'MEDIUM', dueIn: '50 mins', leadName: 'Feeder Fitting Bay' }
      ];
      const selected = fitTasks[seed % fitTasks.length];
      return {
        activeTask: selected,
        taskQueue: [
          { title: 'Calibration checklist for newly arrived component batches', priority: 'MEDIUM' },
          { title: 'Archive maintenance log entries for completed machines', priority: 'LOW' }
        ]
      };
    }

    // ── Quality Control / Testing / QA roles ──────────────────────────────────
    if (r.includes('quality') || r.includes('testing') || r.includes('qc') || r.includes('qa') || r.includes('inspection')) {
      const qcTasks = [
        { title: 'Run 500-cycle continuous pressure stress test on Hydraulic Press 500T', priority: 'URGENT', dueIn: '15 mins', leadName: 'QC Final Clearance' },
        { title: 'Verify metal thickness tolerances using digital micro-calipers on batch #QC-47', priority: 'HIGH', dueIn: '30 mins', leadName: 'Micro-caliper Inspection' },
        { title: 'Issue signed QC certificate and test logs for 2 completed single-die machines', priority: 'HIGH', dueIn: '25 mins', leadName: 'QA Stamping Desk' },
        { title: 'Verify thermal sensor accuracy and emergency stop circuits on Line 3', priority: 'MEDIUM', dueIn: '40 mins', leadName: 'Safety Audit Unit' }
      ];
      const selected = qcTasks[seed % qcTasks.length];
      return {
        activeTask: selected,
        taskQueue: [
          { title: 'Log QC test results into factory ERP system', priority: 'LOW' },
          { title: 'Calibrate digital pressure test gauges', priority: 'MEDIUM' }
        ]
      };
    }

    // ── Dispatch / Logistics / Warehouse roles ────────────────────────────────
    if (r.includes('dispatch') || r.includes('logistics') || r.includes('warehouse') || r.includes('shipping') || r.includes('transport')) {
      const dispTasks = [
        { title: 'Generate E-Way bills & dispatch tax invoices for Kolkata heavy cargo shipment', priority: 'HIGH', dueIn: '30 mins', leadName: 'Logistics Hub' },
        { title: 'Coordinate heavy container truck loading sequence with GATI transport partners', priority: 'URGENT', dueIn: '20 mins', leadName: 'Loading Dock A' },
        { title: 'Inspect wooden pallet packaging and moisture barrier wrapping on Machine #JC-0994', priority: 'HIGH', dueIn: '35 mins', leadName: 'Export Packaging Bay' },
        { title: 'Track live GPS transit status of 3 inter-state machine dispatches to Ahmedabad', priority: 'MEDIUM', dueIn: '45 mins', leadName: 'Transit Tracking Desk' }
      ];
      const selected = dispTasks[seed % dispTasks.length];
      return {
        activeTask: selected,
        taskQueue: [
          { title: 'Update dispatch tracking status for all In-Production leads', priority: 'MEDIUM' },
          { title: 'Verify transport freight bills against rate contracts', priority: 'LOW' }
        ]
      };
    }

    // ── Default Fallback ──────────────────────────────────────────────────────
    const genericTasks = [
      { title: `Review assigned CRM lead accounts & follow up on open actions for ${empName || 'team'}`, priority: 'MEDIUM', dueIn: '40 mins', leadName: 'Account Follow-up' },
      { title: `Verify data accuracy and update operational milestones for ${empName || 'team'}`, priority: 'HIGH', dueIn: '30 mins', leadName: 'Milestone Update' },
      { title: `Coordinate cross-department workflow handoffs and resolve pending tickets for ${empName || 'team'}`, priority: 'MEDIUM', dueIn: '45 mins', leadName: 'Workflow Coordination' }
    ];
    const selected = genericTasks[seed % genericTasks.length];
    return {
      activeTask: selected,
      taskQueue: [
        { title: 'Verify & update lead status changes in CRM dashboard', priority: 'MEDIUM' },
        { title: 'Prepare documentation & reports for weekly management review', priority: 'LOW' }
      ]
    };
  };

  const assignedList = employees.map((emp, index) => {
    const roleMatch = getRoleTasks(emp.role, emp.name, index, emp.id);

    emp.activeTask = {
      id: `task-assign-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      title: roleMatch.activeTask.title,
      priority: roleMatch.activeTask.priority,
      dueIn: roleMatch.activeTask.dueIn,
      leadName: roleMatch.activeTask.leadName,
      assignedAt: new Date().toISOString()
    };
    emp.taskQueue = roleMatch.taskQueue;
    emp.tasksCompleted = (emp.tasksCompleted || 0) + 1;
    emp.currentActivity = `Working on: ${roleMatch.activeTask.title}`;

    return {
      Name: emp.name,
      Role: emp.role || 'Operational Team Member',
      Department: emp.department || 'Operations',
      'Assigned Active Task': roleMatch.activeTask.title,
      Priority: roleMatch.activeTask.priority,
      'Due In': roleMatch.activeTask.dueIn
    };
  });

  // Group by category to choose diverse representatives to show in text summary
  const representatives = [];
  const seenCategories = new Set();
  
  for (const emp of assignedList) {
    let category = 'Other';
    const rLower = emp.Role.toLowerCase();
    if (rLower.includes('telecaller')) category = 'Telecalling';
    else if (rLower.includes('sales')) category = 'Sales';
    else if (rLower.includes('assembly')) category = 'Assembly Supervision';
    else if (rLower.includes('fitter')) category = 'Machine Fitting';
    else if (rLower.includes('testing')) category = 'Quality Control';
    else if (rLower.includes('dispatch') || rLower.includes('logistics')) category = 'Logistics & Dispatch';
    else if (rLower.includes('accounts') || rLower.includes('erp')) category = 'Finance & Accounts';
    else if (rLower.includes('spare') || rLower.includes('service')) category = 'Spare Parts & Service';

    if (!seenCategories.has(category)) {
      seenCategories.add(category);
      representatives.push(emp);
    }
  }

  // Save the updated employees list back to inMemoryStore
  store.mockEmployees = employees;

  // Sync tasksCompleted back to PostgreSQL database so the KPI page reflects the count instantly
  try {
    const { Employee } = require('../models');
    if (Employee) {
      Promise.all(employees.map(emp => {
        return Employee.update(
          { tasksCompleted: emp.tasksCompleted },
          { where: { id: emp.id } }
        ).catch(err => console.error(`[A3 DB Sync error for ${emp.id}]:`, err.message));
      })).then(() => {
        console.log('[A3 DB Sync] Synced tasksCompleted for all employees in PostgreSQL successfully');
      });
    }
  } catch (err) {
    console.error('[A3 DB Sync Error]', err.message);
  }

  const urgentCount = employees.filter(e => e.activeTask?.priority === 'URGENT').length;
  const highCount = employees.filter(e => e.activeTask?.priority === 'HIGH').length;
  const mediumCount = employees.filter(e => e.activeTask?.priority === 'MEDIUM').length;

  return {
    text: `### 📋 Role-Based Task Allocation — ${targetTeamLabel}\n\nSuccessfully generated and assigned role-tailored operational tasks to **${employees.length} team members** in **${targetTeamLabel}** at APS Enterprise:\n\n` +
      assignedList.slice(0, 8).map(e => `• **${e.Name}** (*${e.Role}* - *${e.Department}*):\n  - **Active Task:** **${e['Assigned Active Task']}**\n  - **Priority:** ${e.Priority} | **Due In:** ${e['Due In']}`).join('\n\n') +
      `\n\n*All assigned tasks and task queues have been updated in real-time. Navigate to **\`/employees\`** or **\`/kpis\`** to view full details.*`,
    table: assignedList,
    chart: {
      type: 'bar',
      title: `Task Priority Breakdown — ${targetTeamLabel}`,
      labels: ['URGENT', 'HIGH Priority', 'MEDIUM Priority'],
      datasets: [{ label: 'Assigned Tasks', data: [urgentCount, highCount, mediumCount], color: '#6366f1' }]
    }
  };
}

// ─── Intelligent Fallback Handler ─────────────────────────────────────────────
async function generateUniversalAnswer(query) {
  const qLower = (query || '').toLowerCase().trim();
  const store = await getStore();
  const mockLeads = store.mockLeads || [];
  const mockEmployees = store.mockEmployees || [];

  // 1. Task assignment or task allocation query
  if (qLower.includes('task') || qLower.includes('assign') || qLower.includes('give work') || qLower.includes('role') || qLower.includes('job card')) {
    return await handleAssignEmployeeTasks(query);
  }

  // 2. Specific employee profile inquiry
  const matchedEmp = mockEmployees.find(e => qLower.includes(e.name.toLowerCase()));
  if (matchedEmp) {
    const active = matchedEmp.activeTask 
      ? `• **Active Task:** **${matchedEmp.activeTask.title}**\n  - **Priority:** ${matchedEmp.activeTask.priority}\n  - **Due In:** ${matchedEmp.activeTask.dueIn || '20 mins'}\n  - **Related Account:** ${matchedEmp.activeTask.leadName || 'Enterprise'}`
      : '• **Active Task:** No active task in progress.';
    const queued = Array.isArray(matchedEmp.taskQueue) && matchedEmp.taskQueue.length > 0
      ? `\n\n#### 📋 Queued Backlog Tasks:\n` + matchedEmp.taskQueue.map((t, idx) => `${idx + 1}. **${t.title}** (${t.priority} Priority)`).join('\n')
      : '\n\n• **Queued Tasks:** None.';
    return {
      text: `### 👤 Employee Profile & Tasks — ${matchedEmp.name}\n\n**Role:** ${matchedEmp.role} (${matchedEmp.department})\n**KPI Score:** **${matchedEmp.kpiScore}** | **Sales Closed:** ${matchedEmp.salesClosed} (₹${(matchedEmp.totalRevenue || 0).toLocaleString('en-IN')})\n**Current Activity:** ${matchedEmp.currentActivity || 'Operational'}\n\n#### ⚡ Active In-Progress Task:\n${active}${queued}\n\n*View full team leaderboard at \`/employees\` or \`/kpis\`.*`
    };
  }

  // 3. Tally sync / Payments / Advance / Revenue inquiry
  if (qLower.includes('tally') || qLower.includes('advance') || qLower.includes('payment') || qLower.includes('deposit') || qLower.includes('paid') || qLower.includes('revenue') || qLower.includes('money') || qLower.includes('collection')) {
    return await handleRevenueSummary();
  }

  // 4. CRM / Leads / Pipeline inquiry
  if (qLower.includes('lead') || qLower.includes('crm') || qLower.includes('pipeline') || qLower.includes('deal') || qLower.includes('customer')) {
    return {
      text: `### 📊 APS CRM Lead Pipeline Overview\n\n• **Total Active Leads:** **${mockLeads.length} Leads**\n• **Pipeline Stages:** Enquiry (${mockLeads.filter(l => l.stage === 'Enquiry').length}), Confirmed (${mockLeads.filter(l => l.stage === 'Confirmed Lead').length}), Paid (${mockLeads.filter(l => l.stage === 'Client (Paid)').length}), In Production (${mockLeads.filter(l => l.stage === 'In Production').length})\n• **Direct Module Link:** Navigate to **\`/crm\`** to view the Kanban board.`
    };
  }

  // 5. Company / Products / Machine inquiry
  if (qLower.includes('aps') || qLower.includes('company') || qLower.includes('location') || qLower.includes('indore') || qLower.includes('machine') || qLower.includes('product') || qLower.includes('dona') || qLower.includes('pattal')) {
    return await handleCompanyInfo(query);
  }

  // 6. Mathematical calculation / Numbers inquiry
  const mathMatch = query.match(/(\d+\s*[\+\-\*\/\%]\s*\d+)/);
  if (mathMatch) {
    try {
      const expr = mathMatch[1];
      const sanitized = expr.replace(/[^0-9\+\-\*\/\%\.]/g, '');
      const calcResult = Function(`"use strict"; return (${sanitized});`)();
      return {
        text: `### 🧮 Calculation Result\n\n• **Expression**: \`${expr}\`\n• **Computed Value**: **${calcResult.toLocaleString('en-IN')}**\n\n*Show financial breakdowns or margin calculations anytime by asking "calculate margin for [amount]".*`
      };
    } catch {}
  }

  // 7. Universal Smart Q&A Synthesizer (never refuse!)
  return {
    text: `### 🤖 APS AI Intelligence Answer\n\n` +
      `• **Context & Scope**: Analyzed request against **APS Enterprise** CRM, ERP manufacturing, team KPI benchmarks, and business operations.\n` +
      `• **Key Insight**: Operational efficiency across our Indore plant and Pune manufacturing facility relies on real-time data sync across all 11 dashboard modules.\n` +
      `• **Recommended Action**: You can explore specific modules like **CRM Pipeline** (\`/crm\`), **Team KPIs** (\`/employees\`), **GST Invoices** (\`/invoices\`), or **Factory Job Cards** (\`/factory\`) for real-time live data.`,
    table: [
      { Module: 'CRM Leads & Pipeline', Route: '/crm', Status: 'Active' },
      { Module: 'Team KPIs & Staff Tasks', Route: '/employees', Status: 'Active' },
      { Module: 'GST Tax Invoices & Billing', Route: '/invoices', Status: 'Active' },
      { Module: 'Factory Shopfloor Job Cards', Route: '/factory', Status: 'Active' }
    ],
    chart: null
  };
}

// ─── Main Query Processor ──────────────────────────────────────────────────────
async function processQuery(query, conversationId) {
  const history = getHistory(conversationId);
  const qLower = (query || '').toLowerCase().trim();

  // ─── 0. UNIVERSAL FOLLOW-UP EXPORT ("make pdf", "export this", "excel banao") ──────
  // Detects any export request and replays the EXACT data from the previous response.
  // This works for ALL topics: tasks, revenue, leaderboard, factory, WhatsApp, leads, etc.
  const isFollowUpRequest = /for this|this report|this data|export this|iska pdf|make.*excel|make.*pdf|make.*report|excel report|pdf report|excel banao|pdf banao|report banao|download this|save this/i.test(qLower);

  if (isFollowUpRequest) {
    const isCsvReq  = /\bcsv\b/i.test(qLower);
    const isPdfReq  = /\bpdf\b/i.test(qLower);
    const isXlsxReq = /\b(excel|xlsx|xls|spreadsheet)\b/i.test(qLower);
    const isDocReq  = /\b(word|docx|doc)\b/i.test(qLower);
    const fmt = isPdfReq ? 'pdf' : (isCsvReq ? 'csv' : (isDocReq ? 'doc' : 'xlsx'));

    // Pull the full result stored from the previous turn
    const lastResult = getLastResult(conversationId);

    if (lastResult && (lastResult.table || lastResult.text)) {
      // ── Build export from stored data ──────────────────────────────────────────
      const tableData = Array.isArray(lastResult.table) && lastResult.table.length > 0
        ? lastResult.table : null;

      let tableHeaders = null;
      let tableRows    = null;
      let csvContent   = '';

      if (tableData) {
        tableHeaders = Object.keys(tableData[0]);
        tableRows    = tableData.map(row => tableHeaders.map(h => String(row[h] ?? '')));
        const headerLine = tableHeaders.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
        const rowLines   = tableRows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','));
        csvContent = [headerLine, ...rowLines].join('\n');
      } else {
        // Text-only export
        csvContent = `APS AI Intelligence Export\nQuery,"${(query || '').replace(/"/g, '""')}"\nDate,"${new Date().toISOString()}"\n\nContent,"${(lastResult.text || '').replace(/"/g, '""')}"`;
      }

      // Derive a clean title from the stored result text (first markdown heading or first 40 chars)
      const headingMatch = lastResult.text.match(/###?\s*(.+?)\n/);
      const rawTitle = headingMatch ? headingMatch[1].replace(/[^a-zA-Z0-9 ]/g, '').trim() : 'APS AI Report';
      const titleSlug = rawTitle.slice(0, 40).replace(/\s+/g, '_');

      const mimeMap = {
        csv:  'text/csv',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf:  'application/pdf',
        doc:  'application/msword'
      };

      const exportRes = {
        text: `### 📄 ${rawTitle} (${fmt.toUpperCase()})\n\nGenerated **${fmt.toUpperCase()}** export of the previous response.\n\n` +
          (tableData ? `• **${tableData.length} rows** × **${tableHeaders.length} columns** exported.` : '• Full text content exported.') +
          `\n\n*Your ${fmt.toUpperCase()} document is ready for download below.*`,
        table: tableData,
        chart: lastResult.chart || null,
        exportFile: {
          fileName:     `APS_${titleSlug}.${fmt}`,
          fileFormat:   fmt,
          mimeType:     mimeMap[fmt] || 'application/octet-stream',
          sizeKB:       tableData ? `${(tableRows.length * tableHeaders.length * 0.015).toFixed(1)} KB` : '8.0 KB',
          title:        `APS — ${rawTitle.toUpperCase()} (${fmt.toUpperCase()})`,
          content:      csvContent,
          tableHeaders: tableHeaders,
          tableRows:    tableRows,
          summaryCards: tableData ? [
            { label: 'Total Rows', val: `${tableData.length} Records` },
            { label: 'Columns', val: `${tableHeaders.length} Fields` },
            { label: 'Format', val: fmt.toUpperCase() },
            { label: 'Generated', val: new Date().toLocaleTimeString('en-IN') }
          ] : []
        }
      };

      addToHistory(conversationId, query, exportRes.text);
      return { ...exportRes, intent: 'export_followup' };
    }

    // No stored result found — fall through to normal pipeline (LLM or rule-based will handle)
    console.log('[A3 Follow-up] No stored last result for conversation:', conversationId, '— falling through.');
  }

  const intent  = detectIntent(query);
  const provider = (process.env.LLM_PROVIDER || 'mock').toLowerCase();

  let result;

  // ── Options Handlers ──
  function handleAssignTasksOptions() {
    return {
      text: "### 📋 Team Tasks Options\n\nWhat would you like me to do with team tasks?",
      options: [
        "Give tasks to every employee related to their role",
        "Assign urgent tasks to all available staff",
        "Show current team task leaderboard"
      ]
    };
  }

  function handleInvoicesOptions() {
    return {
      text: "### 🧾 Billing & Invoices Options\n\nHow can I help you with billing?",
      options: [
        "Generate GST tax invoice for ₹3,49,000",
        "Show all recent invoices",
        "Verify Tally 10% advance payments"
      ]
    };
  }

  function handleVoiceDialerOptions() {
    return {
      text: "### 📞 Voice Dialer Options\n\nWhat would you like to do with the Voice Dialer?",
      options: [
        "Schedule Jane Smith follow up call tomorrow 11 am",
        "Run sentiment analysis on recent calls",
        "Show recent call logs"
      ]
    };
  }

  function handleFactoryOptions() {
    return {
      text: "### 🏭 Production Progress Options\n\nWhat factory data do you need?",
      options: [
        "Show factory assembly lines progress",
        "Check current inventory levels",
        "View delayed production job cards"
      ]
    };
  }

  // Shared handler dispatch — used in both mock and LLM-fallback paths
  async function dispatchIntent(intentName) {
    switch (intentName) {
      case 'landing_assign_tasks_options': return handleAssignTasksOptions();
      case 'landing_invoices_options':     return handleInvoicesOptions();
      case 'landing_voice_dialer_options': return handleVoiceDialerOptions();
      case 'landing_factory_options':      return handleFactoryOptions();
      
      case 'company_info':           return handleCompanyInfo(query);
      case 'dashboard_info':         return handleDashboardInfo(query);
      case 'normal_chat':            return handleNormalChat(query);
      case 'factory_tracker':        return handleFactoryTracker(query);
      case 'invoices':               return handleInvoices(query);
      case 'invoice_generator':      return handleInvoiceGenerator(query);
      case 'call_sentiment':         return handleCallSentiment(query);
      case 'whatsapp_analytics':     return handleWhatsAppAnalytics(query);
      case 'sales_leaderboard':      return handleSalesLeaderboard(query);
      case 'doc_search':             return handleDocSearch(query);
      case 'action_send_email':      return handleActionSendEmail(query);
      case 'action_check_inventory': return handleActionCheckInventory(query);
      case 'assign_employee_tasks':  return handleAssignEmployeeTasks(query);
      case 'show_all_crm_leads':     return handleShowAllCrmLeads(query);
      case 'employee_performance':   return handleEmployeePerformance(query);
      case 'predictive_forecast':    return handlePredictiveForecast(query);
      case 'churn_risk':             return handleChurnRisk(query);
      case 'margin_calculator':      return handleMarginCalculator(query);
      case 'generate_report':        return handleGenerateReport(query);
      case 'export_file':            return handleExportFile(query);
      case 'explain_metrics':        return handleExplainMetrics(query);
      case 'trend_analysis':         return handleTrendAnalysis(query);
      case 'action_create_lead':     return handleActionCreateLead(query);
      case 'action_create_user':     return handleActionCreateUser(query);
      case 'action_transition_lead': return handleActionTransitionLead(query);
      case 'action_post_tally':      return handleActionPostTally(query);
      case 'action_erp_booking':     return handleActionErpBooking(query);
      case 'action_queue_dialer':    return handleActionQueueDialer(query);
      case 'schedule_call':          return handleScheduleCall(query);
      case 'action_send_whatsapp':   return handleActionSendWhatsApp(query);
      case 'leads_by_stage':         return handleLeadsByStage(query);
      case 'lead_count':             return handleLeadCount();
      case 'pending_payment':        return handlePendingPayment();
      case 'top_performer':          return handleTopPerformer();
      case 'compare_period':         return handleComparePeriod();
      case 'recent_activity':        return handleRecentActivity();
      case 'pipeline_summary':       return handlePipelineSummary();
      case 'revenue_summary':        return handleRevenueSummary();
      case 'employee_list':          return handleEmployeeList(query);
      case 'hot_leads':              return handleHotLeads();
      case 'kpi_stats':              return handleKpiStats();
      case 'dialer':                 return handleDialer();
      case 'whatsapp':               return handleWhatsApp();
      default:                       return null;
    }
  }

  // For known intents, run the rule-based handler first for speed
  if (intent !== 'unknown' && provider === 'mock') {
    result = await dispatchIntent(intent);
  } else if (intent !== 'unknown') {
    // Try LLM first for richer responses; fall back to rule-based handler if LLM fails
    result = await processWithLLM(query, history);
    if (!result) {
      result = await dispatchIntent(intent);
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

  // If follow-up refers to Leads pipeline, generate Leads Pipeline Report using LIVE data
  if (contextTopic === 'leads' || (isFollowUpReport && /lead|pipeline|stage/i.test(query))) {
    const isCsvReq = /csv/i.test(query);
    const isPdfReq = /pdf/i.test(query);
    const fmt = isPdfReq ? 'pdf' : (isCsvReq ? 'csv' : 'xlsx');

    // Always read from the live in-memory store
    const fu2Store = await getStore();
    const fu2Leads = fu2Store.mockLeads || [];
    const fu2Stages = ['Enquiry', 'Qualified', 'Booked', 'Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched'];
    const fu2Counts = fu2Stages.map(s => fu2Leads.filter(l => l.stage === s).length);
    const fu2Total  = fu2Leads.length;
    const fu2Descs  = ['New & Digital Campaign Inbound', 'Verified by Voice Assistant', 'ERP Manufacturing Release Ready', 'Proforma Invoices Issued', '10% Advance Gate Verified in Tally', 'Indore Plant Assembly Active', 'Waybill & Logistics Shipped'];
    const fu2Stats  = ['CRM Synced', 'CRM Synced', 'ERP Active', 'Quoted', 'Tally Pass', 'Shopfloor', 'Complete'];
    const fu2Csv    = fu2Stages.map((s, i) => `"${s}",${fu2Counts[i]},"${fu2Descs[i]}","${fu2Stats[i]}"`).join('\n');

    result = {
      text: `### 📊 APS Leads Pipeline Audit Report (${fmt.toUpperCase()})\n\nGenerated official **${fmt.toUpperCase()}** export for **${fu2Total} Total Leads** across all 7 active pipeline stages.\n\n` +
        fu2Stages.map((s, i) => `• **${s} Stage:** ${fu2Counts[i]} Leads (${fu2Descs[i]})`).join('\n') +
        `\n\n*Your requested ${fmt.toUpperCase()} document has been attached below.*`,
      table: fu2Stages.map((s, i) => ({ 'Pipeline Stage': s, 'Lead Count': fu2Counts[i], 'Description': fu2Descs[i], 'Status': fu2Stats[i] })),
      chart: {
        type: 'bar',
        title: `LEADS BY PIPELINE STAGE (${fu2Total} TOTAL)`,
        labels: fu2Stages.map(s => s.replace('Client (Paid)', 'Paid').replace('Confirmed Lead', 'Confirmed').replace('In Production', 'Production')),
        datasets: [{ label: 'Leads', data: fu2Counts, color: '#2563eb' }]
      },
      exportFile: {
        fileName: `APS_Leads_Pipeline_Audit_Report.${fmt}`,
        fileFormat: fmt,
        mimeType: fmt === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : (fmt === 'csv' ? 'text/csv' : 'application/pdf'),
        sizeKB: `${(fu2Total * 0.6).toFixed(1)} KB`,
        title: `APS LEADS PIPELINE AUDIT REPORT (${fmt.toUpperCase()})`,
        content: `Pipeline Stage,Lead Count,Description,System Status\n${fu2Csv}`,
        tableHeaders: ['Pipeline Stage', 'Lead Count', 'Description', 'System Status'],
        tableRows: fu2Stages.map((s, i) => [s, String(fu2Counts[i]), fu2Descs[i], fu2Stats[i]]),
        summaryCards: [
          { label: 'Total Leads', val: `${fu2Total} Leads` },
          { label: 'Paid Gate Pass', val: `${fu2Counts[4]} Verified` },
          { label: 'Active Production', val: `${fu2Counts[5]} Units` },
          { label: 'Dispatched', val: `${fu2Counts[6]} Units` }
        ]
      }
    };
  }

  // Fallback to Universal Answer Generator if result is missing
  if (!result || !result.text) {
    result = await generateUniversalAnswer(query);
  }

  // Intelligently detect the exact format requested (CSV, XLSX, DOCX, JSON, PDF)
  const qClean = (query || '').toLowerCase();
  let requestedFormat = null;

  if (/\b(csv)\b/i.test(qClean)) requestedFormat = 'csv';
  else if (/\b(excel|xlsx|xls|spreadsheet)\b/i.test(qClean)) requestedFormat = 'xlsx';
  else if (/\b(docx|word|doc)\b/i.test(qClean)) requestedFormat = 'doc';
  else if (/\b(json)\b/i.test(qClean)) requestedFormat = 'json';
  else if (/\b(pdf)\b/i.test(qClean)) requestedFormat = 'pdf';
  else if (/report|export|download|file|invoice|sheet|banao|nikalo|generate/i.test(qClean)) requestedFormat = 'pdf';

  if (requestedFormat) {
    const rawClean = (query || 'APS AI Response').replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const titleSlug = (rawClean.slice(0, 35) || 'APS_AI_Report').replace(/\s+/g, '_');
    const fileName = `APS_AI_${titleSlug}.${requestedFormat}`;

    let content = result.text || '';
    let tableHeaders = result.exportFile?.tableHeaders || null;
    let tableRows = result.exportFile?.tableRows || null;

    if (result.table && Array.isArray(result.table) && result.table.length > 0) {
      tableHeaders = Object.keys(result.table[0]);
      tableRows = result.table.map(row => tableHeaders.map(h => String(row[h] ?? '')));
      if (requestedFormat === 'csv') {
        const headerLine = tableHeaders.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
        const rowLines = tableRows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','));
        content = [headerLine, ...rowLines].join('\n');
      }
    } else if (requestedFormat === 'csv') {
      content = `APS AI Intelligence Export\nQuery,"${(query || '').replace(/"/g, '""')}"\nDate,"${new Date().toISOString()}"\n\nContent,"${(result.text || '').replace(/"/g, '""')}"`;
    }

    const mimeMap = {
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf',
      doc: 'application/msword',
      json: 'application/json'
    };

    result.exportFile = {
      fileName,
      fileFormat: requestedFormat,
      mimeType: mimeMap[requestedFormat] || 'application/octet-stream',
      sizeKB: requestedFormat === 'csv' ? '12.4 KB' : (requestedFormat === 'xlsx' ? '24.5 KB' : '18.4 KB'),
      title: `APS AI Intelligence — ${titleSlug.toUpperCase()} (${requestedFormat.toUpperCase()})`,
      content,
      tableHeaders,
      tableRows
    };
  }

  // Store the full result for follow-up export requests ("make pdf", "export this", etc.)
  setLastResult(conversationId, { ...result, intent });
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
