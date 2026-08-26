const Employee = require('./Employee');
const Lead = require('./Lead');
const Booking = require('./Booking');
const Payment = require('./Payment');
const ActivityLog = require('./ActivityLog');
const Inventory = require('./Inventory');

// Establish associations

// Lead <-> Booking (1-to-1)
Lead.hasOne(Booking, { foreignKey: 'leadId', as: 'booking', onDelete: 'CASCADE' });
Booking.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });

// Lead <-> Payment (1-to-many)
Lead.hasMany(Payment, { foreignKey: 'leadId', as: 'payments', onDelete: 'CASCADE' });
Payment.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });

// Lead <-> ActivityLog (1-to-many)
Lead.hasMany(ActivityLog, { foreignKey: 'leadId', as: 'activities', onDelete: 'CASCADE' });
ActivityLog.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });

// Employee <-> Lead (1-to-many)
Employee.hasMany(Lead, { foreignKey: 'assignedEmployeeId', as: 'leads' });
Lead.belongsTo(Employee, { foreignKey: 'assignedEmployeeId', as: 'employee' });

// Employee <-> ActivityLog (1-to-many)
Employee.hasMany(ActivityLog, { foreignKey: 'employeeId', as: 'activities' });
ActivityLog.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

module.exports = {
  Employee,
  Lead,
  Booking,
  Payment,
  ActivityLog,
  Inventory
};

