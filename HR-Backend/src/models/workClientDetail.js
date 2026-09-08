const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const WorkClientDetail = sequelize.define('WorkClientDetail', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: true },
  type: { type: DataTypes.STRING, allowNull: false }, // 'client', 'vendor', 'primeVendor'
  name: DataTypes.STRING,
  address: DataTypes.STRING,
  start_date: DataTypes.DATEONLY,
  end_date: DataTypes.DATEONLY,
  work_email: DataTypes.STRING,
  manager_email: DataTypes.STRING,
  manager_phone: DataTypes.STRING,
  remote_work_location: DataTypes.STRING,
  contact_person: DataTypes.STRING,
  email: DataTypes.STRING,
  phone: DataTypes.STRING,
  fein: DataTypes.STRING,
  has_vendor: DataTypes.BOOLEAN,
  vendor_name: DataTypes.STRING,
  has_prime_vendor: DataTypes.BOOLEAN,
  prime_vendor_name: DataTypes.STRING,
  has_client: DataTypes.BOOLEAN,
  client_name: DataTypes.STRING,
  doc_file: DataTypes.JSONB, // { url, filename, originalName, category }
  country_code: DataTypes.STRING,
  meta: DataTypes.JSONB, // admin-created entries: { status, comment, members, createdBy, updatedBy, vendor, primeVendor, client }
}, {
  tableName: 'work_client_details',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});


module.exports = WorkClientDetail;
