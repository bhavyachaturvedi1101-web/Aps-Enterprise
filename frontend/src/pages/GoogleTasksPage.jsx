import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BASE_API_URL } from '../services/api';

export default function GoogleTasksPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState({
    configured: false,
    connected: false,
    isMock: true,
    user: null,
    redirectUri: ''
  });

  const [taskLists, setTaskLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState('@default');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'due_today' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Add State
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [isAdding, setIsAdding] = useState(false);

  // New List Modal
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);

  // Guide / Credentials Modal
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Lead Syncing State
  const [isSyncingLeads, setIsSyncingLeads] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Check URL query parameters for OAuth redirect status
  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      showToast('Google Account connected successfully! Tasks synced with Google Cloud.');
    } else if (searchParams.get('error')) {
      showToast(`Google OAuth error: ${searchParams.get('error')}`);
    }
  }, [searchParams]);

  // Load Status and Task Lists
  const loadStatusAndLists = async () => {
    try {
      const res = await fetch(`${BASE_API_URL}/google-tasks/status`);
      const data = await res.json();
      if (data.success) {
        setStatus(data);
      }

      const listsRes = await fetch(`${BASE_API_URL}/google-tasks/lists`);
      const listsData = await listsRes.json();
      if (listsData.success && Array.isArray(listsData.lists)) {
        setTaskLists(listsData.lists);
        if (listsData.lists.length > 0 && selectedListId === '@default') {
          // Keep @default or select first list
        }
      }
    } catch (err) {
      console.warn('Failed to fetch status/lists:', err.message);
    }
  };

  // Load Tasks
  const loadTasks = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch(`${BASE_API_URL}/google-tasks?listId=${encodeURIComponent(selectedListId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStatusAndLists();
    loadTasks();
  }, [selectedListId]);

  // Connect Google Account (Starts OAuth2 flow)
  const handleConnectGoogle = async () => {
    try {
      const res = await fetch(`${BASE_API_URL}/google-tasks/auth-url`);
      const data = await res.json();
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setShowSetupModal(true);
      }
    } catch {
      setShowSetupModal(true);
    }
  };

  // Disconnect Google Account
  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Google Tasks? You can reconnect anytime.')) return;
    try {
      const res = await fetch(`${BASE_API_URL}/google-tasks/disconnect`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Google Tasks disconnected.');
        loadStatusAndLists();
        loadTasks();
      }
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Create Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsAdding(true);

    try {
      const res = await fetch(`${BASE_API_URL}/google-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId: selectedListId,
          title: newTitle.trim(),
          notes: newNotes.trim(),
          due: newDue || null,
          priority: newPriority
        })
      });
      const data = await res.json();
      if (data.success && data.task) {
        setTasks(prev => [data.task, ...prev]);
        setNewTitle('');
        setNewNotes('');
        setNewDue('');
        setNewPriority('medium');
        showToast('Task added to Google Tasks!');
      } else {
        showToast(data.error || 'Failed to create task');
      }
    } catch (err) {
      showToast(`Network error: ${err.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  // Toggle Complete
  const handleToggleTask = async (task) => {
    const isCompleted = task.status === 'completed';
    const nextStatus = isCompleted ? 'needsAction' : 'completed';

    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus, completed: nextStatus === 'completed' ? new Date().toISOString() : null } : t));

    try {
      const res = await fetch(`${BASE_API_URL}/google-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId: selectedListId,
          status: nextStatus
        })
      });
      const data = await res.json();
      if (!data.success) {
        loadTasks();
      } else {
        showToast(nextStatus === 'completed' ? 'Task marked complete!' : 'Task reopened.');
      }
    } catch {
      loadTasks();
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this task from Google Tasks?')) return;

    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await fetch(`${BASE_API_URL}/google-tasks/${taskId}?listId=${encodeURIComponent(selectedListId)}`, {
        method: 'DELETE'
      });
      showToast('Task deleted.');
    } catch (err) {
      showToast(`Error: ${err.message}`);
      loadTasks();
    }
  };

  // Clear Completed Tasks
  const handleClearCompleted = async () => {
    const completedCount = tasks.filter(t => t.status === 'completed').length;
    if (completedCount === 0) {
      showToast('No completed tasks to clear.');
      return;
    }
    if (!window.confirm(`Clear all ${completedCount} completed tasks?`)) return;

    setTasks(prev => prev.filter(t => t.status !== 'completed'));
    try {
      await fetch(`${BASE_API_URL}/google-tasks/clear-completed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId: selectedListId })
      });
      showToast('Completed tasks cleared.');
    } catch (err) {
      showToast(`Error: ${err.message}`);
      loadTasks();
    }
  };

  // Create New List
  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    setIsCreatingList(true);
    try {
      const res = await fetch(`${BASE_API_URL}/google-tasks/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newListName.trim() })
      });
      const data = await res.json();
      if (data.success && data.list) {
        setTaskLists(prev => [...prev, data.list]);
        setSelectedListId(data.list.id);
        setShowNewListModal(false);
        setNewListName('');
        showToast(`Created task list "${data.list.title}"`);
      }
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsCreatingList(false);
    }
  };

  // Sync Hot CRM Leads to Google Tasks
  const handleSyncPendingLeads = async () => {
    setIsSyncingLeads(true);
    try {
      const res = await fetch(`${BASE_API_URL}/google-tasks/sync-pending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Synced ${data.syncedCount || 0} CRM follow-up tasks to Google Tasks!`);
        loadTasks();
      } else {
        showToast(data.error || 'Failed to sync CRM leads');
      }
    } catch (err) {
      showToast(`Sync error: ${err.message}`);
    } finally {
      setIsSyncingLeads(false);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = total - completed;

    const todayStr = new Date().toISOString().slice(0, 10);
    const dueTodayOrOverdue = tasks.filter(t => {
      if (t.status === 'completed' || !t.due) return false;
      const dueStr = new Date(t.due).toISOString().slice(0, 10);
      return dueStr <= todayStr;
    }).length;

    const highPriority = tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length;

    return { total, completed, pending, dueTodayOrOverdue, highPriority };
  }, [tasks]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    return tasks.filter(task => {
      // Filter tab
      if (filter === 'pending' && task.status === 'completed') return false;
      if (filter === 'completed' && task.status !== 'completed') return false;
      if (filter === 'due_today') {
        if (task.status === 'completed' || !task.due) return false;
        const dueStr = new Date(task.due).toISOString().slice(0, 10);
        if (dueStr > todayStr) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = (task.title || '').toLowerCase().includes(q);
        const inNotes = (task.notes || '').toLowerCase().includes(q);
        const inLead = (task.leadName || task.leadId || '').toLowerCase().includes(q);
        if (!inTitle && !inNotes && !inLead) return false;
      }

      return true;
    });
  }, [tasks, filter, searchQuery]);

  return (
    <div style={styles.page}>
      {/* Toast */}
      {toastMsg && (
        <div style={styles.toast}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.googleIconBadge}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#4285F4"/>
              <path d="M9.5 16.5l-4-4 1.41-1.41 2.59 2.58 7.09-7.09 1.41 1.41-8.5 8.51z" fill="#ffffff"/>
              <circle cx="18" cy="6" r="3" fill="#EA4335"/>
              <circle cx="19" cy="18" r="2.5" fill="#34A853"/>
              <circle cx="5" cy="18" r="2.5" fill="#FBBC05"/>
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={styles.title}>Google Tasks Workspace</h1>
              {status.connected ? (
                <span style={styles.statusPillConnected}>
                  <span style={styles.statusDotGreen} /> Live Google Tasks Connected
                </span>
              ) : (
                <span style={styles.statusPillDemo}>
                  <span style={styles.statusDotAmber} /> Workspace Sync Store Active
                </span>
              )}
            </div>
            <p style={styles.subtitle}>
              Synchronize APS machinery follow-ups, CRM lead inquiries, 10% payment reminders, and telecaller schedules directly with Google Tasks & Workspace.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={handleSyncPendingLeads}
            disabled={isSyncingLeads}
            style={styles.syncBtn}
            title="Auto-generate tasks in Google Tasks for hot leads needing follow-up"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            <span>{isSyncingLeads ? 'Syncing...' : 'Sync Hot Leads'}</span>
          </button>

          {status.connected ? (
            <div style={styles.userBadge}>
              <div style={styles.userInitial}>
                {status.user?.name ? status.user.name.charAt(0) : 'G'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={styles.userEmail}>{status.user?.email || 'Connected Account'}</span>
                <span style={styles.userStatusSub}>Cloud Sync Online</span>
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                style={styles.disconnectBtn}
                title="Disconnect Google Account"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleConnectGoogle}
                style={styles.connectGoogleBtn}
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Authorize Google</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSetupModal(true)}
                style={styles.setupGuideBtn}
                title="Google Cloud Console credentials guide"
              >
                Setup Info
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Total Tasks</div>
          <div style={styles.metricValue}>{metrics.total}</div>
          <div style={styles.metricSub}>In active workspace</div>
        </div>
        <div style={styles.metricCard}>
          <div style={{ ...styles.metricLabel, color: '#2563eb' }}>Pending Follow-ups</div>
          <div style={{ ...styles.metricValue, color: '#1d4ed8' }}>{metrics.pending}</div>
          <div style={styles.metricSub}>Awaiting telecaller action</div>
        </div>
        <div style={styles.metricCard}>
          <div style={{ ...styles.metricLabel, color: '#d97706' }}>Due Today / Overdue</div>
          <div style={{ ...styles.metricValue, color: '#b45309' }}>{metrics.dueTodayOrOverdue}</div>
          <div style={styles.metricSub}>Requires immediate outreach</div>
        </div>
        <div style={styles.metricCard}>
          <div style={{ ...styles.metricLabel, color: '#059669' }}>Completed</div>
          <div style={{ ...styles.metricValue, color: '#047857' }}>{metrics.completed}</div>
          <div style={styles.metricSub}>Verified & closed</div>
        </div>
      </div>

      {/* Main Card: Task List & Quick Add */}
      <div style={styles.mainCard}>
        {/* Top Filter and List Selector Bar */}
        <div style={styles.filterBar}>
          {/* List Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>List:</span>
            <select
              value={selectedListId}
              onChange={(e) => setSelectedListId(e.target.value)}
              style={styles.listSelect}
            >
              <option value="@default">Default List (APS Tasks)</option>
              {taskLists.map(l => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewListModal(true)}
              style={styles.newListBtn}
              title="Create new task list"
            >
              + New List
            </button>
          </div>

          {/* Search Input */}
          <div style={styles.searchWrap}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search tasks, clients, machinery..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '13px' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div style={styles.tabsWrap}>
            {[
              { key: 'all', label: `All (${metrics.total})` },
              { key: 'pending', label: `Pending (${metrics.pending})` },
              { key: 'due_today', label: `Due Today (${metrics.dueTodayOrOverdue})` },
              { key: 'completed', label: `Completed (${metrics.completed})` }
            ].map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                style={{
                  ...styles.tabBtn,
                  backgroundColor: filter === t.key ? '#0f172a' : '#f1f5f9',
                  color: filter === t.key ? '#ffffff' : '#475569',
                  fontWeight: filter === t.key ? 700 : 600
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Add Task Form */}
        <form onSubmit={handleCreateTask} style={styles.addForm}>
          <div style={styles.addFormRow}>
            <input
              type="text"
              placeholder="Add a new task (e.g., Call Indore dealer for Single Die machine demo)..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              style={styles.titleInput}
            />

            <input
              type="date"
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
              style={styles.dateInput}
              title="Due Date"
            />

            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              style={styles.prioritySelect}
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority ⚡</option>
            </select>

            <button
              type="submit"
              disabled={isAdding || !newTitle.trim()}
              style={styles.addSubmitBtn}
            >
              {isAdding ? 'Adding...' : '+ Add Task'}
            </button>
          </div>

          <div style={{ marginTop: 8 }}>
            <input
              type="text"
              placeholder="Add optional notes, client phone number, or quotation reference..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              style={styles.notesInput}
            />
          </div>
        </form>

        {/* Tasks Stream List */}
        <div style={styles.taskListWrap}>
          {loading ? (
            <div style={styles.emptyState}>
              <div style={styles.spinner} />
              <div style={{ marginTop: 12, fontSize: '0.86rem', color: '#64748b' }}>
                Fetching Google Tasks...
              </div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div style={styles.emptyState}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.8">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              <div style={{ fontWeight: 700, color: '#334155', marginTop: 10 }}>No tasks found in this view</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
                {searchQuery ? 'Try clearing your search term.' : 'Use the quick-add bar above to create your first task.'}
              </div>
            </div>
          ) : (
            filteredTasks.map(task => {
              const isDone = task.status === 'completed';
              const isOverdue = !isDone && task.due && new Date(task.due) < new Date(new Date().setHours(0, 0, 0, 0));
              const isToday = !isDone && task.due && new Date(task.due).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);

              return (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task)}
                  style={{
                    ...styles.taskCard,
                    backgroundColor: isDone ? '#fafafa' : '#ffffff',
                    borderLeft: task.priority === 'high' ? '4px solid #ef4444' : task.priority === 'low' ? '4px solid #cbd5e1' : '4px solid #3b82f6'
                  }}
                >
                  {/* Checkbox */}
                  <div
                    style={{
                      ...styles.checkbox,
                      backgroundColor: isDone ? '#2563eb' : '#ffffff',
                      borderColor: isDone ? '#2563eb' : '#cbd5e1'
                    }}
                  >
                    {isDone && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>

                  {/* Task Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: isDone ? '#94a3b8' : '#0f172a',
                          textDecoration: isDone ? 'line-through' : 'none'
                        }}
                      >
                        {task.title}
                      </span>

                      {/* Right Tag Group */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {task.priority === 'high' && (
                          <span style={styles.priorityHighBadge}>High ⚡</span>
                        )}

                        {task.due && (
                          <span
                            style={{
                              ...styles.dueBadge,
                              backgroundColor: isOverdue ? '#fef2f2' : isToday ? '#fffbeb' : '#f1f5f9',
                              color: isOverdue ? '#b91c1c' : isToday ? '#b45309' : '#475569'
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            {isOverdue ? 'Overdue: ' : isToday ? 'Due Today: ' : ''}
                            {new Date(task.due).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleDeleteTask(task.id, e)}
                          style={styles.deleteBtn}
                          title="Delete task"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Notes & Lead Info */}
                    {task.notes && (
                      <div style={styles.taskNotes}>
                        {task.notes}
                      </div>
                    )}

                    {/* Associated Lead Link */}
                    {(task.leadName || task.leadId) && (
                      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={styles.leadTag}>
                          CRM Lead: {task.leadName || task.leadId}
                        </span>
                        {task.leadId && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/leads/${task.leadId}`);
                            }}
                            style={styles.openLeadBtn}
                          >
                            Open Lead Details →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div style={styles.cardFooter}>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Showing {filteredTasks.length} of {tasks.length} tasks in <strong>{selectedListId === '@default' ? 'Default List' : selectedListId}</strong>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => loadTasks(true)}
              disabled={refreshing}
              style={styles.footerActionBtn}
            >
              {refreshing ? 'Refreshing...' : '↻ Refresh Tasks'}
            </button>

            {metrics.completed > 0 && (
              <button
                type="button"
                onClick={handleClearCompleted}
                style={{ ...styles.footerActionBtn, color: '#ef4444' }}
              >
                Clear Completed ({metrics.completed})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Modal: New Task List ────────────────────────────────────────── */}
      {showNewListModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHead}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#09090b', fontWeight: 800 }}>Create New Task List</h3>
              <button
                type="button"
                onClick={() => setShowNewListModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateList} style={{ padding: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                List Title / Category
              </label>
              <input
                type="text"
                placeholder="e.g., Factory Plant Dispatches, MP Dealers Follow-up"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                required
                autoFocus
                style={styles.modalInput}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => setShowNewListModal(false)}
                  style={styles.modalCancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingList || !newListName.trim()}
                  style={styles.modalSubmitBtn}
                >
                  {isCreatingList ? 'Creating...' : 'Create List'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Setup & OAuth Guide ─────────────────────────────────── */}
      {showSetupModal && (
        <div style={styles.modalBackdrop}>
          <div style={{ ...styles.modalCard, maxWidth: 560 }}>
            <div style={styles.modalHead}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#09090b', fontWeight: 800 }}>
                Google Tasks Live Cloud Setup
              </h3>
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#334155', lineHeight: 1.55 }}>
              <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', marginBottom: 14 }}>
                <strong>Workspace Store Active:</strong> You can create, edit, mark complete, and sync tasks right now in this cockpit! Tasks are saved persistently.
              </div>

              <div style={{ fontWeight: 700, color: '#09090b', marginBottom: 6 }}>
                To connect your company Google Workspace or Gmail account:
              </div>
              <ol style={{ paddingLeft: '1.25rem', margin: '0 0 1rem 0' }}>
                <li style={{ marginBottom: 6 }}>
                  Open <strong>Google Cloud Console</strong> (<a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>console.cloud.google.com</a>).
                </li>
                <li style={{ marginBottom: 6 }}>
                  Enable the <strong>Google Tasks API</strong> for your project.
                </li>
                <li style={{ marginBottom: 6 }}>
                  Under <em>APIs & Services → Credentials</em>, create an <strong>OAuth 2.0 Client ID</strong> (Web Application).
                </li>
                <li style={{ marginBottom: 6 }}>
                  Set <strong>Authorized Redirect URI</strong> to:<br />
                  <code style={{ background: '#f1f5f9', padding: '3px 6px', borderRadius: 4, fontSize: '0.78rem', color: '#0f172a' }}>
                    {status.redirectUri || 'http://localhost:5000/api/google-tasks/oauth/callback'}
                  </code>
                </li>
                <li style={{ marginBottom: 6 }}>
                  Copy your <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> into <code>backend/.env</code> or enter them in <strong>System Settings → Tally & Integrations</strong>.
                </li>
              </ol>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowSetupModal(false);
                    navigate('/settings');
                  }}
                  style={styles.modalSubmitBtn}
                >
                  Open Settings →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    padding: '1.5rem 1.75rem',
    maxWidth: 1380,
    margin: '0 auto',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  toast: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: '12px 18px',
    borderRadius: 10,
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: '0.85rem',
    fontWeight: 600,
    zIndex: 9999,
    animation: 'slideUp 0.3s ease'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    padding: '1.25rem 1.5rem',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    maxWidth: 750
  },
  googleIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  title: {
    fontSize: '1.35rem',
    fontWeight: 800,
    color: '#09090b',
    margin: 0,
    letterSpacing: '-0.3px'
  },
  subtitle: {
    fontSize: '0.82rem',
    color: '#64748b',
    margin: '4px 0 0 0',
    lineHeight: 1.45
  },
  statusPillConnected: {
    fontSize: '0.68rem',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    color: '#047857',
    border: '1px solid #a7f3d0',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5
  },
  statusPillDemo: {
    fontSize: '0.68rem',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    color: '#b45309',
    border: '1px solid #fde68a',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5
  },
  statusDotGreen: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#10b981'
  },
  statusDotAmber: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#f59e0b'
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap'
  },
  syncBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  connectGoogleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  },
  setupGuideBtn: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    color: '#475569',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc'
  },
  userInitial: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.78rem'
  },
  userEmail: {
    fontSize: '0.74rem',
    fontWeight: 700,
    color: '#09090b'
  },
  userStatusSub: {
    fontSize: '0.64rem',
    color: '#10b981',
    fontWeight: 600
  },
  disconnectBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    fontSize: '0.7rem',
    fontWeight: 700,
    cursor: 'pointer',
    padding: '2px 4px'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 14
  },
  metricCard: {
    padding: '1.1rem 1.25rem',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
  },
  metricLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.4px'
  },
  metricValue: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#09090b',
    marginTop: 4
  },
  metricSub: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    marginTop: 2
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    overflow: 'hidden'
  },
  filterBar: {
    padding: '1rem 1.25rem',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12
  },
  listSelect: {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#0f172a',
    cursor: 'pointer'
  },
  newListBtn: {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#2563eb',
    fontSize: '0.76rem',
    fontWeight: 700,
    cursor: 'pointer'
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    minWidth: 260
  },
  searchInput: {
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '0.8rem',
    outline: 'none',
    width: '100%',
    color: '#09090b'
  },
  tabsWrap: {
    display: 'flex',
    gap: 6
  },
  tabBtn: {
    padding: '5px 10px',
    borderRadius: 8,
    border: 'none',
    fontSize: '0.74rem',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  addForm: {
    padding: '1.1rem 1.25rem',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0'
  },
  addFormRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap'
  },
  titleInput: {
    flex: 1,
    minWidth: 260,
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#0f172a',
    outline: 'none'
  },
  dateInput: {
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    fontSize: '0.8rem',
    color: '#334155'
  },
  prioritySelect: {
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#334155'
  },
  addSubmitBtn: {
    padding: '9px 16px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  notesInput: {
    width: '100%',
    padding: '7px 12px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    fontSize: '0.78rem',
    color: '#475569',
    outline: 'none'
  },
  taskListWrap: {
    padding: '0.5rem 0',
    minHeight: 280
  },
  taskCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '12px 1.25rem',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease'
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
    transition: 'all 0.15s ease'
  },
  priorityHighBadge: {
    fontSize: '0.64rem',
    fontWeight: 800,
    padding: '2px 6px',
    borderRadius: 6,
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    textTransform: 'uppercase'
  },
  dueBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: '0.68rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 6
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  taskNotes: {
    fontSize: '0.76rem',
    color: '#64748b',
    marginTop: 4,
    lineHeight: 1.45,
    whiteSpace: 'pre-line'
  },
  leadTag: {
    fontSize: '0.66rem',
    fontWeight: 700,
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    padding: '2px 6px',
    borderRadius: 6
  },
  openLeadBtn: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    fontSize: '0.68rem',
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0
  },
  emptyState: {
    padding: '3rem 1.5rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '3px solid #e2e8f0',
    borderTopColor: '#2563eb',
    animation: 'spin 0.8s linear infinite'
  },
  cardFooter: {
    padding: '0.85rem 1.25rem',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10
  },
  footerActionBtn: {
    padding: '5px 10px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#334155',
    fontSize: '0.74rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 9, 11, 0.5)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: 16
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    width: '100%',
    maxWidth: 440,
    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
    overflow: 'hidden'
  },
  modalHead: {
    padding: '1rem 1.25rem',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  modalInput: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box'
  },
  modalCancelBtn: {
    padding: '7px 14px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  modalSubmitBtn: {
    padding: '7px 16px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer'
  }
};
