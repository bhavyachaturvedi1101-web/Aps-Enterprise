'use strict';
require('dotenv').config({ path: './backend/.env' });
const { processQuery, getSuggestions } = require('../backend/src/services/a3Service');

async function test() {
  console.log('Testing Employee Restrictions on the 5 Locked Categories...\n');
  const queries = [
    'profit of this year',
    'what is the company revenue?',
    'calculate profit margin',
    'who is the top performer?',
    'assign task to Animesh',
    'create user for Rahul',
    'sync tally vouchers',
    'reset AI persistent memory'
  ];

  for (const q of queries) {
    const res = await processQuery(q, 'conv_emp_test', {
      userRole: 'employee',
      userName: 'Sales Telecaller',
      employeeId: 'USR-004'
    });
    console.log(`Query: "${q}"`);
    console.log(`  -> Intent: ${res.intent}`);
    console.log(`  -> Restricted?: ${res.intent === 'employee_restricted'}`);
    if (res.intent !== 'employee_restricted') {
      console.error(`FAILED TO RESTRICT: ${q}`);
      process.exit(1);
    }
  }

  console.log('\nTesting Employee Allowed Workplace Queries...\n');
  const allowed = [
    'Show my assigned leads',
    'What are my active tasks?',
    'Check my KPI score and performance',
    'Who should I call next?',
    'Search CNC 500T specification manual'
  ];

  for (const q of allowed) {
    const res = await processQuery(q, 'conv_emp_test', {
      userRole: 'employee',
      userName: 'Sales Telecaller',
      employeeId: 'USR-004'
    });
    console.log(`Query: "${q}"`);
    console.log(`  -> Intent: ${res.intent}`);
    if (res.intent === 'employee_restricted') {
      console.error(`INCORRECTLY RESTRICTED ALLOWED QUERY: ${q}`);
      process.exit(1);
    }
  }

  console.log('\nTesting Admin Access for "profit of this year"...\n');
  const adminRes = await processQuery('profit of this year', 'conv_admin_test', {
    userRole: 'admin',
    userName: 'Super Admin',
    employeeId: 'USR-001'
  });
  console.log(`Admin Query: "profit of this year"`);
  console.log(`  -> Intent: ${adminRes.intent}`);
  console.log(`  -> Admin allowed?: ${adminRes.intent !== 'employee_restricted'}`);
  if (adminRes.intent === 'employee_restricted') {
    console.error('ADMIN SHOULD NOT BE RESTRICTED!');
    process.exit(1);
  }

  console.log('\nTesting Suggestions for Employee vs Admin...\n');
  const empSug = getSuggestions('employee');
  const adminSug = getSuggestions('admin');
  console.log(`Employee suggestions count: ${empSug.length}, sample: ${empSug[0].label}`);
  console.log(`Admin suggestions count: ${adminSug.length}, sample: ${adminSug[0].label}`);

  console.log('\n======================================================');
  console.log('🎉 ALL 5 ROLE RESTRICTION CHECKS PASSED FLAWLESSLY!');
  console.log('======================================================');
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
