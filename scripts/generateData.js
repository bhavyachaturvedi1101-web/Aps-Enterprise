const fs = require('fs');
const path = require('path');

const original = require('../backend/src/config/inMemoryStore.js');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

const firstNames = [
  'Aaditya', 'Aarav', 'Advik', 'Akshay', 'Amit', 'Animesh', 'Arjun', 'Bhavya', 'Dev', 'Dhruv', 
  'Gaurav', 'Harsh', 'Ishaan', 'Kabir', 'Karan', 'Karthik', 'Kunal', 'Lakshya', 'Manish', 'Mohit',
  'Nikhil', 'Pranav', 'Rahul', 'Raj', 'Ravi', 'Rohan', 'Rohit', 'Sahil', 'Sanjay', 'Saurabh',
  'Aadhya', 'Ananya', 'Avni', 'Bhumika', 'Chhavi', 'Diya', 'Isha', 'Kavya', 'Khushi', 'Kiara',
  'Kriti', 'Meera', 'Neha', 'Nidhi', 'Pooja', 'Priya', 'Riya', 'Roshni', 'Sanya', 'Shruti', 'Sneha'
];

const lastNames = [
  'Agarwal', 'Bansal', 'Bhatia', 'Chaturvedi', 'Chauhan', 'Das', 'Desai', 'Dixit', 'Dubey', 'Garg',
  'Goel', 'Gupta', 'Iyer', 'Jain', 'Joshi', 'Kapoor', 'Kaur', 'Khan', 'Khatri', 'Kumar', 'Mahajan',
  'Malhotra', 'Mehta', 'Mishra', 'Mukherjee', 'Nair', 'Pandey', 'Patel', 'Pathak', 'Pillai', 'Rao',
  'Reddy', 'Roy', 'Saini', 'Saxena', 'Sen', 'Shah', 'Sharma', 'Singh', 'Sinha', 'Soni', 'Tiwari',
  'Tripathi', 'Trivedi', 'Verma', 'Yadav'
];

const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal'];

const machineInterests = [
  'Single Die Paper Plate Making Machine', 'Double Die Paper Plate Machine', 
  'Hydraulic Dona Pattal Machine', 'Fully Automatic Paper Cup Machine', 
  'Semi-Automatic Dona Making Machine', 'Crank Type Paper Plate Machine', 
  'Paper Bag Making Machine', 'Non-Woven Bag Making Machine', 
  'Slipper Making Machine', 'Agarbatti Making Machine',
  'Raw Material (Silver Craft Paper Roll)', 'Paper Lamination Machine',
  '4-Die Dona Pattal Machine', 'Heavy Duty Hydraulic Paper Plate Press'
];

const pipelineStages = ['Enquiry', 'Qualified', 'Booked', 'Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched'];

const sources = ['Meta Ads', 'A1 Voice Agent', 'Inbound Call', 'Telecaller', 'WhatsApp', 'Direct Web', 'Referral'];

const departments = ['Telecalling & Inquiry', 'Direct Field Sales', 'Machine Assembly & Production', 'Dispatch & Logistics', 'Accounts & ERP', 'Spare Parts & Service'];
const roles = ['Telecaller Executive', 'Lead Qualification Specialist', 'Field Sales Manager', 'Direct Sales Executive', 'Assembly Supervisor', 'Machine Fitter', 'Quality Testing Engineer', 'Dispatch Coordinator', 'Inventory Clerk', 'Accounts Executive', 'ERP Operations Admin', 'Spare Parts Manager'];

// Task templates based on role category
const taskTemplates = {
  sales: [
    { title: 'Outbound follow-up for Double Die Machine enquiry from', type: 'Sales Qualification', stage: 'Enquiry', priority: 'High', currentActivity: 'Live Outbound Telecall' },
    { title: 'Share quotation and ROI video for Dona Pattal setup with', type: 'Sales Follow-up', stage: 'Qualified', priority: 'Normal', currentActivity: 'Drafting Quotation' },
    { title: 'Conduct secondary telecaller qualification for', type: 'Telecalling', stage: 'Enquiry', priority: 'Normal', currentActivity: 'Handling Operations' },
    { title: 'Follow up on field demo schedule for', type: 'Field Sales', stage: 'Qualified', priority: 'Normal', currentActivity: 'Scheduling Demo' }
  ],
  erp: [
    { title: 'Generate Production Job Card for Hydraulic Press Machine for', type: 'ERP Factory Release', stage: 'In Production', priority: 'High', currentActivity: 'Dispatching Job Card for Manufacturing' },
    { title: 'Verify motor and heating coil assembly for', type: 'Assembly Check', stage: 'In Production', priority: 'Normal', currentActivity: 'Validating Assembly' },
    { title: 'Pack spare parts kit (dies and heaters) for', type: 'Spare Parts Allocation', stage: 'In Production', priority: 'Normal', currentActivity: 'Packing Spare Parts' },
    { title: 'Test and calibrate hydraulics for Double Die Machine for', type: 'Quality Testing', stage: 'In Production', priority: 'Normal', currentActivity: 'Testing Machinery' },
    { title: 'Dispatch fully automatic machine via V-Trans for', type: 'Factory Dispatch', stage: 'Dispatched', priority: 'High', currentActivity: 'Processing Shop Floor Dispatch' }
  ],
  admin: [
    { title: 'Review Booking Specs & Dual-Approval Countersign for', type: 'Admin Dual-Approval', stage: 'Booked', priority: 'Urgent', currentActivity: 'Dual-Approval Review' },
    { title: 'Verify 10% Tally advance for machine booking by', type: 'Payment Gate Verification', stage: 'Confirmed Lead', priority: 'High', currentActivity: 'Reconciling Ledger' },
    { title: 'Approve final dispatch invoice & transport LR for', type: 'Factory Release Authorization', stage: 'Client (Paid)', priority: 'Normal', currentActivity: 'Verifying Invoices' },
    { title: 'Send WhatsApp payment reminder for pending dispatch to', type: 'Payment Reminder', stage: 'Confirmed Lead', priority: 'High', currentActivity: 'Monitoring Confirmed Lead SLAs' }
  ]
};

function getRoleCategory(role) {
  const r = role.toLowerCase();
  if (r.includes('supervisor') || r.includes('fitter') || r.includes('testing') || r.includes('dispatch') || r.includes('inventory')) return 'erp';
  if (r.includes('admin') || r.includes('accounts') || r.includes('erp') || r.includes('spare')) return 'admin';
  return 'sales'; // Default to sales
}

// Generate Employees
const employees = [];
for (let i = 1; i <= 30; i++) {
  const isHighPerformer = Math.random() > 0.7;
  const isLowPerformer = Math.random() < 0.2;
  const kpiBase = isHighPerformer ? 90 : (isLowPerformer ? 60 : 75);
  const kpiScoreNum = randomInt(kpiBase, kpiBase + 9);
  
  const firstName = randomChoice(firstNames);
  const lastName = randomChoice(lastNames);
  const name = `${firstName} ${lastName}`;
  const callsHandled = randomInt(50, 300);
  const salesClosed = Math.floor(callsHandled * (kpiScoreNum / 100) * 0.1);
  const targetSales = randomInt(Math.max(5, salesClosed - 5), salesClosed + 10);
  const totalRevenue = salesClosed * randomInt(20000, 100000);
  const conversionRate = ((salesClosed / callsHandled) * 100).toFixed(1) + '%';
  const role = i <= roles.length ? roles[i - 1] : randomChoice(roles);
  const department = role.includes('Telecaller') ? 'Telecalling & Inquiry' : randomChoice(departments);
  
  const category = getRoleCategory(role);
  const possibleTasks = taskTemplates[category];
  
  const activeT = randomChoice(possibleTasks);
  const queueT = randomChoice(possibleTasks);
  
  // Create mock lead for tasks
  const leadName = `${randomChoice(firstNames)} Industries`;
  const leadId = `LEAD-${randomInt(100, 999)}`;

  employees.push({
    id: `e${i}`,
    name: name,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@aps-enterprise.com`,
    phone: `+91 9${randomInt(100000000, 999999999)}`,
    role: role,
    department: department,
    kpiScore: `${kpiScoreNum}%`,
    kpiScoreNum: kpiScoreNum,
    status: Math.random() > 0.05 ? 'Active' : 'Offline',
    currentActivity: activeT.currentActivity,
    tasksCompleted: randomInt(10, 100),
    callsHandled: callsHandled,
    salesClosed: salesClosed,
    totalRevenue: totalRevenue,
    targetSales: targetSales,
    conversionRate: conversionRate,
    avgCallDurationSec: randomInt(60, 240),
    avgResponseTimeMin: (Math.random() * 10).toFixed(1),
    weeklyKpiHistory: [randomInt(kpiBase, kpiBase + 9), randomInt(kpiBase, kpiBase + 9), randomInt(kpiBase, kpiBase + 9), kpiScoreNum],
    stageConversions: {
      enquiryToQualified: randomInt(20, 80),
      qualifiedToBooked: randomInt(10, 40),
      bookedToConfirmed: randomInt(5, 20),
      confirmedToPaid: salesClosed
    },
    activeTask: {
      id: `task-e${i}-1`,
      title: `${activeT.title} ${leadName}`,
      leadId: leadId,
      leadName: leadName,
      priority: activeT.priority,
      type: activeT.type,
      stage: activeT.stage,
      dueIn: `${randomInt(5, 60)} mins`,
      assignedAt: new Date(Date.now() - randomInt(600000, 3600000))
    },
    taskQueue: [
      {
        id: `task-e${i}-2`,
        title: `${queueT.title} ${leadName}`,
        leadId: leadId,
        leadName: leadName,
        priority: queueT.priority,
        type: queueT.type,
        stage: queueT.stage
      }
    ]
  });
}

// Assign special roles for existing logic
employees[0].id = 'e1';
employees[0].name = 'Animesh';
employees[0].role = 'Voice Operations & Sales Lead';
employees[0].department = 'Voice Operations & Telecalling';

employees[1].id = 'e2';
employees[1].name = 'Bhavya';
employees[1].role = 'Core Systems Architect & Admin';
employees[1].department = 'Operations & Systems';

employees[2].id = 'e3';
employees[2].name = 'Aaditya';
employees[2].role = 'Analytics & WhatsApp Lead';
employees[2].department = 'Customer Success & Automation';

employees[3].id = 'e4';
employees[3].name = 'Pooja Sharma';
employees[3].role = 'Senior Telecaller & Conversion Spec';
employees[3].department = 'Inside Sales';

employees[4].id = 'e5';
employees[4].name = 'Rohan Mehta';
employees[4].role = 'ERP & Factory Dispatch Officer';
employees[4].department = 'Manufacturing Operations';


// Generate Leads
const leads = [];
const numLeads = 350;
const now = Date.now();
const oneDay = 86400000;

for (let i = 1; i <= numLeads; i++) {
  const interest = randomChoice(machineInterests);
  const budget = randomInt(15000, 350000).toString();
  const stage = randomChoice(pipelineStages);
  const erpBookingCreated = ['Booked', 'Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched'].includes(stage);
  const tallyPaymentVerified = ['Client (Paid)', 'In Production', 'Dispatched'].includes(stage);
  
  // Distribute over last 12 months, with more recent being more common for earlier stages
  let daysAgo;
  if (['Enquiry', 'Qualified'].includes(stage)) {
    daysAgo = randomInt(1, 30);
  } else if (['Booked', 'Confirmed Lead'].includes(stage)) {
    daysAgo = randomInt(5, 60);
  } else {
    daysAgo = randomInt(10, 360);
  }
  
  const createdAt = new Date(now - (daysAgo * oneDay));
  const assignedEmp = randomChoice(employees).id;

  leads.push({
    id: `LEAD-${i.toString().padStart(3, '0')}`,
    name: `${randomChoice(firstNames)} ${randomChoice(lastNames)}`,
    company: `${randomChoice(lastNames)} Industries`,
    phone: `+919${randomInt(100000000, 999999999)}`,
    email: `contact${i}@example.com`,
    interest: interest,
    budget: budget,
    stage: stage,
    notes: `Lead generated via ${randomChoice(sources)}.`,
    crmSynced: true,
    erpBookingCreated: erpBookingCreated,
    tallyPaymentVerified: tallyPaymentVerified,
    source: randomChoice(sources),
    assignedEmployeeId: assignedEmp,
    createdAt: createdAt
  });
}

// Generate Call Logs
const callLogs = [];
const callOutcomes = ['Interested - Qualified', 'Interested - High Intent', 'Follow-up Required', 'Callback Requested', 'Not Interested', 'No Response', 'Information Provided'];
for (let i = 1; i <= 200; i++) {
  const lead = randomChoice(leads);
  const outcome = randomChoice(callOutcomes);
  const duration = randomInt(10, 600);
  
  const sentiment = randomChoice(['Positive', 'Neutral', 'Negative']);
  callLogs.push({
    callId: `CALL-${i.toString().padStart(3, '0')}`,
    leadId: lead.id,
    phone: lead.phone,
    agent: randomChoice(['Voice Agent', ...employees.filter(e => e.department === 'Inside Sales' || e.department === 'Voice Operations & Telecalling').map(e => e.name)]),
    durationSeconds: duration,
    callOutcome: outcome,
    sentiment: sentiment,
    transcript: `Discussed ${lead.interest}. Outcome: ${outcome}. Sentiment: ${sentiment}.`,
    timestamp: new Date(lead.createdAt.getTime() + randomInt(1000, oneDay * 2))
  });
}

// Generate Activity Logs
const activityLogs = [];

const realisticActions = [
  { action: 'Verified Tally Advance Payment (₹15,000) for Double Die Machine', from: 'Confirmed Lead', to: 'Client (Paid)' },
  { action: 'Approved machine quotation & ROI specs for Dona Pattal setup', from: 'Qualified', to: 'Booked' },
  { action: 'Triggered factory release job card #MFG', from: 'Client (Paid)', to: 'In Production' },
  { action: 'Dispatched machine via V-Trans Logistics', from: 'In Production', to: 'Dispatched' },
  { action: 'Sent 10% advance WhatsApp reminder sequence', from: 'Booked', to: 'Confirmed Lead' },
  { action: 'Logged inbound inquiry call (142s) for paper plate machine', from: 'None', to: 'Enquiry' },
  { action: 'Qualified machinery requirements & budget', from: 'Enquiry', to: 'Qualified' },
  { action: 'Countersigned Dual-Approval Booking Sheet', from: 'Qualified', to: 'Booked' },
  { action: 'System: Auto-flagged dwell time bottleneck SLA', from: 'Confirmed Lead', to: 'Confirmed Lead' },
  { action: 'Completed Milestone 2: Motor & Heating Coil Assembly', from: 'In Production', to: 'In Production' },
];

for (let i = 1; i <= 250; i++) {
  const lead = randomChoice(leads);
  let emp;
  let isSystem = false;
  
  if (Math.random() < 0.1) {
    emp = { name: 'system' };
    isSystem = true;
  } else {
    emp = randomChoice(employees);
  }
  
  const actionTemplate = randomChoice(realisticActions);
  
  // Custom tweaks to action strings
  let actionText = actionTemplate.action;
  if (actionText.includes('#MFG')) actionText += `-${randomInt(1000, 9999)}`;
  if (actionText.includes('WhatsApp')) actionText = `Automated WhatsApp sequence triggered for ${lead.company}`;
  
  activityLogs.push({
    id: `log-${i.toString().padStart(3, '0')}`,
    // The frontend renders log.employeeId directly as the name, so we use the name here to display correctly!
    employeeId: emp.name, 
    employeeName: emp.name,
    leadId: lead.id,
    leadName: lead.company,
    action: actionText,
    fromStage: actionTemplate.from,
    toStage: actionTemplate.to,
    details: `Action performed by ${isSystem ? 'System Automation' : emp.name}`,
    createdAt: new Date(Date.now() - randomInt(1000, 86400000 * 30)) // Spread over last 30 days
  });
}
activityLogs.sort((a, b) => b.createdAt - a.createdAt);


const mockTimeInStage = [
  { stage: 'Enquiry', avgHours: 4.2, targetSlaHours: 6.0, dealsCount: leads.filter(l=>l.stage==='Enquiry').length, status: 'On Target', healthScore: 98, stalledDeals: [] },
  { stage: 'Qualified', avgHours: 12.5, targetSlaHours: 16.0, dealsCount: leads.filter(l=>l.stage==='Qualified').length, status: 'On Target', healthScore: 92, stalledDeals: [] },
  { stage: 'Booked', avgHours: 8.0, targetSlaHours: 12.0, dealsCount: leads.filter(l=>l.stage==='Booked').length, status: 'On Target', healthScore: 95, stalledDeals: [] },
  { stage: 'Confirmed Lead', avgHours: 48.5, targetSlaHours: 24.0, dealsCount: leads.filter(l=>l.stage==='Confirmed Lead').length, status: 'Critical Warning', healthScore: 42, warning: 'Deals going cold while sitting unpaid awaiting 10% Tally advance gate', stalledDeals: [] },
  { stage: 'Client (Paid)', avgHours: 6.0, targetSlaHours: 8.0, dealsCount: leads.filter(l=>l.stage==='Client (Paid)').length, status: 'On Target', healthScore: 96, stalledDeals: [] },
  { stage: 'In Production', avgHours: 72.0, targetSlaHours: 120.0, dealsCount: leads.filter(l=>l.stage==='In Production').length, status: 'On Target', healthScore: 90, stalledDeals: [] },
  { stage: 'Dispatched', avgHours: 0, targetSlaHours: 0, dealsCount: leads.filter(l=>l.stage==='Dispatched').length, status: 'Complete', healthScore: 100, stalledDeals: [] }
];

// Combine new data with original intact pieces
const newStore = {
  mockLeads: leads,
  mockActivityLogs: activityLogs,
  mockEmployees: employees,
  mockCallLogs: callLogs,
  mockWhatsAppMessages: original.mockWhatsAppMessages,
  mockWhatsAppSequences: original.mockWhatsAppSequences,
  mockWhatsAppTemplates: original.mockWhatsAppTemplates,
  mockTimeInStage: mockTimeInStage,
  mockDocuments: original.mockDocuments,
  mockInventory: original.mockInventory,
  mockInventoryLogs: original.mockInventoryLogs,
  companyProfile: original.companyProfile,
  systemConfig: original.systemConfig
};

function replacer(key, value) {
  if (this[key] instanceof Date) {
    return `__DATE__${this[key].toISOString()}__DATE__`;
  }
  return value;
}

let json = JSON.stringify(newStore, replacer, 2);

// Fix date rendering to be 'new Date("...")'
json = json.replace(/"__DATE__(.+?)__DATE__"/g, 'new Date("$1")');

const fileContent = `// Centralized In-Memory Data Store (Canonical Schemas for APS Enterprise)

const data = ${json};

module.exports = data;
`;

const targetPath = path.join(__dirname, '../backend/src/config/inMemoryStore.js');
fs.writeFileSync(targetPath, fileContent);
console.log('Successfully generated and replaced inMemoryStore.js');
