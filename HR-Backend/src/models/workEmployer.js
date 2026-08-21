const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const WorkEmployer = sequelize.define('WorkEmployer', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false }, // 'present' or 'previous'
  name: DataTypes.STRING,
  designation: DataTypes.STRING,
  start_date: DataTypes.DATEONLY,
  end_date: DataTypes.DATEONLY,
  doc_file: DataTypes.JSONB, // { url, filename, originalName, category }
}, {
  tableName: 'work_employers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});


module.exports = WorkEmployer;
