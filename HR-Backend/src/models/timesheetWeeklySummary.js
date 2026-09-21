const { DataTypes } = require('sequelize');
const sequelize = require('./db');

// One employee-authored work-status report for each Monday-Sunday period.
// Approval remains on TimesheetEntries; this table does not create a second
// approval workflow.
const TimesheetWeeklySummary = sequelize.define('TimesheetWeeklySummary', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  weekStart: { type: DataTypes.STRING, allowNull: false, field: 'week_start' },
  statusReport: { type: DataTypes.TEXT, allowNull: true, field: 'status_report' },
  projectId: { type: DataTypes.INTEGER, allowNull: true, field: 'project_id' },
  projectName: { type: DataTypes.STRING, allowNull: true, field: 'project_name' },
}, {
  tableName: 'timesheet_weekly_summaries',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { name: 'timesheet_weekly_summaries_employee_week_unique', unique: true, fields: ['employee_id', 'week_start'] },
  ],
});

module.exports = TimesheetWeeklySummary;
