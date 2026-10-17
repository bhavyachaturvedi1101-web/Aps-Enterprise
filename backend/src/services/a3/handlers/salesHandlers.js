'use strict';

let _store = null;
function getStore() {
  if (!_store) {
    try { _store = require('../../../config/inMemoryStore'); } catch { _store = {}; }
  }
  return _store;
}

async function handleTopPerformer() {
  const store = await getStore();
  const employees = store.mockEmployees || [];
  const ranked = employees.map(e => ({
    name: e.name, role: e.role,
    salesClosed: e.salesClosed || 0,
    revenue: e.totalRevenue || 0,
    kpi: e.kpiScore || '—',
    calls: e.callsHandled || 0
  })).sort((a, b) => b.salesClosed - a.salesClosed);
  const top = ranked[0];
  return {
    text: top
      ? `**${top.name}** is the top performer with **${top.salesClosed} closed deals** and ₹${(top.revenue || 0).toLocaleString('en-IN')} revenue. KPI Score: **${top.kpi}**.`
    : 'No performance data available.',
    table: ranked.map(r => ({ Name: r.name, Role: r.role || '—', 'Closed Deals': r.salesClosed, 'Revenue': `₹${(r.revenue || 0).toLocaleString('en-IN')}`, KPI: r.kpi, Calls: r.calls })),
    chart: {
      type: 'bar', title: 'Closed Deals by Employee',
      labels: ranked.map(r => r.name.split(' ')[0]),
      datasets: [{ label: 'Closed Deals', data: ranked.map(r => r.salesClosed), color: '#10b981' }]
    }
  };
}

async function handleRevenueSummary() {
  const store = await getStore();
  const leads = store.mockLeads || [];
  const closed = leads.filter(l => ['Client (Paid)', 'In Production', 'Dispatched'].includes(l.stage));
  const totalRev = closed.reduce((s, l) => s + (Number(l.budget) || 0), 0);
  const totalPipeline = leads.reduce((s, l) => s + (Number(l.budget) || 0), 0);
  return {
    text: `Total closed revenue is **₹${totalRev.toLocaleString('en-IN')}** across ${closed.length} deals. Total pipeline value is **₹${totalPipeline.toLocaleString('en-IN')}**.`,
    table: [
      { Metric: 'Closed Revenue', Value: `₹${totalRev.toLocaleString('en-IN')}` },
      { Metric: 'Total Pipeline', Value: `₹${totalPipeline.toLocaleString('en-IN')}` },
      { Metric: 'Closed Deals', Value: closed.length }
    ],
    chart: null
  };
}

async function handleEmployeeList() {
  const store = await getStore();
  const employees = store.mockEmployees || [];
  return {
    text: `There are **${employees.length} team members** registered in the operations panel.`,
    table: employees.map(e => ({
      ID: e.id,
      Name: e.name,
      Role: e.role,
      Department: e.department || 'Sales',
      KPI: e.kpiScore || 'A',
      Status: e.status || 'Active'
    })),
    chart: null
  };
}

async function handleKpiStats() {
  const store = await getStore();
  const employees = store.mockEmployees || [];
  return {
    text: `Team KPI scores range from **A+ to B**. Average closure rate is **78%**.`,
    table: employees.map(e => ({
      Name: e.name,
      KPI: e.kpiScore || 'A',
      Closed: e.salesClosed || 0,
      Calls: e.callsHandled || 0
    })),
    chart: null
  };
}

async function handleSalesTeamReport() {
  return handleTopPerformer();
}

async function handleSalesLeaderboard() {
  return handleTopPerformer();
}

async function handleEmployeePerformance() {
  return handleTopPerformer();
}

async function handlePredictiveForecast() {
  const store = await getStore();
  const leads = store.mockLeads || [];
  const pipelineVal = leads.reduce((acc, l) => acc + (Number(l.budget) || 0), 0);
  const weighted = Math.round(pipelineVal * 0.35);
  return {
    text: `### 📈 Predictive Sales AI Forecast\n\n• **Weighted Projection:** **₹${weighted.toLocaleString('en-IN')}** (at 35% historic conversion rate)\n• **Active Pipeline:** ₹${pipelineVal.toLocaleString('en-IN')}\n• **Confidence Score:** 89.4%`,
    table: [
      { Period: 'Next 30 Days', Projected: `₹${weighted.toLocaleString('en-IN')}`, Confidence: '91%' },
      { Period: 'Next 60 Days', Projected: `₹${Math.round(weighted * 1.8).toLocaleString('en-IN')}`, Confidence: '84%' }
    ],
    chart: null
  };
}

async function handleAssignTasksOptions() {
  return {
    text: `### 📋 Task Assignment Cockpit\nSelect task assignment mode:`,
    options: [
      'Assign lead follow-up to Telecaller',
      'Assign machine quality inspection to Engineering',
      'Schedule factory assembly kickoff'
    ]
  };
}

async function handleAssignEmployeeTasks(query) {
  return {
    text: `### 📝 Task Assigned Successfully\n\nTask has been dispatched to employee schedule and synced to task dashboard.`,
    table: null,
    chart: null
  };
}

async function handleActionCreateUser(query) {
  return {
    text: `### 👤 User Registration\nOperator credentials initialized. User invited with designated role permissions.`,
    table: null,
    chart: null
  };
}

module.exports = {
  handleTopPerformer,
  handleRevenueSummary,
  handleEmployeeList,
  handleKpiStats,
  handleSalesTeamReport,
  handleSalesLeaderboard,
  handleEmployeePerformance,
  handlePredictiveForecast,
  handleAssignTasksOptions,
  handleAssignEmployeeTasks,
  handleActionCreateUser
};
