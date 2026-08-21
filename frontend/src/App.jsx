import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LeadDetails from './pages/LeadDetails';
import Settings from './pages/Settings';
import CRMLeads from './pages/CRMLeads';
import TeamKPIs from './pages/TeamKPIs';
import ActivityLog from './pages/ActivityLog';
import BookingsERP from './pages/BookingsERP';
import PaymentGate from './pages/PaymentGate';
import DialerQueue from './pages/DialerQueue';
import UsersRoles from './pages/UsersRoles';
import TallySync from './pages/TallySync';
import Invoices from './pages/Invoices';
import WhatsAppAutomation from './pages/WhatsAppAutomation';
import { VoiceAgent } from './pages/AgentPages';
import APSAIPage from './pages/APSAIPage';
import DashboardLayout from './layouts/DashboardLayout';
import './App.css';

// ─── Protected Route Component with Role Checks ─────────────────────────────
function ProtectedRoute({ element, allowedRoles = [] }) {
  const { currentUser, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    // Redirect to the user's default role route
    return <Navigate to={currentUser.defaultRoute || '/crm'} replace />;
  }

  return element;
}

function AppRoutes() {
  const { currentUser, isAuthenticated } = useAuth();

  return (
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
          element={<ProtectedRoute element={<CRMLeads />} allowedRoles={['admin', 'manager', 'employee']} />}
        />
        <Route
          path="/bookings"
          element={<ProtectedRoute element={<BookingsERP />} allowedRoles={['admin', 'manager']} />}
        />
        <Route
          path="/payments"
          element={<ProtectedRoute element={<PaymentGate />} allowedRoles={['admin', 'manager']} />}
        />

        {/* AI Agents */}
        <Route
          path="/ai"
          element={<ProtectedRoute element={<APSAIPage />} allowedRoles={['admin', 'manager']} />}
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
          element={<ProtectedRoute element={<TallySync />} allowedRoles={['admin']} />}
        />
        <Route
          path="/invoices"
          element={<ProtectedRoute element={<Invoices />} allowedRoles={['admin', 'manager']} />}
        />

        {/* Productivity */}
        <Route
          path="/employees"
          element={<ProtectedRoute element={<TeamKPIs />} allowedRoles={['admin', 'manager', 'employee']} />}
        />
        <Route
          path="/activity"
          element={<ProtectedRoute element={<ActivityLog />} allowedRoles={['admin', 'manager', 'employee']} />}
        />
        <Route
          path="/settings"
          element={<ProtectedRoute element={<Settings />} allowedRoles={['admin']} />}
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
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
