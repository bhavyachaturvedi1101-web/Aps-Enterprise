'use strict';
/**
 * A3 Report & File Export Builders
 * Handles CSV, XLSX, PDF, XML, DOC, and JSON serializations for enterprise exports.
 */

function detectRequestedFormat(query) {
  const q = (query || '').toLowerCase();
  if (/\b(pdf|pfd|pdff)\b/i.test(q) || /pdf\s*(file|report|format|doc|sheet)?/i.test(q)) return 'pdf';
  if (/\b(excel|exel|excle|xlsx|xls|spreadsheet|sheet|sheets)\b/i.test(q)) return 'xlsx';
  if (/\b(csv|csv\s*file|csv\s*format)\b/i.test(q)) return 'csv';
  if (/\b(xml|xml\s*file)\b/i.test(q)) return 'xml';
  if (/\b(docx|doc|word|word\s*doc)\b/i.test(q)) return 'doc';
  if (/\b(json|json\s*format|json\s*file)\b/i.test(q)) return 'json';
  if (/\b(export|download|downlod|dawnload|generate|geneate|genrate|genearte|create|file|format|sheet|banao|nikalo|chahiye|kisi\s*bhi)\b/i.test(q)) return 'pdf';
  return null;
}

function buildStockExport(inventory, format, dateStr) {
  const totalVal = inventory.reduce((s, i) => s + ((Number(i.stockUnits) || 0) * (Number(i.unitPrice) || 0)), 0);
  const totalUnits = inventory.reduce((s, i) => s + (Number(i.stockUnits) || 0), 0);
  const availUnits = inventory.reduce((s, i) => s + (Number(i.availableUnits) || 0), 0);
  const resUnits = inventory.reduce((s, i) => s + (Number(i.reservedUnits) || 0), 0);

  const fileName = `APS_Warehouse_Stock_Audit_${dateStr}.${format}`;
  let mimeType = 'application/pdf';
  let content = '';

  if (format === 'csv' || format === 'xlsx') {
    mimeType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    content = 'ID,SKU,Item Name,Category,Warehouse,Total Stock Units,Reserved Units,Available Units,Unit Price (INR),Total Valuation (INR),Status,Last Restocked\n' +
      inventory.map(i => `"${i.id}","${i.sku || ''}","${i.name}","${i.category}","${i.warehouse}",${i.stockUnits},${i.reservedUnits},${i.availableUnits},${i.unitPrice},${(Number(i.stockUnits) || 0) * (Number(i.unitPrice) || 0)},"${i.status}","${i.lastRestocked || ''}"`).join('\n');
  } else if (format === 'pdf') {
    mimeType = 'application/pdf';
    content = `================================================================================\n` +
      `          APS ENTERPRISE — WAREHOUSE & FACTORY INVENTORY AUDIT REPORT\n` +
      `================================================================================\n` +
      `Generated Date  : ${dateStr}\n` +
      `Total Products  : ${inventory.length} Tracked Product Lines\n` +
      `Total Stock     : ${totalUnits} Units (Available: ${availUnits} | Reserved: ${resUnits})\n` +
      `Total Valuation : ₹${totalVal.toLocaleString('en-IN')}\n` +
      `Operating Plants: Indore Main Plant (MP), Pune Unit 1, Chakan Unit 2, Raw Material Yard\n` +
      `--------------------------------------------------------------------------------\n` +
      `SKU          ITEM NAME                            WAREHOUSE          AVAIL/TOT   UNIT PRICE    STATUS\n` +
      `--------------------------------------------------------------------------------\n` +
      inventory.map(i => `${(i.sku || i.id).padEnd(12)} ${i.name.slice(0, 35).padEnd(36)} ${(i.warehouse || 'Indore').slice(0, 17).padEnd(18)} ${(i.availableUnits + '/' + i.stockUnits).padEnd(11)} ₹${Number(i.unitPrice || 0).toLocaleString('en-IN').padEnd(12)} ${i.status || 'In Stock'}`).join('\n') +
      `\n--------------------------------------------------------------------------------\n` +
      `APS Enterprise AI Operations System • Official Certified Document\n` +
      `Registered Office: 832, Old Loha Mandi, Indore, MP - 452001 | Web: https://www.apsenterprises.in`;
  } else if (format === 'xml') {
    mimeType = 'application/xml';
    content = `<?xml version="1.0" encoding="UTF-8"?>\n<inventory valuation="${totalVal}" totalUnits="${totalUnits}">\n` +
      inventory.map(i => `  <item id="${i.id}" sku="${i.sku || ''}">\n    <name>${i.name}</name>\n    <category>${i.category}</category>\n    <warehouse>${i.warehouse}</warehouse>\n    <available>${i.availableUnits}</available>\n    <total>${i.stockUnits}</total>\n    <unitPrice>${i.unitPrice}</unitPrice>\n  </item>`).join('\n') +
      `\n</inventory>`;
  } else if (format === 'doc') {
    mimeType = 'application/msword';
    content = `APS Enterprise - Warehouse & Stock Inventory Report\nDate: ${dateStr}\n\nTotal Valuation: ₹${totalVal.toLocaleString('en-IN')} (${inventory.length} Product Lines)\n\n` +
      inventory.map((i, idx) => `${idx + 1}. [${i.sku || i.id}] ${i.name}\n   Warehouse: ${i.warehouse} | Avail: ${i.availableUnits}/${i.stockUnits} units | Price: ₹${Number(i.unitPrice || 0).toLocaleString('en-IN')} | Status: ${i.status}`).join('\n\n');
  } else {
    mimeType = 'application/json';
    content = JSON.stringify(inventory, null, 2);
  }

  return {
    fileName,
    fileFormat: format.toUpperCase(),
    mimeType,
    sizeKB: `${(content.length / 1024).toFixed(1)} KB`,
    title: 'Warehouse & Factory Stock Inventory Audit',
    summaryCards: [
      { label: 'Total Valuation', val: `₹${(totalVal / 10000000).toFixed(2)} Cr` },
      { label: 'Tracked Items', val: `${inventory.length} SKUs` },
      { label: 'Available Stock', val: `${availUnits} Units` },
      { label: 'Operating Units', val: 'Indore & Pune' }
    ],
    tableHeaders: ['SKU', 'Product Name', 'Category', 'Warehouse', 'Avail / Total', 'Unit Price', 'Status'],
    tableRows: inventory.map(i => [
      i.sku || i.id,
      i.name,
      i.category,
      i.warehouse,
      `${i.availableUnits} / ${i.stockUnits} units`,
      `₹${Number(i.unitPrice || 0).toLocaleString('en-IN')}`,
      i.status || 'In Stock'
    ]),
    content
  };
}

function buildLeadsExport(leads, format, dateStr) {
  const fileName = `APS_Enterprise_Leads_${dateStr}.${format}`;
  let mimeType = 'text/csv';
  let content = '';

  if (format === 'csv' || format === 'xlsx') {
    mimeType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    content = 'ID,Name,Stage,Budget,Company,AssignedEmployee\n' +
      leads.map(l => `"${l.id}","${l.name}","${l.stage}","${l.budget}","${l.company || ''}","${l.assignedEmployeeId || ''}"`).join('\n');
  } else if (format === 'pdf') {
    mimeType = 'application/pdf';
    content = `APS ENTERPRISE CRM DATA EXPORT (PDF)\nGenerated: ${dateStr}\nTotal Records: ${leads.length}\n\n` +
      `--------------------------------------------------------------------------------\n` +
      `ID         NAME                 STAGE             BUDGET        COMPANY\n` +
      `--------------------------------------------------------------------------------\n` +
      leads.map(l => `${(l.id || '').padEnd(10)} ${(l.name || '').padEnd(20)} ${(l.stage || '').padEnd(17)} ₹${Number(l.budget || 0).toLocaleString('en-IN').padEnd(12)} ${l.company || ''}`).join('\n') +
      `\n--------------------------------------------------------------------------------\n` +
      `APS Enterprise AI Intelligence Engine • Confidential`;
  } else if (format === 'xml') {
    mimeType = 'application/xml';
    content = '<?xml version="1.0" encoding="UTF-8"?>\n<leads>\n' +
      leads.map(l => `  <lead>\n    <id>${l.id}</id>\n    <name>${l.name}</name>\n    <stage>${l.stage}</stage>\n    <budget>${l.budget}</budget>\n  </lead>`).join('\n') +
      '\n</leads>';
  } else if (format === 'docx' || format === 'doc') {
    mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    content = `APS Enterprise Data Export\nDate: ${dateStr}\n\nTotal Records: ${leads.length}\n\n` +
      leads.map((l, i) => `${i + 1}. [${l.id}] ${l.name} | Stage: ${l.stage} | Budget: ₹${Number(l.budget || 0).toLocaleString('en-IN')}`).join('\n');
  } else {
    mimeType = 'application/json';
    content = JSON.stringify(leads, null, 2);
  }

  const closedLeads = leads.filter(l => ['Client (Paid)', 'In Production', 'Dispatched'].includes(l.stage));
  const totalRev = closedLeads.reduce((s, l) => s + (Number(l.budget) || 0), 0);

  return {
    fileName,
    fileFormat: format.toUpperCase(),
    mimeType,
    sizeKB: `${(content.length / 1024).toFixed(1)} KB`,
    title: 'Enterprise CRM Leads & Pipeline Audit',
    summaryCards: [
      { label: 'Total Leads', val: `${leads.length} Records` },
      { label: 'Closed Revenue', val: `₹${totalRev.toLocaleString('en-IN')}` },
      { label: 'Conversion Rate', val: `${Math.round((closedLeads.length / Math.max(1, leads.length)) * 100)}%` },
      { label: 'Gate Status', val: '10% Advance' }
    ],
    tableHeaders: ['ID', 'Client Name', 'Stage', 'Budget', 'Company', 'Assigned Rep'],
    tableRows: leads.map(l => [
      l.id,
      l.name,
      l.stage,
      `₹${Number(l.budget || 0).toLocaleString('en-IN')}`,
      l.company || 'Industrial Ltd',
      l.assignedEmployeeId === 'e2' ? 'Bhavya' : l.assignedEmployeeId === 'e1' ? 'Animesh' : 'Sales Rep'
    ]),
    content
  };
}

function buildEmployeePerformanceExport(employeesData, format, dateStr) {
  const fileName = `APS_Employee_Performance_Profit_Audit_${dateStr}.${format}`;
  let mimeType = 'text/csv';
  let content = '';

  const totalRev = employeesData.reduce((s, e) => s + e.totalRevenue, 0);
  const totalCost = employeesData.reduce((s, e) => s + e.costSpent, 0);
  const totalProfit = employeesData.reduce((s, e) => s + e.netProfit, 0);
  const avgRoi = Math.round((totalProfit / (totalCost || 1)) * 100);

  if (format === 'csv' || format === 'xlsx') {
    mimeType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    content = 'Employee ID,Name,Role,Department,Cost Spent (INR),Revenue Closed (INR),Net Profit (INR),ROI (%),Deals Closed,KPI Score\n' +
      employeesData.map(e => `"${e.id}","${e.name}","${e.role}","${e.department}",${e.costSpent},${e.totalRevenue},${e.netProfit},${e.roi},${e.salesClosed},"${e.kpiScore}"`).join('\n');
  } else if (format === 'pdf') {
    mimeType = 'application/pdf';
    content = `APS ENTERPRISE EMPLOYEE PERFORMANCE & PROFIT AUDIT (PDF)\nGenerated: ${dateStr}\nTotal Team Members: ${employeesData.length}\n` +
      `Total Revenue: ₹${totalRev.toLocaleString('en-IN')} | Total Cost Spent: ₹${totalCost.toLocaleString('en-IN')} | Net Profit: ₹${totalProfit.toLocaleString('en-IN')} | Avg ROI: ${avgRoi}%\n\n` +
      `--------------------------------------------------------------------------------\n` +
      `NAME            ROLE                     SPENT       REVENUE     NET PROFIT   ROI    KPI\n` +
      `--------------------------------------------------------------------------------\n` +
      employeesData.map(e => `${e.name.padEnd(15)} ${e.role.slice(0, 23).padEnd(24)} ₹${Number(e.costSpent).toLocaleString('en-IN').padEnd(10)} ₹${Number(e.totalRevenue).toLocaleString('en-IN').padEnd(11)} ₹${Number(e.netProfit).toLocaleString('en-IN').padEnd(11)} ${(e.roi + '%').padEnd(6)} ${e.kpiScore}`).join('\n') +
      `\n--------------------------------------------------------------------------------\n` +
      `APS Enterprise AI Operations System • Official Certified Document`;
  } else if (format === 'xml') {
    mimeType = 'application/xml';
    content = `<?xml version="1.0" encoding="UTF-8"?>\n<employeesPerformance totalRevenue="${totalRev}" totalSpent="${totalCost}" netProfit="${totalProfit}">\n` +
      employeesData.map(e => `  <employee id="${e.id}">\n    <name>${e.name}</name>\n    <role>${e.role}</role>\n    <spent>${e.costSpent}</spent>\n    <revenue>${e.totalRevenue}</revenue>\n    <netProfit>${e.netProfit}</netProfit>\n    <roi>${e.roi}%</roi>\n    <kpi>${e.kpiScore}</kpi>\n  </employee>`).join('\n') +
      `\n</employeesPerformance>`;
  } else if (format === 'doc') {
    mimeType = 'application/msword';
    content = `APS Enterprise - Employee Performance, Cost & Profit Audit Report\nDate: ${dateStr}\n\nTeam Revenue: ₹${totalRev.toLocaleString('en-IN')} | Total Spent: ₹${totalCost.toLocaleString('en-IN')} | Net Profit: ₹${totalProfit.toLocaleString('en-IN')}\n\n` +
      employeesData.map((e, i) => `${i + 1}. ${e.name} (${e.role})\n   Cost Spent: ₹${Number(e.costSpent).toLocaleString('en-IN')} | Revenue Closed: ₹${Number(e.totalRevenue).toLocaleString('en-IN')} | Net Profit Gained: ₹${Number(e.netProfit).toLocaleString('en-IN')} (ROI: ${e.roi}%) | Deals: ${e.salesClosed} | KPI: ${e.kpiScore}`).join('\n\n');
  } else {
    mimeType = 'application/json';
    content = JSON.stringify(employeesData, null, 2);
  }

  return {
    fileName,
    fileFormat: format.toUpperCase(),
    mimeType,
    sizeKB: `${(content.length / 1024).toFixed(1)} KB`,
    title: 'Employee Performance, Operational Cost & Net Profit Audit',
    summaryCards: [
      { label: 'Total Revenue', val: `₹${(totalRev / 100000).toFixed(2)} Lakhs` },
      { label: 'Total Cost Spent', val: `₹${(totalCost / 100000).toFixed(2)} Lakhs` },
      { label: 'Net Profit Gain', val: `₹${(totalProfit / 100000).toFixed(2)} Lakhs` },
      { label: 'Team Avg ROI', val: `${avgRoi}%` }
    ],
    tableHeaders: ['ID', 'Employee Name', 'Role', 'Cost Spent (₹)', 'Revenue Closed (₹)', 'Net Profit (₹)', 'ROI (%)', 'Deals', 'KPI Score'],
    tableRows: employeesData.map(e => [
      e.id,
      e.name,
      e.role,
      `₹${Number(e.costSpent).toLocaleString('en-IN')}`,
      `₹${Number(e.totalRevenue).toLocaleString('en-IN')}`,
      `₹${Number(e.netProfit).toLocaleString('en-IN')}`,
      `${e.roi}%`,
      String(e.salesClosed),
      e.kpiScore
    ]),
    content
  };
}

module.exports = {
  detectRequestedFormat,
  buildStockExport,
  buildLeadsExport,
  buildEmployeePerformanceExport
};
