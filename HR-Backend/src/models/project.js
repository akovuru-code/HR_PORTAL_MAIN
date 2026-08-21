const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Project = sequelize.define('Project', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    status: DataTypes.STRING
}, {
    tableName: 'projects',
    timestamps: true,
});


module.exports = Project;
