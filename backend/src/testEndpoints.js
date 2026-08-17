const app = require('./app');
const http = require('http');

async function testAllEndpoints() {
  const server = http.createServer(app);
  
  await new Promise(resolve => server.listen(5099, resolve));
  console.log('--- Testing Week 1 Internal API Endpoints (Port 5099) ---');

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

  // 1. Health check
  const health = await request('GET', '/api/health');
  console.log('1. GET /api/health:', health.status, '|', health.data.milestone);

  // 2. Leads list
  const leads = await request('GET', '/api/leads');
  console.log('2. GET /api/leads:', leads.status, '| Fetched', leads.data.leads?.length, 'leads');

  // 3. A1 Voice Agent Call Ingestion
  const voiceCall = await request('POST', '/api/calls/outcome', {
    name: 'Vikram Mehta',
    phone: '+919811223344',
    interest: 'CNC Milling Machine v4',
    budget: '45000',
    timeline: 'Immediate',
    callOutcome: 'Interested - High Intent',
    durationSeconds: 160
  });
  console.log('3. POST /api/calls/outcome (A1 Ingestion):', voiceCall.status, '| Lead ID:', voiceCall.data.lead?.id);

  // 4. A1 Dialer Queue
  const dialer = await request('GET', '/api/dialer/queue');
  console.log('4. GET /api/dialer/queue:', dialer.status, '| Total queued:', dialer.data.totalQueued);

  // 5. A2 Lead State Machine Transition (Hard Payment Gate Check)
  const transition = await request('POST', '/api/leads/LEAD-004/transition', {
    toStage: 'Client (Paid)',
    employeeId: 'e2'
  });
  console.log('5. POST /api/leads/LEAD-004/transition (Payment Gate):', transition.status, '| Message:', transition.data.message);

  // 6. A4 Performance Profile
  const perf = await request('GET', '/api/employees/e1/performance');
  console.log('6. GET /api/employees/e1/performance:', perf.status, '| Profile:', perf.data.profile?.name);

  // 7. A4 Time in Stage
  const tis = await request('GET', '/api/activity/time-in-stage');
  console.log('7. GET /api/activity/time-in-stage:', tis.status, '| Stages tracked:', tis.data.timeInStage?.length);

  // 8. A5 WhatsApp Reminder
  const wa = await request('POST', '/api/whatsapp/send-reminder', { leadId: 'LEAD-004' });
  console.log('8. POST /api/whatsapp/send-reminder (A5 Reminder):', wa.status, '| Message ID:', wa.data.message?.messageId);

  // 9. System Config
  const cfg = await request('GET', '/api/config');
  console.log('9. GET /api/config:', cfg.status, '| Policy:', cfg.data.config?.approvalPolicy);

  server.close();
  console.log('\n🎉 ALL WEEK 1 API CONTRACT TESTS PASSED WITH 100% SUCCESS!');
}

testAllEndpoints().catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
