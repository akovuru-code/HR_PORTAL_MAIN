const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const AdminActionRequest = sequelize.define('AdminActionRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  requesterId: { type: DataTypes.INTEGER, allowNull: false, field: 'requester_id' },
  requesterRole: { type: DataTypes.STRING, allowNull: false, field: 'requester_role' },
  actionType: { type: DataTypes.STRING, allowNull: false, defaultValue: 'delete', field: 'action_type' },
  resourceType: { type: DataTypes.STRING, allowNull: false, field: 'resource_type' },
  resourceId: { type: DataTypes.STRING, allowNull: false, field: 'resource_id' },
  resourceLabel: { type: DataTypes.STRING, allowNull: false, field: 'resource_label' },
  reason: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
  reviewedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'reviewed_by' },
  reviewedAt: { type: DataTypes.DATE, allowNull: true, field: 'reviewed_at' },
  consumedAt: { type: DataTypes.DATE, allowNull: true, field: 'consumed_at' },
}, { tableName: 'admin_action_requests', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at', indexes: [{ name: 'admin_action_requests_pending_unique', unique: true, fields: ['requester_id', 'action_type', 'resource_type', 'resource_id'], where: { status: 'pending' } }] });
module.exports = AdminActionRequest;
