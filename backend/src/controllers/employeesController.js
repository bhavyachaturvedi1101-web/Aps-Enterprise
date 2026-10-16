const fs = require('fs');
const path = require('path');
const { Employee, ActivityLog, Lead } = require('../models');
const { isDbConnected } = require('../config/db');
const store = require('../config/inMemoryStore');

const EMPLOYEES_FILE = path.join(__dirname, '../../employees_data.json');
const USERS_FILE = path.join(__dirname, '../../users_data.json');

// Canonical Time-in-stage KPI trends & bottleneck alerts for APS machinery
const mockTimeInStage = [
  { stage: 'Enquiry', avgHours: 4.2, targetHours: 6.0, status: 'Healthy', bottleneckRisk: 'Low' },
  { stage: 'Qualified', avgHours: 8.5, targetHours: 12.0, status: 'Healthy', bottleneckRisk: 'Low' },
  { stage: 'Booked', avgHours: 18.0, targetHours: 24.0, status: 'Moderate', bottleneckRisk: 'Medium' },
  { stage: 'Confirmed Lead', avgHours: 36.5, targetHours: 24.0, status: 'Critical Warning', bottleneckRisk: 'High' },
  { stage: 'Client (Paid)', avgHours: 6.0, targetHours: 12.0, status: 'Healthy', bottleneckRisk: 'Low' },
  { stage: 'In Production', avgHours: 48.0, targetHours: 72.0, status: 'Healthy', bottleneckRisk: 'Low' },
  { stage: 'Dispatched', avgHours: 12.0, targetHours: 24.0, status: 'Healthy', bottleneckRisk: 'Low' }
];

// Helper to load employees from disk or in-memory
function loadEmployeesFromFile() {
  try {
    if (fs.existsSync(EMPLOYEES_FILE)) {
      const raw = fs.readFileSync(EMPLOYEES_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        store.mockEmployees = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.error('[loadEmployeesFromFile warn]:', err.message);
  }
  return store.mockEmployees || [];
}

// Helper to save employees to disk
function saveEmployeesToFile(list) {
  store.mockEmployees = list;
  try {
    fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.error('[saveEmployeesToFile warn]:', err.message);
  }
}

// Helper to decorate employee with mock UI fields
const decorateEmployee = (e) => {
  const emp = e.toJSON ? e.toJSON() : e;
  const mockEmp = ((store && store.mockEmployees) || []).find(me => me.id === emp.id) || {};
  
  const tasksCompleted = emp.tasksCompleted !== undefined ? emp.tasksCompleted : (mockEmp.tasksCompleted || 0);
  const kpiScoreNum = mockEmp.kpiScoreNum !== undefined ? mockEmp.kpiScoreNum : (tasksCompleted > 0 ? 85 + (tasksCompleted % 10) : 85);
  const kpiScore = mockEmp.kpiScore || `${kpiScoreNum}%`;

  return {
    ...mockEmp,
    ...emp,
    email: emp.email || mockEmp.email || `${(emp.name || 'user').toLowerCase().replace(/\s+/g, '.')}@aps-enterprise.com`,
    phone: emp.phone || mockEmp.phone || '+91 98765 43210',
    department: emp.department || mockEmp.department || 'Sales & Operations',
    status: emp.status || mockEmp.status || 'Active',
    kpiScore,
    kpiScoreNum,
    conversionRate: mockEmp.conversionRate || '34.5%',
    avgCallDurationSec: mockEmp.avgCallDurationSec || 112,
    avgResponseTimeMin: mockEmp.avgResponseTimeMin || 4.0,
    weeklyKpiHistory: mockEmp.weeklyKpiHistory || [85, 88, 90, 93],
    stageConversions: mockEmp.stageConversions || { enquiryToQualified: 10, qualifiedToBooked: 5, bookedToConfirmed: 3, confirmedToPaid: 2 },
    activeTask: mockEmp.activeTask || emp.activeTask || null,
    taskQueue: mockEmp.taskQueue || emp.taskQueue || []
  };
};

// GET /api/employees — Aggregate performance list + team summary KPIs (A4 Module)
const getEmployees = async (req, res) => {
  try {
    let rawEmployees = [];
    if (isDbConnected()) {
      try {
        const dbEmps = await Employee.findAll();
        if (Array.isArray(dbEmps) && dbEmps.length > 0) {
          rawEmployees = dbEmps;
        }
      } catch {
        // Supabase / DB offline — fall back gracefully to file-based store
      }
    }

    if (!rawEmployees || rawEmployees.length === 0) {
      rawEmployees = loadEmployeesFromFile();
    }

    const employees = rawEmployees.map(decorateEmployee);

    const totalCalls = employees.reduce((sum, e) => sum + (e.callsHandled || 0), 0);
    const totalSales = employees.reduce((sum, e) => sum + (e.salesClosed || 0), 0);
    const totalRevenue = employees.reduce((sum, e) => sum + (e.totalRevenue || 0), 0);
    const totalTasks = employees.reduce((sum, e) => sum + (e.tasksCompleted || 0), 0);
    const avgKpi = Math.round(employees.reduce((sum, e) => sum + (Number(e.kpiScoreNum) || 90), 0) / (employees.length || 1));

    return res.json({
      success: true,
      employees,
      summary: {
        totalEmployees: employees.length,
        activeMembers: employees.filter(e => e.status === 'Active' || e.status === 'Online').length,
        totalCallsHandled: totalCalls,
        totalSalesClosed: totalSales,
        totalRevenueClosed: totalRevenue,
        totalTasksCompleted: totalTasks,
        teamAvgKpiScore: `${avgKpi}%`,
        avgCallDurationSec: 112,
        slaAdherenceRate: '94.6%'
      }
    });
  } catch (error) {
    console.error('[getEmployees fallback error]:', error);
    const fallback = loadEmployeesFromFile().map(decorateEmployee);
    return res.json({
      success: true,
      employees: fallback,
      summary: {
        totalEmployees: fallback.length,
        activeMembers: fallback.length,
        totalCallsHandled: 0,
        totalSalesClosed: 0,
        totalRevenueClosed: 0,
        totalTasksCompleted: 0,
        teamAvgKpiScore: '92%',
        avgCallDurationSec: 112,
        slaAdherenceRate: '94.6%'
      }
    });
  }
};

// GET /api/employees/:id/performance — Detailed profile per employee (A4 Module)
const getEmployeePerformance = async (req, res) => {
  try {
    const { id } = req.params;
    let empData = null;
    try {
      empData = await Employee.findByPk(id);
    } catch {}

    if (!empData) {
      const fileList = loadEmployeesFromFile();
      empData = fileList.find(e => e.id === id);
    }

    if (!empData) {
      return res.status(404).json({ error: 'Employee profile not found', code: 'EMPLOYEE_NOT_FOUND' });
    }

    const employee = decorateEmployee(empData);
    let assignedLeads = [];
    let employeeLogs = [];
    try {
      assignedLeads = await Lead.findAll({ where: { assignedEmployeeId: id } });
    } catch {
      assignedLeads = (store.mockLeads || []).filter(l => l.assignedEmployeeId === id);
    }
    try {
      employeeLogs = await ActivityLog.findAll({ where: { employeeId: id }, order: [['createdAt', 'DESC']] });
    } catch {
      employeeLogs = (store.mockActivityLogs || []).filter(l => l.employeeId === id);
    }

    const totalAssignedBudget = assignedLeads.reduce((sum, l) => sum + (parseFloat(l.budget) || 0), 0);

    return res.json({
      success: true,
      profile: employee,
      metrics: {
        assignedLeadsCount: assignedLeads.length,
        totalAssignedPipelineValue: totalAssignedBudget,
        recentActionsCount: employeeLogs.length,
        kpiScore: employee.kpiScore,
        kpiScoreNum: employee.kpiScoreNum,
        conversionRate: employee.conversionRate,
        avgResponseTimeMin: employee.avgResponseTimeMin,
        tasksCompleted: employee.tasksCompleted,
        callsHandled: employee.callsHandled,
        salesClosed: employee.salesClosed,
        totalRevenue: employee.totalRevenue || 0,
        weeklyKpiHistory: employee.weeklyKpiHistory,
        stageConversions: employee.stageConversions,
        pipelineDeals: assignedLeads.map(l => ({ 
          id: l.id, 
          name: l.name, 
          company: l.company || `${l.name} Corp`,
          phone: l.phone || 'N/A',
          stage: l.stage, 
          budget: l.budget,
          tallyPaymentVerified: l.tallyPaymentVerified || false,
          createdAt: l.createdAt
        }))
      },
      activityLogs: employeeLogs
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch employee performance' });
  }
};

// POST /api/employees — Add new team member with initial task queue
const createEmployee = async (req, res) => {
  try {
    const { name, email, phone, role, department, initialTask } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const currentList = loadEmployeesFromFile();
    const empId = `e${currentList.length + 1}`;

    const newEmp = {
      id: empId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone || '+91 98765 43210',
      role: role || 'Sales & Operations Associate',
      department: department || 'Sales & Operations',
      kpiScore: '92%',
      kpiScoreNum: 92,
      tasksCompleted: 0,
      callsHandled: 0,
      salesClosed: 0,
      totalRevenue: 0,
      status: 'Active',
      conversionRate: '34.5%',
      avgCallDurationSec: 112,
      avgResponseTimeMin: 4.0,
      weeklyKpiHistory: [85, 88, 90, 92],
      activeTask: initialTask ? {
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
      },
      taskQueue: [
        { title: `Review ${department || 'Operations'} SOP`, priority: 'Normal' }
      ]
    };

    // Try DB insert safely
    try {
      await Employee.create({
        id: empId,
        name: newEmp.name,
        email: newEmp.email,
        phone: newEmp.phone,
        role: newEmp.role,
        department: newEmp.department,
        status: newEmp.status,
        tasksCompleted: 0,
        callsHandled: 0,
        salesClosed: 0
      });
    } catch (e) {
      console.log('[DB createEmployee non-critical warn]:', e.message);
    }

    // Save to employees_data.json
    currentList.unshift(newEmp);
    saveEmployeesToFile(currentList);

    // Also sync to users_data.json so they appear in Users & Roles
    try {
      let usersList = [];
      if (fs.existsSync(USERS_FILE)) {
        usersList = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      }
      if (!usersList.some(u => u.email === newEmp.email)) {
        usersList.unshift({
          id: `u${Date.now()}`,
          name: newEmp.name,
          email: newEmp.email,
          role: newEmp.role.includes('Admin') ? 'Admin' : 'Operations',
          module: newEmp.department.includes('Voice') ? 'Voice AI' : 'Operations & CRM',
          lastLogin: 'Just now',
          status: 'Online',
          createdAt: new Date().toISOString()
        });
        fs.writeFileSync(USERS_FILE, JSON.stringify(usersList, null, 2), 'utf8');
        store.mockUsers = usersList;
      }
    } catch (err) {
      console.error('[Sync to Users error]:', err.message);
    }

    const decoratedEmp = decorateEmployee(newEmp);
    return res.status(201).json({ success: true, employee: decoratedEmp });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to create employee' });
  }
};

// POST /api/employees/:id/complete-task — Mark current task complete
const completeTask = async (req, res) => {
  try {
    const { id } = req.params;
    let completedTitle = 'General Operational Follow-up';
    let nextTask = {
      id: `task-${id}-${Date.now()+1}`,
      title: `Auto-assigned pipeline task`,
      priority: 'Normal',
      type: 'Automated Queue Assignment',
      stage: 'In Progress',
      dueIn: '45 mins',
      assignedAt: new Date()
    };

    const currentList = loadEmployeesFromFile();
    const empData = currentList.find(e => e.id === id);
    if (!empData) {
      return res.status(404).json({ error: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' });
    }

    empData.tasksCompleted = (empData.tasksCompleted || 0) + 1;
    if (empData.activeTask) {
      completedTitle = empData.activeTask.title;
    }

    if (Array.isArray(empData.taskQueue) && empData.taskQueue.length > 0) {
      const queued = empData.taskQueue.shift();
      nextTask = {
        id: `task-${id}-${Date.now()+1}`,
        title: queued.title,
        priority: queued.priority || 'Normal',
        type: queued.type || 'Automated Queue Assignment',
        stage: 'In Progress',
        dueIn: queued.dueIn || '30 mins',
        assignedAt: new Date()
      };
    }
    empData.activeTask = nextTask;
    empData.currentActivity = `Working on: ${nextTask.title}`;

    saveEmployeesToFile(currentList);

    // Try DB increment safely
    try {
      const dbEmp = await Employee.findByPk(id);
      if (dbEmp) {
        dbEmp.tasksCompleted = empData.tasksCompleted;
        await dbEmp.save();
      }
    } catch {}

    const employee = decorateEmployee(empData);
    const completedTask = { id: `task-${id}-${Date.now()}`, title: completedTitle };

    return res.json({
      success: true,
      message: `Task completed! Next task has been automatically assigned to ${employee.name}.`,
      completedTask,
      activeTask: nextTask,
      tasksCompleted: employee.tasksCompleted,
      kpiScore: employee.kpiScore,
      employee
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to complete task' });
  }
};

// POST /api/employees/:id/assign-task — Manually queue or assign a new task to an employee
const assignTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, priority, type } = req.body;

    const currentList = loadEmployeesFromFile();
    const empData = currentList.find(e => e.id === id);
    if (!empData) return res.status(404).json({ error: 'Employee not found' });

    const newTask = {
      id: `task-${id}-${Date.now()}`,
      title,
      priority: priority || 'Normal',
      type: type || 'Manual Assignment',
      dueIn: '1 hour',
      assignedAt: new Date()
    };

    empData.activeTask = newTask;
    empData.currentActivity = `Working on: ${title}`;
    saveEmployeesToFile(currentList);

    const employee = decorateEmployee(empData);
    return res.status(201).json({
      success: true,
      message: `New task assigned to ${employee.name}.`,
      employee
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to assign task' });
  }
};

// GET /api/activity — Audit log
const getActivityLogs = async (req, res) => {
  try {
    let logs = [];
    try {
      logs = await ActivityLog.findAll({ order: [['createdAt', 'DESC']], limit: 100 });
    } catch {
      logs = store.mockActivityLogs || [];
    }
    return res.json({ 
      activityLogs: logs,
      totalLogs: logs.length
    });
  } catch (error) {
    return res.json({ activityLogs: store.mockActivityLogs || [], totalLogs: 0 });
  }
};

// GET /api/activity/time-in-stage — Time-in-stage KPI trends & bottleneck alerts (A4 Module)
const getTimeInStage = async (req, res) => {
  const criticalWarnings = mockTimeInStage.filter(s => s.status === 'Critical Warning');
  return res.json({
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
  try {
    const { id } = req.params;
    try {
      const empData = await Employee.findByPk(id);
      if (empData) await empData.destroy();
    } catch {}

    const currentList = loadEmployeesFromFile();
    const target = currentList.find(e => e.id === id);
    const updatedList = currentList.filter(e => e.id !== id);
    saveEmployeesToFile(updatedList);

    // Also remove from users_data.json if matching email
    if (target && target.email) {
      try {
        if (fs.existsSync(USERS_FILE)) {
          let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
          users = users.filter(u => u.email !== target.email);
          fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
          store.mockUsers = users;
        }
      } catch {}
    }

    return res.json({
      success: true,
      message: `Team member was successfully deleted.`
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to delete employee' });
  }
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
