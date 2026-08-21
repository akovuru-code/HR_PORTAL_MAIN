// Spouse model for PostgreSQL
const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Timesheet = sequelize.define('Timesheet', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    employeeId: { type: DataTypes.STRING, allowNull: true },
    employeeName: { type: DataTypes.STRING, allowNull: true },
    projectName: { type: DataTypes.STRING, allowNull: true },
    clientName: { type: DataTypes.STRING, allowNull: true },
    role: { type: DataTypes.STRING, allowNull: true },
    hours: { type: DataTypes.FLOAT, allowNull: true },
    filePath: { type: DataTypes.STRING, allowNull: false },
    originalFileName: { type: DataTypes.STRING, allowNull: true },
    mimeType: { type: DataTypes.STRING, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    summary: { type: DataTypes.TEXT, allowNull: true },
    week: { type: DataTypes.STRING, allowNull: true }
});


module.exports = Timesheet;
