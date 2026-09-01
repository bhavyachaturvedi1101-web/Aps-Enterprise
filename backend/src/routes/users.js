const express = require('express');
const router = express.Router();
const { getStore } = require('../config/inMemoryStore');

const DEFAULT_USERS = [
  { id: 'u1', name: 'Animesh J', email: 'animesh@aps.in', role: 'Super Admin', module: 'Voice AI', lastLogin: '5m ago', status: 'Online' },
  { id: 'u2', name: 'Admin', email: 'admin@aps.enterprise', role: 'Admin', module: 'Dashboard & Core', lastLogin: 'Now', status: 'Online' },
  { id: 'u3', name: 'Bhavya', email: 'bhavya@aps.in', role: 'Operations', module: 'Operations & CRM', lastLogin: '1h ago', status: 'Away' },
  { id: 'u4', name: 'Aaditya', email: 'aaditya@aps.in', role: 'Agent', module: 'WhatsApp & Analytics', lastLogin: '2h ago', status: 'Offline' }
];

// GET /api/users — List all system users & roles
router.get('/', async (req, res) => {
  try {
    const store = await getStore();
    if (!store.mockUsers || store.mockUsers.length === 0) {
      store.mockUsers = [...DEFAULT_USERS];
    }
    return res.json({
      success: true,
      count: store.mockUsers.length,
      users: store.mockUsers
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load users', message: err.message });
  }
});

// POST /api/users — Create a new system user
router.post('/', async (req, res) => {
  try {
    const { name, email, role, module, status } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const store = await getStore();
    if (!store.mockUsers) store.mockUsers = [...DEFAULT_USERS];

    const newUser = {
      id: `u${store.mockUsers.length + 1}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role || 'Operations',
      module: module || (role === 'Admin' ? 'Dashboard & Core' : (role === 'Super Admin' ? 'Voice AI' : 'Operations & CRM')),
      lastLogin: 'Just now',
      status: status || 'Online',
      createdAt: new Date().toISOString()
    };

    store.mockUsers.unshift(newUser);

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
      user: newUser
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create user', message: err.message });
  }
});

// PUT /api/users/:id — Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = await getStore();
    if (!store.mockUsers) store.mockUsers = [...DEFAULT_USERS];

    const idx = store.mockUsers.findIndex(u => u.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    store.mockUsers[idx] = {
      ...store.mockUsers[idx],
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    return res.json({
      success: true,
      message: 'User updated successfully',
      user: store.mockUsers[idx]
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update user', message: err.message });
  }
});

// DELETE /api/users/:id — Remove user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = await getStore();
    if (!store.mockUsers) store.mockUsers = [...DEFAULT_USERS];

    store.mockUsers = store.mockUsers.filter(u => u.id !== id);

    return res.json({
      success: true,
      message: 'User removed successfully'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete user', message: err.message });
  }
});

module.exports = router;
