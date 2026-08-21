const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const CompanySettings = sequelize.define('CompanySettings', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  description: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
  contactEmail: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
  contactPhone: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
  headquarters: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
  canadaOffice: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
  indiaOffice: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
}, {
  tableName: 'company_settings',
  timestamps: true,
});

module.exports = CompanySettings;