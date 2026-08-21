const { DataTypes } = require('sequelize');
const sequelize = require('./db');
const Employee = require('./employee');

const ActionItem = sequelize.define('ActionItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    employeeId: { type: DataTypes.INTEGER, allowNull: false, references: { model: Employee, key: 'employee_id' } },
    type: DataTypes.STRING,
    message: DataTypes.STRING,
    due_date: DataTypes.DATE,
    status: DataTypes.STRING
}, {
    tableName: 'action_items',
    timestamps: true,
});

ActionItem.belongsTo(Employee, { foreignKey: 'employeeId' });
Employee.hasMany(ActionItem, { foreignKey: 'employeeId' });


module.exports = ActionItem;
