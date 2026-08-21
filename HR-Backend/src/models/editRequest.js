const { DataTypes } = require('sequelize');
const sequelize = require('./db');
const Employee = require('./employee');

const EditRequest = sequelize.define('EditRequest', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    employeeId: { type: DataTypes.INTEGER, allowNull: false, references: { model: Employee, key: 'employee_id' } },
    requesterId: { type: DataTypes.INTEGER, allowNull: false },
    sectionKey: { type: DataTypes.STRING, allowNull: false, defaultValue: 'personal', field: 'section_key' }, // e.g. personal, education, work, etc.
    reason: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING, defaultValue: 'pending' }, // pending | approved | denied | used
    requestType: { type: DataTypes.STRING, defaultValue: 'edit_request', field: 'request_type' },
}, {
    tableName: 'edit_requests',
    timestamps: true,
});

EditRequest.belongsTo(Employee, { foreignKey: 'employeeId' });
Employee.hasMany(EditRequest, { foreignKey: 'employeeId' });


module.exports = EditRequest;
