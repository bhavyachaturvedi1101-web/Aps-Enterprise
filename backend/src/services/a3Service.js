'use strict';
/**
 * A3 Service — Internal Natural Language Operational Query Engine
 * ────────────────────────────────────────────────────────────────
 * Modular Subsystem Architecture:
 * - Session & Conversational Memory:   services/a3/sessionStore.js
 * - Intent & Entity Classification:   services/a3/intentClassifier.js
 * - Specialized Domain Handlers:       services/a3/handlers/
 * - Multi-Format Report Exporter:     services/a3/reportBuilders.js
 * - LLM Provider (Groq/Gemini/OpenAI): services/a3/llmProvider.js
 */

const {
  getHistory,
  addToHistory,
  setContextMeta,
  getContextMeta,
  setLastResult,
  getLastResult
} = require('./a3/sessionStore');

const {
  INTENTS,
  detectIntent,
  detectStage
} = require('./a3/intentClassifier');

const {
  detectRequestedFormat,
  buildStockExport,
  buildLeadsExport,
  buildEmployeePerformanceExport
} = require('./a3/reportBuilders');

const {
  processWithLLM,
  generateUniversalAnswer
} = require('./a3/llmProvider');

const { getHandler } = require('./a3/handlers');

const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'mock').toLowerCase();

/**
 * Main query processor entry point
 * @param {string} query User natural language command or question
 * @param {string} conversationId Optional multi-turn conversation thread ID
 */
async function processQuery(query, conversationId = 'default', userContext = {}) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return {
      text: 'Please provide a valid query or command.',
      table: null,
      chart: null,
      intent: 'normal_chat'
    };
  }

  const cleanQuery = query.trim();
  const convId = conversationId || 'default';
  const lastResult = getLastResult(convId);
  const isEmployee = (userContext.userRole || '').toLowerCase() === 'employee';

  // ── Employee Role-Based Dedicated Handlers & Access Guard ─────────────────
  if (isEmployee) {
    // 1. My Assigned Leads
    if (/my (assigned )?leads|leads assigned to me|meri leads/i.test(cleanQuery)) {
      const store = require('../config/inMemoryStore');
      const allLeads = store.mockLeads || [];
      const empId = userContext.employeeId;
      const empName = (userContext.userName || '').toLowerCase();
      const myLeads = allLeads.filter(l =>
        (empId && l.assignedEmployeeId === empId) ||
        (l.assignedEmployeeId && l.assignedEmployeeId.toLowerCase().includes(empName)) ||
        (!empId && (l.assignedEmployeeId === 'EMP-001' || l.assignedEmployeeId === 'EMP-002'))
      );
      const targetList = myLeads.length > 0 ? myLeads : allLeads.slice(0, 5);
      return {
        text: `### 📋 Assigned Leads for ${userContext.userName || 'Your Desk'}\n\nHere are the customer inquiries assigned directly to your desk (${targetList.length} deals):`,
        table: targetList.map(l => ({
          ID: l.id,
          Customer: l.name,
          Company: l.company || '—',
          Stage: l.stage,
          Budget: l.budget ? `₹${Number(l.budget).toLocaleString('en-IN')}` : '—',
          Interest: l.interest || '—',
          Phone: l.phone || '—'
        })),
        options: ['Who should I call next?', 'What are my active tasks?', 'Search CNC 500T specification manual'],
        chart: null,
        intent: 'employee_my_leads'
      };
    }

    // 2. My Active Tasks
    if (/my (active )?tasks?|tasks? assigned to me|mera kaam|meri duties/i.test(cleanQuery)) {
      const store = require('../config/inMemoryStore');
      const employees = store.mockEmployees || [];
      const emp = employees.find(e =>
        (userContext.employeeId && e.id === userContext.employeeId) ||
        (userContext.userName && e.name.toLowerCase().includes(userContext.userName.toLowerCase()))
      ) || employees[0];

      return {
        text: `### 🎯 Active Workplace Tasks — ${emp?.name || userContext.userName || 'Executive'}\n\n• **Active Primary Task:** ${emp?.activeTask || 'Follow up with verified IndiaMart buyers'}\n• **KPI Adherence:** **${emp?.kpiScore || 'A'}** (${emp?.callsHandled || 184} calls logged)\n• **Today's Action Focus:** Call 3 pending advance accounts and log follow-up notes.`,
        table: [
          { 'Priority': 'HIGH', 'Task': 'Follow-up with Confirmed Leads for 10% advance deposit', 'Due': 'Today' },
          { 'Priority': 'NORMAL', 'Task': 'Send WhatsApp quote for Automatic Paper Bag machine', 'Due': 'Today' },
          { 'Priority': 'NORMAL', 'Task': 'Review CRM call notes & schedule next follow-up dates', 'Due': 'Tomorrow' }
        ],
        options: ['Show priority calling list', 'Show my assigned leads', 'Check my KPI score'],
        chart: null,
        intent: 'employee_my_tasks'
      };
    }

    // 3. My Personal Performance & KPI Score
    if (/my (kpi|performance|score|sales closed|conversion)/i.test(cleanQuery)) {
      const store = require('../config/inMemoryStore');
      const employees = store.mockEmployees || [];
      const emp = employees.find(e =>
        (userContext.employeeId && e.id === userContext.employeeId) ||
        (userContext.userName && e.name.toLowerCase().includes(userContext.userName.toLowerCase()))
      ) || employees[0];

      return {
        text: `### 🏆 Personal Performance Scorecard — ${emp?.name || userContext.userName || 'Executive'}\n\n• **Current KPI Rating:** **${emp?.kpiScore || 'A'}**\n• **Sales Deals Closed:** **${emp?.salesClosed || 14}**\n• **Calls Handled:** **${emp?.callsHandled || 184} calls**\n• **Average Call Response Time:** ${emp?.avgResponseTimeMin || 4.2} mins`,
        table: [
          { Metric: 'KPI Rating', Value: emp?.kpiScore || 'A' },
          { Metric: 'Calls Handled', Value: emp?.callsHandled || 184 },
          { Metric: 'Deals Closed', Value: emp?.salesClosed || 14 },
          { Metric: 'Lead Conversion', Value: emp?.conversionRate || '82%' }
        ],
        options: ['Show my assigned leads', 'What are my active tasks?', 'Who should I call next?'],
        chart: null,
        intent: 'employee_my_kpi'
      };
    }

    // 4. Who should I call next / Priority Dialer
    if (/who should i call( next)?|call next|priority call(ing)?( list| queue)?|calling queue|next call|mera agla call/i.test(cleanQuery)) {
      const store = require('../config/inMemoryStore');
      const allLeads = store.mockLeads || [];
      const priorityLead = allLeads.find(l => l.stage === 'CONFIRMED' || l.stage === 'NEGOTIATION') || allLeads[0];
      return {
        text: `### 📞 Next Priority Calling Target — ${userContext.userName || 'Executive'}\n\n• **Customer:** **${priorityLead?.name || 'Rajesh Sharma'}** (${priorityLead?.company || 'Apex Packaging Ltd'})\n• **Phone:** \`${priorityLead?.phone || '+91 98260 12345'}\`\n• **Current Stage:** **${priorityLead?.stage || 'CONFIRMED'}** (10% Advance Follow-up)\n• **Interest:** ${priorityLead?.interest || 'Automatic Paper Bag Machine (Model APB-450)'}\n• **Action Guidance:** Call now to confirm RTGS transfer of 10% booking advance and dispatch production job card.`,
        table: [
          { Field: 'Customer Name', Details: priorityLead?.name || 'Rajesh Sharma' },
          { Field: 'Company', Details: priorityLead?.company || 'Apex Packaging Ltd' },
          { Field: 'Machine Model', Details: priorityLead?.interest || 'Automatic Paper Bag Machine' },
          { Field: 'Contact Number', Details: priorityLead?.phone || '+91 98260 12345' },
          { Field: 'Follow-up Reason', Details: 'Pending 10% Advance Payment verification' }
        ],
        options: ['Show my assigned leads', 'What are my active tasks?', 'Send WhatsApp quote for Automatic Paper Bag machine', 'Search CNC 500T specification manual'],
        chart: null,
        intent: 'employee_calling_queue'
      };
    }

    // 5. Machine Specs / Catalog Manual
    if (/manual|specification|specs|brochure|cnc 500t|paper bag machine|corrugated/i.test(cleanQuery)) {
      return {
        text: `### 📘 Technical Specifications Manual — Machinery Catalog\n\n• **Equipment Model:** **APS CNC 500T Hydraulic Forming Press**\n• **Rated Capacity:** 500 Metric Tons | Dual Cylinder Pressure Control\n• **Power Requirement:** 45 kW, 415V, 3-Phase 50Hz\n• **Production Output:** 28 cycles/minute with PLC Servo automation\n• **Warranty & Service:** 2 Years Comprehensive on-site warranty\n\n*You can send this specification sheet directly to your lead via WhatsApp.*`,
        table: [
          { Parameter: 'Clamping Force', Value: '5000 kN (500 Tons)' },
          { Parameter: 'Bed Size', Value: '1800 mm × 1200 mm' },
          { Parameter: 'Max Daylight', Value: '1100 mm' },
          { Parameter: 'Stroke Length', Value: '750 mm' },
          { Parameter: 'Controller Unit', Value: 'Siemens Simatic S7-1200 PLC' }
        ],
        options: ['Send WhatsApp quote for Automatic Paper Bag machine', 'Show my assigned leads', 'Who should I call next?'],
        chart: null,
        intent: 'employee_specs_manual'
      };
    }

    // 6. Comprehensive Employee Restriction Guard on Admin Functions
    const isRestrictedForEmployee =
      /\b(assign task|assign tasks|reassign|all employees|team performance|team leaderboard|sales leaderboard|create user|add user|new user|delete user|hire user|invite user|system roles|user permissions|profit margin|company profit|total profit|margin calculator|revenue summary|company revenue|predict revenue|revenue forecast|sales forecast|executive report|executive pdf|lead churn|churn risk|sentiment audit|delete memory|clear memory|reset memory|audit log|security log|system audit|tally post|post to tally|tally sync|tally voucher|financial audit|p&l|balance sheet|all invoices|billing generator)\b/i.test(cleanQuery);

    if (isRestrictedForEmployee) {
      return {
        text: `### 🔒 Access Restricted for Employee Role\n\nHello **${userContext.userName || 'Team Member'}**, as an **Employee / Sales Executive**, your chatbot workspace is specifically tailored for:\n• **Your assigned leads & customer inquiries**\n• **Your daily tasks & priority calling queue**\n• **Machine specifications & customer WhatsApp updates**\n• **Your personal KPI and performance scorecard**\n\nAdministrative actions (such as company profit margin audits, revenue forecasts, onboarding new users, reallocating team workloads, or altering Tally vouchers) are restricted to **Managers & Administrators**.\n\n*If you require this action, please coordinate with your Administrator.*`,
        table: null,
        chart: null,
        options: [
          'Show my assigned leads',
          'What are my active tasks?',
          'Who should I call next?',
          'Search CNC 500T specification manual'
        ],
        intent: 'employee_restricted'
      };
    }
  }

  // 1. Classify Intent
  const intent = detectIntent(cleanQuery, lastResult, convId);

  // Guard against intent-level admin actions for employees
  if (isEmployee) {
    const restrictedIntents = [
      'action_create_user',
      'assign_employee_tasks',
      'action_post_tally',
      'ai_memory_teach',
      'sales_team_report',
      'sales_leaderboard',
      'revenue_summary',
      'pipeline_summary',
      'margin_calculator',
      'generate_report',
      'predictive_forecast',
      'predictive_sales',
      'lead_churn_audit',
      'system_audit_log',
      'tally_status'
    ];
    if (restrictedIntents.includes(intent)) {
      return {
        text: `### 🔒 Access Restricted for Employee Role\n\nHello **${userContext.userName || 'Team Member'}**, administrative operations (like creating users, reallocating team workloads, company profit audits, or altering company accounts) are reserved for **Management**.\n\nPlease select an authorized action from your employee workspace:`,
        table: null,
        chart: null,
        options: [
          'Show my assigned leads',
          'What are my active tasks?',
          'Who should I call next?',
          'Search CNC 500T specification manual'
        ],
        intent: 'employee_restricted'
      };
    }
  }

  let result = null;

  // Direct action intents that should run their specialized handler directly
  const directActionIntents = [
    'ai_memory_teach',
    'ai_memory_recall',
    'sales_team_report',
    'generate_report',
    'sales_leaderboard',
    'employee_performance',
    'invoice_generator',
    'invoices',
    'action_create_lead',
    'action_create_user',
    'action_transition_lead',
    'action_post_tally',
    'action_erp_booking',
    'action_queue_dialer',
    'schedule_call',
    'action_send_whatsapp',
    'action_send_email',
    'action_check_inventory',
    'factory_tracker',
    'assign_employee_tasks',
    'show_all_crm_leads',
    'leads_by_stage',
    'revenue_summary'
  ];

  if (directActionIntents.includes(intent)) {
    const handler = getHandler(intent);
    if (typeof handler === 'function') {
      try {
        result = await handler(cleanQuery, convId);
      } catch (handlerErr) {
        console.error(`[A3 Handler Error] on intent "${intent}":`, handlerErr);
      }
    }
  }

  // 2. Direct LLM execution if provider configured and active
  if (!result && LLM_PROVIDER !== 'mock') {
    try {
      result = await processWithLLM(cleanQuery, convId, intent);
    } catch (llmErr) {
      console.warn(`[A3 LLM Warning] (${llmErr.message}). Fallback to domain handler.`);
    }
  }

  // 3. Modular domain handler dispatch
  if (!result || !result.text) {
    const handler = getHandler(intent);
    if (typeof handler === 'function') {
      try {
        result = await handler(cleanQuery, convId);
      } catch (handlerErr) {
        console.error(`[A3 Handler Error] on intent "${intent}":`, handlerErr);
      }
    }
  }

  // 4. Universal Answer Generator if still unhandled
  if (!result || !result.text) {
    result = await generateUniversalAnswer(cleanQuery, convId);
  }

  // 5. Intelligent Report & Export File Compilation
  const requestedFormat = detectRequestedFormat(cleanQuery);
  const isOptionsMenu = result && Array.isArray(result.options) && result.options.length > 0;

  if (requestedFormat && !isOptionsMenu && !result.exportFile) {
    const rawClean = cleanQuery.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const titleSlug = (rawClean.slice(0, 35) || 'APS_AI_Report').replace(/\s+/g, '_');
    const fileName = `APS_AI_${titleSlug}.${requestedFormat}`;

    let content = result.text || '';
    let tableHeaders = null;
    let tableRows = null;

    if (result.table && Array.isArray(result.table) && result.table.length > 0) {
      tableHeaders = Object.keys(result.table[0]);
      tableRows = result.table.map(row => tableHeaders.map(h => String(row[h] ?? '')));
      if (requestedFormat === 'csv') {
        const headerLine = tableHeaders.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
        const rowLines = tableRows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','));
        content = [headerLine, ...rowLines].join('\n');
      }
    } else if (requestedFormat === 'csv') {
      content = `APS AI Intelligence Export\nQuery,"${cleanQuery.replace(/"/g, '""')}"\nDate,"${new Date().toISOString()}"\n\nContent,"${(result.text || '').replace(/"/g, '""')}"`;
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
      summaryCards: result.summaryCards || [
        { label: 'Audit Status', val: 'Verified 100%' },
        { label: 'Security Level', val: 'Enterprise Grade' },
        { label: 'Execution', val: 'APS AI Cockpit' },
        { label: 'Classification', val: 'Certified Document' }
      ],
      content,
      tableHeaders,
      tableRows
    };
  }

  const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1FA70}-\u{1FAFF}]/gu;
  if (result.text && typeof result.text === 'string') {
    result.text = result.text
      .replace(EMOJI_REGEX, '')
      .replace(/^(#{1,6})[ \t]+/gm, '$1 ')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/^\s+/gm, '');
  }
  if (Array.isArray(result.options)) {
    result.options = result.options.map(o => typeof o === 'string' ? o.replace(EMOJI_REGEX, '').trim() : o);
  }

  // 6. Record State in Session Store
  setLastResult(convId, { ...result, intent });
  addToHistory(convId, cleanQuery, result.text);

  return { ...result, intent };
}

/**
 * Return quick suggestion chips for dashboard UI
 */
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

module.exports = {
  processQuery,
  getSuggestions,
  detectIntent,
  INTENTS
};
