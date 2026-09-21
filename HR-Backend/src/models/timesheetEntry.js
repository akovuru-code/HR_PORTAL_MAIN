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
  projectId: { type: DataTypes.INTEGER, allowNull: true, field: 'project_id' },
  client: { type: DataTypes.STRING, allowNull: true },
  role: { type: DataTypes.STRING, allowNull: true },
  type: { type: DataTypes.STRING, allowNull: true }, // 'Project Time' | 'Time Off'
  // Detailed rows and Week-view quick-entry rows share the same authoritative
  // hours table so every existing total and approval calculation stays aligned.
  entrySource: { type: DataTypes.STRING, allowNull: false, defaultValue: 'detailed', field: 'entry_source' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Pending' },
  adminComment: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'TimesheetEntries',
  freezeTableName: true,
  timestamps: true,
});


module.exports = TimesheetEntry;
