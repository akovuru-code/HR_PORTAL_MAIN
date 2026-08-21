const { DataTypes } = require('sequelize');
const sequelize = require('./db');
const Employee = require('./employee');

const DashboardShortcut = sequelize.define('DashboardShortcut', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    employeeId: { type: DataTypes.INTEGER, allowNull: false, references: { model: Employee, key: 'employee_id' } },
    label: DataTypes.STRING,
    link: DataTypes.STRING,
    icon: DataTypes.STRING
}, {
    tableName: 'dashboard_shortcuts',
    timestamps: true,
});

DashboardShortcut.belongsTo(Employee, { foreignKey: 'employeeId' });
Employee.hasMany(DashboardShortcut, { foreignKey: 'employeeId' });


module.exports = DashboardShortcut;
