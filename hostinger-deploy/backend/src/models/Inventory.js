const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Inventory = sequelize.define('Inventory', {
  id: {
    type: DataTypes.STRING,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Machinery'
  },
  totalStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  bookedStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  availableStock: {
    type: DataTypes.VIRTUAL,
    get() {
      const total = this.getDataValue('totalStock') || 0;
      const booked = this.getDataValue('bookedStock') || 0;
      return Math.max(0, total - booked);
    }
  },
  minStockThreshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5
  },
  unitPrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  status: {
    type: DataTypes.ENUM('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'),
    defaultValue: 'IN_STOCK'
  },
  location: {
    type: DataTypes.STRING,
    defaultValue: 'Main Warehouse - Plant 1'
  }
}, {
  tableName: 'inventory',
  timestamps: true
});

module.exports = Inventory;
