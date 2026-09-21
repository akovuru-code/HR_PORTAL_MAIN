const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const PerformanceReportReplacementRequest = sequelize.define('PerformanceReportReplacementRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id', references: { model: 'Employee', key: 'employee_id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
  reportId: { type: DataTypes.INTEGER, allowNull: false, field: 'report_id', references: { model: 'employee_performance_reports', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
  companyId: { type: DataTypes.INTEGER, allowNull: false, field: 'company_id', references: { model: 'companies', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
  companyNameSnapshot: { type: DataTypes.STRING, allowNull: false, field: 'company_name_snapshot' },
  reviewType: { type: DataTypes.STRING(32), allowNull: false, field: 'review_type' },
  reviewYear: { type: DataTypes.INTEGER, allowNull: false, field: 'review_year' },
  submittedVersionId: { type: DataTypes.INTEGER, allowNull: false, field: 'submitted_version_id', references: { model: 'performance_report_versions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
  replacementVersionId: { type: DataTypes.INTEGER, allowNull: true, field: 'replacement_version_id', references: { model: 'performance_report_versions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
  reason: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'pending' },
  reviewedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'reviewed_by', references: { model: 'users', key: 'user_id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
  reviewedAt: { type: DataTypes.DATE, allowNull: true, field: 'reviewed_at' },
  consumedAt: { type: DataTypes.DATE, allowNull: true, field: 'consumed_at' },
}, {
  tableName: 'performance_report_replacement_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { name: 'performance_report_replacement_requests_active_unique', unique: true, fields: ['report_id'], where: { status: ['pending', 'approved'] } },
    { name: 'performance_report_replacement_requests_employee_status', fields: ['employee_id', 'status'] },
  ],
});

module.exports = PerformanceReportReplacementRequest;
