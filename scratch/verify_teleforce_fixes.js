'use strict';

const path = require('path');
const axios = require('../backend/node_modules/axios');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const crmService = require('../backend/src/services/crmService');
const dialerService = require('../backend/src/services/dialerService');
const { executeTransition } = require('../backend/src/stateMachine/leadStateMachine');
const { mockLeads } = require('../backend/src/config/inMemoryStore');

async function runVerification() {
  console.log('\n======================================================');
  console.log('🔍 VERIFYING TELEFORCE CRM & DIALER FIXES');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // ────────────────────────────────────────────────────────────────
  // CHECK 1: Save Teleforce's Lead ID & Resolve for Transitions
  // ────────────────────────────────────────────────────────────────
  console.log('--- TEST 1: Save Teleforce Lead ID & Verify Stage Transition ---');
  try {
    // 1.1 Check resolution method exists
    assert(typeof crmService.resolveTeleforceLeadId === 'function', 'crmService has resolveTeleforceLeadId helper');

    // 1.2 Test extracting ID from simulated Teleforce API response
    const mockLead = {
      id: 'LEAD-VERIFY-001',
      name: 'Ramesh Patel',
      phone: '+91 98260 55443',
      interest: 'Double Die Dona Machine',
      budget: 135000,
      stage: 'Enquiry',
      teleforceLeadId: 'TF-987654'
    };

    // Push into mockLeads store so resolveTeleforceLeadId can find it by LEAD-id
    mockLeads.unshift(mockLead);

    const resolvedId = crmService.resolveTeleforceLeadId('LEAD-VERIFY-001', {});
    assert(resolvedId === 'TF-987654', `Resolved internal LEAD-VERIFY-001 to Teleforce ID "${resolvedId}" (Expected TF-987654)`);

    // 1.3 Transition state and verify syncLeadStatus receives teleforceLeadId
    const transitionResult = await executeTransition(mockLead, 'Qualified');
    assert(transitionResult.success === true, 'Transition Enquiry -> Qualified executed successfully');
    assert(transitionResult.integrationData?.crm?.leadid === 'TF-987654', 
      `Transition correctly sent Teleforce Lead ID "${transitionResult.integrationData?.crm?.leadid}" instead of local LEAD-id!`);

  } catch (err) {
    assert(false, `Test 1 failed with error: ${err.message}`);
  }

  // ────────────────────────────────────────────────────────────────
  // CHECK 2: Strictly Use "leadid" (No Underscore)
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: Spelling Check ("leadid" vs "lead_id") ---');
  try {
    // Intercept axios.post to verify outgoing payload in syncLeadStatus
    let capturedPayload = null;
    const originalPost = axios.post;

    axios.post = async function(url, data, config) {
      capturedPayload = data;
      return { status: 200, data: { success: true, message: 'Mock Teleforce Success', leadid: data.leadid } };
    };

    // Temporarily force provider to teleforce and set dummy apiUrl & secret to test payload generation
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production'; // bypass test check
    crmService.apiUrl = 'https://platformapi.teleforce.cx/api/v1/api/createlead/3226';
    crmService.clientSecret = 'dummy_secret';
    crmService.provider = 'teleforce';

    await crmService.syncLeadStatus('TF-12345', 'Booked', { teleforceLeadId: 'TF-12345' });

    assert(capturedPayload !== null, 'syncLeadStatus dispatched HTTP request payload');
    assert(capturedPayload?.leadid === 'TF-12345', `Payload contains "leadid": "${capturedPayload?.leadid}"`);
    assert(capturedPayload?.lead_id === undefined, 'Payload strictly does NOT contain underscore "lead_id"');

    // Restore
    axios.post = originalPost;
    process.env.NODE_ENV = oldEnv;
    crmService.refreshConfig();
  } catch (err) {
    assert(false, `Test 2 failed with error: ${err.message}`);
  }

  // ────────────────────────────────────────────────────────────────
  // CHECK 3: Sync CRM Edits (Phone, Budget, Notes) to Teleforce
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: Sync CRM Edits via updateLead ---');
  try {
    assert(typeof crmService.updateLead === 'function', 'crmService.updateLead is defined');

    let capturedEditPayload = null;
    let capturedEditUrl = null;
    const originalPost = axios.post;

    axios.post = async function(url, data, config) {
      capturedEditUrl = url;
      capturedEditPayload = data;
      return { status: 200, data: { success: true, message: 'Lead updated', leadid: data.leadid } };
    };

    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    crmService.apiUrl = 'https://platformapi.teleforce.cx/api/v1/api/createlead/3226';
    crmService.clientSecret = 'dummy_secret';
    crmService.provider = 'teleforce';

    const editResult = await crmService.updateLead('LEAD-VERIFY-001', {
      name: 'Ramesh Patel (Updated)',
      phone: '+91 98260 99999',
      budget: 155000,
      notes: 'Customer agreed to 10% advance token payment.',
      stage: 'Booked'
    });

    assert(editResult.success === true, 'updateLead returned success');
    assert(capturedEditUrl.includes('/updatelead'), `URL correctly routed to /updatelead endpoint: ${capturedEditUrl}`);
    assert(capturedEditPayload?.leadid === 'TF-987654', `Resolved to Teleforce ID "TF-987654" in edit payload`);
    assert(capturedEditPayload?.phone === '9826099999', `Phone cleaned to 10 digits: ${capturedEditPayload?.phone}`);
    assert(capturedEditPayload?.budget === 155000, `Budget synced: ${capturedEditPayload?.budget}`);
    assert(capturedEditPayload?.remarks === 'Customer agreed to 10% advance token payment.', `Notes synced as remarks: ${capturedEditPayload?.remarks}`);
    assert(capturedEditPayload?.lead_id === undefined, 'No underscore "lead_id" present in edit payload');

    // Restore
    axios.post = originalPost;
    process.env.NODE_ENV = oldEnv;
    crmService.refreshConfig();
  } catch (err) {
    assert(false, `Test 3 failed with error: ${err.message}`);
  }

  // ────────────────────────────────────────────────────────────────
  // CHECK 4: Dialer Secret Keys & Authentication Headers
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 4: Dialer Authentication Headers & "leadid" ---');
  try {
    let capturedDialerHeaders = null;
    let capturedDialerBody = null;
    const originalPost = axios.post;

    axios.post = async function(url, data, config) {
      capturedDialerBody = data;
      capturedDialerHeaders = config?.headers;
      return { status: 200, data: { sid: 'TF-CALL-SESSION-9999' } };
    };

    // Ensure queue has our verify lead
    const callEntry = dialerService.enqueue({
      id: 'LEAD-VERIFY-001',
      teleforceLeadId: 'TF-987654',
      name: 'Ramesh Patel',
      phone: '+919826055443',
      product: 'Double Die Dona Machine'
    }, 'Hot');

    assert(callEntry !== null, `Dialer successfully enqueued call: ${callEntry.id}`);

    // Trigger outbound call
    const callResult = await dialerService.triggerCall(callEntry.id);

    assert(callResult.success === true, 'triggerCall returned success');
    assert(capturedDialerHeaders !== null, 'Dialer passed custom HTTP headers in axios.post');
    assert(capturedDialerHeaders?.['Authorization']?.startsWith('Bearer '), `Authorization Bearer header is present: ${capturedDialerHeaders?.['Authorization']?.slice(0, 15)}...`);
    assert(capturedDialerHeaders?.['client_id'] !== undefined, `client_id header present: "${capturedDialerHeaders?.['client_id']}"`);
    assert(capturedDialerHeaders?.['client_secret'] !== undefined, 'client_secret header present');
    assert(capturedDialerHeaders?.['x-teleforce-secret'] !== undefined, 'x-teleforce-secret header present');
    assert(capturedDialerBody?.leadid === 'TF-987654', `Dialer sent "leadid": "${capturedDialerBody?.leadid}" (resolved from teleforceLeadId)`);
    assert(capturedDialerBody?.lead_id === undefined, 'Dialer strictly does NOT send underscore "lead_id"');

    // Restore
    axios.post = originalPost;
  } catch (err) {
    assert(false, `Test 4 failed with error: ${err.message}`);
  }

  console.log('\n======================================================');
  console.log(`📊 RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed === 0) {
    console.log('🎉 ALL 4 TELEFORCE INTEGRATION FIXES ARE FULLY FUNCTIONAL AND VERIFIED!\n');
    process.exit(0);
  } else {
    console.error('⚠️ SOME TESTS FAILED. PLEASE CHECK LOGS ABOVE.\n');
    process.exit(1);
  }
}

runVerification().catch(e => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
