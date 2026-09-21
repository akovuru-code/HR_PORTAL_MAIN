const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const EmployeePerformanceReport = sequelize.define('EmployeePerformanceReport', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employeeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'employee_id',
    references: { model: 'Employee', key: 'employee_id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'company_id',
    references: { model: 'companies', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  companyNameSnapshot: { type: DataTypes.STRING, allowNull: false, field: 'company_name_snapshot' },
  templateId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'template_id',
    references: { model: 'performance_review_templates', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  reviewType: {
    type: DataTypes.STRING(32),
    allowNull: false,
    field: 'review_type',
    validate: { isIn: [['MID_YEAR', 'YEAR_END']] },
  },
  reviewYear: { type: DataTypes.INTEGER, allowNull: false, field: 'review_year' },
  originalFilename: { type: DataTypes.STRING, allowNull: false, field: 'original_filename' },
  storedFilename: { type: DataTypes.STRING, allowNull: false, field: 'stored_filename' },
  storageKey: { type: DataTypes.TEXT, allowNull: false, field: 'storage_key' },
  mimeType: { type: DataTypes.STRING, allowNull: false, field: 'mime_type' },
  fileSize: { type: DataTypes.INTEGER, allowNull: false, field: 'file_size' },
  status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'DRAFT' },
  uploadedAt: { type: DataTypes.DATE, allowNull: true, field: 'uploaded_at' },
  submittedAt: { type: DataTypes.DATE, allowNull: true, field: 'submitted_at' },
  lockedAt: { type: DataTypes.DATE, allowNull: true, field: 'locked_at' },
  currentVersionId: { type: DataTypes.INTEGER, allowNull: true, field: 'current_version_id' },
}, {
  tableName: 'employee_performance_reports',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { name: 'employee_performance_reports_current_unique', unique: true, fields: ['employee_id', 'review_type', 'review_year'] },
    { name: 'employee_performance_reports_filters', fields: ['company_id', 'review_year', 'review_type', 'status'] },
  ],
});

module.exports = EmployeePerformanceReport;
