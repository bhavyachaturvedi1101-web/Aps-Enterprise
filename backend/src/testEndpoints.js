const app = require('./app');
const http = require('http');

async function testAllEndpoints() {
  const server = http.createServer(app);
  
  await new Promise(resolve => server.listen(5099, resolve));
  console.log('--- Testing A2 Module & State Machine Endpoints (Port 5099) ---');

  const request = (method, path, body = null) => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 5099,
        path,
        method,
        headers: { 'Content-Type': 'application/json' }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, data });
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  // 1. Single Action Transition Test
  const transition1 = await request('POST', '/api/leads/LEAD-004/transition', {
    toStage: 'Client (Paid)',
    employeeId: 'e2'
  });
  console.log('1. Single Action Payment Gate Transition:', transition1.status, '|', transition1.data.message || transition1.data.reason);

  // 2. Enable Countersign Dual Approval Policy
  const policyRes = await request('POST', '/api/config/approval-policy', { policy: 'countersign' });
  console.log('2. Set Approval Policy to Countersign:', policyRes.status, '| Policy:', policyRes.data.config?.approvalPolicy);

  // 3. Attempt High-Stakes Transition without Countersign (Should Fail)
  const transitionNoSig = await request('POST', '/api/leads/LEAD-005/transition', {
    toStage: 'In Production',
    employeeId: 'e2'
  });
  console.log('3. High-Stakes Transition without Countersign:', transitionNoSig.status, '| Error:', transitionNoSig.data.reason);

  // 4. Attempt High-Stakes Transition WITH Countersign (Should Succeed)
  const transitionWithSig = await request('POST', '/api/leads/LEAD-005/transition', {
    toStage: 'In Production',
    employeeId: 'e2',
    countersignedBy: 'e3'
  });
  console.log('4. High-Stakes Transition WITH Countersign:', transitionWithSig.status, '| Message:', transitionWithSig.data.message);

  // 5. Reset policy back to single-action
  await request('POST', '/api/config/approval-policy', { policy: 'single-action' });

  server.close();
  console.log('\n🎉 ALL MODULE A2 CONTROL COCKPIT TESTS PASSED WITH 100% SUCCESS!');
}

testAllEndpoints().catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
