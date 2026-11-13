// APS Enterprise Production Authentication & Authorization Middleware
const jwt = require('jsonwebtoken');

const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (!isProduction ? 'supersecret_aps_key_2026' : '');
const ADMIN_API_KEY = process.env.API_KEY || (!isProduction ? 'admin-key-123' : '');

if (isProduction && !JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production.');
}

if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'supersecret_aps_key_2026')) {
  console.warn('[SECURITY WARNING] Insecure default JWT_SECRET detected in production! Please provide a strong, randomized JWT_SECRET in environment.');
}

// Build active API key registry
const knownApiKeys = {};
if (ADMIN_API_KEY) {
  knownApiKeys[ADMIN_API_KEY] = { id: 'USR-001', name: 'Super Admin', role: 'admin' };
}

// Allow static test keys only in dev/test environments for automated testing
if (!isProduction) {
  knownApiKeys['sales-key-456'] = { id: 'USR-003', name: 'Sales Telecaller', role: 'employee' };
  knownApiKeys['ops-key-789'] = { id: 'USR-002', name: 'Operations Manager', role: 'manager' };
}

const authenticate = (req, res, next) => {
  // Public routes that do not require auth (login, health, webhooks, metrics)
  if (
    req.path.startsWith('/api/auth/login') ||
    req.path.startsWith('/api/health') ||
    req.path.startsWith('/api/metrics') ||
    req.path === '/api/whatsapp/webhook'
  ) {
    return next();
  }

  const rawAuth = req.headers['authorization'] || '';
  const apiKey = req.headers['x-api-key'] || '';

  // 1. Try JWT Bearer token
  if (rawAuth.startsWith('Bearer ')) {
    const token = rawAuth.slice(7).trim();
    // Allow known static API keys passed in Bearer format (for integration test support)
    if ((ADMIN_API_KEY && token === ADMIN_API_KEY) || knownApiKeys[token]) {
      req.user = knownApiKeys[token] || { id: 'USR-001', name: 'Super Admin', role: 'admin' };
      return next();
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (jwtErr) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'INVALID_TOKEN',
        message: 'Session expired or invalid token.'
      });
    }
  }

  // 2. Try static API key
  if (apiKey && knownApiKeys[apiKey]) {
    req.user = knownApiKeys[apiKey];
    return next();
  } else if (apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'INVALID_API_KEY',
      message: 'Provided API key is not recognized.'
    });
  }

  // 3. Fallback for internal development or test mode ONLY if not in production
  // In production (NODE_ENV === 'production'), this is strictly bypassed
  if (!isProduction && !apiKey && !rawAuth && process.env.ALLOW_DEV_ANONYMOUS_AUTH !== 'false') {
    req.user = { id: 'USR-001', name: 'Super Admin', role: 'admin' };
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized',
    code: 'AUTH_REQUIRED',
    message: 'Valid Authorization Bearer token or x-api-key required.'
  });
};

module.exports = { authenticate };
