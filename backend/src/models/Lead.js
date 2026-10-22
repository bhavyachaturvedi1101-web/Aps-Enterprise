const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Lead = sequelize.define('Lead', {
  id: {
    type: DataTypes.STRING,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '+91 98765 43210'
  },
  company: {
    type: DataTypes.STRING,
    allowNull: true
  },
  interest: {
    type: DataTypes.STRING,
    allowNull: false
  },
  budget: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  stage: {
    type: DataTypes.ENUM(
      'Enquiry',
      'Qualified',
      'Booked',
      'Confirmed Lead',
      'Client (Paid)',
      'In Production',
      'Dispatched'
    ),
    allowNull: false,
    defaultValue: 'Enquiry'
  },
  priority: {
    type: DataTypes.STRING,
    defaultValue: 'Warm'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  source: {
    type: DataTypes.STRING,
    defaultValue: 'Direct Web'
  },
  crmSynced: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  erpBookingCreated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  tallyPaymentVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  assignedEmployeeId: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'leads',
  timestamps: true
});

module.exports = Lead;
