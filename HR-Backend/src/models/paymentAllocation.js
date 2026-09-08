const { DataTypes } = require('sequelize');
const sequelize = require('./db');
const Payment = require('./payment');
const Invoice = require('./invoice');

const PaymentAllocation = sequelize.define('PaymentAllocation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  payment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'payments', key: 'id' },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  },
  invoice_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'invoices', key: 'id' },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
}, {
  tableName: 'payment_allocations',
  freezeTableName: true,
  timestamps: true,
});

Payment.hasMany(PaymentAllocation, { foreignKey: 'payment_id', as: 'allocations' });
PaymentAllocation.belongsTo(Payment, { foreignKey: 'payment_id', as: 'payment' });
Invoice.hasMany(PaymentAllocation, { foreignKey: 'invoice_id', as: 'paymentAllocations' });
PaymentAllocation.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

module.exports = PaymentAllocation;
