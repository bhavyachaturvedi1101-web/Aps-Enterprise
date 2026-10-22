'use strict';
const fs = require('fs');
const path = require('path');

const MEMORY_FILE = path.join(__dirname, '../../ai_memory.json');

const INITIAL_SYSTEM_MEMORY = [
  {
    id: 'mem-init-1',
    timestamp: '2026-10-17T06:00:00.000Z',
    type: 'SYSTEM',
    topic: 'system_initialization',
    summary: 'APS Enterprise AI Assistant memory initialized with 6 registered team members and full CRM catalog.',
    target: 'System',
    status: 'completed',
    details: {
      registeredMembers: ['Super Admin', 'Operations Manager', 'Accounts Officer', 'Sales Telecaller', 'Amit Patidar', 'Vikram Rathore'],
      status: 'active'
    }
  }
];

/**
 * Load all persistent memories from disk
 */
function loadMemories() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const raw = fs.readFileSync(MEMORY_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('[aiMemoryService] Load error:', err.message);
  }
  return INITIAL_SYSTEM_MEMORY;
}

/**
 * Save memories array to disk safely
 */
function saveMemories(memories) {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[aiMemoryService] Save error:', err.message);
    return false;
  }
}

/**
 * Record a new memory entry
 * @param {Object} entry 
 * {
 *   type: 'LEARNED_FACT' | 'TASK_ASSIGNED' | 'TASK_REJECTED' | 'USER_CREATED' | 'REPORT_GENERATED' | 'INVOICE_GENERATED' | 'GENERAL_ACTION',
 *   topic: string,
 *   query?: string,
 *   summary: string,
 *   target?: string,
 *   status?: string,
 *   details?: Object
 * }
 */
function recordMemory(entry) {
  if (!entry || !entry.summary) return null;
  const memories = loadMemories();
  const newMemory = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    type: entry.type || 'GENERAL_ACTION',
    topic: entry.topic || 'general',
    query: entry.query || '',
    summary: entry.summary,
    target: entry.target || null,
    status: entry.status || 'completed',
    details: entry.details || {}
  };

  memories.unshift(newMemory);

  // Keep up to 150 persistent memories
  if (memories.length > 150) {
    memories.length = 150;
  }

  saveMemories(memories);
  return newMemory;
}

/**
 * Specifically learn a new fact / user preference / entity note into memory
 */
function learnFact(fact, topic = 'learned_knowledge', target = null, query = '') {
  if (!fact || !fact.trim()) return null;
  return recordMemory({
    type: 'LEARNED_FACT',
    topic: topic || 'learned_knowledge',
    query: query || '',
    summary: fact.trim(),
    target: target || null,
    status: 'saved',
    details: {
      learnedAt: new Date().toISOString(),
      source: 'user_direct_input'
    }
  });
}

/**
 * Delete a single memory by ID
 */
function deleteMemory(id) {
  if (!id) return false;
  const memories = loadMemories();
  const filtered = memories.filter(m => m.id !== id);
  if (filtered.length === memories.length) return false;
  saveMemories(filtered);
  return true;
}

/**
 * Reset memory back to initial state
 */
function clearMemories() {
  saveMemories(INITIAL_SYSTEM_MEMORY);
  return INITIAL_SYSTEM_MEMORY;
}

/**
 * Get recent N memories
 */
function getRecentMemories(limit = 15) {
  const memories = loadMemories();
  return memories.slice(0, limit);
}

/**
 * Get all learned facts
 */
function getLearnedFacts() {
  const memories = loadMemories();
  return memories.filter(m => m.type === 'LEARNED_FACT');
}

/**
 * Search memories by query keywords (case-insensitive)
 */
function queryMemories(searchTerm, limit = 15) {
  const memories = loadMemories();
  if (!searchTerm || !searchTerm.trim()) {
    return memories.slice(0, limit);
  }
  const term = searchTerm.toLowerCase().trim();
  const filtered = memories.filter(m => {
    return (
      (m.summary && m.summary.toLowerCase().includes(term)) ||
      (m.query && m.query.toLowerCase().includes(term)) ||
      (m.target && m.target.toLowerCase().includes(term)) ||
      (m.topic && m.topic.toLowerCase().includes(term)) ||
      (m.type && m.type.toLowerCase().includes(term))
    );
  });
  return filtered.slice(0, limit);
}

/**
 * Format memories as a compact string for LLM system prompt context
 */
function formatMemoriesForPrompt(limit = 15) {
  const all = loadMemories();
  if (all.length === 0) return 'No previous actions or learned facts recorded in memory yet.';

  const learnedFacts = all.filter(m => m.type === 'LEARNED_FACT');
  const recentActions = all.filter(m => m.type !== 'LEARNED_FACT').slice(0, limit);

  const parts = [];

  if (learnedFacts.length > 0) {
    parts.push('PERMANENT LEARNED KNOWLEDGE (Facts previously taught by user):');
    learnedFacts.forEach((f, i) => {
      const targetStr = f.target ? `[Entity: ${f.target}] ` : '';
      parts.push(`• ${targetStr}${f.summary}`);
    });
  }

  if (recentActions.length > 0) {
    parts.push('RECENT ACTIONS & SYSTEM AUDIT LOG (Most recent first):');
    recentActions.forEach((m, i) => {
      const time = new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      parts.push(`• (${time}) ${m.type}: ${m.summary}`);
    });
  }

  return parts.join('\n');
}

/**
 * Format memories for user response in markdown
 */
function formatMemoriesForUser(searchTerm = null) {
  const memories = searchTerm ? queryMemories(searchTerm, 20) : loadMemories().slice(0, 20);
  
  if (memories.length === 0) {
    return {
      text: `### AI Memory & Knowledge Base\n\nNo recorded memories found ${searchTerm ? `matching **"${searchTerm}"**` : 'in memory yet'}.\n\n*All operational tasks assigned, user-taught facts, rejections, and reports are automatically remembered and preserved across sessions.*`,
      table: null
    };
  }

  const learnedFacts = memories.filter(m => m.type === 'LEARNED_FACT');
  const taskActions = memories.filter(m => m.type === 'TASK_ASSIGNED');
  const rejectedActions = memories.filter(m => m.type === 'TASK_REJECTED');
  const otherActions = memories.filter(m => !['LEARNED_FACT', 'TASK_ASSIGNED', 'TASK_REJECTED'].includes(m.type));

  const table = memories.map(m => {
    const d = new Date(m.timestamp);
    const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return {
      'Date & Time': `${dateStr} ${timeStr}`,
      'Action Type': m.type.replace(/_/g, ' '),
      'Target / Entity': m.target || 'General',
      'Memory Content': m.summary,
      'Status': m.status === 'rejected' ? 'Rejected' : (m.status === 'saved' ? 'Remembered' : 'Active')
    };
  });

  let text = `### APS AI Memory & Knowledge Base (${memories.length} entries)\n\n` +
    `APS AI maintains an active, persistent memory across sessions. It remembers instructions taught by the team, recent task allocations, and security/roster boundaries.\n\n`;

  if (learnedFacts.length > 0) {
    text += `#### Learned Facts & Custom Directives (${learnedFacts.length})\n` +
      learnedFacts.map((f, i) => `• **${f.target ? `[${f.target}] ` : ''}**${f.summary}`).join('\n') +
      `\n\n`;
  }

  if (rejectedActions.length > 0) {
    text += `#### Rejected / Guarded Actions (${rejectedActions.length})\n` +
      rejectedActions.map((r, i) => `• **${r.target || 'Entity'}:** ${r.summary}`).join('\n') +
      `\n\n`;
  }

  if (taskActions.length > 0) {
    text += `#### Recent Task Allocations (${taskActions.length})\n` +
      taskActions.slice(0, 5).map((t, i) => `• **${t.target}:** ${t.summary}`).join('\n') +
      `\n\n`;
  }

  if (otherActions.length > 0 && learnedFacts.length === 0 && taskActions.length === 0 && rejectedActions.length === 0) {
    text += `#### Recent Activity Log\n` +
      otherActions.slice(0, 6).map((o, i) => `• ${o.summary}`).join('\n') +
      `\n\n`;
  }

  text += `*You can teach new info anytime by saying: "Remember that [fact]", or ask: "What do you know about [person/entity]?"*`;

  return { text, table, count: memories.length };
}

module.exports = {
  loadMemories,
  saveMemories,
  recordMemory,
  learnFact,
  deleteMemory,
  clearMemories,
  getRecentMemories,
  getLearnedFacts,
  queryMemories,
  formatMemoriesForPrompt,
  formatMemoriesForUser
};
