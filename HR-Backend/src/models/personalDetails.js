const { DataTypes } = require('sequelize');
const sequelize = require('./db');
// If you have a User model, import it here:
// const User = require('./user');

const PersonalDetails = sequelize.define('PersonalDetails', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false /*, references: { model: User, key: 'id' }*/ },
  firstName: { type: DataTypes.STRING, allowNull: false },
  mobileNo: DataTypes.STRING,
  email: { type: DataTypes.STRING, allowNull: false },
  dateOfBirth: DataTypes.DATE,
  presentAddress: DataTypes.STRING,
  maritalStatus: DataTypes.STRING,
  ssn: DataTypes.STRING,
  sin: DataTypes.STRING,
  ni: DataTypes.STRING,
  tfn: DataTypes.STRING,
  pan: DataTypes.STRING,
  aadhaar: DataTypes.STRING,
  drivingLicense: DataTypes.STRING,
  nationality: DataTypes.STRING,
  visaStatus: DataTypes.STRING,
  visaExpireDate: DataTypes.DATE,
  dlExpireDate: DataTypes.DATE,
  passportNumber: DataTypes.STRING,
  passportExpireDate: DataTypes.DATE,
  documents: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
}, {
  tableName: 'personal_details',
  timestamps: true,
});

// If you want to associate with User:
// PersonalDetails.belongsTo(User, { foreignKey: 'userId' });


module.exports = PersonalDetails;
