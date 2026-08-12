import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LeadDetails from './pages/LeadDetails';
import Employees from './pages/Employees';
import Settings from './pages/Settings';
import CRMLeads from './pages/CRMLeads';
import TeamKPIs from './pages/TeamKPIs';
import ActivityLog from './pages/ActivityLog';
import BookingsERP from './pages/BookingsERP';
import PaymentGate from './pages/PaymentGate';
import DialerQueue from './pages/DialerQueue';
import UsersRoles from './pages/UsersRoles';
import TallySync from './pages/TallySync';
import { WhatsAppAgent, EmailAIAgent, VoiceAgent } from './pages/AgentPages';
import DashboardLayout from './layouts/DashboardLayout';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        <Route element={<DashboardLayout />}>
          {/* Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leads/:id" element={<LeadDetails />} />

          {/* Platform */}
          <Route path="/users" element={<UsersRoles />} />

          {/* Operations */}
          <Route path="/crm" element={<CRMLeads />} />
          <Route path="/bookings" element={<BookingsERP />} />
          <Route path="/payments" element={<PaymentGate />} />

          {/* AI Agents */}
          <Route path="/voice" element={<VoiceAgent />} />
          <Route path="/whatsapp" element={<WhatsAppAgent />} />
          <Route path="/email-ai" element={<EmailAIAgent />} />
          <Route path="/dialer" element={<DialerQueue />} />

          {/* Finance */}
          <Route path="/tally" element={<TallySync />} />
          <Route path="/invoices" element={<TallySync />} />

          {/* Productivity */}
          <Route path="/employees" element={<TeamKPIs />} />
          <Route path="/activity" element={<ActivityLog />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
