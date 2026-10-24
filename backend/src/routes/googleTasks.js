'use strict';

const express = require('express');
const router = express.Router();
const googleTasksService = require('../services/googleTasksService');
const { mockLeads } = require('../config/inMemoryStore');

// GET /api/google-tasks/status
router.get('/status', async (req, res) => {
  try {
    const status = await googleTasksService.getStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/google-tasks/auth-url
router.get('/auth-url', (req, res) => {
  try {
    const authUrl = googleTasksService.generateAuthUrl();
    res.json({ success: true, authUrl });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
      message: 'Please provide GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env or Settings.'
    });
  }
});

// GET /api/google-tasks/oauth/callback
// Handles Google OAuth2 redirect code
router.get('/oauth/callback', async (req, res) => {
  const { code, error } = req.query;
  const config = googleTasksService.getConfig();

  if (error) {
    console.error('[GoogleTasks OAuth Error]', error);
    return res.redirect(`${config.frontendRedirect}?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${config.frontendRedirect}?error=missing_code`);
  }

  try {
    await googleTasksService.handleCallback(code);
    res.redirect(`${config.frontendRedirect}?connected=true`);
  } catch (err) {
    console.error('[GoogleTasks OAuth Callback Failure]', err);
    res.redirect(`${config.frontendRedirect}?error=${encodeURIComponent(err.message)}`);
  }
});

// POST /api/google-tasks/disconnect
router.post('/disconnect', (req, res) => {
  try {
    googleTasksService.clearTokens();
    res.json({ success: true, message: 'Google Tasks account disconnected successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/google-tasks/lists
router.get('/lists', async (req, res) => {
  try {
    const lists = await googleTasksService.getTaskLists();
    res.json({ success: true, lists });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/google-tasks/lists
router.post('/lists', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Task list title is required.' });
    }
    const list = await googleTasksService.createTaskList(title);
    res.json({ success: true, list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/google-tasks
router.get('/', async (req, res) => {
  try {
    const { listId = '@default', showCompleted } = req.query;
    const result = await googleTasksService.getTasks(listId, {
      showCompleted: showCompleted !== 'false'
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/google-tasks
router.post('/', async (req, res) => {
  try {
    const { listId = '@default', title, notes, due, priority, leadId, leadName } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Task title is required.' });
    }

    const task = await googleTasksService.createTask({
      listId,
      title,
      notes,
      due,
      priority,
      leadId,
      leadName
    });
    res.status(201).json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/google-tasks/:taskId
router.patch('/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { listId = '@default', title, notes, status, due, priority } = req.body;

    const updated = await googleTasksService.updateTask({
      listId,
      taskId,
      title,
      notes,
      status,
      due,
      priority
    });
    res.json({ success: true, task: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/google-tasks/:taskId
router.delete('/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { listId = '@default' } = req.query;

    const result = await googleTasksService.deleteTask({ listId, taskId });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/google-tasks/clear-completed
router.post('/clear-completed', async (req, res) => {
  try {
    const { listId = '@default' } = req.body;
    const result = await googleTasksService.clearCompleted({ listId });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/google-tasks/sync-lead
router.post('/sync-lead', async (req, res) => {
  try {
    const { leadId, leadName, phone, machineInterest, reminderDate, notes } = req.body;
    if (!leadName && !leadId) {
      return res.status(400).json({ success: false, error: 'Lead details required for task sync.' });
    }

    const task = await googleTasksService.syncLeadFollowUp({
      leadId,
      leadName,
      phone,
      machineInterest,
      reminderDate,
      notes
    });
    res.status(201).json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/google-tasks/sync-pending
router.post('/sync-pending', async (req, res) => {
  try {
    // Get pending leads from inMemoryStore or passed in body
    const leads = (Array.isArray(req.body.leads) && req.body.leads.length > 0)
      ? req.body.leads
      : (mockLeads || []).filter(l => l.status === 'New' || l.status === 'Hot' || l.status === 'Follow-Up');

    const synced = await googleTasksService.syncPendingLeads(leads.slice(0, 10)); // sync top 10
    res.json({ success: true, syncedCount: synced.length, details: synced });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
