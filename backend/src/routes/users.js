const express = require('express');
const router = express.Router();
const path = require('path');
const store = require('../config/inMemoryStore');
const { authorize } = require('../middleware/rbacMiddleware');
const { isDbConnected } = require('../config/db');
const { withDb, isStrictDbMode, DatabaseUnavailableError } = require('../utils/dbPolicy');
const { safeReadJson, safeWriteJson } = require('../utils/safeStorage');
const { User, Employee, ActivityLog } = require('../models');

const USERS_FILE = path.join(__dirname, '../../users_data.json');
const EMPLOYEES_FILE = path.join(__dirname, '../../employees_data.json');
const ADMIN_EMAIL = (process.env.TELEFORCE_CRM_LOGIN_EMAIL || 'admin@apsenterprises.in').toLowerCase();

const DEFAULT_USERS = [
  { id: 'u1', name: 'Super Admin', email: ADMIN_EMAIL, role: 'Super Admin', module: 'All Modules', lastLogin: 'Now', status: 'Online' }
];

// Helper to load users safely
function loadUsers() {
  const list = safeReadJson(USERS_FILE, null);
  if (Array.isArray(list) && list.length > 0) {
    store.mockUsers = list;
    return list;
  }
  if (!store.mockUsers) {
    store.mockUsers = [...DEFAULT_USERS];
    safeWriteJson(USERS_FILE, store.mockUsers);
  }
  return store.mockUsers;
}

// Helper to save users safely
function saveUsers(usersList) {
  store.mockUsers = usersList;
  safeWriteJson(USERS_FILE, usersList);
}

function formatDbUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role === 'admin' ? 'Super Admin' : (u.role === 'manager' ? 'Operations Manager' : 'Team Associate'),
    module: u.department || 'Operations & CRM',
    lastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Recent',
    status: u.isActive ? 'Online' : 'Offline'
  };
}

// GET /api/users — List all system users & roles (Admin only)
router.get('/', authorize(['admin']), async (req, res, next) => {
  try {
    const users = await withDb(
      async () => {
        const dbUsers = await User.findAll({ order: [['createdAt', 'DESC']] });
        return (dbUsers || []).map(formatDbUser);
      },
      () => {
        const fileUsers = loadUsers();
        return fileUsers;
      }
    );

    return res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/users — Create a new system user (Admin only)
router.post('/', authorize(['admin']), async (req, res, next) => {
  try {
    const { name, email, role, module, status } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const resolvedRole = role || 'Operations';
    const resolvedModule = module || (role === 'Admin' ? 'Dashboard & Core' : (role === 'Super Admin' ? 'Voice AI' : 'Operations & CRM'));

    const result = await withDb(
      async () => {
        const [dbUser, created] = await User.findOrCreate({
          where: { email: cleanEmail },
          defaults: {
            id: `u${Date.now()}`,
            name: cleanName,
            email: cleanEmail,
            role: resolvedRole.toLowerCase().includes('admin') ? 'admin' : (resolvedRole.toLowerCase().includes('manager') ? 'manager' : 'employee'),
            department: resolvedModule,
            isActive: status !== 'Offline'
          }
        });

        // Also ensure employee record exists in DB
        await Employee.findOrCreate({
          where: { email: cleanEmail },
          defaults: {
            id: `e${Date.now()}`,
            name: cleanName,
            email: cleanEmail,
            phone: '+91 98765 43210',
            role: resolvedRole.toLowerCase().includes('admin') ? 'System Administrator' : 'Sales Associate',
            department: resolvedModule,
            status: 'Active',
            kpiScore: '90%',
            tasksCompleted: 0,
            callsHandled: 0,
            salesClosed: 0,
            totalRevenue: 0
          }
        });

        const allUsers = await User.findAll({ order: [['createdAt', 'DESC']] });
        return {
          user: formatDbUser(dbUser),
          users: allUsers.map(formatDbUser)
        };
      },
      () => {
        const users = loadUsers();
        const newUser = {
          id: `u${Date.now()}`,
          name: cleanName,
          email: cleanEmail,
          role: resolvedRole,
          module: resolvedModule,
          lastLogin: 'Just now',
          status: status || 'Online',
          createdAt: new Date().toISOString()
        };

        users.unshift(newUser);
        saveUsers(users);

        // Also sync to employees store so they appear in Team KPIs
        try {
          let empList = safeReadJson(EMPLOYEES_FILE, []);
          if (!empList.some(e => e.email?.toLowerCase() === cleanEmail)) {
            const empId = `e${empList.length + 1}`;
            const newEmp = {
              id: empId,
              name: cleanName,
              email: cleanEmail,
              phone: '+91 98765 43210',
              role: resolvedRole === 'Admin' ? 'System Administrator' : (resolvedRole === 'Super Admin' ? 'Super Admin' : (resolvedRole === 'Telecaller' ? 'Lead Telecaller Executive' : 'Direct Sales Executive')),
              department: resolvedModule,
              status: 'Active',
              kpiScore: '92%',
              kpiScoreNum: 92,
              tasksCompleted: 0,
              callsHandled: 0,
              salesClosed: 0,
              totalRevenue: 0,
              conversionRate: '30%',
              avgCallDurationSec: 110,
              avgResponseTimeMin: 3.5,
              weeklyKpiHistory: [88, 90, 91, 92],
              activeTask: {
                id: `task-${empId}-1`,
                title: `System onboarding for ${cleanName}`,
                priority: 'Normal',
                type: 'System Onboarding',
                dueIn: '45 mins',
                assignedAt: new Date()
              },
              taskQueue: []
            };
            empList.unshift(newEmp);
            safeWriteJson(EMPLOYEES_FILE, empList);
            store.mockEmployees = empList;
          }
        } catch (err) {
          console.error('[users.js sync to employees error]:', err.message);
        }

        if (store.mockActivityLogs) {
          store.mockActivityLogs.unshift({
            id: `act-${Date.now()}`,
            employeeName: 'System AI',
            action: `Created new user account "${cleanName}" with role "${resolvedRole}" (${resolvedModule})`,
            createdAt: new Date()
          });
        }

        return { user: newUser, users };
      }
    );

    return res.status(201).json({
      success: true,
      message: `User ${cleanName} created successfully`,
      user: result.user,
      users: result.users
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id — Update user (Admin only)
router.put('/:id', authorize(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await withDb(
      async () => {
        const u = await User.findByPk(id);
        if (!u) return { notFound: true };

        const { name, role, module, status } = req.body;
        if (name) u.name = name.trim();
        if (role) u.role = role.toLowerCase().includes('admin') ? 'admin' : (role.toLowerCase().includes('manager') ? 'manager' : 'employee');
        if (module) u.department = module;
        if (status !== undefined) u.isActive = status !== 'Offline';

        await u.save();
        const allUsers = await User.findAll({ order: [['createdAt', 'DESC']] });
        return {
          user: formatDbUser(u),
          users: allUsers.map(formatDbUser)
        };
      },
      () => {
        const users = loadUsers();
        const idx = users.findIndex(u => u.id === id || u.email?.toLowerCase() === id.toLowerCase());
        if (idx === -1) {
          return { notFound: true };
        }

        users[idx] = {
          ...users[idx],
          ...req.body,
          updatedAt: new Date().toISOString()
        };
        saveUsers(users);

        return {
          user: users[idx],
          users
        };
      }
    );

    if (result.notFound) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      success: true,
      message: 'User updated successfully',
      user: result.user,
      users: result.users
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id — Remove user (Admin only)
router.delete('/:id', authorize(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await withDb(
      async () => {
        const u = await User.findByPk(id);
        if (!u) return { notFound: true };

        await u.destroy();
        const allUsers = await User.findAll({ order: [['createdAt', 'DESC']] });
        return {
          users: allUsers.map(formatDbUser)
        };
      },
      () => {
        const users = loadUsers();
        const targetUser = users.find(u => u.id === id || u.email?.toLowerCase() === id.toLowerCase());
        const remaining = users.filter(u => u.id !== id && u.email?.toLowerCase() !== id.toLowerCase());
        saveUsers(remaining);

        if (targetUser) {
          try {
            const empList = safeReadJson(EMPLOYEES_FILE, []);
            if (Array.isArray(empList)) {
              const updatedEmps = empList.filter(e => 
                e.email?.toLowerCase() !== targetUser.email?.toLowerCase() &&
                e.name?.toLowerCase() !== targetUser.name?.toLowerCase()
              );
              safeWriteJson(EMPLOYEES_FILE, updatedEmps);
              if (store.mockEmployees) {
                store.mockEmployees = updatedEmps;
              }
            }
          } catch (err) {
            console.error('Error syncing employee deletion:', err);
          }

          if (store.mockActivityLogs) {
            store.mockActivityLogs.unshift({
              id: `act-${Date.now()}`,
              employeeName: 'System AI',
              action: `Removed system account "${targetUser.name}" (${targetUser.email})`,
              createdAt: new Date()
            });
          }
        }

        return { users: remaining };
      }
    );

    if (result.notFound) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      success: true,
      message: 'User removed successfully',
      users: result.users
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
