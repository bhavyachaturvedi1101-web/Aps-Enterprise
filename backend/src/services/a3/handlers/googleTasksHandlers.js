'use strict';

const googleTasksService = require('../../googleTasksService');

/**
 * Handle listing Google Tasks via A3 chat
 */
async function handleShowGoogleTasks(query, convId, stage) {
  try {
    const { tasks, isLiveGoogle } = await googleTasksService.getTasks();
    const pending = tasks.filter(t => t.status !== 'completed');

    if (tasks.length === 0) {
      return {
        text: `You currently have no tasks in your Google Tasks workspace. Would you like me to create one for you?`,
        table: null,
        chart: null,
        intent: 'show_google_tasks'
      };
    }

    const modeTag = isLiveGoogle ? '🟢 Live Google Tasks API' : '🟡 Offline Workspace Store';
    const text = `Here are your current Google Tasks (${modeTag}). You have **${pending.length} pending** tasks and **${tasks.length - pending.length} completed**.`;

    const table = {
      columns: ['Title', 'Priority', 'Due Date', 'Status', 'Lead Link'],
      rows: tasks.slice(0, 10).map(t => [
        t.title,
        (t.priority || 'medium').toUpperCase(),
        t.due ? new Date(t.due).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Due Date',
        t.status === 'completed' ? '✅ Completed' : '⏳ Pending',
        t.leadName || t.leadId || '—'
      ])
    };

    return {
      text,
      table,
      chart: null,
      intent: 'show_google_tasks'
    };
  } catch (err) {
    return {
      text: `Failed to fetch Google Tasks: ${err.message}`,
      table: null,
      chart: null,
      intent: 'show_google_tasks'
    };
  }
}

/**
 * Handle creating a Google Task via A3 chat
 */
async function handleActionCreateGoogleTask(query, convId, stage) {
  try {
    // Extract task title
    let title = query
      .replace(/^(please\s+)?(create|add|schedule|insert|make|new)\s*(a|an)?\s*(google\s+task|task\s+in\s+google|task)\s*(to|for|:|that)?/i, '')
      .replace(/in\s+google\s+tasks?/i, '')
      .trim();

    if (!title) {
      title = 'Follow-up task created via A3 AI Assistant';
    }

    // Check if due tomorrow / today mentioned
    let due = new Date(Date.now() + 86400000).toISOString(); // tomorrow default
    if (/today|aaj/i.test(query)) {
      due = new Date().toISOString();
    } else if (/urgent|high priority|turant|important/i.test(query)) {
      due = new Date().toISOString();
    }

    const priority = /urgent|high priority|important/i.test(query) ? 'high' : 'medium';

    const task = await googleTasksService.createTask({
      title,
      notes: `Created via A3 Assistant query: "${query}"`,
      due,
      priority
    });

    const modeText = task.isLiveGoogle ? 'Google Tasks Cloud' : 'Local Tasks Workspace';

    return {
      text: `✅ **Task Created Successfully in ${modeText}**\n\n📌 **Title**: ${task.title}\n📅 **Due**: ${new Date(task.due).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}\n⚡ **Priority**: ${task.priority.toUpperCase()}\n\nView it in the **Google Tasks** dashboard tab anytime.`,
      table: null,
      chart: null,
      intent: 'action_create_google_task'
    };
  } catch (err) {
    return {
      text: `Could not create Google Task: ${err.message}`,
      table: null,
      chart: null,
      intent: 'action_create_google_task'
    };
  }
}

module.exports = {
  handleShowGoogleTasks,
  handleActionCreateGoogleTask
};
