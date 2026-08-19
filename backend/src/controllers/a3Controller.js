'use strict';
const { processQuery, getSuggestions } = require('../services/a3Service');

/**
 * POST /api/a3/query
 * Body: { query: string, conversationId?: string }
 * Returns: { text, table, chart, intent, processingMs }
 */
async function query(req, res, next) {
  try {
    const { query: userQuery, conversationId } = req.body;
    if (!userQuery || typeof userQuery !== 'string' || !userQuery.trim()) {
      return res.status(400).json({ error: 'query field is required and must be a non-empty string.' });
    }

    const t0 = Date.now();
    const result = await processQuery(userQuery.trim(), conversationId || null);
    const processingMs = Date.now() - t0;

    return res.json({
      ...result,
      query: userQuery.trim(),
      processingMs
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/a3/suggestions
 * Returns quick-access suggestion chips for the chat panel UI.
 */
function suggestions(req, res) {
  return res.json({ suggestions: getSuggestions() });
}

module.exports = { query, suggestions };
