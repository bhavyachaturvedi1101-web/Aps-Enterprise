const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const store = require('../config/inMemoryStore');
const { authorize } = require('../middleware/rbacMiddleware');

const { isDbConnected } = require('../config/db');
const { safeReadJson, safeWriteJson } = require('../utils/safeStorage');

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
  if (process.env.NODE_ENV !== 'test') {
    safeWriteJson(USERS_FILE, usersList);
  }
}

// GET /api/users — List all system users & roles (Admin only)
router.get('/', authorize(['admin']), async (req, res) => {
  try {
    let dbUsers = [];
    if (isDbConnected()) {
      try {
        const { User } = require('../models');
        dbUsers = await User.findAll({ order: [['createdAt', 'DESC']] });
      } catch (e) {}
    }

    const fileUsers = loadUsers();
    let users = fileUsers;
    if (dbUsers && dbUsers.length > 0) {
      const dbFormatted = dbUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role === 'admin' ? 'Super Admin' : (u.role === 'manager' ? 'Operations Manager' : 'Team Associate'),
        module: u.department || 'Operations & CRM',
        lastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Recent',
        status: u.isActive ? 'Online' : 'Offline'
      }));
      const existingEmails = new Set(dbFormatted.map(u => u.email.toLowerCase()));
      users = [...dbFormatted, ...fileUsers.filter(u => !existingEmails.has(u.email.toLowerCase()))];
    }

    return res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load users', message: err.message });
  }
});

// POST /api/users — Create a new system user (Admin only)
router.post('/', authorize(['admin']), async (req, res) => {
  try {
    const { name, email, role, module, status } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const users = loadUsers();
    const newUser = {
      id: `u${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role || 'Operations',
      module: module || (role === 'Admin' ? 'Dashboard & Core' : (role === 'Super Admin' ? 'Voice AI' : 'Operations & CRM')),
      lastLogin: 'Just now',
      status: status || 'Online',
      createdAt: new Date().toISOString()
    };

    users.unshift(newUser);
    saveUsers(users);

    // Persist to DB if connected
    if (isDbConnected()) {
      try {
        const { User } = require('../models');
        await User.findOrCreate({
          where: { email: newUser.email },
          defaults: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role.toLowerCase().includes('admin') ? 'admin' : (newUser.role.toLowerCase().includes('manager') ? 'manager' : 'employee'),
            department: newUser.module || 'Operations',
            isActive: true
          }
        });
      } catch (dbErr) {
        console.warn('[users.js DB create warning]:', dbErr.message);
      }
    }

    // Also sync to employees store so they appear in Team KPIs
    try {
      let empList = safeReadJson(EMPLOYEES_FILE, []);
      if (!empList.some(e => e.email?.toLowerCase() === newUser.email.toLowerCase())) {
        const empId = `e${empList.length + 1}`;
        const newEmp = {
          id: empId,
          name: newUser.name,
          email: newUser.email,
          phone: '+91 98765 43210',
          role: newUser.role === 'Admin' ? 'System Administrator' : (newUser.role === 'Super Admin' ? 'Super Admin' : (newUser.role === 'Telecaller' ? 'Lead Telecaller Executive' : 'Direct Sales Executive')),
          department: newUser.module || 'Sales & Operations',
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
            title: `System onboarding for ${newUser.name}`,
            priority: 'Normal',
            type: 'System Onboarding',
            dueIn: '45 mins',
            assignedAt: new Date()
          },
          taskQueue: []
        };
        empList.unshift(newEmp);
        if (process.env.NODE_ENV !== 'test') {
          safeWriteJson(EMPLOYEES_FILE, empList);
        }
        store.mockEmployees = empList;
      }
    } catch (err) {
      console.error('[users.js sync to employees error]:', err.message);
    }

    // Also add to activity logs
    if (store.mockActivityLogs) {
      store.mockActivityLogs.unshift({
        id: `act-${Date.now()}`,
        employeeName: 'System AI',
        action: `Created new user account "${newUser.name}" with role "${newUser.role}" (${newUser.module})`,
        createdAt: new Date()
      });
    }

    return res.status(201).json({
      success: true,
      message: `User ${newUser.name} created successfully`,
      user: newUser,
      users
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create user', message: err.message });
  }
});

// PUT /api/users/:id — Update user (Admin only)
router.put('/:id', authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const users = loadUsers();

    const idx = users.findIndex(u => u.id === id || u.email?.toLowerCase() === id.toLowerCase());
    if (idx === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    users[idx] = {
      ...users[idx],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    saveUsers(users);

    return res.json({
      success: true,
      message: 'User updated successfully',
      user: users[idx],
      users
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update user', message: err.message });
  }
});

// DELETE /api/users/:id — Remove user (Admin only)
router.delete('/:id', authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const users = loadUsers();

    const targetUser = users.find(u => u.id === id || u.email?.toLowerCase() === id.toLowerCase());
    const remaining = users.filter(u => u.id !== id && u.email?.toLowerCase() !== id.toLowerCase());
    saveUsers(remaining);

    // Also delete from PostgreSQL if connected
    if (isDbConnected()) {
      try {
        const { User } = require('../models');
        await User.destroy({ where: { id } });
      } catch (e) {}
    }

    // Also sync and remove from employees if applicable
    if (targetUser) {
      try {
        const empList = safeReadJson(EMPLOYEES_FILE, []);
        if (Array.isArray(empList)) {
          const updatedEmps = empList.filter(e => 
            e.email?.toLowerCase() !== targetUser.email?.toLowerCase() &&
            e.name?.toLowerCase() !== targetUser.name?.toLowerCase()
          );
          if (process.env.NODE_ENV !== 'test') {
            safeWriteJson(EMPLOYEES_FILE, updatedEmps);
          }
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

    return res.json({
      success: true,
      message: 'User removed successfully',
      users: remaining
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete user', message: err.message });
  }
});

module.exports = router;
