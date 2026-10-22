'use strict';

module.exports = {
  up: async (queryInterface, Sequelize, transaction) => {
    // 1. Users
    await queryInterface.createTable('users', {
      id: { type: Sequelize.STRING, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      passwordHash: { type: Sequelize.STRING, allowNull: true },
      role: { type: Sequelize.STRING, allowNull: false, defaultValue: 'employee' },
      title: { type: Sequelize.STRING, defaultValue: 'Operator' },
      avatar: { type: Sequelize.STRING, defaultValue: 'U' },
      avatarBg: { type: Sequelize.STRING, defaultValue: '#2563eb' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, { transaction }).catch(() => {});

    // 2. Employees
    await queryInterface.createTable('employees', {
      id: { type: Sequelize.STRING, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      role: { type: Sequelize.STRING, allowNull: false },
      department: { type: Sequelize.STRING, defaultValue: 'Sales' },
      status: { type: Sequelize.STRING, defaultValue: 'Active' },
      salesClosed: { type: Sequelize.INTEGER, defaultValue: 0 },
      totalRevenue: { type: Sequelize.DECIMAL(14, 2), defaultValue: 0.00 },
      kpiScore: { type: Sequelize.STRING, defaultValue: 'A' },
      callsHandled: { type: Sequelize.INTEGER, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, { transaction }).catch(() => {});

    // 3. Leads
    await queryInterface.createTable('leads', {
      id: { type: Sequelize.STRING, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      interest: { type: Sequelize.STRING, allowNull: true },
      budget: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.00 },
      stage: {
        type: Sequelize.ENUM('Enquiry', 'Qualified', 'Booked', 'Confirmed Lead', 'Client (Paid)', 'In Production', 'Dispatched'),
        defaultValue: 'Enquiry'
      },
      assignedEmployeeId: {
        type: Sequelize.STRING,
        allowNull: true,
        references: { model: 'employees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      phone: { type: Sequelize.STRING, allowNull: true },
      source: { type: Sequelize.STRING, defaultValue: 'Inbound' },
      tallyPaymentVerified: { type: Sequelize.BOOLEAN, defaultValue: false },
      erpBookingCreated: { type: Sequelize.BOOLEAN, defaultValue: false },
      factoryOrderId: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, { transaction }).catch(() => {});

    // 4. Bookings
    await queryInterface.createTable('bookings', {
      id: { type: Sequelize.STRING, primaryKey: true },
      leadId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: 'leads', key: 'id' },
        onDelete: 'CASCADE'
      },
      machineConfig: { type: Sequelize.JSON, allowNull: true },
      deliveryDate: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, { transaction }).catch(() => {});

    // 5. Activity Logs
    await queryInterface.createTable('activity_logs', {
      id: { type: Sequelize.STRING, primaryKey: true },
      leadId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: 'leads', key: 'id' },
        onDelete: 'CASCADE'
      },
      employeeId: {
        type: Sequelize.STRING,
        allowNull: true,
        references: { model: 'employees', key: 'id' },
        onDelete: 'SET NULL'
      },
      action: { type: Sequelize.STRING, allowNull: false },
      fromStage: { type: Sequelize.STRING, allowNull: true },
      toStage: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, { transaction }).catch(() => {});
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('activity_logs').catch(() => {});
    await queryInterface.dropTable('bookings').catch(() => {});
    await queryInterface.dropTable('leads').catch(() => {});
    await queryInterface.dropTable('employees').catch(() => {});
    await queryInterface.dropTable('users').catch(() => {});
  }
};
