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
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b'
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
        { model, messages, temperature: 0.35, max_tokens: 1024, top_p: 0.95 }
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
    { model: 'gpt-4o-mini', messages, temperature: 0.4, max_tokens: 1024 }
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
    { contents, generationConfig: { temperature: 0.4, maxOutputTokens: 1024 } }
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
  const qLower = (query || '').toLowerCase().trim();

  const closedStages = ['Client (Paid)', 'In Production', 'Dispatched'];
  const closedLeads = leads.filter(l => closedStages.includes(l.stage));
  const totalPipeline = leads.reduce((s, l) => s + (Number(l.budget || l.dealValue || l.value) || 0), 0);
  const totalRevenueLocked = closedLeads.reduce((s, l) => s + (Number(l.budget || l.dealValue || l.value) || 0), 0);
  const advanceCollected = totalRevenueLocked * 0.1;
  const pendingBalance = totalRevenueLocked * 0.9;
  const confirmedLeads = leads.filter(l => l.stage === 'Confirmed Lead');
  const advancePending = confirmedLeads.reduce((s, l) => s + (Number(l.budget || l.dealValue || l.value) || 0) * 0.1, 0);

  // Group stage breakdown counts
  const stageCounts = {};
  leads.forEach(l => {
    const st = l.stage || 'Enquiry';
    stageCounts[st] = (stageCounts[st] || 0) + 1;
  });
  const stageSummaryStr = Object.entries(stageCounts)
    .map(([st, cnt]) => `${st}: ${cnt}`)
    .join(' | ');

  // Compact employee list (top 6 active members)
  const empDetails = employees.slice(0, 6).map(e => {
    const active = e.activeTask ? `Active: "${e.activeTask.title}"` : 'Active: None';
    return `• ${e.name} [${e.role}] KPI=${e.kpiScore} Closed=${e.salesClosed || 0} Rev=₹${(e.totalRevenue || 0).toLocaleString('en-IN')} | ${active}`;
  }).join('\n');

  // Filter leads: prioritize directly mentioned leads, then take top 8 recent leads as sample
  const mentionedLeads = leads.filter(l =>
    qLower.includes((l.name || '').toLowerCase()) || (l.company && qLower.includes(l.company.toLowerCase()))
  );
  const sampleLeads = mentionedLeads.length > 0
    ? mentionedLeads
    : leads.slice(0, 8);

  const leadDetails = sampleLeads.map(l =>
    `• [${l.stage}] ${l.name} (${l.company || 'N/A'}) - ₹${(Number(l.budget || l.dealValue || l.value) || 0).toLocaleString('en-IN')} | Machine: ${l.interest || l.product || 'Standard'}`
  ).join('\n');

  // Compact recent activity (top 3)
  const recentActivity = actLogs.slice(0, 3).map(a =>
    `• ${a.action || a.type}: ${a.leadName || 'General'} (by ${a.employeeName || 'System'})`
  ).join('\n') || 'None';

  // Persistent Memory snippet (top 5 relevant memories)
  let memorySnippet = 'No custom memory.';
  try {
    const aiMemory = require('../aiMemoryService');
    memorySnippet = aiMemory.formatMemoriesForPrompt(query) || 'No custom memory.';
  } catch {}

  return `═══ APS ENTERPRISE LIVE INTELLIGENCE [${new Date().toLocaleDateString('en-IN')}] ═══
• Company: APS Enterprise, 832 Old Loha Mandi, Indore MP | Phone: +91-7869755871 | info@apsenterprises.in
• Core Products: Double Die Dona Pattal Machine, Heavy Duty Hydraulic Press, Single Die Dona Machine, High-Speed Paper Cup Machine, Paper Roll Cutters.
• Financials: Total Pipeline: ₹${totalPipeline.toLocaleString('en-IN')} (${leads.length} leads) | Locked Revenue: ₹${totalRevenueLocked.toLocaleString('en-IN')} | Advance Collected: ₹${advanceCollected.toLocaleString('en-IN')} | Balance Pending: ₹${pendingBalance.toLocaleString('en-IN')}
• Pipeline Stages: ${stageSummaryStr}
• Team Snapshot (Top):
${empDetails || 'None'}
• Leads (${mentionedLeads.length > 0 ? 'Direct Matches' : `Showing 8 of ${leads.length}`}):
${leadDetails || 'None'}
• Recent Events:
${recentActivity}
• Persistent Learned Memory:
${memorySnippet}`;
}

async function processWithLLM(query, historyOrConvId, getStore, fallbackReportHandler) {
  const provider = (process.env.LLM_PROVIDER || 'mock').toLowerCase();
  if (provider === 'mock') return null;

  try {
    const context = await buildFullContext(query, getStore);
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

    let raw = '';
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(Array.isArray(history) ? history : []).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content || m.text || ''
      })).slice(-6),
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
