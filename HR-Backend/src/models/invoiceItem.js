const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const InvoiceItem = sequelize.define('InvoiceItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  invoice_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  hours: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  rate: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
}, {
  tableName: 'invoice_items',
  freezeTableName: true,
  timestamps: true,
});

module.exports = InvoiceItem;
