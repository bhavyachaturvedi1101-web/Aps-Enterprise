'use strict';

const aiMemory = require('../../aiMemoryService');

async function handleAiMemoryTeach(query) {
  let raw = (query || '').trim();

  // Extract fact being taught
  let fact = raw
    .replace(/^(?:please\s+)?(?:remember\s+that|remember|yaad\s+rakhna\s+ki|yaad\s+rakho\s+ki|yaad\s+rakhna|yaad\s+rakho|note\s+down\s+that|note\s+down|note\s+that|save\s+to\s+memory(?:\s*:)?|save\s+this\s+fact(?:\s*:)?|teach\s+ai(?:\s*:)?|keep\s+in\s+mind\s+that|keep\s+in\s+mind)\s*/i, '')
    .trim();

  if (!fact || fact.length < 3) {
    fact = raw;
  }

  // Detect target entity
  let target = 'General Directive';
  const entityMatch = fact.match(/\b(animesh|indore|pune|factory|tally|crm|machine|dona|cup|thali|raw material|client|vendor|supplier)\b/i);
  if (entityMatch) {
    target = entityMatch[1].charAt(0).toUpperCase() + entityMatch[1].slice(1);
  }

  const topic = target.toLowerCase() === 'animesh' ? 'entity_profile' : 'business_knowledge';
  const entry = aiMemory.learnFact(fact, topic, target, query);

  return {
    text: `### 🧠 Saved to AI Persistent Memory\n\n` +
      `I have saved this information to persistent memory and will use it across all future conversations and operational answers:\n\n` +
      `• **Subject / Entity:** **${target}**\n` +
      `• **Learned Knowledge:** *"${fact}"*\n` +
      `• **Category:** \`${topic}\`\n` +
      `• **Storage Status:** ✅ Persisted to \`ai_memory.json\`\n\n` +
      `*You can ask anytime: "What do you know about ${target}?" or "Show AI memory" to review saved knowledge.*`,
    table: [
      {
        'Entity': target,
        'Category': topic,
        'Saved Information': fact,
        'Status': '💡 Active in Memory'
      }
    ],
    learnedMemory: entry
  };
}

async function handleAiMemoryRecall(query) {
  const qLower = (query || '').toLowerCase();

  // If query specifically asks about Animesh
  if (qLower.includes('animesh')) {
    const animeshMemories = aiMemory.queryMemories('animesh', 10);
    const learnedFacts = animeshMemories.filter(m => m.type === 'LEARNED_FACT');
    const rejected = animeshMemories.filter(m => m.type === 'TASK_REJECTED');

    let text = `### 👤 Knowledge Profile — Animesh\n\n`;
    text += `• **Employee Status:** ❌ **Not a registered employee** of APS Enterprise.\n`;
    text += `• **System Role:** External individual / Non-team member.\n\n`;

    if (learnedFacts.length > 0) {
      text += `#### 🧠 Learned Knowledge in Persistent Memory:\n`;
      learnedFacts.forEach((m, idx) => {
        text += `${idx + 1}. *"${m.fact}"* (Saved on ${new Date(m.timestamp).toLocaleDateString('en-IN')})\n`;
      });
      text += `\n`;
    }

    if (rejected.length > 0) {
      text += `#### ⚠️ Blocked Operational Actions Logged:\n`;
      rejected.forEach((r, idx) => {
        text += `${idx + 1}. **Task Assignment Blocked:** User attempted: *"${r.query}"* — Rejected because Animesh is not an employee.\n`;
      });
      text += `\n`;
    }

    text += `*Official registered team members can be viewed in the [Employees Panel](/employees).*`;

    return {
      text,
      table: animeshMemories.slice(0, 5).map(m => ({
        'Date': new Date(m.timestamp).toLocaleDateString('en-IN'),
        'Type': m.type,
        'Subject': m.target || 'Animesh',
        'Record Summary': m.summary || m.fact || 'Logged event'
      }))
    };
  }

  // General memory query
  const queryTerm = qLower.replace(/(show|view|search|recall|what|is|in|ai|the|memory|memories|past|actions)/gi, '').trim();
  const results = queryTerm.length > 1 ? aiMemory.queryMemories(queryTerm, 15) : aiMemory.getMemories({ limit: 15 });

  if (!results || results.length === 0) {
    return {
      text: `### 🧠 AI Persistent Memory\n\nNo specific memory records found matching "${queryTerm || 'all'}".\n\n` +
        `You can teach the AI anytime using statements like:\n` +
        `• *"Remember that Animesh is not an employee"* \n` +
        `• *"Note down that Indore factory opens at 8 AM"*`,
      table: null
    };
  }

  const tableData = results.map(r => ({
    'Type': r.type === 'LEARNED_FACT' ? '💡 Learned Fact' : '📋 Past Action',
    'Subject': r.target || r.topic || 'General',
    'Details': r.fact || r.summary || (r.details ? JSON.stringify(r.details) : 'Recorded event'),
    'Date': new Date(r.timestamp).toLocaleDateString('en-IN')
  }));

  return {
    text: `### 🧠 AI Persistent Long-Term Memory (${results.length} Records Found)\n\n` +
      `Here are the relevant knowledge entries and past operational actions stored in persistent memory:\n\n` +
      results.map((r, i) => `${i + 1}. **[${r.type}]** ${r.target ? `*${r.target}* — ` : ''}${r.fact || r.summary}`).join('\n') +
      `\n\n*All memories persist across restarts in \`backend/ai_memory.json\` and are injected into AI contextual reasoning.*`,
    table: tableData
  };
}

module.exports = {
  handleAiMemoryTeach,
  handleAiMemoryRecall
};
