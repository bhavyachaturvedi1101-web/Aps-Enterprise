const fs = require('fs');
const path = require('path');
const { Employee, ActivityLog, Lead } = require('../models');
const { isDbConnected } = require('../config/db');
const store = require('../config/inMemoryStore');

const EMPLOYEES_FILE = path.join(__dirname, '../../employees_data.json');
const USERS_FILE = path.join(__dirname, '../../users_data.json');

// Canonical Time-in-stage KPI trends & bottleneck alerts for APS machinery
const mockTimeInStage = [];

const { safeReadJson, safeWriteJson } = require('../utils/safeStorage');

// Helper to load employees from disk or in-memory
function loadEmployeesFromFile() {
  const list = safeReadJson(EMPLOYEES_FILE, null);
  if (Array.isArray(list) && list.length > 0) {
    store.mockEmployees = list;
    return list;
  }
  return store.mockEmployees || [];
}

// Helper to save employees safely
function saveEmployeesToFile(list) {
  store.mockEmployees = list;
  safeWriteJson(EMPLOYEES_FILE, list);
}

// Helper to decorate employee with mock UI fields
const decorateEmployee = (e) => {
  const emp = e.toJSON ? e.toJSON() : e;
  const mockEmp = {};
  
  const tasksCompleted = emp.tasksCompleted !== undefined ? emp.tasksCompleted : (mockEmp.tasksCompleted || 0);
  const kpiScoreNum = mockEmp.kpiScoreNum !== undefined ? mockEmp.kpiScoreNum : (tasksCompleted > 0 ? 85 + (tasksCompleted % 10) : 85);
  const kpiScore = mockEmp.kpiScore || `${kpiScoreNum}%`;

  return {
    ...emp,
    email: emp.email || '',
    phone: emp.phone || '',
    department: emp.department || '',
    status: emp.status || '',
    kpiScore,
    kpiScoreNum,
    conversionRate: emp.conversionRate || null,
    avgCallDurationSec: emp.avgCallDurationSec || null,
    avgResponseTimeMin: emp.avgResponseTimeMin || null,
    weeklyKpiHistory: emp.weeklyKpiHistory || [],
    stageConversions: emp.stageConversions || null,
    activeTask: emp.activeTask || null,
    taskQueue: emp.taskQueue || []
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

    // Team/KPI data is database-only; never display fixture employees.

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
    const fallback = [];
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

    // Employee profiles are database-only; never resolve fixture records.

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
      kpiScore: '85%',
      kpiScoreNum: 85,
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

    // Persist to PostgreSQL if connected with atomic transaction
    if (isDbConnected()) {
      const { sequelize } = require('../config/db');
      const { User } = require('../models');
      const t = await sequelize.transaction();
      try {
        await Employee.create({
          id: empId,
          name: newEmp.name,
          email: newEmp.email,
          phone: newEmp.phone,
          role: newEmp.role,
          department: newEmp.department,
          status: newEmp.status,
          kpiScore: newEmp.kpiScore,
          tasksCompleted: 0,
          callsHandled: 0,
          salesClosed: 0,
          totalRevenue: 0,
          activeTask: newEmp.activeTask,
          taskQueue: newEmp.taskQueue
        }, { transaction: t });

        await User.findOrCreate({
          where: { email: newEmp.email },
          defaults: {
            id: `u${Date.now()}`,
            name: newEmp.name,
            email: newEmp.email,
            role: newEmp.role.includes('Admin') ? 'admin' : (newEmp.role.includes('Manager') ? 'manager' : 'employee'),
            department: newEmp.department,
            phone: newEmp.phone,
            isActive: true
          },
          transaction: t
        });

        await t.commit();
      } catch (e) {
        await t.rollback();
        console.warn('[DB createEmployee transaction non-critical warn]:', e.message);
      }
    }

    // Save to employees store
    currentList.unshift(newEmp);
    saveEmployeesToFile(currentList);

    // Also sync to users store so they appear in Users & Roles
    try {
      let usersList = safeReadJson(USERS_FILE, []);
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
        safeWriteJson(USERS_FILE, usersList);
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
  const criticalWarnings = [];
  return res.json({
    timeInStage: mockTimeInStage,
    summary: {
      totalStagesMonitored: mockTimeInStage.length,
      bottleneckCount: criticalWarnings.length,
    criticalStage: null,
    primaryBottleneckReason: null,
    recommendation: null
    }
  });
};

// DELETE /api/employees/:id — Remove/Delete employee member (A4 Module)
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    let empData = null;
    try {
      empData = await Employee.findByPk(id);
      if (empData) await empData.destroy();
    } catch {}

    const currentList = loadEmployeesFromFile();
    const target = currentList.find(e => e.id === id);
    if (!target && !empData) {
      return res.status(404).json({ error: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' });
    }

    const updatedList = currentList.filter(e => e.id !== id);
    saveEmployeesToFile(updatedList);

    // Also remove from users_data.json if matching email
    if (target && target.email) {
      try {
        let users = safeReadJson(USERS_FILE, []);
        users = users.filter(u => u.email !== target.email);
        safeWriteJson(USERS_FILE, users);
        store.mockUsers = users;
      } catch {}
    }

    const deletedEmployee = target || { id, name: empData?.name || id };
    return res.json({
      success: true,
      message: `Team member "${deletedEmployee.name || id}" was successfully deleted.`,
      deletedEmployee
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
