'use strict';
const assert = require('assert');
const { processQuery } = require('../backend/src/services/a3Service');
const { getHistory, getLastResult, clearSession } = require('../backend/src/services/a3/sessionStore');

async function runPrivacyVerification() {
  console.log('Testing chat privacy isolation between Admin and Employee...\n');

  const adminConvId = 'conv_admin_usr-001_session_1';
  const employeeConvId = 'conv_employee_usr-004_session_1';

  // 1. Admin queries revenue and company financials
  console.log('1. Admin queries revenue summary...');
  const adminRes = await processQuery('Show revenue summary', adminConvId, {
    userRole: 'admin',
    userName: 'Super Admin',
    employeeId: 'USR-001'
  });

  assert(adminRes.text && (adminRes.table || adminRes.chart), 'Admin should receive valid report');
  console.log('✓ Admin successfully retrieved report with intent:', adminRes.intent);

  // Verify Admin session in sessionStore
  const adminLast = getLastResult(adminConvId);
  assert(adminLast !== null, 'Admin should have a stored last result');
  assert(adminLast.intent === adminRes.intent, 'Admin stored intent should match');
  const adminHist = getHistory(adminConvId);
  assert(adminHist.length > 0, 'Admin history should have messages');

  // Verify Employee session is completely empty and isolated
  const empLastBefore = getLastResult(employeeConvId);
  assert(empLastBefore === null, 'Employee session should be null before any queries');
  const empHistBefore = getHistory(employeeConvId);
  assert(empHistBefore.length === 0, 'Employee history should be empty');
  console.log('✓ Verified: Employee sessionStore does not have any of Admin\'s messages or results');

  // 2. Employee queries their assigned leads
  console.log('\n2. Employee queries assigned leads...');
  const empRes = await processQuery('Show my assigned leads', employeeConvId, {
    userRole: 'employee',
    userName: 'Sales Telecaller',
    employeeId: 'USR-004'
  });

  assert(empRes.intent === 'employee_my_leads', 'Employee should trigger employee_my_leads');
  console.log('✓ Employee successfully retrieved personal assigned leads');

  // Verify Employee session in sessionStore has their own data
  const empLast = getLastResult(employeeConvId);
  assert(empLast !== null, 'Employee should have a stored last result');
  assert(empLast.intent === 'employee_my_leads', 'Employee stored intent should be employee_my_leads');

  // Re-verify Admin session is still untouched
  const adminLastAfter = getLastResult(adminConvId);
  assert(adminLastAfter.intent === adminRes.intent, 'Admin stored intent must still match adminRes.intent');
  console.log('✓ Verified: Admin session remains strictly isolated and unaffected by Employee actions');

  // 3. Employee attempts to query admin financial action
  console.log('\n3. Employee attempts to query restricted admin financial action...');
  const empBlocked = await processQuery('What is the company profit margin?', employeeConvId, {
    userRole: 'employee',
    userName: 'Sales Telecaller',
    employeeId: 'USR-004'
  });

  assert(empBlocked.intent === 'employee_restricted', 'Employee should be restricted');
  assert(empBlocked.text.includes('Access Restricted for Employee Role'), 'Response should state restricted');
  console.log('✓ Employee access guard successfully blocked administrative queries');

  // Cleanup
  clearSession(adminConvId);
  clearSession(employeeConvId);

  console.log('\n========================================');
  console.log('🎉 ALL PRIVACY ISOLATION TESTS PASSED!');
  console.log('========================================');
}

runPrivacyVerification().catch(err => {
  console.error('❌ Privacy verification failed:', err);
  process.exit(1);
});
