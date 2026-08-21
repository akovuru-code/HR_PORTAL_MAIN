// Document model for PostgreSQL
const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Document = sequelize.define('Document', {
  document_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: DataTypes.INTEGER,
  name: DataTypes.STRING,
  url: DataTypes.STRING,
  filename: DataTypes.STRING,
  originalName: DataTypes.STRING,
  document_type: DataTypes.STRING,
  expiry: DataTypes.DATEONLY,
  modifiedBy: DataTypes.STRING,
  fileData: DataTypes.JSONB,
}, {
  tableName: 'Document',
  freezeTableName: true,
  timestamps: false
});


module.exports = Document;
