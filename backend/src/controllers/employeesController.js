const fs = require('fs');
const path = require('path');
const { Employee, ActivityLog, Lead, User } = require('../models');
const { isDbConnected, sequelize } = require('../config/db');
const { withDb, isStrictDbMode, DatabaseUnavailableError } = require('../utils/dbPolicy');
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
  const emp = e && e.toJSON ? e.toJSON() : (e || {});
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
const getEmployees = async (req, res, next) => {
  try {
    const employees = await withDb(
      async () => {
        const dbEmps = await Employee.findAll({ order: [['createdAt', 'ASC']] });
        return (dbEmps || []).map(decorateEmployee);
      },
      () => {
        return loadEmployeesFromFile().map(decorateEmployee);
      }
    );

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
    next(error);
  }
};

// GET /api/employees/:id/performance — Detailed profile per employee (A4 Module)
const getEmployeePerformance = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await withDb(
      async () => {
        const empRecord = await Employee.findByPk(id);
        if (!empRecord) return null;

        const assignedLeads = await Lead.findAll({ where: { assignedEmployeeId: id } });
        const employeeLogs = await ActivityLog.findAll({
          where: { employeeId: id },
          order: [['createdAt', 'DESC']]
        });

        return {
          employee: decorateEmployee(empRecord),
          assignedLeads,
          employeeLogs
        };
      },
      () => {
        const fileList = loadEmployeesFromFile();
        const empData = fileList.find(e => e.id === id);
        if (!empData) return null;

        const assignedLeads = (store.mockLeads || []).filter(l => l.assignedEmployeeId === id);
        const employeeLogs = (store.mockActivityLogs || []).filter(l => l.employeeId === id);

        return {
          employee: decorateEmployee(empData),
          assignedLeads,
          employeeLogs
        };
      }
    );

    if (!data) {
      return res.status(404).json({ error: 'Employee profile not found', code: 'EMPLOYEE_NOT_FOUND' });
    }

    const { employee, assignedLeads, employeeLogs } = data;
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
        tasksCompleted: employee.tasksCompleted || 0,
        callsHandled: employee.callsHandled || 0,
        salesClosed: employee.salesClosed || 0,
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
    next(error);
  }
};

// POST /api/employees — Add new team member with initial task queue
const createEmployee = async (req, res, next) => {
  try {
    const { name, email, phone, role, department, initialTask } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    const created = await withDb(
      async () => {
        const count = await Employee.count();
        const empId = `e${count + 1}`;

        const activeTask = initialTask ? {
          id: `task-${empId}-1`,
          title: initialTask,
          priority: 'High',
          type: 'Operational Task',
          stage: 'In Progress',
          dueIn: '45 mins',
          assignedAt: new Date()
        } : {
          id: `task-${empId}-1`,
          title: `Onboarding & initial pipeline sync for ${cleanName}`,
          priority: 'Normal',
          type: 'System Onboarding',
          stage: 'Onboarding',
          dueIn: '1 hour',
          assignedAt: new Date()
        };

        const taskQueue = [
          { title: `Review ${department || 'Operations'} SOP`, priority: 'Normal' }
        ];

        const t = await sequelize.transaction();
        try {
          const emp = await Employee.create({
            id: empId,
            name: cleanName,
            email: cleanEmail,
            phone: phone || '+91 98765 43210',
            role: role || 'Sales & Operations Associate',
            department: department || 'Sales & Operations',
            status: 'Active',
            kpiScore: '85%',
            tasksCompleted: 0,
            callsHandled: 0,
            salesClosed: 0,
            totalRevenue: 0,
            activeTask,
            taskQueue
          }, { transaction: t });

          await User.findOrCreate({
            where: { email: cleanEmail },
            defaults: {
              id: `u${Date.now()}`,
              name: cleanName,
              email: cleanEmail,
              role: (role || '').includes('Admin') ? 'admin' : ((role || '').includes('Manager') ? 'manager' : 'employee'),
              department: department || 'Sales & Operations',
              phone: phone || '+91 98765 43210',
              isActive: true
            },
            transaction: t
          });

          await t.commit();
          return decorateEmployee(emp);
        } catch (dbErr) {
          await t.rollback();
          throw dbErr;
        }
      },
      () => {
        const currentList = loadEmployeesFromFile();
        const empId = `e${currentList.length + 1}`;

        const newEmp = {
          id: empId,
          name: cleanName,
          email: cleanEmail,
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
            title: `Onboarding & initial pipeline sync for ${cleanName}`,
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

        currentList.unshift(newEmp);
        saveEmployeesToFile(currentList);

        try {
          let usersList = safeReadJson(USERS_FILE, []);
          if (!usersList.some(u => u.email === cleanEmail)) {
            usersList.unshift({
              id: `u${Date.now()}`,
              name: cleanName,
              email: cleanEmail,
              role: (newEmp.role || '').includes('Admin') ? 'Admin' : 'Operations',
              module: (newEmp.department || '').includes('Voice') ? 'Voice AI' : 'Operations & CRM',
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

        return decorateEmployee(newEmp);
      }
    );

    return res.status(201).json({ success: true, employee: created });
  } catch (error) {
    next(error);
  }
};

// POST /api/employees/:id/complete-task — Mark current task complete
const completeTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await withDb(
      async () => {
        const emp = await Employee.findByPk(id);
        if (!emp) return { notFound: true };

        const tasksCompleted = (emp.tasksCompleted || 0) + 1;
        let completedTitle = emp.activeTask?.title || 'General Operational Follow-up';
        let queue = Array.isArray(emp.taskQueue) ? [...emp.taskQueue] : [];
        let nextTask = {
          id: `task-${id}-${Date.now() + 1}`,
          title: 'Auto-assigned pipeline task',
          priority: 'Normal',
          type: 'Automated Queue Assignment',
          stage: 'In Progress',
          dueIn: '45 mins',
          assignedAt: new Date()
        };

        if (queue.length > 0) {
          const queued = queue.shift();
          nextTask = {
            id: `task-${id}-${Date.now() + 1}`,
            title: queued.title,
            priority: queued.priority || 'Normal',
            type: queued.type || 'Automated Queue Assignment',
            stage: 'In Progress',
            dueIn: queued.dueIn || '30 mins',
            assignedAt: new Date()
          };
        }

        await emp.update({
          tasksCompleted,
          activeTask: nextTask,
          taskQueue: queue
        });

        const decorated = decorateEmployee(emp);
        return {
          employee: decorated,
          completedTask: { id: `task-${id}-${Date.now()}`, title: completedTitle },
          nextTask,
          tasksCompleted,
          kpiScore: decorated.kpiScore
        };
      },
      () => {
        const currentList = loadEmployeesFromFile();
        const empData = currentList.find(e => e.id === id);
        if (!empData) return { notFound: true };

        let completedTitle = 'General Operational Follow-up';
        let nextTask = {
          id: `task-${id}-${Date.now() + 1}`,
          title: `Auto-assigned pipeline task`,
          priority: 'Normal',
          type: 'Automated Queue Assignment',
          stage: 'In Progress',
          dueIn: '45 mins',
          assignedAt: new Date()
        };

        empData.tasksCompleted = (empData.tasksCompleted || 0) + 1;
        if (empData.activeTask) {
          completedTitle = empData.activeTask.title;
        }

        if (Array.isArray(empData.taskQueue) && empData.taskQueue.length > 0) {
          const queued = empData.taskQueue.shift();
          nextTask = {
            id: `task-${id}-${Date.now() + 1}`,
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
        const decorated = decorateEmployee(empData);

        return {
          employee: decorated,
          completedTask: { id: `task-${id}-${Date.now()}`, title: completedTitle },
          nextTask,
          tasksCompleted: decorated.tasksCompleted,
          kpiScore: decorated.kpiScore
        };
      }
    );

    if (result.notFound) {
      return res.status(404).json({ error: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' });
    }

    return res.json({
      success: true,
      message: `Task completed! Next task has been automatically assigned to ${result.employee.name}.`,
      completedTask: result.completedTask,
      activeTask: result.nextTask,
      tasksCompleted: result.tasksCompleted,
      kpiScore: result.kpiScore,
      employee: result.employee
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/employees/:id/assign-task — Manually queue or assign a new task to an employee
const assignTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, priority, type } = req.body;

    const newTask = {
      id: `task-${id}-${Date.now()}`,
      title,
      priority: priority || 'Normal',
      type: type || 'Manual Assignment',
      dueIn: '1 hour',
      assignedAt: new Date()
    };

    const result = await withDb(
      async () => {
        const emp = await Employee.findByPk(id);
        if (!emp) return { notFound: true };

        await emp.update({
          activeTask: newTask
        });

        return { employee: decorateEmployee(emp) };
      },
      () => {
        const currentList = loadEmployeesFromFile();
        const empData = currentList.find(e => e.id === id);
        if (!empData) return { notFound: true };

        empData.activeTask = newTask;
        empData.currentActivity = `Working on: ${title}`;
        saveEmployeesToFile(currentList);

        return { employee: decorateEmployee(empData) };
      }
    );

    if (result.notFound) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    return res.status(201).json({
      success: true,
      message: `New task assigned to ${result.employee.name}.`,
      employee: result.employee
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/activity — Audit log
const getActivityLogs = async (req, res, next) => {
  try {
    const logs = await withDb(
      async () => {
        return await ActivityLog.findAll({ order: [['createdAt', 'DESC']], limit: 100 });
      },
      () => {
        return store.mockActivityLogs || [];
      }
    );

    return res.json({ 
      activityLogs: logs,
      totalLogs: logs.length
    });
  } catch (error) {
    next(error);
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
const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await withDb(
      async () => {
        const emp = await Employee.findByPk(id);
        if (!emp) return { notFound: true };

        const deletedName = emp.name;
        await emp.destroy();
        return { deletedEmployee: { id, name: deletedName } };
      },
      () => {
        const currentList = loadEmployeesFromFile();
        const target = currentList.find(e => e.id === id);
        if (!target) return { notFound: true };

        const updatedList = currentList.filter(e => e.id !== id);
        saveEmployeesToFile(updatedList);

        if (target && target.email) {
          try {
            let users = safeReadJson(USERS_FILE, []);
            users = users.filter(u => u.email !== target.email);
            safeWriteJson(USERS_FILE, users);
            store.mockUsers = users;
          } catch {}
        }

        return { deletedEmployee: target };
      }
    );

    if (result.notFound) {
      return res.status(404).json({ error: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' });
    }

    return res.json({
      success: true,
      message: `Team member "${result.deletedEmployee.name || id}" was successfully deleted.`,
      deletedEmployee: result.deletedEmployee
    });
  } catch (error) {
    next(error);
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
