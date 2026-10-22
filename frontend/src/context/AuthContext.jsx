import React, { createContext, useContext, useState, useEffect } from 'react';

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API = isLocal ? 'http://localhost:5000/api' : '/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('aps_auth_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved auth user:', e);
    }
    return null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('aps_token') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('aps_token'));

  useEffect(() => {
    if (currentUser && token) {
      localStorage.setItem('aps_auth_user', JSON.stringify(currentUser));
      localStorage.setItem('aps_token', token);
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem('aps_auth_user');
      localStorage.removeItem('aps_token');
      setIsAuthenticated(false);
    }
  }, [currentUser, token]);

  // Production login against backend API
  const login = async (email, password) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || data.error || 'Authentication failed');
    }

    localStorage.setItem('aps_auth_user', JSON.stringify(data.user));
    localStorage.setItem('aps_token', data.token);
    setToken(data.token);
    setCurrentUser(data.user);
    setIsAuthenticated(true);
    return data.user;
  };

  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('aps_auth_user');
    localStorage.removeItem('aps_token');
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
    if (currentUser.role === 'manager' || currentUser.role === 'operations') {
      const managerAllowed = [
        '/dashboard', '/leads', '/crm', '/bookings', '/payments',
        '/ai', '/whatsapp', '/voice', '/dialer', '/tally', '/invoices', '/employees', '/activity'
      ];
      return managerAllowed.some(p => routePath.startsWith(p));
    }

    // Accountant allowed paths
    if (currentUser.role === 'accountant') {
      const accountantAllowed = [
        '/tally', '/invoices', '/payments', '/crm', '/leads', '/activity'
      ];
      return accountantAllowed.some(p => routePath.startsWith(p));
    }

    // Employee allowed paths
    if (currentUser.role === 'employee') {
      const employeeAllowed = [
        '/crm', '/leads', '/dialer', '/voice', '/ai', '/employees', '/activity'
      ];
      return employeeAllowed.some(p => routePath.startsWith(p));
    }

    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isAuthenticated,
        login,
        logout,
        hasPermission,
        canAccessRoute
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
