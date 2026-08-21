const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const EducationUpload = sequelize.define('EducationUpload', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  education_id: DataTypes.INTEGER,
  file_name: DataTypes.STRING,
  file_url: DataTypes.TEXT,
}, {
  tableName: 'education_uploads',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});


module.exports = EducationUpload;
