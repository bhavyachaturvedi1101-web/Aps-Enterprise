// A2 Internal Security Middleware — Authentication
const mockUsers = {
  'admin-key-123': { id: 'e2', name: 'Bhavya', role: 'Admin' },
  'sales-key-456': { id: 'e1', name: 'Animesh', role: 'Telecaller' },
  'ops-key-789': { id: 'e3', name: 'Aaditya', role: 'Operations' }
};

const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  // Default to Admin in development if no token passed
  if (!apiKey) {
    req.user = { id: 'e2', name: 'Bhavya (Default Dev)', role: 'Admin' };
    return next();
  }

  const user = mockUsers[apiKey];
  if (!user && process.env.NODE_ENV === 'production') {
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'AUTH_UNAUTHORIZED',
      message: 'Valid API Key or Bearer token is required.'
    });
  }

  req.user = user || { id: 'user-anon', name: 'Authenticated User', role: 'Admin' };
  next();
};

module.exports = { authenticate };
