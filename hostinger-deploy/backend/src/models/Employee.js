const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Sales & Operations'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Active'
  },
  kpiScore: {
    type: DataTypes.STRING,
    defaultValue: '90%'
  },
  tasksCompleted: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  callsHandled: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  salesClosed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalRevenue: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  activeTask: {
    type: DataTypes.JSON,
    allowNull: true
  },
  taskQueue: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'employees',
  timestamps: true
});

module.exports = Employee;
