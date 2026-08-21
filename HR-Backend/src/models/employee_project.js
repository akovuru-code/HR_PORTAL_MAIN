const { DataTypes } = require('sequelize');
const sequelize = require('./db');
const Employee = require('./employee');
const Project = require('./project');

const EmployeeProject = sequelize.define('EmployeeProject', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    employeeId: { type: DataTypes.INTEGER, allowNull: false, references: { model: Employee, key: 'employee_id' } },
    projectId: { type: DataTypes.INTEGER, allowNull: false, references: { model: Project, key: 'id' } },
    role: DataTypes.STRING,
    start_date: DataTypes.DATE,
    end_date: DataTypes.DATE
}, {
    tableName: 'employee_projects',
    timestamps: true,
});

EmployeeProject.belongsTo(Employee, { foreignKey: 'employeeId' });
EmployeeProject.belongsTo(Project, { foreignKey: 'projectId' });
Employee.hasMany(EmployeeProject, { foreignKey: 'employeeId' });
Project.hasMany(EmployeeProject, { foreignKey: 'projectId' });


module.exports = EmployeeProject;
