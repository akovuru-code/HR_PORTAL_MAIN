const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Address = sequelize.define('Address', {
    address_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    employee_id: DataTypes.INTEGER,
    type: { type: DataTypes.STRING, allowNull: false },
    street: DataTypes.STRING,
    city: DataTypes.STRING,
    state: DataTypes.STRING,
    zip: DataTypes.STRING,
    country: DataTypes.STRING,
}, {
    tableName: 'Address',
    freezeTableName: true,
    timestamps: false
});


module.exports = Address;
