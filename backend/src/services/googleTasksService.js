'use strict';

const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
const { safeReadJson, safeWriteJson } = require('../utils/safeStorage');

const TOKENS_FILE = path.join(__dirname, '../../google_tasks_tokens.json');
const MOCK_DATA_FILE = path.join(__dirname, '../../google_tasks_data.json');

const SCOPES = [
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// Initial mock tasks if no data exists yet
const INITIAL_MOCK_TASKS = [
  {
    id: 'gtask-1',
    title: 'Follow-up with Rahul Sharma on Double Die Machine quotation',
    notes: 'Lead ID: LEAD-1002 | Phone: +91 98260 12345 | Discuss 10% token advance & delivery schedule to Indore.',
    status: 'needsAction',
    due: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    updated: new Date().toISOString(),
    priority: 'high',
    leadId: 'LEAD-1002',
    leadName: 'Rahul Sharma'
  },
  {
    id: 'gtask-2',
    title: 'Verify 10% payment gate receipt for Global Tech Ltd',
    notes: 'Invoice #APS-2026-089. Amount: ₹42,000 for Hydraulic Thali Press. Confirm UTR with accounts team.',
    status: 'needsAction',
    due: new Date(Date.now() + 3600000 * 5).toISOString(), // today
    updated: new Date().toISOString(),
    priority: 'high',
    leadId: 'LEAD-1004',
    leadName: 'Global Tech Ltd'
  },
  {
    id: 'gtask-3',
    title: 'Dispatch WhatsApp machine video catalogue to Vikram Patel',
    notes: 'Send 4-minute demonstration of Single Die High Speed Crank Machine.',
    status: 'completed',
    completed: new Date(Date.now() - 3600000 * 3).toISOString(),
    due: new Date().toISOString(),
    updated: new Date().toISOString(),
    priority: 'medium',
    leadId: 'LEAD-1005',
    leadName: 'Vikram Patel'
  },
  {
    id: 'gtask-4',
    title: 'Reorder 120 GSM Raw Silver Craft Paper Rolls for Factory',
    notes: 'Stock level at Indore Warehouse Bay B-1 is low (under 10 bundles). Vendor: MP Paper Mills.',
    status: 'needsAction',
    due: new Date(Date.now() + 86400000 * 2).toISOString(),
    updated: new Date().toISOString(),
    priority: 'medium'
  }
];

const INITIAL_MOCK_LISTS = [
  {
    id: 'aps-default-list',
    title: 'APS Enterprise Tasks & Follow-ups',
    updated: new Date().toISOString()
  },
  {
    id: 'crm-leads-list',
    title: 'Hot CRM Leads Follow-up',
    updated: new Date().toISOString()
  }
];

class GoogleTasksService {
  constructor() {
    this._oauth2Client = null;
    this._initialized = false;
  }

  getConfig() {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google-tasks/oauth/callback',
      frontendRedirect: process.env.GOOGLE_TASKS_FRONTEND_REDIRECT || 'http://localhost:5173/tasks',
      defaultListName: process.env.GOOGLE_TASKS_DEFAULT_LIST_NAME || 'APS Enterprise Follow-ups'
    };
  }

  isOAuthConfigured() {
    const { clientId, clientSecret } = this.getConfig();
    return Boolean(
      clientId &&
      clientSecret &&
      clientId.length > 5 &&
      clientSecret.length > 5 &&
      !clientId.includes('your_google_client_id')
    );
  }

  getOAuth2Client() {
    const config = this.getConfig();
    if (!this.isOAuthConfigured()) {
      return null;
    }

    if (!this._oauth2Client) {
      this._oauth2Client = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
        config.redirectUri
      );

      // Listen for token updates (refresh token automatic usage)
      this._oauth2Client.on('tokens', (newTokens) => {
        console.log('[GoogleTasks] Tokens refreshed automatically by Google OAuth client');
        const existingTokens = this.getSavedTokens() || {};
        const merged = { ...existingTokens, ...newTokens, updatedAt: new Date().toISOString() };
        safeWriteJson(TOKENS_FILE, merged);
      });
    }

    // Load saved tokens if available
    const saved = this.getSavedTokens();
    if (saved && saved.access_token) {
      this._oauth2Client.setCredentials(saved);
    }

    return this._oauth2Client;
  }

  getSavedTokens() {
    return safeReadJson(TOKENS_FILE, null);
  }

  saveTokens(tokens, userInfo = null) {
    const existing = this.getSavedTokens() || {};
    const payload = {
      ...existing,
      ...tokens,
      user: userInfo || existing.user || null,
      updatedAt: new Date().toISOString(),
      connectedAt: existing.connectedAt || new Date().toISOString()
    };
    safeWriteJson(TOKENS_FILE, payload);
    return payload;
  }

  clearTokens() {
    try {
      safeWriteJson(TOKENS_FILE, null);
      if (this._oauth2Client) {
        this._oauth2Client = null;
      }
      return true;
    } catch (e) {
      console.error('[GoogleTasks] Failed to clear tokens:', e.message);
      return false;
    }
  }

  generateAuthUrl() {
    const oauth2 = this.getOAuth2Client();
    if (!oauth2) {
      throw new Error('Google OAuth credentials not configured in backend/.env');
    }

    return oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES
    });
  }

  async handleCallback(code) {
    const oauth2 = this.getOAuth2Client();
    if (!oauth2) {
      throw new Error('Google OAuth credentials not configured in backend/.env');
    }

    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    // Fetch user profile info
    let userInfo = null;
    try {
      const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 });
      const userRes = await oauth2Api.userinfo.get();
      userInfo = {
        email: userRes.data.email,
        name: userRes.data.name,
        picture: userRes.data.picture
      };
    } catch (err) {
      console.warn('[GoogleTasks] Could not fetch userinfo:', err.message);
    }

    this.saveTokens(tokens, userInfo);
    return { tokens, userInfo };
  }

  async getStatus() {
    const config = this.getConfig();
    const isConfigured = this.isOAuthConfigured();
    const tokens = this.getSavedTokens();

    const isConnected = Boolean(tokens && (tokens.access_token || tokens.refresh_token));

    let tokenValid = isConnected;
    if (isConnected && tokens.expiry_date) {
      tokenValid = Date.now() < tokens.expiry_date;
    }

    // Get counts for display
    let tasksCount = 0;
    let pendingCount = 0;
    try {
      const listData = await this.getTasks();
      tasksCount = listData.tasks ? listData.tasks.length : 0;
      pendingCount = listData.tasks ? listData.tasks.filter(t => t.status !== 'completed').length : 0;
    } catch {}

    return {
      configured: isConfigured,
      connected: isConnected,
      isMock: !isConfigured || !isConnected,
      tokenValid,
      user: tokens?.user || (isConfigured ? null : {
        name: 'APS Enterprise Workspace',
        email: 'ops@apsenterprises.in',
        picture: null
      }),
      connectedAt: tokens?.connectedAt || null,
      clientIdMasked: config.clientId ? `${config.clientId.substring(0, 12)}...apps.googleusercontent.com` : null,
      redirectUri: config.redirectUri,
      tasksCount,
      pendingCount
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Mock Data Helpers (used when OAuth not connected or demo mode)
  // ─────────────────────────────────────────────────────────────────────────
  _getMockData() {
    let data = safeReadJson(MOCK_DATA_FILE, null);
    if (!data || !Array.isArray(data.tasks)) {
      data = {
        lists: INITIAL_MOCK_LISTS,
        tasks: INITIAL_MOCK_TASKS
      };
      safeWriteJson(MOCK_DATA_FILE, data);
    }
    return data;
  }

  _saveMockData(data) {
    safeWriteJson(MOCK_DATA_FILE, data);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Task Lists
  // ─────────────────────────────────────────────────────────────────────────
  async getTaskLists() {
    const oauth2 = this.getOAuth2Client();
    const tokens = this.getSavedTokens();

    if (oauth2 && tokens?.access_token) {
      try {
        const tasksApi = google.tasks({ version: 'v1', auth: oauth2 });
        const res = await tasksApi.tasklists.list({ maxResults: 100 });
        return res.data.items || [];
      } catch (err) {
        console.warn('[GoogleTasks] Live API getTaskLists failed, falling back to mock:', err.message);
      }
    }

    // Fallback Mock
    const mock = this._getMockData();
    return mock.lists;
  }

  async createTaskList(title) {
    if (!title || !title.trim()) {
      throw new Error('Task list title is required');
    }

    const oauth2 = this.getOAuth2Client();
    const tokens = this.getSavedTokens();

    if (oauth2 && tokens?.access_token) {
      try {
        const tasksApi = google.tasks({ version: 'v1', auth: oauth2 });
        const res = await tasksApi.tasklists.insert({
          requestBody: { title: title.trim() }
        });
        return res.data;
      } catch (err) {
        console.warn('[GoogleTasks] Live API createTaskList failed:', err.message);
      }
    }

    // Mock
    const mock = this._getMockData();
    const newList = {
      id: `list-${Date.now()}`,
      title: title.trim(),
      updated: new Date().toISOString()
    };
    mock.lists.push(newList);
    this._saveMockData(mock);
    return newList;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Tasks CRUD
  // ─────────────────────────────────────────────────────────────────────────
  async getTasks(listId = '@default', options = {}) {
    const oauth2 = this.getOAuth2Client();
    const tokens = this.getSavedTokens();

    if (oauth2 && tokens?.access_token) {
      try {
        const tasksApi = google.tasks({ version: 'v1', auth: oauth2 });
        const params = {
          tasklist: listId === '@default' ? '@default' : listId,
          showCompleted: options.showCompleted !== false,
          showHidden: true,
          maxResults: 100
        };
        if (options.dueMin) params.dueMin = options.dueMin;
        if (options.dueMax) params.dueMax = options.dueMax;

        const res = await tasksApi.tasks.list(params);
        return {
          tasks: res.data.items || [],
          isLiveGoogle: true
        };
      } catch (err) {
        console.warn('[GoogleTasks] Live API getTasks failed, falling back to mock:', err.message);
      }
    }

    // Mock
    const mock = this._getMockData();
    let tasks = [...mock.tasks];
    if (options.showCompleted === false) {
      tasks = tasks.filter(t => t.status !== 'completed');
    }
    return {
      tasks,
      isLiveGoogle: false
    };
  }

  async createTask({ listId = '@default', title, notes = '', due = null, priority = 'medium', leadId = null, leadName = null }) {
    if (!title || !title.trim()) {
      throw new Error('Task title is required');
    }

    const oauth2 = this.getOAuth2Client();
    const tokens = this.getSavedTokens();

    const taskData = {
      title: title.trim(),
      notes: notes || '',
      status: 'needsAction'
    };

    if (due) {
      // Google Tasks due date requires RFC 3339 format (e.g. 2026-10-24T00:00:00.000Z)
      const d = new Date(due);
      if (!isNaN(d.getTime())) {
        taskData.due = d.toISOString();
      }
    }

    if (oauth2 && tokens?.access_token) {
      try {
        const tasksApi = google.tasks({ version: 'v1', auth: oauth2 });
        const res = await tasksApi.tasks.insert({
          tasklist: listId === '@default' ? '@default' : listId,
          requestBody: taskData
        });
        return { ...res.data, priority, leadId, leadName, isLiveGoogle: true };
      } catch (err) {
        console.warn('[GoogleTasks] Live API createTask failed, using mock:', err.message);
      }
    }

    // Mock
    const mock = this._getMockData();
    const newTask = {
      id: `gtask-${Date.now()}`,
      title: taskData.title,
      notes: taskData.notes,
      due: taskData.due || null,
      status: 'needsAction',
      updated: new Date().toISOString(),
      priority,
      leadId,
      leadName
    };
    mock.tasks.unshift(newTask);
    this._saveMockData(mock);
    return { ...newTask, isLiveGoogle: false };
  }

  async updateTask({ listId = '@default', taskId, title, notes, status, due, priority }) {
    if (!taskId) {
      throw new Error('Task ID is required');
    }

    const oauth2 = this.getOAuth2Client();
    const tokens = this.getSavedTokens();

    const patchBody = {};
    if (title !== undefined) patchBody.title = title;
    if (notes !== undefined) patchBody.notes = notes;
    if (status !== undefined) {
      patchBody.status = status;
      if (status === 'completed') {
        patchBody.completed = new Date().toISOString();
      } else {
        patchBody.completed = null;
      }
    }
    if (due !== undefined) {
      if (due) {
        const d = new Date(due);
        if (!isNaN(d.getTime())) patchBody.due = d.toISOString();
      } else {
        patchBody.due = null;
      }
    }

    if (oauth2 && tokens?.access_token) {
      try {
        const tasksApi = google.tasks({ version: 'v1', auth: oauth2 });
        const res = await tasksApi.tasks.patch({
          tasklist: listId === '@default' ? '@default' : listId,
          task: taskId,
          requestBody: patchBody
        });
        return { ...res.data, isLiveGoogle: true };
      } catch (err) {
        console.warn('[GoogleTasks] Live API updateTask failed:', err.message);
      }
    }

    // Mock
    const mock = this._getMockData();
    const index = mock.tasks.findIndex(t => t.id === taskId);
    if (index === -1) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    const updated = {
      ...mock.tasks[index],
      ...patchBody,
      priority: priority || mock.tasks[index].priority,
      updated: new Date().toISOString()
    };
    mock.tasks[index] = updated;
    this._saveMockData(mock);
    return { ...updated, isLiveGoogle: false };
  }

  async deleteTask({ listId = '@default', taskId }) {
    if (!taskId) {
      throw new Error('Task ID is required');
    }

    const oauth2 = this.getOAuth2Client();
    const tokens = this.getSavedTokens();

    if (oauth2 && tokens?.access_token) {
      try {
        const tasksApi = google.tasks({ version: 'v1', auth: oauth2 });
        await tasksApi.tasks.delete({
          tasklist: listId === '@default' ? '@default' : listId,
          task: taskId
        });
        return { success: true, isLiveGoogle: true };
      } catch (err) {
        console.warn('[GoogleTasks] Live API deleteTask failed:', err.message);
      }
    }

    // Mock
    const mock = this._getMockData();
    mock.tasks = mock.tasks.filter(t => t.id !== taskId);
    this._saveMockData(mock);
    return { success: true, isLiveGoogle: false };
  }

  async clearCompleted({ listId = '@default' }) {
    const oauth2 = this.getOAuth2Client();
    const tokens = this.getSavedTokens();

    if (oauth2 && tokens?.access_token) {
      try {
        const tasksApi = google.tasks({ version: 'v1', auth: oauth2 });
        await tasksApi.tasks.clear({
          tasklist: listId === '@default' ? '@default' : listId
        });
        return { success: true, isLiveGoogle: true };
      } catch (err) {
        console.warn('[GoogleTasks] Live API clearCompleted failed:', err.message);
      }
    }

    // Mock
    const mock = this._getMockData();
    mock.tasks = mock.tasks.filter(t => t.status !== 'completed');
    this._saveMockData(mock);
    return { success: true, isLiveGoogle: false };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CRM Lead Sync Integration
  // ─────────────────────────────────────────────────────────────────────────
  async syncLeadFollowUp({ leadId, leadName, phone, machineInterest, reminderDate, notes }) {
    const title = `Follow-up: ${leadName || 'Lead'} (${machineInterest || 'Dona Pattal Machine'})`;
    const taskNotes = [
      `Lead ID: ${leadId || 'N/A'}`,
      `Client: ${leadName || 'Prospective Buyer'}`,
      `Phone: ${phone || 'N/A'}`,
      `Product Interest: ${machineInterest || 'APS Machinery'}`,
      notes ? `Notes: ${notes}` : null,
      `Scheduled via APS Enterprise Cockpit`
    ].filter(Boolean).join('\n');

    const due = reminderDate || new Date(Date.now() + 86400000).toISOString();

    return this.createTask({
      title,
      notes: taskNotes,
      due,
      priority: 'high',
      leadId,
      leadName
    });
  }

  async syncPendingLeads(leads = []) {
    const results = [];
    for (const lead of leads) {
      try {
        const item = await this.syncLeadFollowUp({
          leadId: lead.id,
          leadName: lead.name,
          phone: lead.phone,
          machineInterest: lead.machineInterest || lead.product,
          notes: lead.notes || lead.requirements
        });
        results.push({ leadId: lead.id, taskId: item.id, success: true });
      } catch (err) {
        results.push({ leadId: lead.id, error: err.message, success: false });
      }
    }
    return results;
  }
}

module.exports = new GoogleTasksService();
