const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  vendor: { type: DataTypes.STRING, allowNull: false, field: 'client' },
  invoice: { type: DataTypes.STRING, allowNull: false },
  referenceNumber: { type: DataTypes.STRING, allowNull: false },
  paymentMethod: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  createdBy: DataTypes.STRING,
}, {
  tableName: 'payments',
  freezeTableName: true,
  timestamps: true,
});

module.exports = Payment;
