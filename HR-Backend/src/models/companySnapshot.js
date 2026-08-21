const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const CompanySnapshot = sequelize.define('CompanySnapshot', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  date: { type: DataTypes.DATEONLY, allowNull: false, unique: true },
  in_project: { type: DataTypes.INTEGER, defaultValue: 0 },
  in_training: { type: DataTypes.INTEGER, defaultValue: 0 },
  on_bench: { type: DataTypes.INTEGER, defaultValue: 0 },
  total: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'company_snapshots',
  timestamps: false,
});

module.exports = CompanySnapshot;
