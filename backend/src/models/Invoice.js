const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  leadId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  clientName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  clientPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  clientEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gstNo: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '27AAAAA0000A1Z5'
  },
  poNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  product: {
    type: DataTypes.STRING,
    allowNull: false
  },
  hsnCode: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '8466'
  },
  baseAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  gstAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Sent', 'Paid', 'Overdue'),
    allowNull: false,
    defaultValue: 'Draft'
  },
  paymentTerms: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Net 30 Days'
  },
  issuedDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'invoices',
  timestamps: true
});

module.exports = Invoice;
