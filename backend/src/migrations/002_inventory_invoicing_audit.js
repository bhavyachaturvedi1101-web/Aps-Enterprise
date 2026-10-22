'use strict';

module.exports = {
  up: async (queryInterface, Sequelize, transaction) => {
    // 1. Inventory
    await queryInterface.createTable('inventory', {
      id: { type: Sequelize.STRING, primaryKey: true },
      sku: { type: Sequelize.STRING, allowNull: false, unique: true },
      name: { type: Sequelize.STRING, allowNull: false },
      category: { type: Sequelize.STRING, allowNull: false, defaultValue: 'Machinery' },
      totalStock: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      bookedStock: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      minStockThreshold: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5 },
      unitPrice: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00 },
      status: {
        type: Sequelize.ENUM('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'),
        defaultValue: 'IN_STOCK'
      },
      location: { type: Sequelize.STRING, defaultValue: 'Main Warehouse - Plant 1' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, { transaction }).catch(() => {});

    // 2. Payments
    await queryInterface.createTable('payments', {
      id: { type: Sequelize.STRING, primaryKey: true },
      leadId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: 'leads', key: 'id' },
        onDelete: 'CASCADE'
      },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      status: { type: Sequelize.STRING, defaultValue: 'Completed' },
      referenceNo: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, { transaction }).catch(() => {});

    // 3. Invoices
    await queryInterface.createTable('invoices', {
      id: { type: Sequelize.STRING, primaryKey: true },
      invoiceNumber: { type: Sequelize.STRING, allowNull: false, unique: true },
      leadId: {
        type: Sequelize.STRING,
        allowNull: true,
        references: { model: 'leads', key: 'id' },
        onDelete: 'SET NULL'
      },
      customerName: { type: Sequelize.STRING, allowNull: false },
      companyName: { type: Sequelize.STRING, allowNull: true },
      subtotal: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.00 },
      gstRate: { type: Sequelize.DECIMAL(5, 2), defaultValue: 18.00 },
      gstAmount: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.00 },
      totalAmount: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.00 },
      advancePaid: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.00 },
      balanceDue: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.00 },
      status: {
        type: Sequelize.ENUM('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'),
        defaultValue: 'ISSUED'
      },
      tallyVoucherId: { type: Sequelize.STRING, allowNull: true },
      dispatchedWhatsApp: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, { transaction }).catch(() => {});

    // 4. Job Cards
    await queryInterface.createTable('job_cards', {
      id: { type: Sequelize.STRING, primaryKey: true },
      bookingId: {
        type: Sequelize.STRING,
        allowNull: true,
        references: { model: 'bookings', key: 'id' },
        onDelete: 'SET NULL'
      },
      jobCardNumber: { type: Sequelize.STRING, allowNull: false, unique: true },
      stage: { type: Sequelize.STRING, defaultValue: 'Fabrication' },
      assignedEngineer: { type: Sequelize.STRING, allowNull: true },
      priority: { type: Sequelize.STRING, defaultValue: 'Standard' },
      targetDate: { type: Sequelize.DATE, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, { transaction }).catch(() => {});
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('job_cards').catch(() => {});
    await queryInterface.dropTable('invoices').catch(() => {});
    await queryInterface.dropTable('payments').catch(() => {});
    await queryInterface.dropTable('inventory').catch(() => {});
  }
};
