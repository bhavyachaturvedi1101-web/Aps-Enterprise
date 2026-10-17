const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_aps_key_2026';
const ADMIN_EMAIL = (process.env.TELEFORCE_CRM_LOGIN_EMAIL || 'admin@apsenterprises.in').toLowerCase();
const ADMIN_API_KEY = process.env.API_KEY || 'admin-key-123';

// Configurable Operator Passwords via Environment (with safe fallback for demo/development)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const OPERATOR_PASSWORD = process.env.OPERATOR_PASSWORD || 'aps2026';

// Production Operator Registry for APS Enterprises (Dedicated User per Panel)
const OPERATORS = [
  {
    id: 'USR-001',
    name: 'Super Admin',
    email: ADMIN_EMAIL,
    altEmail: 'admin@apsenterprise.com',
    role: 'admin',
    title: 'Chief System & Operations Admin',
    avatar: 'A',
    avatarBg: '#09090b',
    permissions: [
      'Full Platform Management',
      'AI Strategy & System Control',
      'Users & Roles Management',
      'Lead Pipeline & Pipeline Machine Control',
      'Bookings & Factory Release',
      '10% Advance Payment Gate (Approve/Verify)',
      'WhatsApp Automation & Sandbox',
      'Voice Call Agent & Inbound Dialer',
      'Tally ERP Sync & Invoicing',
      'Team KPIs & Employee Activity Management',
      'System Settings'
    ],
    defaultRoute: '/dashboard'
  },
  {
    id: 'USR-002',
    name: 'Operations Manager',
    email: 'manager@apsenterprises.in',
    altEmail: 'manager@apsenterprise.com',
    role: 'manager',
    title: 'Factory Operations & Production Lead',
    avatar: 'OM',
    avatarBg: '#2563eb',
    permissions: [
      'Dashboard & Analytics',
      'CRM / Lead Pipeline Management',
      'Bookings & Factory Order Release',
      '10% Advance Payment Verification',
      'APS AI Assistant & Voice Agent',
      'WhatsApp Broadcast & Simulator',
      'Dialer Queue Dispatch',
      'Tally Sync & Invoicing',
      'Team KPIs & Monitoring',
      'Activity Log Review'
    ],
    defaultRoute: '/dashboard'
  },
  {
    id: 'USR-003',
    name: 'Accounts Officer',
    email: 'accounts@apsenterprises.in',
    altEmail: 'accounts@apsenterprise.com',
    role: 'accountant',
    title: 'Senior Accountant & Tally ERP Lead',
    avatar: 'AO',
    avatarBg: '#7c3aed',
    permissions: [
      'Tally Prime & ERP 9 Sync',
      'Customer Invoices & Billing',
      '10% Advance Gate Verification',
      'CRM Leads Financial Clearance',
      'Activity Log Review'
    ],
    defaultRoute: '/tally'
  },
  {
    id: 'USR-004',
    name: 'Sales Telecaller',
    email: 'telecaller@apsenterprises.in',
    altEmail: 'telecaller@apsenterprise.com',
    role: 'employee',
    title: 'Senior Telecaller & Equipment Specialist',
    avatar: 'ST',
    avatarBg: '#059669',
    permissions: [
      'CRM / Assigned Leads',
      'Dialer Queue (Outbound Calls)',
      'Voice Agent Calls & Call Outcomes',
      'My Tasks & KPI Performance Score',
      'Live Activity Log Entry'
    ],
    defaultRoute: '/crm'
  }
];

// POST /api/auth/login — Authenticate system operator
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Please provide both email and password.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // 1. Check PostgreSQL User table if available
    let dbUser = null;
    try {
      const { User } = require('../models');
      dbUser = await User.findOne({
        where: { email: cleanEmail }
      });
    } catch (dbErr) {
      // Non-critical if DB offline; fallback to OPERATORS registry
    }

    // 2. Find operator matching primary or alternative email
    const operator = OPERATORS.find(
      op => op.email === cleanEmail || (op.altEmail && op.altEmail === cleanEmail)
    );

    if (!operator && !dbUser) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Credentials',
        message: 'Operator account not found with this email address.'
      });
    }

    // 3. Password validation with Bcrypt & Env config
    let isMatch = false;

    // Check DB user hash
    if (dbUser && dbUser.passwordHash) {
      try {
        isMatch = await bcrypt.compare(cleanPass, dbUser.passwordHash);
      } catch (e) {}
    }

    // Check against environment-configured operator passwords
    if (!isMatch && operator) {
      const isProduction = process.env.NODE_ENV === 'production';
      const expectedPass = operator.role === 'admin' ? ADMIN_PASSWORD : OPERATOR_PASSWORD;
      
      // In production, reject known insecure defaults if not explicitly overridden
      if (isProduction && (cleanPass === 'admin123' || cleanPass === 'aps2026') && !process.env.ALLOW_DEFAULT_PASSWORDS_IN_PROD) {
        return res.status(403).json({
          success: false,
          error: 'Insecure Default Password Blocked',
          message: 'Default passwords are not permitted in production. Please set custom ADMIN_PASSWORD in environment or use database password hash.'
        });
      }

      // Allow operator's designated password, universal admin password, or demo operator passwords
      const acceptedPasswords = [
        expectedPass,
        ADMIN_PASSWORD,
        OPERATOR_PASSWORD,
        'admin123',
        'aps2026'
      ].filter(Boolean);

      if (acceptedPasswords.includes(cleanPass)) {
        isMatch = true;
      }
    }

    // Check static API key direct authentication
    if (!isMatch && ADMIN_API_KEY && cleanPass === ADMIN_API_KEY) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Credentials',
        message: 'Incorrect password for this operator account.'
      });
    }

    // Build user session payload
    const activeUser = operator || {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      title: dbUser.title || `${dbUser.role} Operator`,
      avatar: (dbUser.name || 'U').charAt(0).toUpperCase(),
      avatarBg: dbUser.avatarBg || '#2563eb',
      permissions: ['Platform Access', 'Operational Tasks'],
      defaultRoute: dbUser.role === 'admin' ? '/dashboard' : '/crm'
    };

    // Generate JWT token (7 days expiry)
    const token = jwt.sign(
      {
        id: activeUser.id,
        name: activeUser.name,
        email: activeUser.email,
        role: activeUser.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Strip passwordHashes before returning
    const safeUser = { ...activeUser };
    delete safeUser.passwordHashes;

    return res.json({
      success: true,
      message: 'Authentication successful',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('[Auth Login Error]', err);
    return res.status(500).json({
      success: false,
      error: 'Authentication Server Error',
      message: err.message
    });
  }
});

// GET /api/auth/verify — Verify token validity
router.get('/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.replace(/^Bearer\s+/, '');
  if (!token) return res.status(401).json({ valid: false, error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({ valid: true, user: decoded });
  } catch (err) {
    return res.status(401).json({ valid: false, error: 'Token expired or invalid' });
  }
});

// GET /api/auth/me — Get profile from JWT token
router.get('/me', (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.replace(/^Bearer\s+/, '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token Missing',
        message: 'No authorization token provided.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const operator = OPERATORS.find(op => op.id === decoded.id || op.email === decoded.email) || decoded;

    return res.json({
      success: true,
      user: operator
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid Token',
      message: 'Session has expired or is invalid. Please log in again.'
    });
  }
});

module.exports = router;
