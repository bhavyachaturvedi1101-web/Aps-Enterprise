'use strict';
/**
 * A3 Session & Context Store
 * Manages conversational state, sliding-window TTL, and query snapshots for multi-turn exports.
 */

const conversationStore = new Map();

const SESSION_TTL_MS = 120 * 60 * 1000; // 120-minute sliding window
const MAX_HISTORY_MESSAGES = 40; // 20 conversation turns

function getHistory(conversationId) {
  if (!conversationId) return [];
  const entry = conversationStore.get(conversationId);
  if (!entry) return [];
  if (Date.now() - entry.lastAccess > SESSION_TTL_MS) {
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

  if (entry.messages.length > MAX_HISTORY_MESSAGES) {
    entry.messages = entry.messages.slice(-MAX_HISTORY_MESSAGES);
  }
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

function setLastResult(conversationId, result) {
  if (!conversationId || !result) return;
  if (!conversationStore.has(conversationId)) {
    conversationStore.set(conversationId, { messages: [], lastAccess: Date.now(), context: {} });
  }
  const entry = conversationStore.get(conversationId);
  entry.context._lastResult = {
    text: result.text || '',
    table: Array.isArray(result.table) ? result.table : null,
    chart: result.chart || null,
    intent: result.intent || 'unknown',
    storedAt: Date.now()
  };
}

function getLastResult(conversationId) {
  if (!conversationId) return null;
  const entry = conversationStore.get(conversationId);
  const lr = entry?.context?._lastResult;
  if (!lr) return null;
  if (Date.now() - lr.storedAt > SESSION_TTL_MS) return null;
  return lr;
}

function clearSession(conversationId) {
  if (conversationId) conversationStore.delete(conversationId);
}

module.exports = {
  getHistory,
  addToHistory,
  setContextMeta,
  getContextMeta,
  setLastResult,
  getLastResult,
  clearSession
};
