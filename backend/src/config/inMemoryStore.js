// Centralized In-Memory Data Store (Canonical Schemas for Week 1)

const mockLeads = [
  { 
    id: 'LEAD-001', 
    name: 'John Doe', 
    interest: 'CNC Machine v2', 
    budget: '15000', 
    stage: 'Enquiry', 
    notes: 'Inquired via Meta Ads campaign.', 
    crmSynced: true, 
    erpBookingCreated: false, 
    tallyPaymentVerified: false, 
    source: 'Meta Ads', 
    assignedEmployeeId: 'e1',
    createdAt: new Date(Date.now() - 86400000 * 5)
  },
  { 
    id: 'LEAD-002', 
    name: 'Jane Smith', 
    interest: 'Laser Cutter Pro', 
    budget: '25000', 
    stage: 'Qualified', 
    notes: 'Called by A1 agent, confirmed interest.', 
    crmSynced: true, 
    erpBookingCreated: false, 
    tallyPaymentVerified: false, 
    source: 'A1 Voice Agent', 
    assignedEmployeeId: 'e2',
    createdAt: new Date(Date.now() - 86400000 * 4)
  },
  { 
    id: 'LEAD-003', 
    name: 'Acme Corp', 
    interest: 'Industrial Mill', 
    budget: '50000', 
    stage: 'Booked', 
    notes: 'ERP booking created, awaiting approval.', 
    crmSynced: true, 
    erpBookingCreated: true, 
    tallyPaymentVerified: false, 
    source: 'Inbound Call', 
    assignedEmployeeId: 'e1',
    createdAt: new Date(Date.now() - 86400000 * 3)
  },
  { 
    id: 'LEAD-004', 
    name: 'Global Tech', 
    interest: 'Hydraulic Press', 
    budget: '42000', 
    stage: 'Confirmed Lead', 
    notes: 'Booking approved. Awaiting payment gate.', 
    crmSynced: true, 
    erpBookingCreated: true, 
    tallyPaymentVerified: false, 
    source: 'Meta Ads', 
    assignedEmployeeId: 'e3',
    createdAt: new Date(Date.now() - 86400000 * 3)
  },
  { 
    id: 'LEAD-005', 
    name: 'Elite Builders', 
    interest: 'CNC Router', 
    budget: '18000', 
    stage: 'Client (Paid)', 
    notes: '10% advance verified. Order in production.', 
    crmSynced: true, 
    erpBookingCreated: true, 
    tallyPaymentVerified: true, 
    source: 'Telecaller', 
    assignedEmployeeId: 'e2',
    createdAt: new Date(Date.now() - 86400000 * 2)
  },
  { 
    id: 'LEAD-006', 
    name: 'Precision Works', 
    interest: 'Plasma Cutter', 
    budget: '35000', 
    stage: 'In Production', 
    notes: 'Order released to manufacturing floor.', 
    crmSynced: true, 
    erpBookingCreated: true, 
    tallyPaymentVerified: true, 
    source: 'A1 Voice Agent', 
    assignedEmployeeId: 'e1',
    createdAt: new Date(Date.now() - 86400000 * 1)
  },
  { 
    id: 'LEAD-007', 
    name: 'ModernFab', 
    interest: 'Sheet Bender', 
    budget: '28000', 
    stage: 'Dispatched', 
    notes: 'Dispatched to client location.', 
    crmSynced: true, 
    erpBookingCreated: true, 
    tallyPaymentVerified: true, 
    source: 'WhatsApp A5', 
    assignedEmployeeId: 'e3',
    createdAt: new Date(Date.now() - 86400000 * 1)
  }
];

const mockActivityLogs = [
  { id: 'log1', employeeId: 'e2', leadId: 'LEAD-004', action: 'Lead status transitioned from "Booked" to "Confirmed Lead"', fromStage: 'Booked', toStage: 'Confirmed Lead', createdAt: new Date(Date.now() - 300000) },
  { id: 'log2', employeeId: 'e1', leadId: 'LEAD-002', action: 'Lead status transitioned from "Enquiry" to "Qualified"', fromStage: 'Enquiry', toStage: 'Qualified', createdAt: new Date(Date.now() - 720000) },
  { id: 'log3', employeeId: 'e3', leadId: 'LEAD-005', action: 'Lead status transitioned from "Confirmed Lead" to "Client (Paid)"', fromStage: 'Confirmed Lead', toStage: 'Client (Paid)', createdAt: new Date(Date.now() - 2040000) }
];

const mockEmployees = [
  { 
    id: 'e1', 
    name: 'Animesh', 
    role: 'A1 Voice Agent Architect', 
    tasksCompleted: 14, 
    callsHandled: 124, 
    salesClosed: 8,
    avgCallDurationSec: 135
  },
  { 
    id: 'e2', 
    name: 'Bhavya', 
    role: 'A2 Core Developer', 
    tasksCompleted: 18, 
    callsHandled: 0, 
    salesClosed: 12,
    avgCallDurationSec: 0
  },
  { 
    id: 'e3', 
    name: 'Aaditya', 
    role: 'A4/A5 Specialist', 
    tasksCompleted: 11, 
    callsHandled: 15, 
    salesClosed: 5,
    avgCallDurationSec: 110
  }
];

const mockCallLogs = [
  {
    callId: 'CALL-001',
    leadId: 'LEAD-002',
    phone: '+919876543210',
    agent: 'A1 Voice Agent',
    durationSeconds: 145,
    callOutcome: 'Interested - Qualified',
    transcript: 'Customer expressed strong interest in Laser Cutter Pro for immediate purchase.',
    timestamp: new Date(Date.now() - 7200000)
  },
  {
    callId: 'CALL-002',
    leadId: 'LEAD-006',
    phone: '+919812345678',
    agent: 'A1 Voice Agent',
    durationSeconds: 210,
    callOutcome: 'Interested - High Intent',
    transcript: 'Inquired about Plasma Cutter specifications and 10% advance payment details.',
    timestamp: new Date(Date.now() - 14400000)
  }
];

const mockWhatsAppMessages = [
  {
    messageId: 'WA-001',
    leadId: 'LEAD-004',
    leadName: 'Global Tech',
    phone: '+919988776655',
    template: 'payment_reminder_advance_10pct',
    sequenceType: 'PAYMENT_REMINDER',
    status: 'Delivered',
    sentAt: new Date(Date.now() - 3600000)
  },
  {
    messageId: 'WA-002',
    leadId: 'LEAD-005',
    leadName: 'Elite Builders',
    phone: '+919123456789',
    template: 'order_confirmation_factory_release',
    sequenceType: 'ORDER_CONFIRMATION',
    status: 'Read',
    sentAt: new Date(Date.now() - 1800000)
  }
];

const mockTimeInStage = [
  { stage: 'Enquiry', avgHours: 4.2 },
  { stage: 'Qualified', avgHours: 12.5 },
  { stage: 'Booked', avgHours: 8.0 },
  { stage: 'Confirmed Lead', avgHours: 48.5, warning: 'Deals going cold while sitting unpaid' },
  { stage: 'Client (Paid)', avgHours: 6.0 },
  { stage: 'In Production', avgHours: 72.0 },
  { stage: 'Dispatched', avgHours: 0 }
];

const systemConfig = {
  approvalPolicy: 'single-action', // 'single-action' vs 'countersign' (dual-approval)
  paymentGatePercentage: 10,
  autoSendPaymentReminders: true,
  reminderDelayHours: 24
};

module.exports = {
  mockLeads,
  mockActivityLogs,
  mockEmployees,
  mockCallLogs,
  mockWhatsAppMessages,
  mockTimeInStage,
  systemConfig
};
