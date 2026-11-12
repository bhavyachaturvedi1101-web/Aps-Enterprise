'use strict';
const request = require('../backend/node_modules/supertest');
const app = require('../backend/src/app');

async function testHttpChatPrivacy() {
  console.log('Testing HTTP /api/a3/query user privacy partitioning...\n');

  // 1. Admin sends query
  const resAdmin = await request(app)
    .post('/api/a3/query')
    .send({
      query: 'Show all CRM leads',
      userRole: 'admin',
      userName: 'Super Admin',
      employeeId: 'USR-001'
    })
    .expect(200);

  console.log('✓ Admin query received 200, conversationId:', resAdmin.body.conversationId);
  if (!resAdmin.body.conversationId.includes('admin')) {
    throw new Error('Admin conversationId should include admin user partition');
  }

  // 2. Employee sends query with different employee ID
  const resEmp = await request(app)
    .post('/api/a3/query')
    .send({
      query: 'Show my assigned leads',
      userRole: 'employee',
      userName: 'Sales Telecaller',
      employeeId: 'USR-004'
    })
    .expect(200);

  console.log('✓ Employee query received 200, conversationId:', resEmp.body.conversationId);
  if (!resEmp.body.conversationId.includes('employee_usr-004')) {
    throw new Error('Employee conversationId should include employee_usr-004 partition');
  }

  if (resAdmin.body.conversationId === resEmp.body.conversationId) {
    throw new Error('Admin and Employee should have completely distinct partitioned conversationIds');
  }

  console.log('✓ Verified: Server enforces isolated conversation partitioning per role and employee ID.');
  console.log('\n🎉 HTTP Privacy Tests Passed!');
}

testHttpChatPrivacy().then(() => process.exit(0)).catch(err => {
  console.error('❌ HTTP Privacy test failed:', err);
  process.exit(1);
});
