import React, { createContext, useContext, useState, useEffect } from 'react';

export const DEMO_ACCOUNTS = {
  admin: {
    id: 'USR-001',
    name: 'System Administrator',
    email: 'admin@apsenterprise.com',
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
  manager: {
    id: 'USR-002',
    name: 'Rahul Deshmukh',
    email: 'manager@apsenterprise.com',
    role: 'manager',
    title: 'Operations & Sales Manager',
    avatar: 'RD',
    avatarBg: '#2563eb',
    permissions: [
      'Dashboard & Analytics',
      'CRM / Lead Pipeline Management',
      'Bookings & Factory Order Release',
      '10% Advance Payment Verification',
      'WhatsApp Broadcast & Simulator',
      'Dialer Queue Dispatch',
      'Invoices & Customer Billing',
      'Team KPIs & Employee Monitoring',
      'Activity Log Review'
    ],
    defaultRoute: '/dashboard'
  },
  employee: {
    id: 'USR-003',
    name: 'Bhavya Chaturvedi',
    email: 'employee@apsenterprise.com',
    role: 'employee',
    title: 'Senior Sales & Equipment Specialist',
    avatar: 'BC',
    avatarBg: '#10b981',
    permissions: [
      'CRM / Assigned Leads',
      'Dialer Queue (Outbound Calls)',
      'Voice Agent Calls & Call Outcomes',
      'My Tasks & KPI Performance Score',
      'Live Activity Log Entry'
    ],
    defaultRoute: '/crm'
  }
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('aps_auth_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved auth user:', e);
    }
    return DEMO_ACCOUNTS.admin; // Default fallback to Admin
  });

  const [isAuthenticated, setIsAuthenticated] = useState(true);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('aps_auth_user', JSON.stringify(currentUser));
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem('aps_auth_user');
      setIsAuthenticated(false);
    }
  }, [currentUser]);

  const loginWithRole = (roleKey) => {
    const account = DEMO_ACCOUNTS[roleKey] || DEMO_ACCOUNTS.admin;
    setCurrentUser(account);
    setIsAuthenticated(true);
    return account;
  };

  const login = (email, password) => {
    const trimmedEmail = (email || '').trim().toLowerCase();

    if (trimmedEmail.includes('manager')) {
      return loginWithRole('manager');
    }
    if (trimmedEmail.includes('employee') || trimmedEmail.includes('sales') || trimmedEmail.includes('bhavya')) {
      return loginWithRole('employee');
    }
    // Default to admin
    return loginWithRole('admin');
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('aps_auth_user');
  };

  const hasPermission = (permissionName) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return currentUser.permissions?.includes(permissionName) || false;
  };

  const canAccessRoute = (routePath) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;

    // Manager allowed paths
    if (currentUser.role === 'manager') {
      const managerAllowed = [
        '/dashboard', '/leads', '/crm', '/bookings', '/payments',
        '/ai', '/whatsapp', '/dialer', '/invoices', '/employees', '/activity'
      ];
      return managerAllowed.some(p => routePath.startsWith(p));
    }

    // Employee allowed paths
    if (currentUser.role === 'employee') {
      const employeeAllowed = [
        '/crm', '/leads', '/dialer', '/voice', '/employees', '/activity'
      ];
      return employeeAllowed.some(p => routePath.startsWith(p));
    }

    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        login,
        loginWithRole,
        logout,
        hasPermission,
        canAccessRoute,
        demoAccounts: DEMO_ACCOUNTS
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
