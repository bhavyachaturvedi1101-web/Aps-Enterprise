'use strict';
/**
 * A3 LLM Provider Integration Layer
 * Unified client supporting Groq Compound (Llama hybrid), OpenAI, and Gemini with resilient fallback chaining.
 */

const https = require('https');

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

async function callGroq(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const envModel = process.env.GROQ_MODEL;
  const fallbackChain = [
    'groq/compound',
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
    'qwen/qwen3.6-27b',
    'openai/gpt-oss-20b',
    'groq/compound-mini'
  ];
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

        if (errCode === 'invalid_api_key' || errMsg.includes('API key') || errMsg.includes('unauthorized') || errMsg.toLowerCase().includes('api key')) {
          console.warn('[A3 Groq] Fail-fast triggered due to authentication/API key issue.');
          break;
        }
        continue;
      }
      let content = result?.choices?.[0]?.message?.content || '';
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
    ...(Array.isArray(history) ? history : []).map(m => ({
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

function parseLLMResponse(raw) {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();

  // 1. Direct JSON parse
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed.text === 'string' && parsed.text.trim()) return parsed;
  } catch {}

  // 2. Code block ```json ... ```
  if (trimmed.startsWith('```')) {
    try {
      const cleaned = trimmed.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed.text === 'string' && parsed.text.trim()) return parsed;
    } catch {}
  }

  // 3. Regex JSON object match
  const match = trimmed.match(/\{[\s\S]*"text"\s*:\s*"([\s\S]*?)"[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed && typeof parsed.text === 'string' && parsed.text.trim()) return parsed;
    } catch {}
  }

  return { text: trimmed, table: null, chart: null };
}

function getDefaultStore() {
  try {
    return require('../../config/inMemoryStore');
  } catch {
    return {};
  }
}

async function buildFullContext(query, getStore) {
  const storeFn = typeof getStore === 'function' ? getStore : getDefaultStore;
  const store = await storeFn();
  const leads = store.mockLeads || [];
  const employees = store.mockEmployees || [];
  const actLogs = store.mockActivityLogs || [];
  const callLogs = store.mockCallLogs || [];
  const qLower = (query || '').toLowerCase().trim();

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

  const mentionedLeads = leads.filter(l =>
    qLower.includes((l.name || '').toLowerCase()) || qLower.includes((l.company || '').toLowerCase())
  );
  const remainingLeads = leads.filter(l => !mentionedLeads.some(x => x.id === l.id));
  const allLeadsOrdered = [...mentionedLeads, ...remainingLeads];

  const leadDetails = allLeadsOrdered.map(l =>
    `[${l.stage}] ${l.id} | ${l.name} (${l.company || 'N/A'}) | ₹${(Number(l.budget || l.dealValue || l.value) || 0).toLocaleString('en-IN')} | Product:${l.interest || l.product || l.machineRequired || 'N/A'} | Owner:${l.assignedTo || l.assignedEmployeeId || 'Unassigned'} | Tally:${l.tallyPaymentVerified ? 'Verified' : 'Pending'} | ERP:${l.erpBookingCreated ? 'Booked' : 'Pending'} | Source:${l.source || 'N/A'} | City:${l.city || l.location || 'N/A'}`
  ).join('\n');

  const recentActivity = actLogs.slice(0, 5).map(a =>
    `[${new Date(a.timestamp || a.createdAt || Date.now()).toLocaleDateString('en-IN')}] ${a.action || a.type} | Lead:${a.leadName || a.leadId || '?'} | By:${a.employeeName || 'System'}`
  ).join('\n') || 'No recent activity logged.';

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
• Contact: +91-7869755871 | +91-8827848099 | info@apsenterprises.in | www.apsenterprises.in

━━━ [2] FINANCIAL HEALTH SNAPSHOT ━━━
• Total Pipeline Value: ₹${totalPipeline.toLocaleString('en-IN')} (${leads.length} Leads)
• Revenue Locked (Closed Stages): ₹${totalRevenueLocked.toLocaleString('en-IN')} (${closedLeads.length} Deals)
• Advance Collected (10% of Locked): ₹${advanceCollected.toLocaleString('en-IN')}
• Balance Pending (90% of Locked): ₹${pendingBalance.toLocaleString('en-IN')}
• Advance Pending (Confirmed but Unpaid): ₹${advancePending.toLocaleString('en-IN')} from ${confirmedLeads.length} leads
• New Leads This Month: ${thisMonthLeads.length} leads

━━━ [3] LIVE TEAM PERFORMANCE ━━━
${empDetails || 'No team data available.'}

━━━ [4] FULL CRM PIPELINE STATE ━━━
${leadDetails || 'No leads found.'}

━━━ [5] RECENT ACTIVITY ━━━
${recentActivity}

━━━ [6] AI PERSISTENT LONG-TERM MEMORY & LEARNED FACTS ━━━
${(() => {
  try {
    const aiMemory = require('../aiMemoryService');
    return aiMemory.formatMemoriesForPrompt(query);
  } catch {
    return 'No persistent memories available.';
  }
})()}`;
}

async function processWithLLM(query, historyOrConvId, getStore, fallbackReportHandler) {
  const provider = (process.env.LLM_PROVIDER || 'mock').toLowerCase();
  if (provider === 'mock') return null;

  try {
    const context = await buildFullContext(query, getStore);
    const systemPrompt = `You are APS AI — Enterprise Intelligence Copilot for APS Enterprise, Indore. Always answer with rich markdown and professional clarity. Match the user's language.\n\n${context}`;

    let history = Array.isArray(historyOrConvId) ? historyOrConvId : [];
    if (typeof historyOrConvId === 'string') {
      try {
        const { getHistory } = require('./sessionStore');
        history = getHistory(historyOrConvId);
      } catch {}
    }

    let raw = '';
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(Array.isArray(history) ? history : []),
      { role: 'user', content: query }
    ];

    if (provider === 'groq') raw = await callGroq(messages);
    else if (provider === 'openai') raw = await callOpenAI(messages);
    else if (provider === 'gemini') raw = await callGemini(systemPrompt, history, query);

    if (raw && typeof raw === 'string' && raw.trim()) {
      if (/```python|import reportlab|from reportlab|def generatesalesreport/i.test(raw) && fallbackReportHandler) {
        return await fallbackReportHandler(query);
      }
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

module.exports = {
  callGroq,
  callOpenAI,
  callGemini,
  parseLLMResponse,
  buildFullContext,
  processWithLLM
};
