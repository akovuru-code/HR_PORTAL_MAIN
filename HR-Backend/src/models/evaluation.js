const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Evaluation = sequelize.define('Evaluation', {
  evaluation_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  description: DataTypes.TEXT,
  file_name: DataTypes.STRING,
  file_url: DataTypes.TEXT,
}, {
  tableName: 'evaluations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});


module.exports = Evaluation;
