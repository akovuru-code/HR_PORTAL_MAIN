const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Certification = sequelize.define('Certification', {
  certification_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  education_id: DataTypes.INTEGER,
  name: DataTypes.STRING,
  org: DataTypes.STRING,
  start_date: DataTypes.DATEONLY,
  end_date: DataTypes.DATEONLY,
  description: DataTypes.TEXT,
  file_name: DataTypes.STRING,
  file_url: DataTypes.TEXT,
}, {
  tableName: 'certifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});


module.exports = Certification;
