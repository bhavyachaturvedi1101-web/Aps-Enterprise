const { mockEmployees, mockActivityLogs, mockTimeInStage, mockLeads } = require('../config/inMemoryStore');

// GET /api/employees — Aggregate performance list + team summary KPIs (A4 Module)
const getEmployees = async (req, res) => {
  const totalCalls = mockEmployees.reduce((sum, e) => sum + (e.callsHandled || 0), 0);
  const totalSales = mockEmployees.reduce((sum, e) => sum + (e.salesClosed || 0), 0);
  const totalRevenue = mockEmployees.reduce((sum, e) => sum + (e.totalRevenue || 0), 0);
  const totalTasks = mockEmployees.reduce((sum, e) => sum + (e.tasksCompleted || 0), 0);
  const avgKpi = Math.round(mockEmployees.reduce((sum, e) => sum + (e.kpiScoreNum || 90), 0) / (mockEmployees.length || 1));

  res.json({
    employees: mockEmployees,
    summary: {
      totalEmployees: mockEmployees.length,
      activeMembers: mockEmployees.filter(e => e.status === 'Active').length,
      totalCallsHandled: totalCalls,
      totalSalesClosed: totalSales,
      totalRevenueClosed: totalRevenue,
      totalTasksCompleted: totalTasks,
      teamAvgKpiScore: `${avgKpi}%`,
      avgCallDurationSec: 112,
      slaAdherenceRate: '94.6%'
    }
  });
};

// GET /api/employees/:id/performance — Detailed profile per employee (A4 Module)
const getEmployeePerformance = async (req, res) => {
  const { id } = req.params;
  const employee = mockEmployees.find(e => e.id === id);
  if (!employee) return res.status(404).json({ error: 'Employee profile not found', code: 'EMPLOYEE_NOT_FOUND' });

  const assignedLeads = mockLeads.filter(l => l.assignedEmployeeId === id);
  const employeeLogs = mockActivityLogs.filter(a => a.employeeId === id);

  const totalAssignedBudget = assignedLeads.reduce((sum, l) => sum + (parseFloat(l.budget) || 0), 0);

  res.json({
    profile: employee,
    metrics: {
      assignedLeadsCount: assignedLeads.length,
      totalAssignedPipelineValue: totalAssignedBudget,
      recentActionsCount: employeeLogs.length,
      kpiScore: employee.kpiScore,
      kpiScoreNum: employee.kpiScoreNum,
      conversionRate: employee.conversionRate || '34.5%',
      avgResponseTimeMin: employee.avgResponseTimeMin || 4.0,
      tasksCompleted: employee.tasksCompleted,
      callsHandled: employee.callsHandled,
      salesClosed: employee.salesClosed,
      totalRevenue: employee.totalRevenue,
      weeklyKpiHistory: employee.weeklyKpiHistory || [85, 88, 90, 93],
      stageConversions: employee.stageConversions || {},
      pipelineDeals: assignedLeads.map(l => ({ 
        id: l.id, 
        name: l.name, 
        company: l.company,
        phone: l.phone,
        stage: l.stage, 
        budget: l.budget,
        tallyPaymentVerified: l.tallyPaymentVerified,
        createdAt: l.createdAt
      }))
    },
    activityLogs: employeeLogs
  });
};

// POST /api/employees — Add new team member
const createEmployee = async (req, res) => {
  const { name, email, phone, role, department } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const newEmp = {
    id: `e${mockEmployees.length + 1}`,
    name,
    email,
    phone: phone || '+91 98000 00000',
    role: role || 'Sales & Operations Associate',
    department: department || 'Sales & Operations',
    kpiScore: '85%',
    kpiScoreNum: 85,
    status: 'Active',
    tasksCompleted: 0,
    callsHandled: 0,
    salesClosed: 0,
    totalRevenue: 0,
    targetSales: 5,
    conversionRate: '0%',
    avgCallDurationSec: 0,
    avgResponseTimeMin: 5.0,
    weeklyKpiHistory: [80, 82, 84, 85],
    stageConversions: { enquiryToQualified: 0, qualifiedToBooked: 0, bookedToConfirmed: 0, confirmedToPaid: 0 }
  };

  mockEmployees.push(newEmp);
  mockActivityLogs.unshift({
    id: `log-${Date.now()}`,
    employeeId: req.user?.id || 'e2',
    employeeName: req.user?.name || 'Admin',
    action: `Added new team member ${newEmp.name} (${newEmp.role})`,
    fromStage: 'None',
    toStage: 'None',
    details: 'Team member provisioned in Performance Registry',
    createdAt: new Date()
  });

  res.status(201).json({ success: true, employee: newEmp });
};

// GET /api/activity — Audit log
const getActivityLogs = async (req, res) => {
  res.json({ 
    activityLogs: mockActivityLogs,
    totalLogs: mockActivityLogs.length
  });
};

// GET /api/activity/time-in-stage — Time-in-stage KPI trends & bottleneck alerts
const getTimeInStage = async (req, res) => {
  const criticalWarnings = mockTimeInStage.filter(s => s.status === 'Critical Warning');
  res.json({
    timeInStage: mockTimeInStage,
    summary: {
      totalStagesMonitored: mockTimeInStage.length,
      bottleneckCount: criticalWarnings.length,
      criticalStage: 'Confirmed Lead',
      primaryBottleneckReason: 'Confirmed leads waiting for 10% Tally advance before factory release',
      recommendation: 'Trigger automated WhatsApp payment reminder sequences for deals > 24h in Confirmed Lead.'
    }
  });
};

// DELETE /api/employees/:id — Remove/Delete employee member
const deleteEmployee = async (req, res) => {
  const { id } = req.params;
  const index = mockEmployees.findIndex(e => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' });
  }

  const deletedEmp = mockEmployees.splice(index, 1)[0];

  mockActivityLogs.unshift({
    id: `log-${Date.now()}`,
    employeeId: req.user?.id || 'e2',
    employeeName: req.user?.name || 'Admin',
    action: `Removed team member ${deletedEmp.name} (${deletedEmp.role})`,
    fromStage: 'None',
    toStage: 'None',
    details: `Employee ${deletedEmp.id} removed from Performance registry`,
    createdAt: new Date()
  });


  res.json({
    success: true,
    message: `Team member "${deletedEmp.name}" was successfully deleted.`,
    deletedEmployee: deletedEmp
  });
};

module.exports = {
  getEmployees,
  getEmployeePerformance,
  createEmployee,
  deleteEmployee,
  getActivityLogs,
  getTimeInStage
};


