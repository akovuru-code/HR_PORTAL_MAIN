const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Education = sequelize.define('Education', {
  education_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: DataTypes.INTEGER,
  education_level: { type: DataTypes.STRING, allowNull: true },
  degree: DataTypes.STRING,
  university: DataTypes.STRING,
  major: DataTypes.STRING,
  start_date: DataTypes.DATEONLY,
  end_date: DataTypes.DATEONLY,
  street: DataTypes.STRING,
  city: DataTypes.STRING,
  state: DataTypes.STRING,
  zip_code: DataTypes.STRING,
}, {
  tableName: 'educations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});


module.exports = Education;
