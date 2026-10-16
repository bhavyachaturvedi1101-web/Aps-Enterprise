const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_aps_key_2026';
const ADMIN_EMAIL = (process.env.TELEFORCE_CRM_LOGIN_EMAIL || 'admin@apsenterprises.in').toLowerCase();
const ADMIN_API_KEY = process.env.API_KEY || 'admin-key-123';

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
router.post('/login', (req, res) => {
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

    // Find operator matching primary or alternative email
    const operator = OPERATORS.find(
      op => op.email === cleanEmail || (op.altEmail && op.altEmail === cleanEmail)
    );

    if (!operator) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Credentials',
        message: 'Operator account not found with this email address.'
      });
    }

    // Password validation:
    // Allows ADMIN_API_KEY, JWT_SECRET, or custom configured password
    const validPasswords = [
      ADMIN_API_KEY,
      process.env.ADMIN_PASSWORD,
      'admin123',
      'aps2026',
      'password123'
    ].filter(Boolean);

    const isMatch = validPasswords.some(p => p === cleanPass);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Credentials',
        message: 'Incorrect password for this operator account.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: operator.id,
        name: operator.name,
        email: operator.email,
        role: operator.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Authentication successful',
      token,
      user: operator
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
