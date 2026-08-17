const { mockEmployees, mockActivityLogs } = require('../config/inMemoryStore');

// ─────────────────────────────────────────────────
// GET /api/employees — A4 Module: employee metrics
// ─────────────────────────────────────────────────
const getEmployees = async (req, res) => {
  const employees = mockEmployees.map(emp => ({
    ...emp,
    kpiScore: `${Math.min(100, Math.round(
      (emp.tasksCompleted * 3 + emp.salesClosed * 5 + emp.callsHandled * 0.1) / 1.2
    ))}%`
  }));
  res.json({ employees });
};

// ─────────────────────────────────────────────────
// GET /api/activity — Audit log list
// ─────────────────────────────────────────────────
const getActivityLogs = async (req, res) => {
  res.json({ logs: mockActivityLogs });
};

module.exports = {
  getEmployees,
  getActivityLogs
};

