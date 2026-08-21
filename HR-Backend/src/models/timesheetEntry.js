const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const TimesheetEntry = sequelize.define('TimesheetEntry', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  dateKey: { type: DataTypes.STRING, allowNull: false }, // 'YYYY-MM-DD'
  hours: { type: DataTypes.FLOAT, allowNull: false },
  project: { type: DataTypes.STRING, allowNull: true },
  client: { type: DataTypes.STRING, allowNull: true },
  role: { type: DataTypes.STRING, allowNull: true },
  type: { type: DataTypes.STRING, allowNull: true }, // 'Project Time' | 'Time Off'
  notes: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Pending' },
  adminComment: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'TimesheetEntries',
  freezeTableName: true,
  timestamps: true,
});


module.exports = TimesheetEntry;
