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
  role: {
    type: DataTypes.STRING,
    allowNull: false
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
  }
}, {
  tableName: 'employees',
  timestamps: true
});

module.exports = Employee;
