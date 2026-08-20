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

// POST /api/employees — Add new team member with initial task queue
const createEmployee = async (req, res) => {
  const { name, email, phone, role, department, initialTask } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const empId = `e${mockEmployees.length + 1}`;
  const assignedTask = initialTask ? {
    id: `task-${empId}-1`,
    title: initialTask,
    priority: 'High',
    type: 'Operational Task',
    stage: 'In Progress',
    dueIn: '45 mins',
    assignedAt: new Date()
  } : {
    id: `task-${empId}-1`,
    title: `Onboarding & initial pipeline sync for ${name}`,
    priority: 'Normal',
    type: 'System Onboarding',
    stage: 'Onboarding',
    dueIn: '1 hour',
    assignedAt: new Date()
  };

  const newEmp = {
    id: empId,
    name,
    email,
    phone: phone || '+91 98000 00000',
    role: role || 'Sales & Operations Associate',
    department: department || 'Sales & Operations',
    kpiScore: '88%',
    kpiScoreNum: 88,
    status: 'Active',
    currentActivity: `Working on task: ${assignedTask.title}`,
    tasksCompleted: 0,
    callsHandled: 0,
    salesClosed: 0,
    totalRevenue: 0,
    targetSales: 5,
    conversionRate: '0%',
    avgCallDurationSec: 0,
    avgResponseTimeMin: 4.5,
    weeklyKpiHistory: [80, 83, 85, 88],
    stageConversions: { enquiryToQualified: 0, qualifiedToBooked: 0, bookedToConfirmed: 0, confirmedToPaid: 0 },
    activeTask: assignedTask,
    taskQueue: [
      {
        id: `task-${empId}-2`,
        title: `Review assigned CRM leads and initiate customer engagement`,
        priority: 'Normal',
        type: 'Pipeline Review',
        stage: 'Enquiry'
      }
    ]
  };

  mockEmployees.push(newEmp);
  mockActivityLogs.unshift({
    id: `log-${Date.now()}`,
    employeeId: newEmp.id,
    employeeName: newEmp.name,
    action: `Added new team member ${newEmp.name} (${newEmp.role})`,
    fromStage: 'None',
    toStage: 'None',
    details: `Assigned initial task: "${assignedTask.title}"`,
    createdAt: new Date()
  });

  res.status(201).json({ success: true, employee: newEmp });
};

// POST /api/employees/:id/complete-task — Mark current task complete & auto-assign next task from queue
const completeTask = async (req, res) => {
  const { id } = req.params;
  const employee = mockEmployees.find(e => e.id === id);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' });
  }

  const completedTask = employee.activeTask || {
    id: `task-${id}-${Date.now()}`,
    title: 'General Operational Follow-up'
  };

  // 1. Increment completed tasks counter
  employee.tasksCompleted = (employee.tasksCompleted || 0) + 1;

  // 2. Dynamically update KPI score
  if (!employee.kpiScoreNum) employee.kpiScoreNum = 90;
  employee.kpiScoreNum = Math.min(99, employee.kpiScoreNum + 1);
  employee.kpiScore = `${employee.kpiScoreNum}%`;

  // 3. Auto-assign Next Task from Queue (or generate contextual next pipeline task)
  let nextTask = null;
  if (employee.taskQueue && employee.taskQueue.length > 0) {
    nextTask = employee.taskQueue.shift();
    nextTask.assignedAt = new Date();
    nextTask.dueIn = nextTask.dueIn || '30 mins';
  } else {
    // Generate intelligent dynamic task linked to real pipeline leads
    const sampleLeads = mockLeads || [];
    const randomLead = sampleLeads[Math.floor(Math.random() * sampleLeads.length)] || { id: 'LEAD-001', name: 'Acme Machinery' };
    nextTask = {
      id: `task-${id}-${Date.now()}`,
      title: `Follow up on machine requirement & invoice milestone for ${randomLead.name} (${randomLead.id})`,
      leadId: randomLead.id,
      leadName: randomLead.name,
      priority: 'Normal',
      type: 'Automated Queue Assignment',
      stage: randomLead.stage || 'In Progress',
      dueIn: '45 mins',
      assignedAt: new Date()
    };
  }

  employee.activeTask = nextTask;
  employee.currentActivity = `Working on task: ${nextTask.title}`;

  // 4. Record to central A2 Activity Audit Log
  const logEntry = {
    id: `log-${Date.now()}`,
    employeeId: employee.id,
    employeeName: employee.name,
    action: `Completed Task: "${completedTask.title}"`,
    fromStage: completedTask.stage || 'In Progress',
    toStage: 'Task Completed',
    details: `Task completed successfully. Next task auto-assigned: "${nextTask.title}"`,
    createdAt: new Date()
  };
  mockActivityLogs.unshift(logEntry);

  res.json({
    success: true,
    message: `Task completed! Next task has been automatically assigned to ${employee.name}.`,
    completedTask,
    activeTask: nextTask,
    tasksCompleted: employee.tasksCompleted,
    kpiScore: employee.kpiScore,
    employee,
    log: logEntry
  });
};

// POST /api/employees/:id/assign-task — Manually queue or assign a new task to an employee
const assignTask = async (req, res) => {
  const { id } = req.params;
  const { title, leadId, leadName, priority, type } = req.body;
  const employee = mockEmployees.find(e => e.id === id);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' });
  }

  if (!title) {
    return res.status(400).json({ error: 'Task title is required.' });
  }

  const newTask = {
    id: `task-${id}-${Date.now()}`,
    title,
    leadId: leadId || null,
    leadName: leadName || null,
    priority: priority || 'Normal',
    type: type || 'Manual Assignment',
    dueIn: '1 hour',
    assignedAt: new Date()
  };

  if (!employee.activeTask) {
    employee.activeTask = newTask;
    employee.currentActivity = `Working on task: ${newTask.title}`;
  } else {
    if (!employee.taskQueue) employee.taskQueue = [];
    employee.taskQueue.push(newTask);
  }

  mockActivityLogs.unshift({
    id: `log-${Date.now()}`,
    employeeId: employee.id,
    employeeName: employee.name,
    action: `Assigned new task to ${employee.name}: "${newTask.title}"`,
    details: `Task priority: ${newTask.priority}`,
    createdAt: new Date()
  });

  res.status(201).json({
    success: true,
    message: `New task assigned to ${employee.name}.`,
    employee
  });
};

// GET /api/activity — Audit log
const getActivityLogs = async (req, res) => {
  res.json({ 
    activityLogs: mockActivityLogs,
    totalLogs: mockActivityLogs.length
  });
};

// GET /api/activity/time-in-stage — Time-in-stage KPI trends & bottleneck alerts (A4 Module)
const getTimeInStage = async (req, res) => {
  const criticalWarnings = mockTimeInStage.filter(s => s.status === 'Critical Warning');
  res.json({
    timeInStage: mockTimeInStage,
    summary: {
      totalStagesMonitored: mockTimeInStage.length,
      bottleneckCount: criticalWarnings.length,
      criticalStage: 'Confirmed Lead',
      primaryBottleneckReason: 'Confirmed leads waiting for 10% Tally advance before factory release',
      recommendation: 'Trigger automated A5 WhatsApp payment reminder sequences for deals > 24h in Confirmed Lead.'
    }
  });
};

// DELETE /api/employees/:id — Remove/Delete employee member (A4 Module)
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
    details: `Employee ${deletedEmp.id} removed from A4 Performance registry`,
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
  completeTask,
  assignTask,
  deleteEmployee,
  getActivityLogs,
  getTimeInStage
};



