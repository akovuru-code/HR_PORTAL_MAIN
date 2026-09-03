const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const VendorEmployeeRate = sequelize.define('VendorEmployeeRate', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  vendor_id: { type: DataTypes.INTEGER, allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  rate: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
}, {
  tableName: 'vendor_employee_rates',
  freezeTableName: true,
  timestamps: true,
  indexes: [{ unique: true, fields: ['vendor_id', 'employee_id'] }],
});

module.exports = VendorEmployeeRate;
