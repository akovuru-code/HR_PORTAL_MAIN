const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const EmergencyContact = sequelize.define('EmergencyContact', {
  emergency_contact_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: DataTypes.INTEGER,
  first_name: DataTypes.STRING,
  middle_name: DataTypes.STRING,
  last_name: DataTypes.STRING,
  phone: { type: DataTypes.STRING, allowNull: false },
  email: DataTypes.STRING,
}, {
  tableName: 'EmergencyContact',
  freezeTableName: true,
  timestamps: false
});


module.exports = EmergencyContact;
