const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const ResumeUpload = sequelize.define('ResumeUpload', {
  resume_upload_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  role_section_id: DataTypes.INTEGER,
  file_name: DataTypes.STRING,
  file_type: DataTypes.STRING,
  file_size: DataTypes.INTEGER,
  file_url: DataTypes.TEXT,
  upload_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'resume_uploads',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});


module.exports = ResumeUpload;
