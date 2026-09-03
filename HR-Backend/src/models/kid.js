// Kid model for PostgreSQL
//const Employee = require('./employee_pg');

const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Kid = sequelize.define('Kid', {
  kid_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: DataTypes.INTEGER,
  first_name: DataTypes.STRING,
  middle_name: DataTypes.STRING,
  last_name: DataTypes.STRING,
  dob: DataTypes.DATEONLY,
  nationality: DataTypes.STRING,
  passport_number: DataTypes.STRING,
  passport_expiry: DataTypes.DATEONLY,
  ssn: DataTypes.STRING,
  sin: DataTypes.STRING,
  ni: DataTypes.STRING,
  tfn: DataTypes.STRING,
  pan: DataTypes.STRING,
  aadhaar: DataTypes.STRING,
  visa_type: DataTypes.STRING,
  custom_visa_type: DataTypes.STRING,
  visa_expiry: DataTypes.DATEONLY,
  address_same: DataTypes.BOOLEAN,
  address: DataTypes.JSONB,
  passportFile: DataTypes.JSONB,
  docFile: DataTypes.JSONB,
  docFile2: DataTypes.JSONB,
  kid_address_id: DataTypes.INTEGER,
}, {
  tableName: 'Kid',
  freezeTableName: true,
  timestamps: false
});


module.exports = Kid;
