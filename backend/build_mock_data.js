const fs = require('fs');
const path = require('path');

// Read files
const leads = JSON.parse(fs.readFileSync(path.join(__dirname, 'leads_data.json'), 'utf8'));
const employees = JSON.parse(fs.readFileSync(path.join(__dirname, 'employees_data.json'), 'utf8'));
const logs = JSON.parse(fs.readFileSync(path.join(__dirname, 'logs_data.json'), 'utf8'));

// Format leads
const formattedLeads = leads.map(l => ({
  id: l.id,
  name: l.name,
  company: l.company || `${l.name} Corp`,
  phone: l.phone || '+91 98765 43210',
  email: l.email || `${l.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
  interest: l.interest || 'Single Die Paper Plate Making Machine',
  budget: String(l.budget || 150000),
  stage: l.stage || 'Enquiry',
  priority: l.priority || (parseFloat(l.budget) > 300000 ? 'Hot' : parseFloat(l.budget) > 150000 ? 'Warm' : 'Cold'),
  notes: l.notes || 'Direct manual entry from CRM Board.',
  source: l.source || 'Direct Web',
  crmSynced: l.crmSynced !== undefined ? l.crmSynced : true,
  erpBookingCreated: l.erpBookingCreated !== undefined ? l.erpBookingCreated : false,
  tallyPaymentVerified: l.tallyPaymentVerified !== undefined ? l.tallyPaymentVerified : false,
  assignedEmployeeId: l.assignedEmployeeId || 'e1',
  createdAt: l.createdAt || new Date().toISOString()
}));

// Format employees
const formattedEmployees = employees.map(e => ({
  id: e.id,
  name: e.name,
  role: e.role || 'Telecaller',
  email: e.email || `${e.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@apsenterprises.com`,
  phone: e.phone || '+91 98765 43210',
  department: e.department || 'Voice Operations',
  status: e.status || 'Active',
  leadsAssigned: e.leadsAssigned || Math.floor(Math.random() * 50) + 10,
  leadsConverted: e.leadsConverted || Math.floor(Math.random() * 10) + 5,
  revenue: e.revenue || Math.floor(Math.random() * 500000) + 100000,
  callsToday: e.callsToday || Math.floor(Math.random() * 25),
  tasksCompleted: e.tasksCompleted || Math.floor(Math.random() * 15),
  performance: e.performance || Math.floor(Math.random() * 20) + 80
}));

// Format activity logs
const formattedLogs = logs.map(a => {
  const emp = employees.find(e => e.id === a.employeeId) || { name: 'System' };
  return {
    id: a.id,
    leadId: a.leadId,
    employeeId: a.employeeId,
    employeeName: a.employeeName || emp.name,
    action: a.action || `Status updated`,
    fromStage: a.fromStage || 'None',
    toStage: a.toStage || 'Enquiry',
    createdAt: a.createdAt || new Date().toISOString()
  };
});

// Format Bookings
const mapStageToStatus = (stage) => {
  switch (stage) {
    case 'Booked': return 'Booking Created';
    case 'Confirmed Lead': return 'Confirmed';
    case 'Client (Paid)': return 'Factory Released';
    case 'In Production': return 'In Production';
    case 'Dispatched': return 'Dispatched';
    default: return 'Booking Created';
  }
};

const bookings = formattedLeads
  .filter(l => ['Booked', 'Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched'].includes(l.stage))
  .map((l, i) => ({
    id: `BK${String(i + 1).padStart(3, '0')}`,
    leadId: l.id,
    clientName: l.name,
    company: l.company,
    product: l.interest,
    amount: parseFloat(l.budget) || 150000,
    stage: l.stage,
    status: mapStageToStatus(l.stage),
    erpRef: `ERP-2026-${1000 + (parseInt(l.id ? l.id.replace('LEAD-', '') : i) || i)}`,
    createdAt: l.createdAt,
    assignedEmployeeId: l.assignedEmployeeId,
  }));

// Format Payments
const payments = formattedLeads
  .filter(l => ['Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched'].includes(l.stage))
  .map((l, i) => {
    const isVerified = l.stage !== 'Confirmed Lead';
    return {
      id: `PAY${String(i + 1).padStart(3, '0')}`,
      leadId: l.id,
      lead: l.name,
      company: l.company,
      amount: `₹${Math.round((parseFloat(l.budget) || 150000) * 0.10).toLocaleString('en-IN')}`,
      percent: '10%',
      status: isVerified ? 'Verified' : 'Pending Verification',
      tallyRef: isVerified ? `TALLY-2026-${2000 + i}` : null,
      dueDate: '2026-08-31',
      daysOverdue: l.stage === 'Confirmed Lead' ? 3 : 0,
    };
  });

// Write to mockData.js
const mockDataContent = `// Central Mock Data — APS Enterprise
// Used as default/fallback data in all pages so UI always shows data

export const MOCK_LEADS = ${JSON.stringify(formattedLeads, null, 2)};

export const MOCK_ACTIVITY_LOGS = ${JSON.stringify(formattedLogs, null, 2)};

export const MOCK_EMPLOYEES = ${JSON.stringify(formattedEmployees, null, 2)};

export const MOCK_BOOKINGS = ${JSON.stringify(bookings, null, 2)};

export const MOCK_PAYMENTS = ${JSON.stringify(payments, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '..', 'frontend', 'src', 'mockData.js'), mockDataContent, 'utf8');
console.log('Successfully generated frontend/src/mockData.js with full dataset!');
