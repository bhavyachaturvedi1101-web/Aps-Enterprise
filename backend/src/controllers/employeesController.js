const MOCK_EMPLOYEES = [
  { id: 'e1', name: 'Animesh', role: 'A1 Voice Agent Architect', tasksCompleted: 14, callsHandled: 124, salesClosed: 8 },
  { id: 'e2', name: 'Bhavya', role: 'A2 Core Developer', tasksCompleted: 18, callsHandled: 0, salesClosed: 12 },
  { id: 'e3', name: 'Aaditya', role: 'A4/A5 Specialist', tasksCompleted: 11, callsHandled: 15, salesClosed: 5 }
];

const MOCK_ACTIVITY_LOGS = [
  { id: 'log1', employeeId: 'e2', leadId: '4', action: 'Lead status transitioned from "Booked" to "Confirmed Lead"', fromStage: 'Booked', toStage: 'Confirmed Lead', createdAt: new Date(Date.now() - 1800000) },
  { id: 'log2', employeeId: 'e1', leadId: '2', action: 'Lead status transitioned from "Enquiry" to "Qualified"', fromStage: 'Enquiry', toStage: 'Qualified', createdAt: new Date(Date.now() - 3600000) },
  { id: 'log3', employeeId: 'e3', leadId: '5', action: 'Lead status transitioned from "Confirmed Lead" to "Client (Paid)"', fromStage: 'Confirmed Lead', toStage: 'Client (Paid)', createdAt: new Date(Date.now() - 7200000) }
];

// ─────────────────────────────────────────────────
// GET /api/employees — A4 Module: employee metrics
// ─────────────────────────────────────────────────
const getEmployees = async (req, res) => {
  const employees = MOCK_EMPLOYEES.map(emp => ({
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
  res.json({ logs: MOCK_ACTIVITY_LOGS });
};

module.exports = {
  getEmployees,
  getActivityLogs
};
