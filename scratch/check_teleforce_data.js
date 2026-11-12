'use strict';

const path = require('path');
const axios = require('../backend/node_modules/axios');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const secret = process.env.TELEFORCE_CRM_CLIENT_SECRET;
const clientId = process.env.TELEFORCE_CRM_CLIENT_ID;
const orgId = process.env.TELEFORCE_CRM_ORG_ID || '3226';

console.log('Using OrgId:', orgId, 'ClientId:', clientId);

const endpoints = [
  // Patterns like createlead/3226
  `https://platformapi.teleforce.cx/api/v1/api/getleads/${orgId}`,
  `https://platformapi.teleforce.cx/api/v1/api/leads/${orgId}`,
  `https://platformapi.teleforce.cx/api/v1/api/leadlist/${orgId}`,
  `https://platformapi.teleforce.cx/api/v1/api/getallleads/${orgId}`,
  `https://platformapi.teleforce.cx/api/v1/api/fetchleads/${orgId}`,
  `https://platformapi.teleforce.cx/api/v1/api/viewleads/${orgId}`,
  `https://platformapi.teleforce.cx/api/v1/api/viewlead/${orgId}`,
  `https://platformapi.teleforce.cx/api/v1/api/lead/${orgId}`,
  `https://platformapi.teleforce.cx/api/v1/api/getlead/${orgId}`,
  `https://platformapi.teleforce.cx/api/v1/api/allleads/${orgId}`,
  `https://platformapi.teleforce.cx/api/v1/api/listleads/${orgId}`,
  `https://platformapi.teleforce.cx/api/v1/api/leads`,
  `https://platformapi.teleforce.cx/api/v1/leads`,
  `https://platformapi.teleforce.cx/api/v1/lead`,
  `https://platformapi.teleforce.cx/api/v1/api/lead`
];

async function probe() {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + secret,
    'client_id': clientId,
    'client_secret': secret,
    'x-teleforce-secret': secret
  };

  for (const url of endpoints) {
    // 1. Try GET
    try {
      const res = await axios.get(url, { headers, timeout: 5000 });
      console.log('✅ GET', url, 'HTTP', res.status, JSON.stringify(res.data).slice(0, 200));
    } catch (err) {
      if (err.response && err.response.status !== 404) {
        console.log('⚠️ GET', url, 'HTTP', err.response.status, JSON.stringify(err.response.data));
      }
    }

    // 2. Try POST
    try {
      const res = await axios.post(url, { organization_id: orgId }, { headers, timeout: 5000 });
      console.log('✅ POST', url, 'HTTP', res.status, JSON.stringify(res.data).slice(0, 200));
    } catch (err) {
      if (err.response && err.response.status !== 404) {
        console.log('⚠️ POST', url, 'HTTP', err.response.status, JSON.stringify(err.response.data));
      }
    }
  }
}

probe().then(() => console.log('Done probing.')).catch(console.error);

