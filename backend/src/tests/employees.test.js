/**
 * ============================================================
 * EMPLOYEES API — Deep Test Suite
 * Tests: GET /api/employees, POST /api/employees,
 *        GET /api/employees/:id/performance,
 *        DELETE /api/employees/:id,
 *        GET /api/activity, GET /api/activity/time-in-stage
 * ============================================================
 */

const request = require('supertest');
const app = require('../app');

const ADMIN_HEADERS = { 'x-api-key': 'admin-key-123' };

// ============================================================
// 1. GET /api/employees
// ============================================================
describe('GET /api/employees', () => {
  it('should return 200 with employees array and summary', async () => {
    const res = await request(app).get('/api/employees').set(ADMIN_HEADERS);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('employees');
    expect(res.body).toHaveProperty('summary');
    expect(Array.isArray(res.body.employees)).toBe(true);
    expect(res.body.employees.length).toBeGreaterThan(0);
  });

  it('should return team summary with all required KPI fields', async () => {
    const res = await request(app).get('/api/employees').set(ADMIN_HEADERS);
    const s = res.body.summary;
    expect(s).toHaveProperty('totalEmployees');
    expect(s).toHaveProperty('activeMembers');
    expect(s).toHaveProperty('totalCallsHandled');
    expect(s).toHaveProperty('totalSalesClosed');
    expect(s).toHaveProperty('totalRevenueClosed');
    expect(s).toHaveProperty('teamAvgKpiScore');
    expect(s).toHaveProperty('slaAdherenceRate');
    expect(s.teamAvgKpiScore).toMatch(/%$/); // ends with %
  });

  it('should return each employee with required profile fields', async () => {
    const res = await request(app).get('/api/employees').set(ADMIN_HEADERS);
    const emp = res.body.employees[0];
    expect(emp).toHaveProperty('id');
    expect(emp).toHaveProperty('name');
    expect(emp).toHaveProperty('role');
    expect(emp).toHaveProperty('kpiScore');
    expect(emp).toHaveProperty('status');
  });

  it('should have activeMembers count <= totalEmployees', async () => {
    const res = await request(app).get('/api/employees').set(ADMIN_HEADERS);
    expect(res.body.summary.activeMembers).toBeLessThanOrEqual(res.body.summary.totalEmployees);
  });

  it('should correctly count total employees in summary', async () => {
    const res = await request(app).get('/api/employees').set(ADMIN_HEADERS);
    expect(res.body.summary.totalEmployees).toBe(res.body.employees.length);
  });
});

// ============================================================
// 2. POST /api/employees — Create employee
// ============================================================
describe('POST /api/employees', () => {
  let createdEmpId;

  it('should create a new employee with all fields', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set(ADMIN_HEADERS)
      .send({
        name: 'Test Employee One',
        email: 'test.emp@aps.com',
        phone: '+91 88888 77777',
        role: 'Sales Manager',
        department: 'Sales'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.employee).toHaveProperty('id');
    expect(res.body.employee.name).toBe('Test Employee One');
    expect(res.body.employee.email).toBe('test.emp@aps.com');
    expect(res.body.employee.status).toBe('Active');
    createdEmpId = res.body.employee.id;
  });

  it('should initialize performance metrics to zero', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set(ADMIN_HEADERS)
      .send({ name: 'Fresh Employee', email: 'fresh@aps.com' });

    const emp = res.body.employee;
    expect(emp.tasksCompleted).toBe(0);
    expect(emp.callsHandled).toBe(0);
    expect(emp.salesClosed).toBe(0);
    expect(emp.totalRevenue).toBe(0);
  });

  it('should apply default values for optional fields', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set(ADMIN_HEADERS)
      .send({ name: 'Default Role Employee', email: 'defaul@aps.com' });

    expect(res.status).toBe(201);
    expect(res.body.employee.role).toContain('Sales');
    expect(res.body.employee.kpiScore).toBe('85%');
  });

  it('should return 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set(ADMIN_HEADERS)
      .send({ email: 'no-name@aps.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Name and email are required/i);
  });

  it('should return 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set(ADMIN_HEADERS)
      .send({ name: 'No Email Employee' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Name and email are required/i);
  });

  it('should return 400 when both name and email are missing', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set(ADMIN_HEADERS)
      .send({});

    expect(res.status).toBe(400);
  });

  it('should appear in the employees list after creation', async () => {
    const listRes = await request(app).get('/api/employees').set(ADMIN_HEADERS);
    const found = listRes.body.employees.find(e => e.id === createdEmpId);
    expect(found).toBeDefined();
  });

  it('should increment totalEmployees in summary after creation', async () => {
    const before = (await request(app).get('/api/employees').set(ADMIN_HEADERS)).body.summary.totalEmployees;
    await request(app).post('/api/employees').set(ADMIN_HEADERS).send({ name: 'Count Test Emp', email: 'count@aps.com' });
    const after = (await request(app).get('/api/employees').set(ADMIN_HEADERS)).body.summary.totalEmployees;
    expect(after).toBe(before + 1);
  });
});

// ============================================================
// 3. GET /api/employees/:id/performance
// ============================================================
describe('GET /api/employees/:id/performance', () => {
  it('should return 200 with detailed performance profile for e1', async () => {
    const res = await request(app)
      .get('/api/employees/e1/performance')
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('profile');
    expect(res.body).toHaveProperty('metrics');
    expect(res.body).toHaveProperty('activityLogs');
  });

  it('should include all key metrics in performance response', async () => {
    const res = await request(app).get('/api/employees/e1/performance').set(ADMIN_HEADERS);
    const m = res.body.metrics;
    expect(m).toHaveProperty('assignedLeadsCount');
    expect(m).toHaveProperty('totalAssignedPipelineValue');
    expect(m).toHaveProperty('recentActionsCount');
    expect(m).toHaveProperty('kpiScore');
    expect(m).toHaveProperty('conversionRate');
    expect(m).toHaveProperty('pipelineDeals');
    expect(m).toHaveProperty('weeklyKpiHistory');
    expect(Array.isArray(m.pipelineDeals)).toBe(true);
    expect(Array.isArray(m.weeklyKpiHistory)).toBe(true);
  });

  it('should have correct employee profile identity', async () => {
    const res = await request(app).get('/api/employees/e1/performance').set(ADMIN_HEADERS);
    expect(res.body.profile.id).toBe('e1');
  });

  it('should return 404 for a non-existent employee', async () => {
    const res = await request(app)
      .get('/api/employees/e999/performance')
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('EMPLOYEE_NOT_FOUND');
  });

  it('pipelineDeals should have required deal fields', async () => {
    const res = await request(app).get('/api/employees/e1/performance').set(ADMIN_HEADERS);
    if (res.body.metrics.pipelineDeals.length > 0) {
      const deal = res.body.metrics.pipelineDeals[0];
      expect(deal).toHaveProperty('id');
      expect(deal).toHaveProperty('name');
      expect(deal).toHaveProperty('stage');
      expect(deal).toHaveProperty('budget');
    }
  });
});

// ============================================================
// 4. DELETE /api/employees/:id
// ============================================================
describe('DELETE /api/employees/:id', () => {
  let empToDelete;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/employees')
      .set(ADMIN_HEADERS)
      .send({ name: 'Employee To Delete', email: 'delete.me@aps.com' });
    empToDelete = res.body.employee.id;
  });

  it('should delete the employee and return success message', async () => {
    const res = await request(app)
      .delete(`/api/employees/${empToDelete}`)
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('deleted');
    expect(res.body.deletedEmployee.id).toBe(empToDelete);
  });

  it('should no longer appear in employees list after deletion', async () => {
    const listRes = await request(app).get('/api/employees').set(ADMIN_HEADERS);
    const found = listRes.body.employees.find(e => e.id === empToDelete);
    expect(found).toBeUndefined();
  });

  it('should return 404 for non-existent employee', async () => {
    const res = await request(app)
      .delete('/api/employees/e999')
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('EMPLOYEE_NOT_FOUND');
  });
});

// ============================================================
// 5. GET /api/activity — Audit Logs
// ============================================================
describe('GET /api/activity', () => {
  it('should return 200 with activityLogs array and totalLogs', async () => {
    const res = await request(app).get('/api/activity').set(ADMIN_HEADERS);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('activityLogs');
    expect(res.body).toHaveProperty('totalLogs');
    expect(Array.isArray(res.body.activityLogs)).toBe(true);
  });

  it('totalLogs count should match activityLogs array length', async () => {
    const res = await request(app).get('/api/activity').set(ADMIN_HEADERS);
    expect(res.body.totalLogs).toBe(res.body.activityLogs.length);
  });

  it('each log entry should have required audit fields', async () => {
    const res = await request(app).get('/api/activity').set(ADMIN_HEADERS);
    if (res.body.activityLogs.length > 0) {
      const log = res.body.activityLogs[0];
      expect(log).toHaveProperty('id');
      expect(log).toHaveProperty('action');
      expect(log).toHaveProperty('createdAt');
    }
  });

  it('should grow by 1 after a new lead is created', async () => {
    const before = (await request(app).get('/api/activity').set(ADMIN_HEADERS)).body.totalLogs;
    await request(app).post('/api/leads').set(ADMIN_HEADERS).send({ name: 'Activity Log Test Lead' });
    const after = (await request(app).get('/api/activity').set(ADMIN_HEADERS)).body.totalLogs;
    expect(after).toBe(before + 1);
  });
});

// ============================================================
// 6. GET /api/activity/time-in-stage
// ============================================================
describe('GET /api/activity/time-in-stage', () => {
  it('should return 200 with timeInStage data and summary', async () => {
    const res = await request(app).get('/api/activity/time-in-stage').set(ADMIN_HEADERS);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('timeInStage');
    expect(res.body).toHaveProperty('summary');
  });

  it('summary should include all required bottleneck KPI fields', async () => {
    const res = await request(app).get('/api/activity/time-in-stage').set(ADMIN_HEADERS);
    const s = res.body.summary;
    expect(s).toHaveProperty('totalStagesMonitored');
    expect(s).toHaveProperty('bottleneckCount');
    expect(s).toHaveProperty('criticalStage');
    expect(s).toHaveProperty('recommendation');
  });

  it('bottleneckCount should match count of Critical Warning entries', async () => {
    const res = await request(app).get('/api/activity/time-in-stage').set(ADMIN_HEADERS);
    const criticalCount = res.body.timeInStage.filter(s => s.status === 'Critical Warning').length;
    expect(res.body.summary.bottleneckCount).toBe(criticalCount);
  });
});
