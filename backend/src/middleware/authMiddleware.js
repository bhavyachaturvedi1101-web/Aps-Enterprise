// APS Enterprise Production Authentication & Authorization Middleware
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_aps_key_2026';
const ADMIN_API_KEY = process.env.API_KEY || 'admin-key-123';

const knownApiKeys = {
  [ADMIN_API_KEY]: { id: 'USR-001', name: 'Super Admin', role: 'admin' },
  'sales-key-456': { id: 'USR-003', name: 'Sales Telecaller', role: 'employee' },
  'ops-key-789': { id: 'USR-002', name: 'Bhavya Chaturvedi', role: 'manager' }
};

const authenticate = (req, res, next) => {
  // Public routes that do not require auth
  if (req.path.startsWith('/api/auth/login') || req.path === '/api/health') {
    return next();
  }

  const rawAuth = req.headers['authorization'] || '';
  const apiKey = req.headers['x-api-key'] || '';

  // 1. Try JWT Bearer token
  if (rawAuth.startsWith('Bearer ')) {
    const token = rawAuth.slice(7).trim();
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (jwtErr) {
      // If production, reject invalid JWT
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({
          error: 'Unauthorized',
          code: 'INVALID_TOKEN',
          message: 'Session expired or invalid token.'
        });
      }
    }
  }

  // 2. Try static API key
  if (apiKey && knownApiKeys[apiKey]) {
    req.user = knownApiKeys[apiKey];
    return next();
  }

  // 3. Fallback for internal development or requests without header
  if (process.env.NODE_ENV !== 'production' || !apiKey && !rawAuth) {
    req.user = { id: 'USR-001', name: 'Super Admin', role: 'admin' };
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized',
    code: 'AUTH_UNAUTHORIZED',
    message: 'Valid Authorization Bearer token or x-api-key required.'
  });
};

module.exports = { authenticate };
