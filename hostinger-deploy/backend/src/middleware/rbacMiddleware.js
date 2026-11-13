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

    const currentRole = (req.user.role || '').toLowerCase().trim();
    // Admin / Super Admin role has full access to all endpoints
    if (['admin', 'super admin', 'superadmin'].includes(currentRole)) {
      return next();
    }

    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase().trim());
    if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(currentRole)) {
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
