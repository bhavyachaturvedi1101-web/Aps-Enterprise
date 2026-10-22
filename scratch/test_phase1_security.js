const request = require('../backend/node_modules/supertest');
const app = require('../backend/src/app');

async function runTests() {
  console.log('--- RUNNING PHASE 1 SECURITY VALIDATION SUITE ---');
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

  // 1. Helmet headers
  const healthRes = await request(app).get('/api/health');
  assert(healthRes.headers['x-content-type-options'] === 'nosniff', 'Helmet x-content-type-options header present');
  assert(healthRes.body.status === 'healthy' || healthRes.body.status === 'degraded', 'Health check returns dynamic status');

  // 2. Rate limiter headers
  assert(healthRes.headers['ratelimit-limit'] !== undefined, 'Rate limit headers present on /api/ endpoints');

  // 3. Login with valid password (admin123 verified via bcrypt)
  const validLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@apsenterprises.in', password: 'admin123' });
  
  assert(validLogin.status === 200, 'Valid login returns status 200');
  assert(typeof validLogin.body.token === 'string' && validLogin.body.token.length > 20, 'JWT token returned on valid login');
  assert(validLogin.body.user.role === 'admin', 'Returned user has expected admin role');
  assert(validLogin.body.user.passwordHashes === undefined, 'passwordHashes are not exposed in response body');
  
  const token = validLogin.body.token;

  // 4. Login with invalid password
  const invalidLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@apsenterprises.in', password: 'wrongpassword' });
  
  assert(invalidLogin.status === 401, 'Invalid password returns status 401');

  // 5. Access protected route with valid JWT Bearer token
  const protectedAuthRes = await request(app)
    .get('/api/leads')
    .set({ 'authorization': `Bearer ${token}` });
  
  assert(protectedAuthRes.status === 200, 'Protected endpoint accessible with valid Bearer token');

  // 6. Access protected route with invalid Bearer token
  const invalidTokenRes = await request(app)
    .get('/api/leads')
    .set({ 'authorization': 'Bearer invalid.tampered.token' });
  
  assert(invalidTokenRes.status === 401, 'Invalid Bearer token rejected with status 401');

  // 7. Test /api/auth/verify endpoint
  const verifyValid = await request(app)
    .get('/api/auth/verify')
    .set({ 'authorization': `Bearer ${token}` });
  assert(verifyValid.status === 200 && verifyValid.body.valid === true, '/api/auth/verify confirms valid token');

  const verifyInvalid = await request(app)
    .get('/api/auth/verify')
    .set({ 'authorization': 'Bearer badtoken' });
  assert(verifyInvalid.status === 401, '/api/auth/verify rejects bad token with 401 Unauthorized');

  // 8. Test Production Environment Auth Bypass Fix (simulate NODE_ENV=production)
  const origEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const unauthProdRes = await request(app)
      .get('/api/leads');
    assert(unauthProdRes.status === 401, 'Production mode strictly rejects requests with no credentials (Bypass Closed!)');
    assert(unauthProdRes.body.code === 'AUTH_REQUIRED', 'Returns AUTH_REQUIRED error code in production');
  } finally {
    process.env.NODE_ENV = origEnv;
  }

  console.log(`\n--- SUMMARY: ${passCount} Passed, ${failCount} Failed ---`);
  if (failCount > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
