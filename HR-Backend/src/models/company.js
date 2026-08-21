const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Company = sequelize.define('Company', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  logoUrl: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
}, {
  tableName: 'companies',
  timestamps: true,
});

module.exports = Company;