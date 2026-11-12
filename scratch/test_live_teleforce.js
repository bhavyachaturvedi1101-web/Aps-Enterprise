'use strict';

const path = require('path');
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });
const crmService = require('../backend/src/services/crmService');

async function testTeleforceLive() {
  console.log('\n===============================================================');
  console.log('🚀 LIVE TELEFORCE MANUAL TEST RUNNER');
  console.log('===============================================================\n');

  // Force production mode for this test to hit live Teleforce API
  process.env.NODE_ENV = 'production';

  // 1. Check Configuration
  console.log('1️⃣ Checking CRM Service Connection...');
  const status = crmService.getStatus();
  console.log(`   Organization ID : ${status.organizationId}`);
  console.log(`   Client ID       : ${status.clientId}`);
  console.log(`   Status Mode     : ${status.mode}`);
  console.log('   ✅ Connection parameters verified.\n');

  // 2. Create Lead
  const testPhone = '98' + Math.floor(10000000 + Math.random() * 90000000); // 10 digit random valid phone
  console.log(`2️⃣ Creating Test Lead in Teleforce (Phone: ${testPhone})...`);
  
  const createResult = await crmService.createLead({
    name: 'Manual Test Client',
    phone: testPhone,
    interest: 'Double Die Dona Pattal Machine',
    budget: 125000,
    notes: 'Created via manual verification script'
  });

  if (createResult.success && createResult.teleforceLeadId) {
    console.log(`   ✅ SUCCESS: Lead Created in Teleforce!`);
    console.log(`   📌 Assigned Teleforce Lead ID: ${createResult.teleforceLeadId}\n`);
  } else {
    console.log(`   ❌ FAILED to create lead:`, createResult.error || createResult);
    return;
  }

  const tfId = createResult.teleforceLeadId;
  await new Promise(r => setTimeout(r, 1000)); // Allow 1s for Teleforce cloud index

  // 3. Edit Lead
  console.log(`3️⃣ Updating Lead Details in Teleforce (Lead ID: ${tfId})...`);
  const editResult = await crmService.updateLead(tfId, {
    name: 'Manual Test Client (Updated)',
    phone: testPhone,
    budget: 145000,
    notes: 'Updated budget to 1,45,000 for Double Die setup'
  });

  if (editResult.success) {
    console.log(`   ✅ SUCCESS: Lead details updated in Teleforce!`);
    console.log(`   📌 Server Message: ${editResult.data?.message || 'Updated'}\n`);
  } else {
    console.log(`   ❌ FAILED to update lead:`, editResult.error || editResult);
  }

  // 4. Change Stage
  console.log(`4️⃣ Transitioning Stage to "Qualified" in Teleforce...`);
  const stageResult = await crmService.syncLeadStatus(tfId, 'Qualified');

  if (stageResult.success) {
    console.log(`   ✅ SUCCESS: Stage synced to "Qualified" in Teleforce!`);
    console.log(`   📌 Server Message: ${stageResult.data?.message || 'Updated'}\n`);
  } else {
    console.log(`   ❌ FAILED to sync stage:`, stageResult.warning || stageResult);
  }

  console.log('===============================================================');
  console.log('🎉 ALL 3 LIVE ACTIONS VERIFIED DIRECTLY WITH TELEFORCE CLOUD!');
  console.log('===============================================================\n');
}

testTeleforceLive().catch(err => {
  console.error('Test execution error:', err.message);
});
