const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const PerformanceReviewTemplate = sequelize.define('PerformanceReviewTemplate', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'company_id',
    references: { model: 'companies', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
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
  version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
}, {
  tableName: 'performance_review_templates',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { name: 'performance_review_templates_lookup', fields: ['company_id', 'review_type', 'review_year', 'is_active'] },
    { name: 'performance_review_templates_version_unique', unique: true, fields: ['company_id', 'review_type', 'review_year', 'version'] },
  ],
});

module.exports = PerformanceReviewTemplate;
