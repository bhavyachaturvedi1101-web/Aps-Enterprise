const { sequelize } = require('../src/config/db');
const inMemoryStore = require('../src/config/inMemoryStore');
const { Employee, Lead, ActivityLog, Booking, Payment, Inventory, Invoice, User } = require('../src/models');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Synchronizing tables safely...');
    await sequelize.sync(); // Create tables if not existing, preserves data

    console.log('Seeding employees...');
    const employeesToInsert = (inMemoryStore.mockEmployees || []).map(e => ({
      id: e.id,
      name: e.name,
      role: e.role,
      email: e.email,
      department: e.department,
      status: e.status || 'Active'
    }));
    if (employeesToInsert.length > 0) {
      await Employee.bulkCreate(employeesToInsert, { ignoreDuplicates: true });
    }

    console.log('Seeding users & operators...');
    const usersToInsert = [
      { id: 'USR-001', name: 'Super Admin', email: 'admin@apsenterprises.in', role: 'admin', title: 'System Administrator' },
      { id: 'USR-002', name: 'Operations Manager', email: 'manager@apsenterprises.in', role: 'manager', title: 'Operations Lead' },
      { id: 'USR-003', name: 'Accounts Officer', email: 'accounts@apsenterprises.in', role: 'accountant', title: 'Senior Accountant' },
      { id: 'USR-004', name: 'Sales Telecaller', email: 'telecaller@apsenterprises.in', role: 'employee', title: 'Equipment Sales' }
    ];
    await User.bulkCreate(usersToInsert, { ignoreDuplicates: true });

    console.log('Seeding inventory machinery...');
    const inventoryToInsert = (inMemoryStore.mockInventory || []).map(i => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      category: i.category || 'Machinery',
      totalStock: Number(i.totalStock || i.stockUnits || 0),
      bookedStock: Number(i.bookedStock || 0),
      minStockThreshold: Number(i.minStockThreshold || 3),
      unitPrice: Number(i.unitPrice || 0),
      status: (i.totalStock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK'),
      location: i.location || i.warehouse || 'Main Warehouse - Plant 1'
    }));
    if (inventoryToInsert.length > 0) {
      await Inventory.bulkCreate(inventoryToInsert, { ignoreDuplicates: true });
    }

    console.log('Seeding leads...');
    const leadsToInsert = (inMemoryStore.mockLeads || []).map(l => ({
      id: l.id,
      name: l.name,
      interest: l.interest,
      budget: l.budget,
      stage: l.stage,
      assignedEmployeeId: l.assignedEmployeeId || 'e1',
      createdAt: l.createdAt || new Date()
    }));
    if (leadsToInsert.length > 0) {
      await Lead.bulkCreate(leadsToInsert, { ignoreDuplicates: true });
    }

    console.log('Seeding activity logs...');
    const validEmpIds = new Set(employeesToInsert.map(e => e.id));
    const validLeadIds = new Set(leadsToInsert.map(l => l.id));
    
    const logsToInsert = (inMemoryStore.mockActivityLogs || [])
      .filter(a => validLeadIds.has(a.leadId))
      .map(a => ({
        id: a.id,
        leadId: a.leadId,
        employeeId: validEmpIds.has(a.employeeId) ? a.employeeId : 'e1',
        action: a.action,
        fromStage: a.fromStage || null,
        toStage: a.toStage || null,
        createdAt: a.createdAt || new Date()
      }));
    if (logsToInsert.length > 0) {
      await ActivityLog.bulkCreate(logsToInsert, { ignoreDuplicates: true });
    }

    console.log('Database seeded successfully across all entities (Users, Employees, Inventory, Leads, ActivityLogs)!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
