'use strict';

const path = require('path');
const axios = require('../backend/node_modules/axios');
const qs = require('querystring');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const secret = process.env.TELEFORCE_CRM_CLIENT_SECRET;
const clientId = process.env.TELEFORCE_CRM_CLIENT_ID;

async function checkTeleforceData() {
  console.log('\n======================================================');
  console.log('🔍 FETCHING REAL DATA FROM TELEFORCE CLOUD SERVER');
  console.log('======================================================\n');

  // 1. Authenticate with Teleforce
  const loginRes = await axios.post('https://platformapi.teleforce.cx/api/v1/api/login', qs.stringify({
    client_id: clientId,
    client_secret: secret
  }), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const token = loginRes.data.accessToken;
  console.log('✅ Teleforce Access Token Generated.');

  // 2. Fetch call reports for the last 15 days
  const dates = [];
  for (let i = 0; i < 15; i++) {
    const d = new Date(Date.now() - i * 86400000);
    dates.push(d.toISOString().split('T')[0]);
  }

  let totalCalls = 0;
  const allRecords = [];

  for (const date of dates) {
    try {
      const res = await axios.post('https://platformapi.teleforce.cx/api/v1/api/getcallreport', {
        token,
        date
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      if (res.data?.status && Array.isArray(res.data?.data) && res.data.data.length > 0) {
        console.log(`📅 Date: ${date} -> Found ${res.data.data.length} Real Call Records / Leads`);
        totalCalls += res.data.data.length;
        allRecords.push(...res.data.data);
      }
    } catch (err) {
      // ignore
    }
  }

  console.log('\n------------------------------------------------------');
  console.log(`📊 TOTAL REAL RECORDS IN TELEFORCE (Last 15 Days): ${totalCalls}`);
  console.log('------------------------------------------------------\n');

  if (allRecords.length > 0) {
    console.log('📋 SAMPLE REAL LEADS & CALLS FROM TELEFORCE:');
    allRecords.slice(0, 8).forEach((r, idx) => {
      console.log(`\n[Lead ${idx + 1}]`);
      console.log(`  Customer Phone : +${r.country_code || '91'} ${r.caller_number}`);
      console.log(`  Source / Name  : ${r.caller_name || 'N/A'}`);
      console.log(`  Agent Number   : ${r.user_number} (${r.user_name || 'Agent'})`);
      console.log(`  Call Time      : ${r.call_start_time}`);
      console.log(`  Duration       : ${r.call_talktime || r.call_duration}`);
      console.log(`  Circle/State   : ${r.circle_name} (${r.operator_name})`);
      console.log(`  Status         : ${r.call_status}`);
      if (r.rec_path) {
        console.log(`  Recording URL  : ${r.rec_path}`);
      }
    });
  }
}

checkTeleforceData().catch(err => {
  console.error('Error fetching Teleforce data:', err.message);
});

