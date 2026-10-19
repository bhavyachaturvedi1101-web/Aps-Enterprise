'use strict';
/**
 * A3 LLM Provider Integration Layer
 * Unified client supporting Groq Compound (Llama hybrid), OpenAI, and Gemini with resilient fallback chaining.
 */

const https = require('https');
const { sanitizeLeadForLLM, sanitizeEmployeeForLLM, sanitizeLogForLLM, maskName, maskText } = require('../../utils/privacyMasker');

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

async function buildFullContext(query, getStore, user = null) {
  const storeFn = typeof getStore === 'function' ? getStore : getDefaultStore;
  const store = await storeFn();
  let leads = store.mockLeads || [];
  let employees = store.mockEmployees || [];
  const actLogs = store.mockActivityLogs || [];
  const callLogs = store.mockCallLogs || [];
  const qLower = (query || '').toLowerCase().trim();

  // BOLA & Privacy filter: employees only receive assigned leads & own profile
  if (user && user.role === 'employee') {
    try {
      const { canAccessLead, canAccessEmployeePerformance, isPrivileged } = require('../../middleware/rbacMiddleware');
      if (!isPrivileged(user)) {
        leads = leads.filter(l => canAccessLead(user, l));
        employees = employees.filter(e => canAccessEmployeePerformance(user, e.id));
      }
    } catch {}
  }

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

  const sanitizedEmployees = employees.map(e => sanitizeEmployeeForLLM(e)).filter(Boolean);
  const empDetails = sanitizedEmployees.map(e => {
    const active = e.activeTask
      ? `Active: "${e.activeTask.title}" [P:${e.activeTask.priority}, Due: ${e.activeTask.dueIn || 'N/A'}]`
      : 'Active: None';
    const queued = e.taskQueueCount > 0
      ? `Queue: ${e.taskQueueCount} tasks pending`
      : 'Queue: Empty';
    return `• ${e.name} [${e.role} / ${e.department}] KPI=${e.kpiScore} Sales=${e.salesClosed} Rev=₹${(e.totalRevenue || 0).toLocaleString('en-IN')} Calls=${e.callsHandled || 0}\n  ${active} | ${queued}`;
  }).join('\n');

  const mentionedLeads = leads.filter(l =>
    qLower.includes((l.name || '').toLowerCase()) || qLower.includes((l.company || '').toLowerCase())
  );
  const remainingLeads = leads.filter(l => !mentionedLeads.some(x => x.id === l.id));
  const allLeadsOrdered = [...mentionedLeads, ...remainingLeads];

  const sanitizedLeads = allLeadsOrdered.map(l => sanitizeLeadForLLM(l)).filter(Boolean);
  const leadDetails = sanitizedLeads.map(l =>
    `[${l.stage}] ${l.id} | ${l.maskedName} (${l.company || 'N/A'}) | ₹${l.budget.toLocaleString('en-IN')} | Product:${l.interest} | Owner:${l.assignedTo} | Tally:${l.tallyPaymentVerified ? 'Verified' : 'Pending'} | ERP:${l.erpBookingCreated ? 'Booked' : 'Pending'} | Source:${l.source} | City:${l.city}`
  ).join('\n');

  const recentActivity = actLogs.slice(0, 5).map(a => {
    const cleanLog = sanitizeLogForLLM(a);
    return `[${new Date(cleanLog.timestamp || a.createdAt || Date.now()).toLocaleDateString('en-IN')}] ${cleanLog.action} | Lead:${maskName(a.leadName) || a.leadId || '?'} | By:${a.employeeName || 'System'}`;
  }).join('\n') || 'No recent activity logged.';

  const totalCalls = callLogs.length;
  const avgCallDuration = totalCalls > 0 ? Math.round(callLogs.reduce((s, c) => s + (c.durationSeconds || 0), 0) / totalCalls) : 0;
  const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0 };
  callLogs.forEach(c => {
    const s = (c.sentiment || '').toLowerCase();
    if (s.includes('positive')) sentimentBreakdown.positive++;
    else if (s.includes('negative')) sentimentBreakdown.negative++;
    else sentimentBreakdown.neutral++;
  });

  // Persistent Learned AI Memory snippet
  let memorySnippet = 'None';
  try {
    const aiMemory = require('../aiMemoryService');
    const recentMemories = aiMemory.queryMemories(query, 6);
    if (recentMemories.length > 0) {
      memorySnippet = recentMemories.map(m => `• [${m.type}] ${m.summary}`).join('\n');
    }
  } catch {}

  return `═══ APS ENTERPRISE — LIVE INTELLIGENCE STATE [${new Date().toLocaleString('en-IN')}] ═══

━━━ [1] COMPANY IDENTITY & LOCATIONS ━━━
• Full Name: APS Enterprise — Lead Industrial Manufacturer, Indore MP
• Head Office: 832, Old Loha Mandi, Opp. Devshree Cinema, Near Khambati Pipes, Indore, MP 452001
• Contact: +91-7869755871 | +91-8827848099 | info@apsenterprises.in | www.apsenterprises.in

━━━ [2] FINANCIAL HEALTH SNAPSHOT ━━━
• Total Pipeline Value: ₹${totalPipeline.toLocaleString('en-IN')} (${leads.length} Deals Accessible)
• Revenue Locked (Closed Stages): ₹${totalRevenueLocked.toLocaleString('en-IN')} (${closedLeads.length} Deals)
• Advance Collected (10% of Locked): ₹${advanceCollected.toLocaleString('en-IN')}
• Balance Pending (90% of Locked): ₹${pendingBalance.toLocaleString('en-IN')}
• Advance Pending (Confirmed but Unpaid): ₹${advancePending.toLocaleString('en-IN')} from ${confirmedLeads.length} leads
• New Leads This Month: ${thisMonthLeads.length} leads

━━━ [3] LIVE TEAM PERFORMANCE ━━━
${empDetails || 'No team data available for current user scope.'}

━━━ [4] FULL CRM PIPELINE STATE ━━━
${leadDetails || 'No leads accessible for current user scope.'}

━━━ [5] RECENT ACTIVITY ━━━
${recentActivity}

━━━ [6] PERSISTENT LEARNED MEMORY ━━━
${memorySnippet}`;
}

async function processWithLLM(query, historyOrConvId, arg3, arg4, arg5) {
  const provider = (process.env.LLM_PROVIDER || 'mock').toLowerCase();
  if (provider === 'mock') return null;

  let user = null;
  let getStore = null;
  let fallbackReportHandler = null;

  [arg3, arg4, arg5].forEach(arg => {
    if (arg && typeof arg === 'object' && arg.role) user = arg;
    else if (typeof arg === 'function') {
      if (!getStore) getStore = arg;
      else fallbackReportHandler = arg;
    }
  });

  try {
    const context = await buildFullContext(query, getStore, user);
    const systemPrompt = `You are APS AI — Executive Operations Intelligence Copilot for APS Enterprise, Indore.

EXECUTIVE ANSWER PROTOCOL:
1. **Key Takeaway First**: Always start with a 1-2 sentence executive summary (TL;DR) or bottom-line figure before diving into details.
2. **Visual Hierarchy & Structure**:
   - Use clean section headers (### Header) to separate topics.
   - For comparisons, rosters, or multi-field datasets, ALWAYS use clean Markdown Tables with column headers (| Col 1 | Col 2 |).
   - Use concise bullet points (•) and numbered steps (1., 2.) rather than dense walls of text.
   - Bold all critical numbers, metrics, currencies, and names (e.g. **₹42,000**, **84%**, **Plant 1**).
3. **Tone**: Crisp, authoritative, executive-ready, and operational. Match the user's language (English, Hindi, Hinglish) seamlessly.
4. **Actionable Closure**: When relevant, end with 1-2 suggested operational actions.

${context}`;

    let history = Array.isArray(historyOrConvId) ? historyOrConvId : [];
    if (typeof historyOrConvId === 'string') {
      try {
        const { getHistory } = require('./sessionStore');
        history = getHistory(historyOrConvId);
      } catch {}
    }

    const cleanQuery = maskText(query);
    const sanitizedHistory = (Array.isArray(history) ? history : []).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: maskText(m.content || m.text || '')
    })).slice(-6);

    let raw = '';
    const messages = [
      { role: 'system', content: systemPrompt },
      ...sanitizedHistory,
      { role: 'user', content: cleanQuery }
    ];

    if (provider === 'groq') raw = await callGroq(messages);
    else if (provider === 'openai') raw = await callOpenAI(messages);
    else if (provider === 'gemini') raw = await callGemini(systemPrompt, sanitizedHistory, cleanQuery);

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

/**
 * Universal fallback answer generator for general queries when LLM is unavailable or unconfigured
 */
async function generateUniversalAnswer(query, convId) {
  const qLower = (query || '').toLowerCase().trim();
  const store = await getDefaultStore();
  const employees = store.mockEmployees || [];

  // 1. Employee query
  const matchedEmp = employees.find(e => qLower.includes(e.name.toLowerCase()));
  if (matchedEmp) {
    const active = matchedEmp.activeTask
      ? `• **Active Task:** **${matchedEmp.activeTask.title}** (Priority: ${matchedEmp.activeTask.priority || 'Normal'}, Due: ${matchedEmp.activeTask.dueIn || 'Today'})\n`
      : '• **Active Task:** None currently in progress.\n';
    const queue = Array.isArray(matchedEmp.taskQueue) && matchedEmp.taskQueue.length > 0
      ? `\n**Queued Tasks:**\n` + matchedEmp.taskQueue.map((t, i) => `${i + 1}. ${t.title} [${t.priority || 'Normal'}]`).join('\n')
      : '';
    return {
      text: `### 👤 Employee Profile — ${matchedEmp.name}\n\n` +
        `• **Role / Department:** ${matchedEmp.role} (${matchedEmp.department || 'Operations'})\n` +
        `• **KPI Score:** **${matchedEmp.kpiScore}** | **Sales Closed:** ${matchedEmp.salesClosed || 0} (₹${(matchedEmp.totalRevenue || 0).toLocaleString('en-IN')})\n` +
        `• **Conversion Rate:** ${matchedEmp.conversionRate || 'N/A'}\n\n` +
        `#### ⚡ Task Status:\n${active}${queue}\n\n` +
        `*To assign a task, say: "Assign task to ${matchedEmp.name}: [task description]"*`,
      table: null,
      chart: null,
      intent: 'employee_profile'
    };
  }

  // 2. Machine & Equipment Knowledge (APS Core Catalog)
  if (qLower.includes('dona') || qLower.includes('hydraulic') || qLower.includes('crank') || qLower.includes('cup') || qLower.includes('cutter') || qLower.includes('roll') || qLower.includes('machine') || qLower.includes('spec')) {
    return {
      text: `### ⚙️ APS Enterprise Industrial Machinery Catalog\n\n` +
        `APS Enterprise manufactures heavy-duty industrial machinery in Indore, MP:\n\n` +
        `1. **Fully Automatic Double Die Dona Pattal Machine (APS-DD-01)**: High-speed dual feeder, 4,000–6,000 pcs/hr output. Ideal for high-volume paper dona/plate production.\n` +
        `2. **Heavy Duty Hydraulic Paper Plate & Thali Press (APS-HYD-50)**: High tonnage hydraulic pressure, supports multi-layer GSM sheets, wrinkle-free deep thali pressing.\n` +
        `3. **Single Die High-Speed Crank Dona Machine (APS-SD-02)**: Low power consumption (1–1.5 HP), durable mechanical crank drive for consistent daily continuous operation.\n` +
        `4. **Automatic High-Speed Paper Cup Machine (APS-CUP-90)**: Ultrasonic sealing, 70–90 cups/min, smart sensor control.\n` +
        `5. **Semi-Automatic Roll Cutter Machine (APS-CUT-36)**: Precision cutting for craft/silver rolls from 80 to 140 GSM.\n\n` +
        `*Would you like to check current warehouse stock or generate a GST quotation for any of these machines?*`,
      table: null,
      chart: null,
      intent: 'machinery_catalog'
    };
  }

  // 3. Company identity & Indore Location
  if (qLower.includes('aps') || qLower.includes('indore') || qLower.includes('company') || qLower.includes('address') || qLower.includes('office') || qLower.includes('phone') || qLower.includes('contact')) {
    return {
      text: `### 🏢 APS Enterprise — Indore, Madhya Pradesh\n\n` +
        `• **Head Office & Factory:** 832, Old Loha Mandi, Opp. Devshree Cinema, Near Khambati Pipes, Indore, MP 452001\n` +
        `• **Phone:** +91-7869755871 | +91-8827848099\n` +
        `• **Email:** info@apsenterprises.in | Web: www.apsenterprises.in\n` +
        `• **Core Domain:** High-speed paper plate, dona pattal, hydraulic thali, and paper cup manufacturing equipment.`,
      table: null,
      chart: null,
      intent: 'company_info'
    };
  }

  // 4. Default Assistant Guidance
  return {
    text: `### 🤖 APS AI Operations Copilot\n\n` +
      `I can execute commands, query real-time data, and generate business documents across your workspace:\n\n` +
      `• **CRM & Sales:** *"Show leads by stage"*, *"Create new lead for Rajesh in Indore"*, *"Predict monthly revenue"*\n` +
      `• **Factory & ERP:** *"Check warehouse inventory"*, *"Track factory job cards"*, *"Release ERP booking"*\n` +
      `• **Accounting & Invoicing:** *"Generate GST invoice for 42000"*, *"Verify Tally advance vouchers"*\n` +
      `• **Team & Memory:** *"Assign task to Bhavya: verify payment"*, *"Remember that client requires 120 GSM paper"*\n` +
      `• **Exports:** *"Give me Excel of CRM leads"*, *"Download PDF report of warehouse stock"*\n\n` +
      `How can I assist your operations right now?`,
    table: null,
    chart: null,
    intent: 'normal_chat'
  };
}

module.exports = {
  callGroq,
  callOpenAI,
  callGemini,
  parseLLMResponse,
  buildFullContext,
  processWithLLM,
  generateUniversalAnswer
};
