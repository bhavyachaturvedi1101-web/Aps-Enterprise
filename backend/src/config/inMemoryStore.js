const mockLeads = [
  { 
    id: '1', 
    name: 'John Doe', 
    interest: 'CNC Machine v2', 
    budget: '15000', 
    stage: 'Enquiry', 
    notes: 'Inquired via Meta Ads campaign.', 
    crmSynced: true, 
    erpBookingCreated: false, 
    tallyPaymentVerified: false, 
    source: 'Meta Ads', 
    assignedEmployeeId: 'e1' 
  },
  { 
    id: '2', 
    name: 'Jane Smith', 
    interest: 'Laser Cutter Pro', 
    budget: '25000', 
    stage: 'Qualified', 
    notes: 'Called by A1 agent, confirmed interest.', 
    crmSynced: true, 
    erpBookingCreated: false, 
    tallyPaymentVerified: false, 
    source: 'A1 Voice Agent', 
    assignedEmployeeId: 'e2' 
  },
  { 
    id: '3', 
    name: 'Acme Corp', 
    interest: 'Industrial Mill', 
    budget: '50000', 
    stage: 'Booked', 
    notes: 'ERP booking created, awaiting approval.', 
    crmSynced: true, 
    erpBookingCreated: true, 
    tallyPaymentVerified: false, 
    source: 'Inbound Call', 
    assignedEmployeeId: 'e1' 
  },
  { 
    id: '4', 
    name: 'Global Tech', 
    interest: 'Hydraulic Press', 
    budget: '42000', 
    stage: 'Confirmed Lead', 
    notes: 'Booking approved. Awaiting payment gate.', 
    crmSynced: true, 
    erpBookingCreated: true, 
    tallyPaymentVerified: false, 
    source: 'Meta Ads', 
    assignedEmployeeId: 'e3' 
  },
  { 
    id: '5', 
    name: 'Elite Builders', 
    interest: 'CNC Router', 
    budget: '18000', 
    stage: 'Client (Paid)', 
    notes: '10% advance verified. Order in production.', 
    crmSynced: true, 
    erpBookingCreated: true, 
    tallyPaymentVerified: true, 
    source: 'Telecaller', 
    assignedEmployeeId: 'e2' 
  },
  { 
    id: '6', 
    name: 'Precision Works', 
    interest: 'Plasma Cutter', 
    budget: '35000', 
    stage: 'In Production', 
    notes: 'Order released to manufacturing floor.', 
    crmSynced: true, 
    erpBookingCreated: true, 
    tallyPaymentVerified: true, 
    source: 'A1 Voice Agent', 
    assignedEmployeeId: 'e1' 
  },
  { 
    id: '7', 
    name: 'ModernFab', 
    interest: 'Sheet Bender', 
    budget: '28000', 
    stage: 'Dispatched', 
    notes: 'Dispatched to client location.', 
    crmSynced: true, 
    erpBookingCreated: true, 
    tallyPaymentVerified: true, 
    source: 'WhatsApp A5', 
    assignedEmployeeId: 'e3' 
  }
];

const mockActivityLogs = [
  { id: 'log1', employeeId: 'e2', leadId: '4', action: 'Lead status transitioned from "Booked" to "Confirmed Lead"', fromStage: 'Booked', toStage: 'Confirmed Lead', createdAt: new Date(Date.now() - 300000) },
  { id: 'log2', employeeId: 'e1', leadId: '2', action: 'Lead status transitioned from "Enquiry" to "Qualified"', fromStage: 'Enquiry', toStage: 'Qualified', createdAt: new Date(Date.now() - 720000) },
  { id: 'log3', employeeId: 'e3', leadId: '5', action: 'Lead status transitioned from "Confirmed Lead" to "Client (Paid)"', fromStage: 'Confirmed Lead', toStage: 'Client (Paid)', createdAt: new Date(Date.now() - 2040000) }
];

const mockEmployees = [
  { id: 'e1', name: 'Animesh', role: 'A1 Voice Agent Architect', tasksCompleted: 14, callsHandled: 124, salesClosed: 8 },
  { id: 'e2', name: 'Bhavya', role: 'A2 Core Developer', tasksCompleted: 18, callsHandled: 0, salesClosed: 12 },
  { id: 'e3', name: 'Aaditya', role: 'A4/A5 Specialist', tasksCompleted: 11, callsHandled: 15, salesClosed: 5 }
];

module.exports = {
  mockLeads,
  mockActivityLogs,
  mockEmployees
};
