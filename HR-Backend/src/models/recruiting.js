const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Recruiting = sequelize.define('Recruiting', {

    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    name: {
        type: DataTypes.STRING,
        allowNull: false
    },

    phone_number: {
        type: DataTypes.STRING
    },

    email: {
        type: DataTypes.STRING
    },

    company: {
        type: DataTypes.STRING
    }

}, {

    tableName: 'recruiting',
    freezeTableName: true,
    timestamps: true

});


module.exports = Recruiting;