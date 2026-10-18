'use strict';
/**
 * ============================================================
 * APS ENTERPRISE — STRICT PRODUCTION ENVIRONMENT & SECRETS GATE
 * Validates cryptographic entropy, prevents default master keys,
 * and halts execution if insecure credentials are used in production.
 * ============================================================
 */

const WEAK_KEYS = new Set([
  'admin-key-123',
  'supersecret_aps_key_2026',
  'supersecret_ci_key_2026',
  'secret',
  'jwt_secret',
  'admin123',
  'aps2026',
  'password',
  'changeme',
  '123456',
  '12345678',
  'test-key',
  'sales-key-456',
  'ops-key-789',
  'your_production_secure_admin_api_key_here',
  'your_production_jwt_signing_secret_here'
]);

/**
 * Checks whether a key is known to be weak or default
 */
function isWeakKey(key) {
  if (!key || typeof key !== 'string') return true;
  const normalized = key.trim().toLowerCase();
  if (WEAK_KEYS.has(normalized)) return true;
  if (normalized.length < 16) return true;
  return false;
}

/**
 * Validates an environment configuration map against strict security gates
 */
function validateSecurityConfig(env = process.env) {
  const isProd = env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  const jwtSecret = env.JWT_SECRET || '';
  const apiKey = env.API_KEY || '';
  const adminPass = env.ADMIN_PASSWORD || '';
  const operatorPass = env.OPERATOR_PASSWORD || '';
  const allowDevAnon = env.ALLOW_DEV_ANONYMOUS_AUTH;

  // 1. JWT_SECRET Validation
  if (!jwtSecret) {
    if (isProd) {
      errors.push('JWT_SECRET is required in production environment.');
    } else {
      warnings.push('JWT_SECRET is unset. Using fallback development secret.');
    }
  } else if (isWeakKey(jwtSecret)) {
    if (isProd) {
      errors.push(`Insecure or default JWT_SECRET detected ("${jwtSecret.slice(0, 4)}..."). Production requires a random secret with at least 32 characters.`);
    } else {
      warnings.push('Using a default/weak JWT_SECRET in non-production mode.');
    }
  } else if (jwtSecret.length < 32 && isProd) {
    errors.push('JWT_SECRET length is insufficient for production. Minimum length is 32 characters.');
  }

  // 2. API_KEY Validation
  if (!apiKey) {
    if (isProd) {
      errors.push('API_KEY is required in production environment.');
    } else {
      warnings.push('API_KEY is unset. Using fallback development key.');
    }
  } else if (isWeakKey(apiKey)) {
    if (isProd) {
      errors.push(`Insecure or default API_KEY detected ("${apiKey.slice(0, 4)}..."). Production requires a strong master key.`);
    } else {
      warnings.push('Using a default/weak API_KEY in non-production mode.');
    }
  } else if (apiKey.length < 24 && isProd) {
    errors.push('API_KEY length is insufficient for production. Minimum length is 24 characters.');
  }

  // 3. Operator Password Hardening
  if (isProd) {
    if (adminPass && (adminPass === 'admin123' || adminPass.toLowerCase() === 'admin')) {
      errors.push('Insecure default ADMIN_PASSWORD ("admin123") detected in production.');
    }
    if (operatorPass && (operatorPass === 'aps2026' || operatorPass.toLowerCase() === 'operator')) {
      errors.push('Insecure default OPERATOR_PASSWORD ("aps2026") detected in production.');
    }
  }

  // 4. Anonymous Auth Enforcement
  if (isProd && allowDevAnon === 'true') {
    errors.push('ALLOW_DEV_ANONYMOUS_AUTH must NOT be enabled in production.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Boots validation gate at application startup
 */
function validateSecurityEnvironment() {
  const result = validateSecurityConfig(process.env);
  const isProd = process.env.NODE_ENV === 'production';

  if (result.warnings.length > 0) {
    result.warnings.forEach(w => {
      console.warn(`[SECURITY WARNING] ${w}`);
    });
  }

  if (!result.valid) {
    console.error('\n======================================================================');
    console.error(' [CRITICAL ERROR] PRODUCTION SECURITY & SECRETS GATE FAILED');
    console.error('======================================================================');
    result.errors.forEach(e => console.error(`  ✖ ${e}`));
    console.error('\nResolution: Generate strong 256-bit keys using:');
    console.error('  npm run security:generate-keys');
    console.error('and configure them in your production environment variables.');
    console.error('======================================================================\n');

    if (isProd) {
      const err = new Error(`Production Security Gate Failed: ${result.errors.join('; ')}`);
      err.code = 'ERR_SECURITY_GATE_FAILED';
      throw err;
    }
  }

  return result;
}

module.exports = {
  WEAK_KEYS,
  isWeakKey,
  validateSecurityConfig,
  validateSecurityEnvironment
};
