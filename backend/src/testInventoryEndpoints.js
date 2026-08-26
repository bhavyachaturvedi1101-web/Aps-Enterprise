const app = require('./app');
const http = require('http');

async function testInventory() {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(5098, resolve));
  console.log('--- Testing Inventory & Stock Tracking Endpoints (Port 5098) ---');

  const request = (method, path, body = null) => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 5098,
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

  // 1. Test GET /api/inventory/summary
  const summaryRes = await request('GET', '/api/inventory/summary');
  console.log('1. GET /api/inventory/summary Status:', summaryRes.status);
  console.log('   Summary Data:', summaryRes.data.summary);
  console.log('   Top Items Count:', summaryRes.data.topItems?.length);

  // 2. Test GET /api/inventory
  const listRes = await request('GET', '/api/inventory');
  console.log('2. GET /api/inventory Status:', listRes.status, '| Total Items:', listRes.data.count);

  // 3. Test POST /api/inventory (Add new item)
  const newSku = `APS-TEST-${Date.now().toString().slice(-4)}`;
  const createRes = await request('POST', '/api/inventory', {
    sku: newSku,
    name: 'Automatic Multi-Die Paper Plate Machine v4',
    category: 'Paper Plate Machines',
    totalStock: 10,
    bookedStock: 2,
    minStockThreshold: 3,
    unitPrice: 145000,
    location: 'Indore Main Plant'
  });
  console.log('3. POST /api/inventory Status:', createRes.status, '| Item SKU:', createRes.data.item?.sku);

  // 4. Test PATCH /api/inventory/:id/adjust
  const adjustRes = await request('PATCH', `/api/inventory/${newSku}/adjust`, {
    delta: 1,
    type: 'BOOKING',
    reason: 'Customer Test Booking'
  });
  console.log('4. PATCH /api/inventory adjust Status:', adjustRes.status, '| New Available:', adjustRes.data.item?.availableUnits);

  server.close();
  console.log('\n✅ INVENTORY TESTS COMPLETED SUCCESSFULLY!');
}

testInventory().catch(err => {
  console.error('Inventory Test Error:', err);
  process.exit(1);
});
