const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Payroll = sequelize.define('Payroll', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  nameOrNumber: { type: DataTypes.STRING, allowNull: false },
  w2Url: { type: DataTypes.STRING },
  w2OriginalName: { type: DataTypes.STRING },
  payChequeDate: { type: DataTypes.DATEONLY },
  payChequeUrl: { type: DataTypes.STRING },
  payChequeOriginalName: { type: DataTypes.STRING },
}, {
  tableName: 'Payroll',
  freezeTableName: true,
  timestamps: true,
});


module.exports = Payroll;
