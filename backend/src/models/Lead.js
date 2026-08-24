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
  interest: {
    type: DataTypes.STRING,
    allowNull: false
  },
  budget: {
    type: DataTypes.DECIMAL(10, 2),
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
  assignedEmployeeId: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'leads',
  timestamps: true
});

module.exports = Lead;
