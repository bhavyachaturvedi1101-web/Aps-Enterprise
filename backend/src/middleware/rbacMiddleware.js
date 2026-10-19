// APS Enterprise Production RBAC & BOLA (Horizontal Access Control) Middleware

/**
 * Resolves canonical employee ID (e.g. 'e1', 'e2', 'e4') from user identity
 */
const getEmployeeId = (user) => {
  if (!user) return null;
  if (user.employeeId) return user.employeeId;
  const idStr = String(user.id || '');
  if (idStr.toLowerCase().startsWith('e') && idStr.length <= 5) return idStr.toLowerCase();
  
  // Known operator / static mapping
  const email = (user.email || '').toLowerCase().trim();
  if (email.includes('telecaller') || idStr === 'USR-004' || idStr === 'u4') return 'e4';
  if (email.includes('accounts') || idStr === 'USR-003' || idStr === 'u3') return 'e3';
  if (email.includes('manager') || idStr === 'USR-002' || idStr === 'u2') return 'e2';
  if (email.includes('admin') || idStr === 'USR-001' || idStr === 'u1') return 'e1';

  const numMatch = idStr.match(/(\d+)$/);
  if (numMatch && numMatch[1].length <= 3) return `e${parseInt(numMatch[1], 10)}`;
  return idStr;
};

/**
 * Returns true if the user possesses elevated administrative/management authority
 */
const isPrivileged = (user) => {
  if (!user) return false;
  const role = (user.role || '').toLowerCase().trim();
  return ['admin', 'super admin', 'superadmin', 'manager'].includes(role);
};

/**
 * Validates whether user has horizontal read permission for a given lead
 */
const canAccessLead = (user, lead) => {
  if (!user) return false;
  if (isPrivileged(user)) return true;
  const role = (user.role || '').toLowerCase().trim();
  if (role === 'accountant') return true;

  if (!lead) return false;
  const empId = getEmployeeId(user);
  const assigned = lead.assignedEmployeeId || lead.employeeId;

  // Telecaller/Employee can see assigned leads, unassigned leads, or leads matching their name
  return (
    !assigned ||
    assigned === empId ||
    assigned === user.id ||
    (lead.assignedTo && lead.assignedTo.toLowerCase() === (user.name || '').toLowerCase())
  );
};

/**
 * Validates whether user has horizontal mutation permission for a given lead
 */
const canModifyLead = (user, lead) => {
  if (!user) return false;
  if (isPrivileged(user)) return true;
  const role = (user.role || '').toLowerCase().trim();
  if (role === 'accountant') return true;

  if (!lead) return false;
  const empId = getEmployeeId(user);
  const assigned = lead.assignedEmployeeId || lead.employeeId;

  return (
    assigned === empId ||
    assigned === user.id ||
    (lead.assignedTo && lead.assignedTo.toLowerCase() === (user.name || '').toLowerCase())
  );
};

/**
 * Validates whether user has permission to view/modify target employee profile/tasks
 */
const canAccessEmployeePerformance = (user, targetEmployeeId) => {
  if (!user) return false;
  if (isPrivileged(user)) return true;

  const empId = getEmployeeId(user);
  const target = String(targetEmployeeId || '').toLowerCase().trim();
  return (
    target === String(empId).toLowerCase() ||
    target === String(user.id || '').toLowerCase()
  );
};

/**
 * Role-Based Access Control (RBAC) route gate
 */
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

module.exports = {
  authorize,
  getEmployeeId,
  isPrivileged,
  canAccessLead,
  canModifyLead,
  canAccessEmployeePerformance
};

