const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Invoice = sequelize.define('Invoice', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  invoiceNumber: DataTypes.STRING,
  status: DataTypes.STRING,
  generatedDate: DataTypes.DATEONLY,
  url: DataTypes.STRING,
  filename: DataTypes.STRING,
  originalName: DataTypes.STRING,
  createdBy: DataTypes.STRING,
  updatedBy: DataTypes.STRING,
}, {
  tableName: 'invoices',
  freezeTableName: true,
  timestamps: true,
});

module.exports = Invoice;
