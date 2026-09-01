const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const JobCard = sequelize.define('JobCard', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  bookingId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  leadId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  jobNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  product: {
    type: DataTypes.STRING,
    allowNull: false
  },
  clientName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // Milestones stored as JSON array:
  // [{ name, completedAt, completedBy, notes }]
  milestones: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [
      { name: 'Material Procured', completedAt: null, completedBy: null, notes: '' },
      { name: 'CNC Assembly', completedAt: null, completedBy: null, notes: '' },
      { name: 'Quality Testing', completedAt: null, completedBy: null, notes: '' },
      { name: 'Dispatch Ready', completedAt: null, completedBy: null, notes: '' }
    ]
  },
  currentMilestoneIndex: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('Open', 'In Progress', 'Quality Hold', 'Dispatch Ready', 'Closed'),
    defaultValue: 'Open'
  },
  estimatedCompletionDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  assignedTeam: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Assembly Floor A'
  },
  priority: {
    type: DataTypes.ENUM('Normal', 'High', 'Urgent'),
    defaultValue: 'Normal'
  }
}, {
  tableName: 'job_cards',
  timestamps: true
});

module.exports = JobCard;
