const request = require('../backend/node_modules/supertest');
const app = require('../backend/src/app');
const { Lead, Employee, ActivityLog, Invoice, Inventory, User } = require('../backend/src/models');
const { safeReadJson, safeWriteJson, isServerless } = require('../backend/src/utils/safeStorage');

async function runPhase2Tests() {
  console.log('--- RUNNING PHASE 2 DATABASE & ARCHITECTURE VALIDATION ---');
  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] PASS: ${message}`);
      passCount++;
    } else {
      console.error(`[FAIL] FAIL: ${message}`);
      failCount++;
    }
  }

  // 1. Model Column Set Validation
  const leadAttrs = Object.keys(Lead.rawAttributes);
  const requiredLeadAttrs = ['phone', 'company', 'interest', 'budget', 'stage', 'priority', 'notes', 'source', 'crmSynced', 'erpBookingCreated', 'tallyPaymentVerified'];
  const hasAllLeadAttrs = requiredLeadAttrs.every(attr => leadAttrs.includes(attr));
  assert(hasAllLeadAttrs, `Lead model schema contains all required enterprise attributes (${requiredLeadAttrs.join(', ')})`);

  const empAttrs = Object.keys(Employee.rawAttributes);
  const requiredEmpAttrs = ['email', 'phone', 'department', 'status', 'kpiScore', 'totalRevenue', 'activeTask', 'taskQueue'];
  const hasAllEmpAttrs = requiredEmpAttrs.every(attr => empAttrs.includes(attr));
  assert(hasAllEmpAttrs, `Employee model schema contains all required attributes (${requiredEmpAttrs.join(', ')})`);

  const actAttrs = Object.keys(ActivityLog.rawAttributes);
  assert(actAttrs.includes('countersignedBy'), 'ActivityLog model includes countersignedBy column for dual-approval audit');

  const userRoles = User.rawAttributes.role.values;
  assert(userRoles.includes('accountant'), 'User model role ENUM includes accountant');

  // 2. SafeStorage in Serverless Environment Simulation
  const testObj = { test: 'serverless_data', timestamp: Date.now() };
  process.env.VERCEL = '1';
  // Reload safeStorage to capture env change
  delete require.cache[require.resolve('../backend/src/utils/safeStorage')];
  const serverlessSafeStorage = require('../backend/src/utils/safeStorage');
  const writeRes = serverlessSafeStorage.safeWriteJson('/root/read_only_fake_dir/file.json', testObj);
  assert(writeRes === true, 'safeWriteJson successfully protects against EROFS crashes in serverless environment');
  delete process.env.VERCEL;

  // 3. API Token Auth for testing endpoints
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@apsenterprises.in', password: 'admin123' });
  const token = loginRes.body.token;
  const authHeaders = { 'authorization': `Bearer ${token}` };

  // 4. Lead Creation & Attribute Persistence
  const newLeadRes = await request(app)
    .post('/api/leads')
    .set(authHeaders)
    .send({
      name: 'Pooja Enterprises',
      phone: '+91 99887 76655',
      company: 'Pooja Paper Products',
      interest: 'Automatic Dona Machine',
      budget: 150000,
      priority: 'Hot',
      source: 'Direct Portal',
      stage: 'Enquiry'
    });

  assert(newLeadRes.status === 201, 'POST /api/leads succeeds with 201 Created');
  assert(newLeadRes.body.lead.name === 'Pooja Enterprises', 'Created lead name matches input');
  assert(newLeadRes.body.lead.phone === '+91 99887 76655', 'Created lead phone persisted');
  const createdLeadId = newLeadRes.body.lead.id;

  // 5. Lead Transition with Atomic Transaction
  const transitionRes = await request(app)
    .post(`/api/leads/${createdLeadId}/transition`)
    .set(authHeaders)
    .send({
      toStage: 'Qualified',
      employeeId: 'USR-001'
    });

  assert(transitionRes.status === 200, 'POST /api/leads/:id/transition succeeds with 200');
  assert(transitionRes.body.activityLog !== null, 'Activity log generated atomically with stage transition');

  // 6. Invoice Creation with Atomic Activity Logging
  const invoiceRes = await request(app)
    .post('/api/invoices')
    .set(authHeaders)
    .send({
      clientName: 'Pooja Enterprises',
      clientPhone: '+91 99887 76655',
      clientEmail: 'pooja@enterprises.com',
      product: 'Automatic Dona Machine',
      baseAmount: 150000,
      leadId: createdLeadId
    });

  assert(invoiceRes.status === 201, 'POST /api/invoices succeeds with 201 Created');
  assert(invoiceRes.body.invoice.baseAmount === 150000, 'Invoice baseAmount matches request');

  // 7. Employee Creation & User Sync Transaction
  const empRes = await request(app)
    .post('/api/employees')
    .set(authHeaders)
    .send({
      name: 'Rohan Verma',
      email: `rohan.${Date.now()}@aps-enterprise.com`,
      phone: '+91 91234 56789',
      role: 'Sales Executive',
      department: 'Sales & CRM'
    });

  assert(empRes.status === 201, 'POST /api/employees succeeds with 201 Created');
  assert(empRes.body.employee.name === 'Rohan Verma', 'Employee created with correct name');

  // 8. Serverless Lead Query Test
  process.env.VERCEL = '1';
  const getLeadsRes = await request(app)
    .get('/api/leads')
    .set(authHeaders);
  assert(getLeadsRes.status === 200, 'GET /api/leads executes cleanly in serverless mode');
  assert(Array.isArray(getLeadsRes.body.leads) && getLeadsRes.body.leads.length > 0, 'Leads array returned in serverless mode');
  delete process.env.VERCEL;

  console.log(`\n--- SUMMARY: ${passCount} Passed, ${failCount} Failed ---`);
  if (failCount > 0) process.exit(1);
}

runPhase2Tests().catch(err => {
  console.error('Phase 2 test runner failure:', err);
  process.exit(1);
});
