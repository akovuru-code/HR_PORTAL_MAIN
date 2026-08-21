const { DataTypes } = require('sequelize');
const sequelize = require('./db');
const Employee = require('./employee');

const TrainingProgress = sequelize.define('TrainingProgress', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    employeeId: { type: DataTypes.INTEGER, allowNull: false, references: { model: Employee, key: 'employee_id' } },
    module: DataTypes.STRING,
    percent_complete: DataTypes.FLOAT
}, {
    tableName: 'training_progress',
    timestamps: true,
});

TrainingProgress.belongsTo(Employee, { foreignKey: 'employeeId' });
Employee.hasMany(TrainingProgress, { foreignKey: 'employeeId' });


module.exports = TrainingProgress;
