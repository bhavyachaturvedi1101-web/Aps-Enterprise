// APS Enterprise Production Authentication & Authorization Middleware
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_aps_key_2026';
const ADMIN_API_KEY = process.env.API_KEY || 'admin-key-123';

/**
 * Constant-time string comparison using SHA-256 digests to prevent timing attacks
 */
function timingSafeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = crypto.createHash('sha256').update(a).digest();
  const bufB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

const { getEmployeeId } = require('./rbacMiddleware');

// Build active API key registry
const knownApiKeys = {
  [ADMIN_API_KEY]: { id: 'USR-001', name: 'Super Admin', role: 'admin', employeeId: 'e1', email: 'admin@apsenterprises.in' }
};

// Allow static test keys only in dev/test environments for automated testing
if (!isProduction) {
  knownApiKeys['sales-key-456'] = { id: 'USR-004', name: 'Sales Telecaller', role: 'employee', employeeId: 'e4', email: 'telecaller@apsenterprises.in' };
  knownApiKeys['ops-key-789'] = { id: 'USR-002', name: 'Operations Manager', role: 'manager', employeeId: 'e2', email: 'manager@apsenterprises.in' };
  knownApiKeys['acct-key-321'] = { id: 'USR-003', name: 'Accounts Officer', role: 'accountant', employeeId: 'e3', email: 'accounts@apsenterprises.in' };
}

/**
 * Validates an incoming API key against known keys in constant time
 */
function matchApiKey(providedKey) {
  if (!providedKey || typeof providedKey !== 'string') return null;
  let matchedUser = null;
  for (const [key, user] of Object.entries(knownApiKeys)) {
    if (timingSafeCompare(providedKey, key)) {
      matchedUser = { ...user };
    }
  }
  return matchedUser;
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

  const attachUser = (user) => {
    req.user = {
      ...user,
      employeeId: user.employeeId || getEmployeeId(user)
    };
  };

  // 1. Try JWT Bearer token
  if (rawAuth.startsWith('Bearer ')) {
    const token = rawAuth.slice(7).trim();
    
    // Check if a known static API key was passed in Bearer format
    const apiKeyMatch = matchApiKey(token);
    if (apiKeyMatch) {
      attachUser(apiKeyMatch);
      return next();
    }

    try {
      // Strictly enforce HS256 algorithm to prevent algorithm confusion exploits
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      attachUser(decoded);
      return next();
    } catch (jwtErr) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'INVALID_TOKEN',
        message: 'Session expired or invalid token.'
      });
    }
  }

  // 2. Try static API key via x-api-key header (Timing-safe evaluation)
  if (apiKey) {
    const matchedUser = matchApiKey(apiKey);
    if (matchedUser) {
      attachUser(matchedUser);
      return next();
    }
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'INVALID_API_KEY',
      message: 'Provided API key is not recognized.'
    });
  }

  // 3. Fallback for internal development or test mode ONLY if not in production
  // In production (NODE_ENV === 'production'), this is strictly bypassed
  if (!isProduction && !apiKey && !rawAuth && process.env.ALLOW_DEV_ANONYMOUS_AUTH !== 'false') {
    attachUser({ id: 'USR-001', name: 'Super Admin', role: 'admin', employeeId: 'e1' });
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized',
    code: 'AUTH_REQUIRED',
    message: 'Valid Authorization Bearer token or x-api-key required.'
  });
};

module.exports = { authenticate, timingSafeCompare, matchApiKey };

