const { mockEmployees, mockActivityLogs, mockTimeInStage, mockLeads } = require('../config/inMemoryStore');

// GET /api/employees — Aggregate performance list
const getEmployees = async (req, res) => {
  res.json({ employees: mockEmployees });
};

// GET /api/employees/:id/performance — Detailed profile per employee (A4 Module)
const getEmployeePerformance = async (req, res) => {
  const { id } = req.params;
  const employee = mockEmployees.find(e => e.id === id);
  if (!employee) return res.status(404).json({ error: 'Employee profile not found' });

  const assignedLeads = mockLeads.filter(l => l.assignedEmployeeId === id);
  const employeeLogs = mockActivityLogs.filter(a => a.employeeId === id);

  res.json({
    profile: employee,
    metrics: {
      assignedLeadsCount: assignedLeads.length,
      recentActionsCount: employeeLogs.length,
      pipelineDeals: assignedLeads.map(l => ({ id: l.id, name: l.name, stage: l.stage, budget: l.budget }))
    },
    activityLogs: employeeLogs
  });
};

// GET /api/activity — Audit log
const getActivityLogs = async (req, res) => {
  res.json({ activityLogs: mockActivityLogs });
};

// GET /api/activity/time-in-stage — Time-in-stage KPI trends (A4 Module)
const getTimeInStage = async (req, res) => {
  res.json({
    timeInStage: mockTimeInStage
  });
};

module.exports = {
  getEmployees,
  getEmployeePerformance,
  getActivityLogs,
  getTimeInStage
};
