const fs = require('fs');
const path = require('path');

// Require the data module
const data = require('./src/config/inMemoryStore.js');

// Standardize departments based on roles
function getStandardizedDepartment(role) {
  const r = role.toLowerCase();
  
  // Sales Department
  if (
    r.includes('sales') || 
    r.includes('telecaller') || 
    r.includes('telecalling') || 
    r.includes('conversion') || 
    r.includes('inquiry') || 
    r.includes('outbound') || 
    r.includes('calling') || 
    r.includes('call') || 
    r.includes('voice operations specialist') ||
    r.includes('field sales')
  ) {
    return 'Sales';
  }
  
  // Operations & Administration Department
  if (
    r.includes('systems') || 
    r.includes('architect') || 
    r.includes('admin') || 
    r.includes('ops') || 
    r.includes('operations manager') || 
    r.includes('accounts') || 
    r.includes('erp') || 
    r.includes('billing') || 
    r.includes('analytic') || 
    r.includes('specialist')
  ) {
    return 'Operations & Administration';
  }
  
  // Production & Assembly Department
  if (
    r.includes('fitter') || 
    r.includes('fit') || 
    r.includes('test') || 
    r.includes('testing') || 
    r.includes('supervisor') || 
    r.includes('assembly') || 
    r.includes('production') || 
    r.includes('manufacturing') || 
    r.includes('welder') || 
    r.includes('machinist')
  ) {
    return 'Production & Assembly';
  }
  
  // Logistics & Service Department
  if (
    r.includes('dispatch') || 
    r.includes('logistic') || 
    r.includes('logistics') || 
    r.includes('coordinator') || 
    r.includes('clerk') || 
    r.includes('yard') || 
    r.includes('inventory') || 
    r.includes('spare') || 
    r.includes('service') || 
    r.includes('transport')
  ) {
    return 'Logistics & Service';
  }
  
  return 'Sales'; // fallback
}

// 1. Rename e2 to Sneha and map departments
data.mockEmployees = data.mockEmployees.map(emp => {
  if (emp.id === 'e2') {
    emp.name = 'Sneha';
  }
  emp.department = getStandardizedDepartment(emp.role);
  return emp;
});

// Also update activity logs that refer to e2's name
if (data.mockActivityLogs) {
  data.mockActivityLogs = data.mockActivityLogs.map(log => {
    if (log.employeeId === 'e2') {
      log.employeeName = 'Sneha';
    }
    // Also update from the employee list name just in case
    const matchedEmp = data.mockEmployees.find(e => e.id === log.employeeId);
    if (matchedEmp) {
      log.employeeName = matchedEmp.name;
    }
    return log;
  });
}

// Custom serializer to handle Date objects as `new Date("...")` in output Javascript file
function serialize(val) {
  if (val instanceof Date) {
    return `new Date("${val.toISOString()}")`;
  }
  if (Array.isArray(val)) {
    return `[\n` + val.map(item => '      ' + serialize(item)).join(',\n') + `\n    ]`;
  }
  if (val !== null && typeof val === 'object') {
    let parts = [];
    for (let key in val) {
      parts.push(`      "${key}": ${serialize(val[key])}`);
    }
    return `{\n` + parts.join(',\n') + `\n    }`;
  }
  return JSON.stringify(val);
}

// Serialize the entire data object
let serializedLeads = `[\n` + data.mockLeads.map(l => '    ' + serialize(l)).join(',\n') + `\n  ]`;
let serializedEmployees = `[\n` + data.mockEmployees.map(e => '    ' + serialize(e)).join(',\n') + `\n  ]`;
let serializedLogs = `[\n` + data.mockActivityLogs.map(a => '    ' + serialize(a)).join(',\n') + `\n  ]`;
let serializedInventory = `[\n` + data.mockInventory.map(i => '    ' + serialize(i)).join(',\n') + `\n  ]`;
let serializedInventoryLogs = `[\n` + data.mockInventoryLogs.map(l => '    ' + serialize(l)).join(',\n') + `\n  ]`;
let serializedProfile = serialize(data.companyProfile);
let serializedConfig = serialize(data.systemConfig);

const outputContent = `// Centralized In-Memory Data Store (Canonical Schemas for APS Enterprise)

const data = {
  "mockLeads": ${serializedLeads},
  "mockEmployees": ${serializedEmployees},
  "mockActivityLogs": ${serializedLogs},
  "mockInventory": ${serializedInventory},
  "mockInventoryLogs": ${serializedInventoryLogs},
  "companyProfile": ${serializedProfile},
  "systemConfig": ${serializedConfig}
};

module.exports = data;
`;

fs.writeFileSync('./src/config/inMemoryStore.js', outputContent, 'utf8');
console.log('Successfully updated inMemoryStore.js with aligned names and standardized departments!');
