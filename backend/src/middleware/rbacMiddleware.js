// A2 Internal Security Middleware — Role-Based Access Control (RBAC)
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'AUTH_UNAUTHORIZED',
        message: 'User identity missing.'
      });
    }

    // Admin role has full access to all endpoints
    if (req.user.role === 'Admin') {
      return next();
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: `Role "${req.user.role}" does not have permission to perform this action. Allowed roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

module.exports = { authorize };
