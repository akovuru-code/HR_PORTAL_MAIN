// Spouse model for PostgreSQL
const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Spouse = sequelize.define('Spouse', {
  spouse_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: DataTypes.INTEGER,
  first_name: DataTypes.STRING,
  middle_name: DataTypes.STRING,
  last_name: DataTypes.STRING,
  email: DataTypes.STRING,
  phone: DataTypes.STRING,
  dob: DataTypes.DATEONLY,
  nationality: DataTypes.STRING,
  passport_number: DataTypes.STRING,
  passport_expiry: DataTypes.DATEONLY,
  occupation: DataTypes.STRING,
  ssn: DataTypes.STRING,
  sin: DataTypes.STRING,
  ni: DataTypes.STRING,
  tfn: DataTypes.STRING,
  pan: DataTypes.STRING,
  aadhaar: DataTypes.STRING,
  spouse_visa_type: DataTypes.STRING,
  spouse_visa_type2: DataTypes.STRING,
  visa_expiry: DataTypes.DATEONLY,
  driving_license: DataTypes.STRING,
  dl_state: DataTypes.STRING,
  dl_expiry: DataTypes.DATEONLY,
  is_spouse_address_same: DataTypes.BOOLEAN,
  address: DataTypes.JSONB,
  passportFile: DataTypes.JSONB,
  visaFile: DataTypes.JSONB,
  dlFile: DataTypes.JSONB,
  spouse_address_id: DataTypes.INTEGER,
}, {
  tableName: 'Spouse',
  freezeTableName: true,
  timestamps: false
});


module.exports = Spouse;
