const fs = require('fs');
const path = require('path');

const rolesDef = [
  { filter: 'Telecaller', roleName: 'Telecaller', department: 'Voice Operations & Telecalling', stages: ['Enquiry', 'Qualified'] },
  { filter: 'Sales', roleName: 'Sales Executive', department: 'Field & Direct Sales', stages: ['Qualified', 'Booked'] },
  { filter: 'Assembly', roleName: 'Assembly Supervisor', department: 'Manufacturing & Assembly', stages: ['In Production'] },
  { filter: 'Fitter', roleName: 'Machine Fitter', department: 'Manufacturing & Assembly', stages: ['In Production'] },
  { filter: 'Testing', roleName: 'Quality Testing', department: 'Quality & Service', stages: ['In Production'] },
  { filter: 'Dispatch', roleName: 'Dispatch & Logistics', department: 'Logistics & Dispatch', stages: ['Dispatched'] },
  { filter: 'Admin', roleName: 'Accounts & ERP Admin', department: 'Accounts & Administration', stages: ['Confirmed Lead', 'Client (Paid)'] },
  { filter: 'Spare', roleName: 'Spare Parts & Service', department: 'Quality & Service', stages: ['Dispatched', 'Client (Paid)'] }
];

const firstNames = ['Animesh', 'Pooja', 'Rohan', 'Sneha', 'Aaditya', 'Vikram', 'Rajesh', 'Siddharth', 'Amit', 'Neha', 'Priya', 'Rahul', 'Karan', 'Simran', 'Ravi', 'Manoj', 'Deepa', 'Suresh', 'Rita', 'Ajay'];
const lastNames = ['Sharma', 'Patel', 'Kumar', 'Desai', 'Singhal', 'Singh', 'Gupta', 'Jain', 'Shah', 'Verma', 'Yadav', 'Rao', 'Chauhan', 'Reddy', 'Das'];

const employees = [];
let empIdCounter = 1;

rolesDef.forEach(r => {
  for (let i = 0; i < 10; i++) {
    const isSenior = i < 4; // 4 seniors, 6 juniors
    const prefix = isSenior ? 'Senior' : 'Junior';
    const role = `${prefix} ${r.roleName}`;
    const name = (r.filter === 'Sales' && i === 0) ? 'Animesh' : 
                 (r.filter === 'Telecaller' && i === 0) ? 'Pooja Sharma' : 
                 `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    
    const kpi = isSenior ? Math.floor(Math.random() * 10) + 90 : Math.floor(Math.random() * 20) + 70;
    
    employees.push({
      id: `e${empIdCounter++}`,
      name: name,
      email: `${name.split(' ')[0].toLowerCase()}@aps-enterprise.com`,
      phone: `+91 98${Math.floor(Math.random() * 90000000 + 10000000)}`,
      role: role,
      department: r.department,
      kpiScore: `${kpi}%`,
      kpiScoreNum: kpi,
      status: 'Active',
      currentActivity: `${prefix} task in progress`,
      tasksCompleted: Math.floor(Math.random() * 50) + (isSenior ? 30 : 10),
      callsHandled: Math.floor(Math.random() * 100) + (isSenior ? 50 : 20),
      salesClosed: Math.floor(Math.random() * 15) + (isSenior ? 5 : 0),
      totalRevenue: Math.floor(Math.random() * 500000) + 100000,
      targetSales: isSenior ? 15 : 10,
      conversionRate: `${Math.floor(Math.random() * 20) + 15}%`,
      avgCallDurationSec: Math.floor(Math.random() * 60) + 60,
      avgResponseTimeMin: (Math.random() * 5 + 1).toFixed(1),
      weeklyKpiHistory: [kpi-3, kpi-1, kpi, kpi],
      stageConversions: { enquiryToQualified: 40, qualifiedToBooked: 20, bookedToConfirmed: 10, confirmedToPaid: 5 },
      activeTask: {
        id: `task-${empIdCounter}-1`,
        title: `${role} assigned task`,
        leadId: `LEAD-00${Math.floor(Math.random() * 9) + 1}`,
        leadName: 'Generic Lead',
        priority: 'Normal',
        type: 'Routine',
        stage: r.stages[0],
        dueIn: '30 mins',
        assignedAt: new Date(Date.now() - 3600000)
      },
      taskQueue: []
    });
  }
});

// Update backend inMemoryStore.js
const backendPath = path.join(__dirname, '../backend/src/config/inMemoryStore.js');
let backendContent = fs.readFileSync(backendPath, 'utf8');
const backendRegex = /("mockEmployees"\s*:\s*\[)[\s\S]*?(],\s*"mockActivityLogs"\s*:)/;
if (backendRegex.test(backendContent)) {
  const replacement = '$1\n' + employees.map(e => JSON.stringify(e, null, 4)).join(',\n') + '\n$2';
  backendContent = backendContent.replace(backendRegex, replacement);
  fs.writeFileSync(backendPath, backendContent, 'utf8');
  console.log('Backend updated.');
}

// Update frontend TeamKPIs.jsx
const frontendPath = path.join(__dirname, '../frontend/src/pages/TeamKPIs.jsx');
let frontendContent = fs.readFileSync(frontendPath, 'utf8');

// The DEFAULT_EMPLOYEES array declaration
// We'll replace from `const DEFAULT_EMPLOYEES = [` until `];` right before `const DEFAULT_TIME_IN_STAGE`
// BUT we have Date objects in the frontend! We need to output the frontend version slightly differently.
const frontendEmployeesStr = employees.map(e => {
  const eStr = JSON.stringify(e, null, 2);
  // replace "assignedAt": "..." with "assignedAt": new Date("...")
  return eStr.replace(/"assignedAt": "([^"]+)"/, 'assignedAt: new Date("$1")');
}).join(',\n');

const frontendRegex = /const DEFAULT_EMPLOYEES = \[[^]*?\];(\s+const DEFAULT_TIME_IN_STAGE)/;
if (frontendRegex.test(frontendContent)) {
  const replacement = `const DEFAULT_EMPLOYEES = [\n${frontendEmployeesStr}\n];$1`;
  frontendContent = frontendContent.replace(frontendRegex, replacement);
  fs.writeFileSync(frontendPath, frontendContent, 'utf8');
  console.log('Frontend updated.');
} else {
  console.log('Frontend regex failed.');
}
