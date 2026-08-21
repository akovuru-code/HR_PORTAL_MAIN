const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const AuditLog = sequelize.define('AuditLog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    entity: { type: DataTypes.STRING },
    entityId: { type: DataTypes.INTEGER },
    action: { type: DataTypes.STRING },
    actorId: { type: DataTypes.INTEGER },
    payload: { type: DataTypes.JSONB },
}, {
    tableName: 'audit_logs',
    timestamps: true,
});


module.exports = AuditLog;
