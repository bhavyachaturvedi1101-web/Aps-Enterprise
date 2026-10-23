'use strict';

const request = require('supertest');
const app = require('../app');
const googleTasksService = require('../services/googleTasksService');

describe('Google Tasks API & Service Integration', () => {
  let createdTaskId = null;

  it('GET /api/google-tasks/status should return workspace configuration and status', async () => {
    const res = await request(app)
      .get('/api/google-tasks/status')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('configured');
    expect(res.body).toHaveProperty('connected');
    expect(res.body).toHaveProperty('isMock');
    expect(res.body).toHaveProperty('redirectUri');
  });

  it('GET /api/google-tasks/lists should return available task lists', async () => {
    const res = await request(app)
      .get('/api/google-tasks/lists')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.lists)).toBe(true);
    expect(res.body.lists.length).toBeGreaterThan(0);
  });

  it('POST /api/google-tasks should create a new task', async () => {
    const res = await request(app)
      .post('/api/google-tasks')
      .send({
        title: 'Call Indore Factory for Paper Roll Dispatch',
        notes: 'Check 120 GSM reel availability and freight charges',
        priority: 'high',
        due: new Date(Date.now() + 86400000).toISOString()
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.task).toBeDefined();
    expect(res.body.task.title).toBe('Call Indore Factory for Paper Roll Dispatch');
    expect(res.body.task.status).toBe('needsAction');
    expect(res.body.task.priority).toBe('high');

    createdTaskId = res.body.task.id;
  });

  it('GET /api/google-tasks should retrieve the task list containing the created task', async () => {
    const res = await request(app)
      .get('/api/google-tasks')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.tasks)).toBe(true);
    const found = res.body.tasks.find(t => t.id === createdTaskId);
    expect(found).toBeDefined();
  });

  it('PATCH /api/google-tasks/:taskId should update task status to completed', async () => {
    const res = await request(app)
      .patch(`/api/google-tasks/${createdTaskId}`)
      .send({
        status: 'completed'
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.task.status).toBe('completed');
    expect(res.body.task.completed).toBeDefined();
  });

  it('POST /api/google-tasks/sync-lead should create a CRM lead follow-up task', async () => {
    const res = await request(app)
      .post('/api/google-tasks/sync-lead')
      .send({
        leadId: 'LEAD-9999',
        leadName: 'Narmada Paper Mills',
        phone: '+91 98930 11223',
        machineInterest: 'Double Die High Speed Machine',
        notes: 'Interested in quotation with GST breakdown'
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.task).toBeDefined();
    expect(res.body.task.title).toContain('Narmada Paper Mills');
    expect(res.body.task.leadId).toBe('LEAD-9999');

    // Clean up
    if (res.body.task.id) {
      await googleTasksService.deleteTask({ taskId: res.body.task.id });
    }
  });

  it('DELETE /api/google-tasks/:taskId should remove the task', async () => {
    const res = await request(app)
      .delete(`/api/google-tasks/${createdTaskId}`)
      .expect(200);

    expect(res.body.success).toBe(true);

    // Verify gone
    const listRes = await request(app).get('/api/google-tasks');
    const exists = listRes.body.tasks.some(t => t.id === createdTaskId);
    expect(exists).toBe(false);
  });
});
