import React, { useState, useMemo, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import APSAIChatPanel from '../components/A3ChatPanel';

// ─── Master Nav Structure (APS Enterprise specific) ─────────────────────────
const ALL_NAV_GROUPS = [
  {
    group: 'PLATFORM',
    items: [
      {
        key: 'analytics', label: 'Dashboard', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></svg>
      },
      {
        key: 'users', label: 'Users & Roles', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
      }
    ]
  },
  {
    group: 'OPERATIONS',
    items: [
      {
        key: 'pipeline', label: 'CRM / Leads', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
      },
      {
        key: 'bookings', label: 'Bookings & ERP', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
      },
      {
        key: 'payments', label: 'Payment Gate', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
      }
    ]
  },
  {
    group: 'AI AGENTS',
    items: [
      {
        key: 'ai', label: 'APS AI Assistant', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.25 2 11.5c0 2.3.87 4.4 2.3 6.03L3 21l4.2-1.15A10.45 10.45 0 0 0 12 21c5.52 0 10-4.25 10-9.5S17.52 2 12 2z" /><path d="M8 11h.01M12 11h.01M16 11h.01" strokeWidth="3" /></svg>
      },
      {
        key: 'voice', label: 'Voice Agent', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z" /></svg>
      },
      {
        key: 'whatsapp', label: 'WhatsApp Agent', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
      },
      {
        key: 'dialer', label: 'Dialer Queue', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
      }
    ]
  },
  {
    group: 'FINANCE',
    items: [
      {
        key: 'tally', label: 'Tally Sync', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
      },
      {
        key: 'invoices', label: 'Invoices', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
      }
    ]
  },
  {
    group: 'PRODUCTIVITY',
    items: [
      {
        key: 'build', label: 'Team & KPIs', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
      },
      {
        key: 'activity', label: 'Activity Log', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
      },
      {
        key: 'settings', label: 'Settings', badge: null,
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
      }
    ]
  }
];

const INITIAL_NOTIFICATIONS = [
  {
    id: 'n1',
    title: 'New Meta Ads Lead',
    message: 'Acme Metalworks registered interest for CNC Router Pro.',
    time: '2 mins ago',
    read: false,
    route: '/crm',
    color: '#2563eb',
    bg: '#eff6ff',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
  },
  {
    id: 'n2',
    title: 'Payment Gate Verification',
    message: 'Global Tech 10% advance (₹4,200) requires verification.',
    time: '15 mins ago',
    read: false,
    route: '/payments',
    color: '#d97706',
    bg: '#fffbeb',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
  },
  {
    id: 'n3',
    title: 'WhatsApp Sequence Delivered',
    message: 'Payment reminder sequence dispatched to 3 pending leads.',
    time: '45 mins ago',
    read: false,
    route: '/whatsapp',
    color: '#10b981',
    bg: '#ecfdf5',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
  },
  {
    id: 'n4',
    title: 'AI Voice Call Outcome',
    message: 'Outbound call to Rahul Sharma completed — Demo Scheduled.',
    time: '1 hour ago',
    read: false,
    route: '/voice',
    color: '#7c3aed',
    bg: '#f3e8ff',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z" /></svg>
  }
];

const OPERATOR_PANELS = [
  {
    role: 'admin',
    name: 'Super Admin',
    email: 'admin@apsenterprises.in',
    tag: 'Full Cockpit (Settings & Users)',
    route: '/dashboard'
  },
  {
    role: 'manager',
    name: 'Operations Manager',
    email: 'manager@apsenterprises.in',
    tag: 'Plant Operations & Factory Lead',
    route: '/dashboard'
  },
  {
    role: 'accountant',
    name: 'Accounts Officer',
    email: 'accounts@apsenterprises.in',
    tag: 'Tally ERP Sync & Invoicing',
    route: '/tally'
  },
  {
    role: 'employee',
    name: 'Sales Telecaller',
    email: 'telecaller@apsenterprises.in',
    tag: 'CRM Pipeline & Outbound Calls',
    route: '/crm'
  }
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, login, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [notifFilter, setNotifFilter] = useState('all');
  const [isSimulating, setIsSimulating] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Dynamic Navigation Groups based on active User Role
  const filteredNavGroups = useMemo(() => {
    const role = (currentUser?.role || 'admin').toLowerCase().trim();
    if (role === 'admin' || role === 'super admin' || role === 'superadmin') return ALL_NAV_GROUPS;

    // Manager / Operations Lead
    if (role === 'manager' || role === 'operations') {
      return [
        {
          group: 'PLATFORM',
          items: ALL_NAV_GROUPS[0].items.filter(i => i.key === 'analytics')
        },
        {
          group: 'OPERATIONS',
          items: ALL_NAV_GROUPS[1].items
        },
        {
          group: 'AI AGENTS',
          items: ALL_NAV_GROUPS[2].items
        },
        {
          group: 'FINANCE',
          items: ALL_NAV_GROUPS[3].items // includes 'tally' & 'invoices'
        },
        {
          group: 'PRODUCTIVITY',
          items: ALL_NAV_GROUPS[4].items.filter(i => ['build', 'activity'].includes(i.key))
        }
      ].filter(g => g.items.length > 0);
    }

    // Accountant Role (Tally ERP, Invoices, Payment Gate, CRM Leads)
    if (role === 'accountant') {
      return [
        {
          group: 'FINANCE',
          items: ALL_NAV_GROUPS[3].items // includes 'tally' & 'invoices'
        },
        {
          group: 'OPERATIONS',
          items: ALL_NAV_GROUPS[1].items.filter(i => ['payments', 'pipeline'].includes(i.key))
        },
        {
          group: 'PRODUCTIVITY',
          items: ALL_NAV_GROUPS[4].items.filter(i => ['activity'].includes(i.key))
        }
      ].filter(g => g.items.length > 0);
    }

    // Employee / Telecaller Role
    return [
      {
        group: 'OPERATIONS',
        items: ALL_NAV_GROUPS[1].items.filter(i => ['pipeline'].includes(i.key))
      },
      {
        group: 'AI AGENTS',
        items: ALL_NAV_GROUPS[2].items.filter(i => ['dialer', 'voice', 'ai'].includes(i.key))
      },
      {
        group: 'PRODUCTIVITY',
        items: [
          {
            key: 'build',
            label: 'My Tasks & KPIs',
            badge: null,
            icon: ALL_NAV_GROUPS[4].items[0].icon
          },
          ALL_NAV_GROUPS[4].items[1] // activity
        ]
      }
    ].filter(g => g.items.length > 0);
  }, [currentUser?.role]);

  // Dynamic Header Pills based on Role
  const headerPills = useMemo(() => {
    const role = (currentUser?.role || 'admin').toLowerCase().trim();
    if (role === 'employee') {
      return [
        { key: 'pipeline', label: 'Lead Pipeline' },
        { key: 'dialer', label: 'Dialer Queue' },
        { key: 'build', label: 'My Tasks & KPIs' }
      ];
    }
    if (role === 'accountant') {
      return [
        { key: 'tally', label: 'Tally Prime Sync' },
        { key: 'invoices', label: 'Invoices' },
        { key: 'payments', label: '10% Payment Gate' }
      ];
    }
    return [
      { key: 'analytics', label: 'AI Strategy' },
      { key: 'pipeline', label: 'Lead Pipeline' },
      { key: 'build', label: 'Team KPIs' }
    ];
  }, [currentUser?.role]);

  // Fetch notifications from backend API
  const fetchNotifications = async () => {
    try {
      const res = await fetch((import.meta.env.PROD ? '/api' : 'http://localhost:5000/api') + '/notifications');
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
    } catch (e) {
      // Keep local state
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 6000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleToggleRead = async (id, e) => {
    if (e) e.stopPropagation();
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: !n.read } : n));
    try {
      await fetch((import.meta.env.PROD ? '/api' : 'http://localhost:5000/api') + '/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await fetch((import.meta.env.PROD ? '/api' : 'http://localhost:5000/api') + '/notifications/mark-read', { method: 'POST' });
    } catch (e) {}
  };

  const handleClearAll = async () => {
    setNotifications([]);
    try {
      await fetch((import.meta.env.PROD ? '/api' : 'http://localhost:5000/api') + '/notifications/clear', { method: 'POST' });
    } catch (e) {}
  };

  const handleSimulateAlert = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch((import.meta.env.PROD ? '/api' : 'http://localhost:5000/api') + '/notifications/simulate', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.notification) {
        setNotifications(prev => [data.notification, ...prev]);
      }
    } catch (e) {
      const mockEvent = {
        id: `notif-${Date.now()}`,
        title: 'Incoming Customer AI Query',
        message: 'Client asked: "What is the warranty and dispatch timeline for CNC Machine v2?"',
        time: 'Just now',
        read: false,
        category: 'ai',
        route: '/ai',
        color: '#0891b2',
        iconType: 'ai'
      };
      setNotifications(prev => [mockEvent, ...prev]);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleNotifClick = async (notif) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    try {
      await fetch((import.meta.env.PROD ? '/api' : 'http://localhost:5000/api') + '/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notif.id })
      });
    } catch (e) {}
    setNotifOpen(false);
    if (notif.route) navigate(notif.route);
  };

  // Filtered notifications list
  const filteredNotifications = useMemo(() => {
    if (notifFilter === 'unread') return notifications.filter(n => !n.read);
    if (notifFilter === 'ai') return notifications.filter(n => n.category === 'ai' || (n.title || '').toLowerCase().includes('ai') || (n.title || '').toLowerCase().includes('query'));
    if (notifFilter === 'ops') return notifications.filter(n => ['leads', 'payments', 'whatsapp', 'voice'].includes(n.category));
    return notifications;
  }, [notifications, notifFilter]);

  const renderNotifIcon = (notif) => {
    const type = notif.iconType || notif.category;
    if (type === 'ai') {
      return (
        <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#ecfeff', color: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 2C6.48 2 2 6.25 2 11.5c0 2.3.87 4.4 2.3 6.03L3 21l4.2-1.15A10.45 10.45 0 0 0 12 21c5.52 0 10-4.25 10-9.5S17.52 2 12 2z"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="11" r="1"/><circle cx="16" cy="11" r="1"/></svg>
        </div>
      );
    }
    if (type === 'payment' || type === 'payments') {
      return (
        <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
        </div>
      );
    }
    if (type === 'whatsapp') {
      return (
        <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
      );
    }
    if (type === 'voice') {
      return (
        <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z"/></svg>
        </div>
      );
    }
    return (
      <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
      </div>
    );
  };

  const path = location.pathname;
  const queryParams = new URLSearchParams(location.search);
  const activeTab =
    (path === '/crm' ? 'pipeline' :
      path === '/ai' ? 'ai' :
        path === '/chatbot' ? 'ai' :
          path === '/users' ? 'users' :
            path === '/bookings' ? 'bookings' :
              path === '/payments' ? 'payments' :
                path === '/voice' ? 'voice' :
                  path === '/whatsapp' ? 'whatsapp' :
                    path === '/dialer' ? 'dialer' :
                      path === '/tally' ? 'tally' :
                        path === '/invoices' ? 'invoices' :
                          path === '/employees' ? 'build' :
                            path === '/activity' ? 'activity' :
                              path === '/settings' ? 'settings' :
                                queryParams.get('tab') || 'analytics');


  const handleTabChange = (key) => {
    const routes = {
      analytics: '/dashboard',
      pipeline: '/crm',
      ai: '/ai',
      users: '/users',
      bookings: '/bookings',
      payments: '/payments',
      voice: '/voice',
      whatsapp: '/whatsapp',
      dialer: '/dialer',
      tally: '/tally',
      invoices: '/invoices',
      build: '/employees',
      activity: '/activity',
      settings: '/settings'
    };
    navigate(routes[key] || '/dashboard');
  };



  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleTitleDisplay = currentUser?.role === 'admin' ? 'System Administrator' : currentUser?.role === 'manager' ? 'Operations Manager' : 'Sales Specialist';

  const mobileSidebarStyle = isMobile ? {
    position: 'fixed',
    top: 0,
    left: sidebarOpen ? 0 : -240,
    width: 240,
    height: '100vh',
    boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
    transition: 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    zIndex: 1000
  } : {};

  return (
    <div style={s.container}>

      {/* ─── TOP HEADER ─────────────────────────────────────────────────── */}
      <header style={{ ...s.header, padding: isMobile ? '0 1rem' : '0 1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 8px 8px 0', marginRight: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title="Toggle Menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="2.5">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}
          {/* Logo */}
          <div style={s.logoSection} onClick={() => navigate(currentUser?.defaultRoute || '/dashboard')}>
            <img src="/aps-logo.png" alt="APS Enterprises" style={{ height: isMobile ? 36 : 44, width: 'auto', display: 'block', objectFit: 'contain' }} />
          </div>
        </div>

        {/* Center Pills (Desktop only) */}
        {!isMobile && (
          <div style={s.pillContainer}>
            {headerPills.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={`header-pill-btn ${activeTab === key ? 'active' : ''}`}
                style={{ ...s.pillButton, ...(activeTab === key ? s.pillActive : s.pillInactive) }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Right Actions */}
        <div style={{ ...s.headerRight, position: 'relative' }}>
          {/* Notification Bell */}
          <div style={s.notifWrap} onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && <div style={s.notifDot} />}
          </div>

          {/* Notifications Dropdown */}
          {notifOpen && (
            <div className="notif-dropdown-panel">
              {/* Header */}
              <div style={s.notifHeaderRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={s.dropdownHeaderTitle}>System Notifications</span>
                  {unreadCount > 0 && (
                    <span style={s.unreadPill}>{unreadCount} new</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {unreadCount > 0 && (
                    <button type="button" onClick={handleMarkAllRead} style={s.markAllBtn} title="Mark all notifications as read">
                      Mark read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button type="button" onClick={handleClearAll} style={s.deleteAllBtn} title="Clear all notifications">
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Pills & Simulate Trigger */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
                  {[
                    { key: 'all', label: `All (${notifications.length})` },
                    { key: 'unread', label: `Unread (${unreadCount})` },
                    { key: 'ai', label: 'AI & Queries' },
                    { key: 'ops', label: 'Operations' }
                  ].map(f => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setNotifFilter(f.key)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 12,
                        border: '1px solid',
                        borderColor: notifFilter === f.key ? '#2563eb' : '#e2e8f0',
                        backgroundColor: notifFilter === f.key ? '#eff6ff' : '#ffffff',
                        color: notifFilter === f.key ? '#1d4ed8' : '#64748b',
                        fontSize: '0.66rem',
                        fontWeight: notifFilter === f.key ? 700 : 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleSimulateAlert}
                  disabled={isSimulating}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                  title="Simulate a live incoming query or event from backend"
                >
                  {isSimulating ? '…' : '+ Simulate'}
                </button>
              </div>

              {/* Notification Stream List */}
              <div style={s.notifList}>
                {filteredNotifications.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                    No notifications in this filter.
                  </div>
                ) : (
                  filteredNotifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      style={{
                        ...s.notifItem,
                        backgroundColor: n.read ? '#ffffff' : '#f8fafc',
                        border: '1px solid',
                        borderColor: n.read ? '#f1f5f9' : '#e2e8f0',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        {renderNotifIcon(n)}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 4 }}>
                            <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {n.title}
                            </span>
                            <span style={{ fontSize: '0.64rem', color: '#94a3b8', flexShrink: 0 }}>{n.time}</span>
                          </div>
                          <div style={{ fontSize: '0.73rem', color: '#475569', marginTop: 2, lineHeight: 1.35 }}>
                            {n.message}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                            <span style={{
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '1px 6px',
                              borderRadius: 6,
                              backgroundColor: '#f1f5f9',
                              color: '#64748b'
                            }}>
                              {n.category || 'system'}
                            </span>
                            <span style={{ fontSize: '0.66rem', color: '#2563eb', fontWeight: 700 }}>
                              Open →
                            </span>
                          </div>
                        </div>
                      </div>

                      {!n.read && (
                        <div
                          onClick={(e) => handleToggleRead(n.id, e)}
                          title="Click to mark read"
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: '#2563eb'
                          }}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* User Widget */}
          <div className="header-user-card" style={s.userWidget} onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }}>
            <div style={{ ...s.userAvatarInitial, backgroundColor: currentUser?.avatarBg || '#09090b' }}>
              {currentUser?.avatar || 'A'}
            </div>
            {!isMobile && (
              <div style={s.userInfo}>
                <div style={s.userName}>{currentUser?.name || 'Admin'}</div>
                <div style={s.userRole}>{roleTitleDisplay}</div>
              </div>
            )}
            <svg style={s.dropdownIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {/* Profile Dropdown & Quick Switch */}
          {userMenuOpen && (
            <div className="user-dropdown-panel" style={{ width: 280 }}>
              <div style={s.dropdownHeader}>
                <div>Signed in as <strong>{currentUser?.name}</strong></div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>{currentUser?.email}</div>
              </div>

              {/* Role Indicator & Title */}
              <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: 8,
                  backgroundColor: currentUser?.role === 'admin' ? '#fef3c7' : currentUser?.role === 'manager' ? '#dbeafe' : currentUser?.role === 'accountant' ? '#ede9fe' : '#d1fae5',
                  color: currentUser?.role === 'admin' ? '#b45309' : currentUser?.role === 'manager' ? '#1d4ed8' : currentUser?.role === 'accountant' ? '#7c3aed' : '#047857'
                }}>
                  Active Role: {currentUser?.role}
                </span>
                <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 4, fontWeight: 600 }}>{currentUser?.title}</div>
              </div>

              {/* Quick Switch Panel Selector */}
              <div style={{ padding: '10px 12px 6px 12px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 8 }}>
                  Switch Panel / Operator
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {OPERATOR_PANELS.map(op => {
                    const isActive = (currentUser?.role || '').toLowerCase() === op.role.toLowerCase();
                    return (
                      <button
                        key={op.email}
                        type="button"
                        onClick={async () => {
                          if (isActive) return;
                          try {
                            const user = await login(op.email, 'admin123');
                            setUserMenuOpen(false);
                            navigate(user?.defaultRoute || op.route);
                          } catch (err) {
                            console.error('Quick switch error', err);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: 8,
                          border: isActive ? '1px solid #cbd5e1' : '1px solid #f1f5f9',
                          backgroundColor: isActive ? '#f8fafc' : '#ffffff',
                          cursor: isActive ? 'default' : 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: isActive ? 700 : 600, color: isActive ? '#09090b' : '#334155' }}>
                            {op.name}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                            {op.tag}
                          </span>
                        </div>
                        {isActive ? (
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: 6, backgroundColor: '#e2e8f0', color: '#0f172a' }}>
                            Active
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#2563eb' }}>
                            Switch
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {currentUser?.role === 'admin' && (
                <>
                  <div style={s.menuItem} onClick={() => { handleTabChange('settings'); setUserMenuOpen(false); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                    <span>System Settings</span>
                  </div>
                  <div style={s.menuItem} onClick={() => { handleTabChange('users'); setUserMenuOpen(false); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    <span>Users & Roles</span>
                  </div>
                </>
              )}

              <div style={{ ...s.menuItem, color: '#ef4444' }} onClick={handleLogout}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                <span>Logout Session</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ─── BODY: SIDEBAR + MAIN ───────────────────────────────────────── */}
      <div style={s.bodyWrapper}>

        {/* Mobile Sidebar Backdrop */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(9, 9, 11, 0.4)',
              backdropFilter: 'blur(3px)',
              zIndex: 999,
              transition: 'opacity 0.25s ease'
            }}
          />
        )}

        {/* ─── SIDEBAR ──────────────────────────────────────────────────── */}
        <aside style={{ ...s.sidebar, ...mobileSidebarStyle }}>

          {/* Scrollable Nav */}
          <div style={s.sidebarScroll}>
            {filteredNavGroups.map((group) => (
              <div key={group.group} style={s.navGroup}>
                <div style={s.navGroupLabel}>{group.group}</div>
                {group.items.map((item) => {
                  const isActive = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleTabChange(item.key)}
                      className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                      style={isActive ? s.navItemActive : s.navItem}
                    >
                      {isActive && <div style={s.activePill} />}
                      <span style={isActive ? s.navIconActive : s.navIcon}>{item.icon}</span>
                      <span style={isActive ? s.navLabelActive : s.navLabel}>{item.label}</span>
                      {item.badge && (
                        <span style={{
                          ...s.badge,
                          backgroundColor: item.badge === 'Live' ? 'rgba(16,185,129,0.2)' : 'rgba(170,59,255,0.2)',
                          color: item.badge === 'Live' ? '#10b981' : '#c084fc'
                        }}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Bottom user card */}
          <div style={s.sidebarBottom}>
            <div style={s.sidebarDivider} />
            <div style={s.userCard}>
              <div style={{ ...s.sidebarInitial, backgroundColor: currentUser?.avatarBg || '#09090b' }}>
                {currentUser?.avatar || 'A'}
              </div>
              <div style={s.userCardInfo}>
                <div style={s.userCardName} title={currentUser?.name || 'Super Admin'}>
                  {currentUser?.name || 'Super Admin'}
                </div>
                <div style={s.userCardEmail} title={currentUser?.email || 'admin@apsenterprises.in'}>
                  {currentUser?.email || 'admin@apsenterprises.in'}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="sidebar-logout-btn"
                style={s.logoutBtn}
                title="Sign out"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        {/* ─── MAIN CONTENT ─────────────────────────────────────────────── */}
        <main style={s.mainContent}>
          <Outlet />
        </main>
      </div>

      {/* ─── MOBILE BOTTOM NAV ───────────────────────────────────────────── */}
      {isMobile && (
        <nav className="mobile-bottom-nav">
          {[
            {
              key: 'analytics',
              label: 'Dashboard',
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" />
                </svg>
              )
            },
            {
              key: 'pipeline',
              label: 'CRM',
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              )
            },
            {
              key: 'ai',
              label: 'AI',
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C6.48 2 2 6.25 2 11.5c0 2.3.87 4.4 2.3 6.03L3 21l4.2-1.15A10.45 10.45 0 0 0 12 21c5.52 0 10-4.25 10-9.5S17.52 2 12 2z" />
                  <path d="M8 11h.01M12 11h.01M16 11h.01" strokeWidth="3" />
                </svg>
              )
            },
            {
              key: 'whatsapp',
              label: 'WhatsApp',
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              )
            },
            {
              key: 'invoices',
              label: 'Finance',
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              )
            }
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`mobile-bottom-nav-item ${activeTab === key ? 'active' : ''}`}
            >
              <span className="mobile-bottom-nav-icon">{icon}</span>
              <span className="mobile-bottom-nav-label">{label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Floating AI Assistant Chat Panel */}
      <APSAIChatPanel />
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = {
  container: {
    display: 'flex', flexDirection: 'column',
    height: '100vh', backgroundColor: 'var(--bg-primary)', overflow: 'hidden'
  },

  // ── Header
  header: {
    height: 62,
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 1.75rem', zIndex: 20, flexShrink: 0,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
  },
  logoSection: {
    display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer'
  },
  logoIconWrap: {
    width: 34, height: 34, borderRadius: 9,
    background: '#09090b',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
  },
  logoText: {
    fontFamily: 'var(--font-heading)', fontSize: '1.1rem',
    fontWeight: 800, color: '#09090b', letterSpacing: '-0.3px'
  },
  pillContainer: {
    display: 'flex', backgroundColor: '#f1f3f7',
    padding: '3px', borderRadius: 28, gap: 2
  },
  pillButton: {
    padding: '6px 18px', border: 'none', borderRadius: 22,
    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.2s', fontFamily: 'var(--font-body)'
  },
  pillActive: { backgroundColor: '#09090b', color: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.12)' },
  pillInactive: { backgroundColor: 'transparent', color: '#52525b' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  notifWrap: {
    position: 'relative', width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#ffffff', border: '1px solid #e4e4e7',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
  },
  notifDot: {
    position: 'absolute', top: 7, right: 7,
    width: 7, height: 7, borderRadius: '50%',
    backgroundColor: '#09090b', border: '1.5px solid #fff'
  },
  userWidget: {
    display: 'flex', alignItems: 'center', gap: '0.65rem',
    cursor: 'pointer', padding: '5px 10px', borderRadius: 28,
    border: '1px solid #e4e4e7', backgroundColor: '#ffffff'
  },
  userAvatarInitial: {
    width: 32, height: 32, borderRadius: '50%',
    backgroundColor: '#09090b',
    color: '#fff', fontWeight: 800, fontSize: '0.85rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, fontFamily: 'var(--font-heading)'
  },
  userInfo: { display: 'flex', flexDirection: 'column' },
  userName: { fontSize: '0.8rem', fontWeight: 700, color: '#09090b', lineHeight: 1.2 },
  userRole: { fontSize: '0.68rem', color: '#71717a', fontWeight: 500 },
  dropdownIcon: { color: '#71717a' },

  // ── Body
  bodyWrapper: { display: 'flex', flexGrow: 1, overflow: 'hidden' },

  // ── Sidebar
  sidebar: {
    width: 236, flexShrink: 0,
    background: '#ffffff',
    borderRight: '1px solid #e4e4e7',
    display: 'flex', flexDirection: 'column',
    boxShadow: '1px 0 8px rgba(0,0,0,0.02)',
    zIndex: 10
  },
  sidebarScroll: {
    flex: 1, overflowY: 'auto', padding: '1.25rem 0.75rem 0.5rem',
    display: 'flex', flexDirection: 'column', gap: '0.25rem',
    scrollbarWidth: 'none'
  },
  navGroup: { marginBottom: '0.65rem' },
  navGroupLabel: {
    fontSize: '0.62rem', fontWeight: 800, letterSpacing: '1px',
    color: '#a1a1aa', textTransform: 'uppercase',
    padding: '0.65rem 0.75rem 0.35rem', userSelect: 'none'
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '0.65rem',
    width: '100%', padding: '0.55rem 0.75rem', borderRadius: 10,
    border: 'none', background: 'transparent', cursor: 'pointer',
    position: 'relative', transition: 'background 0.15s, color 0.15s', textAlign: 'left'
  },
  navItemActive: {
    display: 'flex', alignItems: 'center', gap: '0.65rem',
    width: '100%', padding: '0.55rem 0.75rem', borderRadius: 10,
    border: 'none', background: '#09090b',
    cursor: 'pointer', position: 'relative', textAlign: 'left',
    boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
  },
  activePill: {
    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
    width: 3.5, height: 20, borderRadius: '0 3px 3px 0',
    background: '#ffffff',
    display: 'none'
  },
  navIcon: { color: '#71717a', display: 'flex', flexShrink: 0 },
  navIconActive: { color: '#ffffff', display: 'flex', flexShrink: 0 },
  navLabel: {
    fontSize: '0.82rem', fontWeight: 600,
    color: '#3f3f46', flex: 1, fontFamily: 'var(--font-body)'
  },
  navLabelActive: {
    fontSize: '0.82rem', fontWeight: 700,
    color: '#ffffff', flex: 1, fontFamily: 'var(--font-body)'
  },
  badge: {
    fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px',
    borderRadius: 20, flexShrink: 0
  },

  // ── Sidebar Bottom
  sidebarBottom: { padding: '0 0.75rem 1rem', flexShrink: 0 },
  sidebarDivider: { height: 1, backgroundColor: '#e4e4e7', marginBottom: '0.75rem' },
  userCard: {
    display: 'flex', alignItems: 'center', gap: '0.65rem',
    padding: '0.6rem 0.7rem', borderRadius: 12,
    background: '#f8fafc', border: '1px solid #e4e4e7',
    position: 'relative', boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
  },
  sidebarInitial: {
    width: 34, height: 34, borderRadius: '50%',
    backgroundColor: '#09090b',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.85rem', fontWeight: 800, color: '#fff', flexShrink: 0,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
  },
  userCardInfo: {
    flex: 1, minWidth: 0,
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
    gap: 2, overflow: 'hidden'
  },
  userCardName: {
    fontSize: '0.78rem', fontWeight: 700, color: '#09090b',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    lineHeight: 1.25
  },
  userCardEmail: {
    fontSize: '0.66rem', color: '#71717a', fontWeight: 500,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    lineHeight: 1.2
  },
  logoutBtn: {
    flexShrink: 0, marginLeft: 'auto',
    width: 28, height: 28, borderRadius: 7,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', border: 'none',
    color: '#71717a', cursor: 'pointer',
    padding: 0, transition: 'all 0.15s ease'
  },

  // ── Main Content
  mainContent: { flexGrow: 1, overflowY: 'auto', position: 'relative', backgroundColor: 'var(--bg-primary)' },

  // ── Dropdowns
  dropdownPanel: { position: 'absolute', top: 46, right: 0, width: 280, backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e4e4e7', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)', zIndex: 100, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  dropdownHeader: { fontSize: '0.72rem', fontWeight: 800, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 8px', borderBottom: '1px solid #f4f4f5', marginBottom: 4 },
  notifHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', marginBottom: '0.4rem', borderBottom: '1px solid #f1f5f9' },
  dropdownHeaderTitle: { fontSize: '0.82rem', fontWeight: 800, color: '#09090b', fontFamily: 'var(--font-heading)' },
  unreadPill: { fontSize: '0.65rem', fontWeight: 800, backgroundColor: '#eff6ff', color: '#2563eb', padding: '2px 7px', borderRadius: 10, border: '1px solid #bfdbfe' },
  markAllBtn: { background: 'none', border: 'none', color: '#2563eb', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', padding: 0 },
  deleteAllBtn: { background: 'none', border: 'none', color: '#ef4444', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', padding: 0 },
  notifList: { display: 'flex', flexDirection: 'column', gap: '0.55rem', maxHeight: 320, overflowY: 'auto' },
  notifItem: { padding: '10px 12px', borderRadius: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'all 0.15s ease' },
  notifBadgeCount: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 10, backgroundColor: '#2563eb', color: '#ffffff', fontSize: '0.68rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', boxShadow: '0 2px 6px rgba(37,99,235,0.4)', border: '2px solid #ffffff' },
  notifDotRead: { position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: '50%', backgroundColor: '#94a3b8', border: '1.5px solid #fff' },
  menuItem: { padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, color: '#3f3f46', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s' }
};
