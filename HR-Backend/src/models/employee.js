
const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Employee = sequelize.define('Employee', {
  employee_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: DataTypes.STRING,
  firstName: DataTypes.STRING,
  middleName: DataTypes.STRING,
  lastName: DataTypes.STRING,
  phoneCountry: DataTypes.STRING,
  phone: DataTypes.STRING,
  mobile: DataTypes.STRING,
  email: DataTypes.STRING,
  dob: DataTypes.DATE,
  visaStatus: DataTypes.STRING,
  address: DataTypes.STRING,
  presentAddress: DataTypes.JSONB,
  previousAddresses: DataTypes.JSONB,
  presentEmployer: DataTypes.STRING,
  whatsappPhone: DataTypes.STRING,
  isWhatsappSame: DataTypes.BOOLEAN,
  maritalStatus: DataTypes.STRING,
  nationality: DataTypes.STRING,
  passportNumber: DataTypes.STRING,
  passportExpiry: DataTypes.DATE,
  passport: DataTypes.STRING,
  passportExpire: DataTypes.DATE,
  visaType: DataTypes.STRING,
  visaExpiry: DataTypes.DATE,
  visaExpire: DataTypes.DATE,
  ssn: DataTypes.STRING,
  sin: DataTypes.STRING,
  ni: DataTypes.STRING,
  tfn: DataTypes.STRING,
  pan: DataTypes.STRING,
  aadhaar: DataTypes.STRING,
  drivingLicense: DataTypes.STRING,
  dlState: DataTypes.STRING,
  dlExpire: DataTypes.DATE,
  dlExpiry: DataTypes.DATE,
  showKidsInfo: DataTypes.BOOLEAN,
  // File uploads (stored as JSON: { url, originalName, filename, category })
  passportFile: DataTypes.JSONB,
  passportFile2: DataTypes.JSONB,
  visaFile: DataTypes.JSONB,
  visaFile2: DataTypes.JSONB,
  dlFile: DataTypes.JSONB,
  marriageCertFile: DataTypes.JSONB,
  i9File: DataTypes.JSONB,
  w4File: DataTypes.JSONB,
  emergencyEnabled: DataTypes.BOOLEAN,
  emergencyFirstName: DataTypes.STRING,
  emergencyMiddleName: DataTypes.STRING,
  emergencyLastName: DataTypes.STRING,
  emergencyMobile: DataTypes.STRING,
  emergencyPhone: DataTypes.STRING,
  emergencyEmail: DataTypes.STRING,
  emergencyRelationship: DataTypes.STRING,
  bankDetails: DataTypes.JSONB, // { name, acc, routing, type }
  insuranceData: DataTypes.JSONB, // [{ name, coverage: { medical, vision, dental } }]
  onboardDocsFiles: DataTypes.JSONB, // [{ id, name, template, modifiedBy, file: { url, ... } }]
  photoUrl: DataTypes.TEXT,
  jobRole: DataTypes.STRING,
  jobDescription: DataTypes.STRING,
  organization: DataTypes.STRING,
  clientName: DataTypes.STRING,
  clientWorkEmail: DataTypes.STRING,
  clientManager: DataTypes.STRING,
  clientCompletionDate: DataTypes.DATE,
  onboardingStatus: { type: DataTypes.STRING, defaultValue: 'draft' },
  onboardingSubmittedAt: DataTypes.DATE,
  onboardingRejectedReason: DataTypes.STRING,
  submittedTabs: { type: DataTypes.JSONB, defaultValue: {} },
  profileStatus: DataTypes.STRING,
  taskNotes: DataTypes.TEXT,
  aboutMe: DataTypes.TEXT,
  statusDetails: DataTypes.JSONB,
  notifPrefs: DataTypes.JSONB,
  empTerminateDate: DataTypes.DATEONLY,
  empTerminateComments: DataTypes.TEXT,
}, {
  tableName: 'Employee',
  freezeTableName: true,
  timestamps: true,
});

// Define associations (must be done after model definitions)
Employee.associate = function (models) {
  Employee.hasOne(models.Spouse, { foreignKey: 'employee_id' });
  Employee.hasMany(models.Kid, { foreignKey: 'employee_id' });
  Employee.hasMany(models.Document, { foreignKey: 'employee_id' });
};


module.exports = Employee;
