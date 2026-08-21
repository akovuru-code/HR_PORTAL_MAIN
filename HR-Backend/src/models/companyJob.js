const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const CompanyJob = sequelize.define('CompanyJob', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  role: { type: DataTypes.STRING, allowNull: false },
  technology: { type: DataTypes.STRING, allowNull: false },
  experience: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: 'company_jobs',
  timestamps: true,
});

module.exports = CompanyJob;