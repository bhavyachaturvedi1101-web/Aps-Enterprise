'use strict';
const { processQuery, getSuggestions } = require('../services/a3Service');
const aiMemory = require('../services/aiMemoryService');
const { Lead } = require('../models');

/**
 * POST /api/a3/query
 * Body: { query: string, conversationId?: string }
 * Returns: { text, table, chart, intent, processingMs }
 */
async function query(req, res, next) {
  try {
    const { query: userQuery, conversationId, userRole, userName, employeeId } = req.body;
    if (!userQuery || typeof userQuery !== 'string' || !userQuery.trim()) {
      return res.status(400).json({ error: 'query field is required and must be a non-empty string.' });
    }

    const effectiveRole = (userRole || req.user?.role || '').toLowerCase().trim();
    const effectiveName = userName || req.user?.name || 'User';
    const effectiveEmpId = employeeId || req.user?.employeeId || req.user?.id || null;

    // Enforce strict private conversation partitioning per user/role
    const rawUserScope = `${effectiveRole || 'user'}_${String(effectiveEmpId || effectiveName).toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;
    const safeConvId = conversationId && conversationId.includes(rawUserScope)
      ? conversationId
      : `conv_${rawUserScope}_${conversationId || Date.now()}`;

    const t0 = Date.now();
    const result = await processQuery(userQuery.trim(), safeConvId, {
      userRole: effectiveRole,
      userName: effectiveName,
      employeeId: effectiveEmpId
    });
    const processingMs = Date.now() - t0;

    return res.json({
      ...result,
      query: userQuery.trim(),
      conversationId: safeConvId,
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
  const userRole = (req.query.role || req.user?.role || '').toLowerCase().trim();
  return res.json({ suggestions: getSuggestions(userRole) });
}

/**
 * GET /api/a3/memory
 * Returns persistent memories list, categorized with counts.
 */
function getMemories(req, res) {
  try {
    const search = req.query.search || null;
    const memories = search ? aiMemory.queryMemories(search, 50) : aiMemory.loadMemories();
    const learnedFacts = memories.filter(m => m.type === 'LEARNED_FACT');
    const taskAssigned = memories.filter(m => m.type === 'TASK_ASSIGNED');
    const taskRejected = memories.filter(m => m.type === 'TASK_REJECTED');

    return res.json({
      success: true,
      totalCount: memories.length,
      counts: {
        learnedFacts: learnedFacts.length,
        taskAssigned: taskAssigned.length,
        taskRejected: taskRejected.length,
        total: memories.length
      },
      memories
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/a3/memory
 * Directly learn/save a new fact or operational instruction to memory
 * Body: { fact: string, topic?: string, target?: string }
 */
function addMemory(req, res) {
  try {
    if (req.user?.role === 'employee') {
      return res.status(403).json({ success: false, error: 'Access Denied', message: 'AI Persistent Memory modification is restricted to Administrators.' });
    }
    const { fact, topic, target, type } = req.body;
    if (!fact || !fact.trim()) {
      return res.status(400).json({ success: false, error: 'fact field is required' });
    }

    const memory = aiMemory.recordMemory({
      type: type || 'LEARNED_FACT',
      topic: topic || 'user_directive',
      target: target || 'General',
      summary: fact.trim(),
      status: 'saved',
      details: { addedVia: 'api_manual' }
    });

    return res.status(201).json({
      success: true,
      message: 'Memory saved successfully',
      memory
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * DELETE /api/a3/memory/:id
 * Delete a specific memory entry
 */
function deleteMemory(req, res) {
  try {
    if (req.user?.role === 'employee') {
      return res.status(403).json({ success: false, error: 'Access Denied', message: 'AI Persistent Memory modification is restricted to Administrators.' });
    }
    const { id } = req.params;
    const ok = aiMemory.deleteMemory(id);
    return res.json({ success: ok });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * DELETE /api/a3/memory
 * Reset all memories to default baseline
 */
function clearMemories(req, res) {
  try {
    if (req.user?.role === 'employee') {
      return res.status(403).json({ success: false, error: 'Access Denied', message: 'AI Persistent Memory modification is restricted to Administrators.' });
    }
    const reset = aiMemory.clearMemories();
    return res.json({ success: true, memories: reset });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET/POST /api/a3/export
 * Query/Body: { format: 'csv'|'xlsx'|'pdf'|'xml'|'docx'|'json', type?: string }
 * Sends file directly as attachment download with proper headers.
 */
async function exportFile(req, res) {
  try {
    const format = (req.query.format || req.body?.format || 'csv').toLowerCase();
    let leads = [];
    try {
      const leadsData = await Lead.findAll();
      leads = leadsData.map(l => (l.toJSON ? l.toJSON() : l));
    } catch {
      const { mockLeads } = require('../config/inMemoryStore');
      leads = mockLeads || [];
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    let fileName = `APS_Enterprise_Export_${dateStr}.${format}`;
    let mimeType = 'text/csv';
    let content = '';

    if (format === 'csv' || format === 'xlsx') {
      mimeType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      content = 'ID,Name,Stage,Budget,Company,AssignedEmployee\n' +
        leads.map(l => `"${l.id}","${l.name}","${l.stage}","${l.budget}","${l.company || ''}","${l.assignedEmployeeId || ''}"`).join('\n');
    } else if (format === 'xml') {
      mimeType = 'application/xml';
      content = '<?xml version="1.0" encoding="UTF-8"?>\n<leads>\n' +
        leads.map(l => `  <lead>\n    <id>${l.id}</id>\n    <name>${l.name}</name>\n    <stage>${l.stage}</stage>\n    <budget>${l.budget}</budget>\n  </lead>`).join('\n') +
        '\n</leads>';
    } else if (format === 'docx' || format === 'pdf') {
      mimeType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      content = `APS Enterprise Dashboard Export (${format.toUpperCase()})\nDate: ${dateStr}\n\nSummary of ${leads.length} Records:\n` +
        leads.map((l, i) => `${i + 1}. [${l.id}] ${l.name} | Stage: ${l.stage} | Budget: ₹${Number(l.budget || 0).toLocaleString('en-IN')}`).join('\n');
    } else {
      mimeType = 'application/json';
      content = JSON.stringify(leads, null, 2);
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(content);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export file' });
  }
}

module.exports = {
  query,
  suggestions,
  exportFile,
  getMemories,
  addMemory,
  deleteMemory,
  clearMemories
};
