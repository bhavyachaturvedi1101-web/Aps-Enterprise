const { sequelize } = require('../src/config/db');
const { mockLeads, mockEmployees, mockActivityLogs } = require('../src/config/inMemoryStore');
const { Employee, Lead, ActivityLog, Booking, Payment } = require('../src/models');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Syncing models...');
    await sequelize.sync({ force: true }); // Drop all tables and recreate them

    console.log('Seeding employees...');
    const employeesToInsert = mockEmployees.map(e => ({
      id: e.id,
      name: e.name,
      role: e.role,
      email: e.email,
      department: e.department,
      status: e.status || 'Active'
    }));
    await Employee.bulkCreate(employeesToInsert, { ignoreDuplicates: true });

    console.log('Seeding leads...');
    // We must ensure the assignedEmployeeId actually exists, but since we just seeded employees, it should.
    const leadsToInsert = mockLeads.map(l => ({
      id: l.id,
      name: l.name,
      interest: l.interest,
      budget: l.budget,
      stage: l.stage,
      assignedEmployeeId: l.assignedEmployeeId || 'e1',
      createdAt: l.createdAt || new Date()
    }));
    await Lead.bulkCreate(leadsToInsert, { ignoreDuplicates: true });

    console.log('Seeding activity logs...');
    const validEmpIds = new Set(employeesToInsert.map(e => e.id));
    const validLeadIds = new Set(leadsToInsert.map(l => l.id));
    
    const logsToInsert = mockActivityLogs
      .filter(a => validLeadIds.has(a.leadId)) // ensure lead exists
      .map(a => ({
        id: a.id,
        leadId: a.leadId,
        employeeId: validEmpIds.has(a.employeeId) ? a.employeeId : 'e1',
        action: a.action,
        fromStage: a.fromStage || null,
        toStage: a.toStage || null,
        createdAt: a.createdAt || new Date()
      }));
    await ActivityLog.bulkCreate(logsToInsert, { ignoreDuplicates: true });

    console.log('Database seeded successfully with 350+ leads!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
