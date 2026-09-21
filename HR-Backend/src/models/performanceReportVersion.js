const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const PerformanceReportVersion = sequelize.define('PerformanceReportVersion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  reportId: { type: DataTypes.INTEGER, allowNull: false, field: 'report_id', references: { model: 'employee_performance_reports', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
  versionNumber: { type: DataTypes.INTEGER, allowNull: false, field: 'version_number' },
  originalFilename: { type: DataTypes.STRING, allowNull: false, field: 'original_filename' },
  storedFilename: { type: DataTypes.STRING, allowNull: false, field: 'stored_filename' },
  storageKey: { type: DataTypes.TEXT, allowNull: false, field: 'storage_key' },
  mimeType: { type: DataTypes.STRING, allowNull: false, field: 'mime_type' },
  fileSize: { type: DataTypes.INTEGER, allowNull: false, field: 'file_size' },
  status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'draft' },
  uploadedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'uploaded_at' },
  submittedAt: { type: DataTypes.DATE, allowNull: true, field: 'submitted_at' },
  replacedAt: { type: DataTypes.DATE, allowNull: true, field: 'replaced_at' },
}, {
  tableName: 'performance_report_versions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { name: 'performance_report_versions_unique', unique: true, fields: ['report_id', 'version_number'] },
    { name: 'performance_report_versions_active_draft_unique', unique: true, fields: ['report_id'], where: { status: 'draft' } },
  ],
});

module.exports = PerformanceReportVersion;
