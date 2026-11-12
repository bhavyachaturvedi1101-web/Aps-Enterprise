const http = require('http');

function postQuery(query, userRole, userName, employeeId) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ query, userRole, userName, employeeId });
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/a3/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve({ error: data }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runFullVerification() {
  const tests = [
    { name: '1. My Assigned Leads (Employee)', query: 'Show my assigned leads', role: 'employee', expectRestricted: false, expectIntent: 'employee_my_leads' },
    { name: '2. Priority Calling Target (Employee)', query: 'Who should I call next?', role: 'employee', expectRestricted: false, expectIntent: 'employee_calling_queue' },
    { name: '3. Active Tasks Today (Employee)', query: 'What are my active tasks?', role: 'employee', expectRestricted: false, expectIntent: 'employee_my_tasks' },
    { name: '4. Personal KPI Scorecard (Employee)', query: 'Check my KPI score', role: 'employee', expectRestricted: false, expectIntent: 'employee_my_kpi' },
    { name: '5. Machine Specs Manual (Employee)', query: 'Search CNC 500T specification manual', role: 'employee', expectRestricted: false, expectIntent: 'employee_specs_manual' },
    { name: '6. Profit Margin Calculation (Employee)', query: 'Show profit margin for CNC order', role: 'employee', expectRestricted: true, expectIntent: 'employee_restricted' },
    { name: '7. Create Admin User (Employee)', query: 'Create user John as admin', role: 'employee', expectRestricted: true, expectIntent: 'employee_restricted' },
    { name: '8. Company Revenue Summary (Employee)', query: 'Show company revenue summary', role: 'employee', expectRestricted: true, expectIntent: 'employee_restricted' },
    { name: '9. Assign Tasks to Team (Employee)', query: 'Assign task to Animesh', role: 'employee', expectRestricted: true, expectIntent: 'employee_restricted' },
    { name: '10. Sales Forecast (Employee)', query: 'Predict September revenue', role: 'employee', expectRestricted: true, expectIntent: 'employee_restricted' },
    { name: '11. Profit Margin Calculation (Admin)', query: 'Show profit margin for CNC order', role: 'admin', expectRestricted: false, expectIntent: 'margin_calculator' },
    { name: '12. Company Revenue Summary (Admin)', query: 'Show company revenue summary', role: 'admin', expectRestricted: false, expectIntent: ['pipeline_summary', 'revenue_summary'] },
    { name: '13. Assign Tasks to Team (Admin)', query: 'Assign task to Animesh', role: 'admin', expectRestricted: false, expectIntent: 'assign_employee_tasks' }
  ];

  console.log('═════════════════════════════════════════════════════════════════════════');
  console.log('   FULL END-TO-END CHATBOT ROLE RESTRICTION TEST RUNNER                  ');
  console.log('═════════════════════════════════════════════════════════════════════════\n');

  let passed = 0;
  for (const t of tests) {
    const res = await postQuery(t.query, t.role, t.role === 'employee' ? 'Rahul Verma' : 'Administrator', 'EMP-001');
    const isRestricted = res.intent === 'employee_restricted';
    const matchRestricted = isRestricted === t.expectRestricted;
    const matchIntent = Array.isArray(t.expectIntent) ? t.expectIntent.includes(res.intent) : (t.expectIntent ? res.intent === t.expectIntent : true);
    const ok = matchRestricted && matchIntent;

    if (ok) passed++;
    const icon = ok ? '✔ PASS' : '✖ FAIL';
    console.log(`[${icon}] ${t.name}`);
    console.log(`       Query: "${t.query}"`);
    console.log(`       Intent: ${res.intent} | Restricted: ${isRestricted}`);
    console.log(`       Snippet: ${res.text ? res.text.split('\n')[0].slice(0, 70) : 'No text'}\n`);
  }

  console.log('═════════════════════════════════════════════════════════════════════════');
  console.log(`TOTAL RESULT: ${passed} / ${tests.length} Tests Passed (${Math.round(passed/tests.length*100)}%)`);
  console.log('═════════════════════════════════════════════════════════════════════════');
}

runFullVerification().catch(console.error);
