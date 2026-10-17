import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import './App.css';

// ─── Code-Split Route Components (React.lazy) ─────────────────────────────────
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LeadDetails = lazy(() => import('./pages/LeadDetails'));
const Settings = lazy(() => import('./pages/Settings'));
const CRMLeads = lazy(() => import('./pages/CRMLeads'));
const TeamKPIs = lazy(() => import('./pages/TeamKPIs'));
const ActivityLog = lazy(() => import('./pages/ActivityLog'));
const BookingsERP = lazy(() => import('./pages/BookingsERP'));
const PaymentGate = lazy(() => import('./pages/PaymentGate'));
const DialerQueue = lazy(() => import('./pages/DialerQueue'));
const UsersRoles = lazy(() => import('./pages/UsersRoles'));
const TallySync = lazy(() => import('./pages/TallySync'));
const Invoices = lazy(() => import('./pages/Invoices'));
const WhatsAppAutomation = lazy(() => import('./pages/WhatsAppAutomation'));
const VoiceAgent = lazy(() => import('./pages/AgentPages').then(m => ({ default: m.VoiceAgent })));
const APSAIPage = lazy(() => import('./pages/APSAIPage'));

// Loading Fallback Component
function RouteLoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      flexDirection: 'column',
      gap: '14px',
      color: '#64748b'
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        border: '3px solid #e2e8f0',
        borderTopColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <span style={{ fontSize: '13px', fontWeight: 500 }}>Loading Module...</span>
    </div>
  );
}

// ─── Protected Route Component with Role Checks ─────────────────────────────
function ProtectedRoute({ element, allowedRoles = [] }) {
  const { currentUser, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0) {
    const rawRole = (currentUser.role || '').toLowerCase().trim();
    const normalizedRoles = allowedRoles.map(r => r.toLowerCase().trim());
    const isSuperOrAdmin = rawRole === 'admin' || rawRole === 'super admin' || rawRole === 'superadmin';
    const isAllowed = isSuperOrAdmin || normalizedRoles.includes(rawRole);

    if (!isAllowed) {
      return <Navigate to={currentUser.defaultRoute || '/crm'} replace />;
    }
  }

  return element;
}

function AppRoutes() {
  const { currentUser, isAuthenticated } = useAuth();

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated && currentUser ? (
              <Navigate to={currentUser.defaultRoute || '/dashboard'} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/login" element={<Login />} />

        <Route element={<DashboardLayout />}>
          {/* Platform: Dashboard */}
          <Route
            path="/dashboard"
            element={<ProtectedRoute element={<Dashboard />} allowedRoles={['admin', 'manager']} />}
          />
          <Route
            path="/leads/:id"
            element={<ProtectedRoute element={<LeadDetails />} allowedRoles={['admin', 'manager', 'employee']} />}
          />

          {/* Platform: Users & Roles (Admin only) */}
          <Route
            path="/users"
            element={<ProtectedRoute element={<UsersRoles />} allowedRoles={['admin']} />}
          />

          {/* Operations */}
          <Route
            path="/crm"
            element={<ProtectedRoute element={<CRMLeads />} allowedRoles={['admin', 'manager', 'employee', 'accountant']} />}
          />
          <Route
            path="/bookings"
            element={<ProtectedRoute element={<BookingsERP />} allowedRoles={['admin', 'manager']} />}
          />
          <Route
            path="/payments"
            element={<ProtectedRoute element={<PaymentGate />} allowedRoles={['admin', 'manager', 'accountant']} />}
          />

          {/* AI Agents */}
          <Route
            path="/ai"
            element={<ProtectedRoute element={<APSAIPage />} allowedRoles={['admin', 'manager', 'employee']} />}
          />
          <Route path="/chatbot" element={<Navigate to="/ai" replace />} />
          <Route
            path="/voice"
            element={<ProtectedRoute element={<VoiceAgent />} allowedRoles={['admin', 'manager', 'employee']} />}
          />
          <Route
            path="/whatsapp"
            element={<ProtectedRoute element={<WhatsAppAutomation />} allowedRoles={['admin', 'manager']} />}
          />
          <Route
            path="/dialer"
            element={<ProtectedRoute element={<DialerQueue />} allowedRoles={['admin', 'manager', 'employee']} />}
          />

          {/* Finance */}
          <Route
            path="/tally"
            element={<ProtectedRoute element={<TallySync />} allowedRoles={['admin', 'manager', 'accountant', 'operations', 'employee']} />}
          />
          <Route
            path="/invoices"
            element={<ProtectedRoute element={<Invoices />} allowedRoles={['admin', 'manager', 'accountant']} />}
          />

          {/* Productivity */}
          <Route
            path="/employees"
            element={<ProtectedRoute element={<TeamKPIs />} allowedRoles={['admin', 'manager', 'employee']} />}
          />
          <Route
            path="/activity"
            element={<ProtectedRoute element={<ActivityLog />} allowedRoles={['admin', 'manager', 'employee', 'accountant']} />}
          />
          <Route
            path="/settings"
            element={<ProtectedRoute element={<Settings />} allowedRoles={['admin']} />}
          />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
