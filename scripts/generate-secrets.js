#!/usr/bin/env node
/**
 * ============================================================
 * APS ENTERPRISE — CRYPTOGRAPHIC SECRET GENERATOR UTILITY
 * Generates high-entropy 256-bit cryptographically secure keys
 * for production deployment (API_KEY, JWT_SECRET, Webhook tokens)
 * ============================================================
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function generateSecurePassword(length = 20) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
  const randomBytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

const secrets = {
  API_KEY: generateSecureToken(32),
  JWT_SECRET: generateSecureToken(48),
  ADMIN_PASSWORD: generateSecurePassword(22),
  OPERATOR_PASSWORD: generateSecurePassword(20),
  WEBHOOK_SECRET: generateSecureToken(32)
};

console.log('\n=================================================================');
console.log('   APS ENTERPRISE — GENERATED PRODUCTION SECURITY KEYS (256-BIT)  ');
console.log('=================================================================\n');
console.log('Copy these keys to your production environment or secrets manager:\n');
console.log(`API_KEY=${secrets.API_KEY}`);
console.log(`JWT_SECRET=${secrets.JWT_SECRET}`);
console.log(`ADMIN_PASSWORD=${secrets.ADMIN_PASSWORD}`);
console.log(`OPERATOR_PASSWORD=${secrets.OPERATOR_PASSWORD}`);
console.log(`WEBHOOK_SECRET=${secrets.WEBHOOK_SECRET}`);
console.log('\n-----------------------------------------------------------------');
console.log('These keys have been generated using Node.js crypto.randomBytes.');
console.log('NEVER commit these generated values to Git or public repositories.');
console.log('=================================================================\n');

module.exports = { generateSecureToken, generateSecurePassword };
