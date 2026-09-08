const { DataTypes } = require('sequelize');
const sequelize = require('./db');
const Invoice = require('./invoice');

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  vendor: { type: DataTypes.STRING, allowNull: false, field: 'client' },
  vendor_id: { type: DataTypes.INTEGER, allowNull: true },
  currency: { type: DataTypes.STRING(3), allowNull: true },
  // New records use invoice_id as the source of truth. The text invoice value
  // remains for legacy records and human-readable exports.
  invoice_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'invoices', key: 'id' },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  },
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

Payment.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoiceRecord' });
Invoice.hasMany(Payment, { foreignKey: 'invoice_id', as: 'payments' });

module.exports = Payment;
