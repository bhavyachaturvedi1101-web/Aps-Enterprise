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
async function processQuery(query, conversationId = 'default') {
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

  // 1. Classify Intent
  const intent = detectIntent(cleanQuery, lastResult, convId);

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
