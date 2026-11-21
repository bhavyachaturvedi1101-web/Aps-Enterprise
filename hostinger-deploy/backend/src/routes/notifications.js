'use strict';
const express = require('express');
const router = express.Router();
const store = require('../config/inMemoryStore');

// In-memory notifications store initialized with recent system events
let notifications = [
  {
    id: 'n-lead-1',
    title: 'New Meta Ads Lead',
    message: 'Acme Metalworks registered interest for CNC Router Pro.',
    time: '2 mins ago',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    read: false,
    category: 'leads',
    route: '/crm',
    color: '#2563eb',
    iconType: 'lead'
  },
  {
    id: 'n-pay-1',
    title: 'Payment Gate Verification',
    message: 'Global Tech 10% advance (₹4,200) requires verification.',
    time: '15 mins ago',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    read: false,
    category: 'payments',
    route: '/payments',
    color: '#d97706',
    iconType: 'payment'
  },
  {
    id: 'n-wa-1',
    title: 'WhatsApp Sequence Delivered',
    message: 'Payment reminder sequence dispatched to 3 pending leads.',
    time: '45 mins ago',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    read: false,
    category: 'whatsapp',
    route: '/whatsapp',
    color: '#10b981',
    iconType: 'whatsapp'
  },
  {
    id: 'n-call-1',
    title: 'AI Voice Call Outcome',
    message: 'Outbound call to Rahul Sharma completed — Demo Scheduled.',
    time: '1 hour ago',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    read: false,
    category: 'voice',
    route: '/voice',
    color: '#7c3aed',
    iconType: 'voice'
  }
];

// Helper to calculate relative time
function getRelativeTime(timestamp) {
  if (!timestamp) return 'Just now';
  const diffSec = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diffSec < 45) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  return `${Math.floor(diffSec / 86400)} days ago`;
}

// GET /api/notifications — Retrieve all live notifications
router.get('/', (req, res) => {
  // Sync with any new activity logs from store
  const activityLogs = store.mockActivityLogs || [];
  
  // Format and update relative times
  const formatted = notifications.map(n => ({
    ...n,
    time: getRelativeTime(n.timestamp)
  }));

  const unreadCount = formatted.filter(n => !n.read).length;

  res.json({
    success: true,
    notifications: formatted,
    total: formatted.length,
    unreadCount
  });
});

// POST /api/notifications/mark-read — Mark notification(s) as read
router.post('/mark-read', (req, res) => {
  const { id } = req.body;
  if (id) {
    notifications = notifications.map(n => n.id === id ? { ...n, read: true } : n);
  } else {
    notifications = notifications.map(n => ({ ...n, read: true }));
  }
  res.json({ success: true, unreadCount: notifications.filter(n => !n.read).length });
});

// POST /api/notifications/clear — Clear all notifications
router.post('/clear', (req, res) => {
  notifications = [];
  res.json({ success: true, count: 0 });
});

// POST /api/notifications/simulate — Push a live simulation event into the notification drawer
router.post('/simulate', (req, res) => {
  const sampleEvents = [
    {
      title: 'Incoming Customer AI Query',
      message: 'Client asked: "What is the warranty and dispatch timeline for CNC Machine v2?"',
      category: 'ai',
      route: '/ai',
      color: '#0891b2',
      iconType: 'ai'
    },
    {
      title: 'New Meta Ads Lead Ingested',
      message: 'Apex Precision Works registered inquiry for Hydraulic Press HP-50.',
      category: 'leads',
      route: '/crm',
      color: '#2563eb',
      iconType: 'lead'
    },
    {
      title: 'UPI Advance Payment Verified',
      message: '₹3,500 advance received for Order #ORD-9821. Tally sync clearance complete.',
      category: 'payments',
      route: '/payments',
      color: '#059669',
      iconType: 'payment'
    },
    {
      title: 'WhatsApp Response Received',
      message: 'Priya Patel replied: "Payment transferred via NEFT. Please send dispatch note."',
      category: 'whatsapp',
      route: '/whatsapp',
      color: '#10b981',
      iconType: 'whatsapp'
    },
    {
      title: 'Outbound Voice Call Completed',
      message: 'Telecaller connected with Rajesh Nair. Call outcome: Booking Advance Requested.',
      category: 'voice',
      route: '/voice',
      color: '#7c3aed',
      iconType: 'voice'
    }
  ];

  const pick = sampleEvents[Math.floor(Math.random() * sampleEvents.length)];
  const newNotification = {
    id: `notif-${Date.now()}`,
    title: pick.title,
    message: pick.message,
    timestamp: new Date().toISOString(),
    time: 'Just now',
    read: false,
    category: pick.category,
    route: pick.route,
    color: pick.color,
    iconType: pick.iconType
  };

  notifications.unshift(newNotification);
  if (notifications.length > 30) notifications = notifications.slice(0, 30);

  res.status(201).json({
    success: true,
    notification: newNotification,
    unreadCount: notifications.filter(n => !n.read).length
  });
});

module.exports = router;
