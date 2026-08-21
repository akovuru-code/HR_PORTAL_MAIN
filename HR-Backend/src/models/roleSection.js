const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const RoleSection = sequelize.define('RoleSection', {
  role_section_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: DataTypes.INTEGER,
  role: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  skills: DataTypes.TEXT,
}, {
  tableName: 'role_sections',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});


module.exports = RoleSection;
