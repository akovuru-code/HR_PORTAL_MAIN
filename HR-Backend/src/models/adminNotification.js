const { DataTypes } = require('sequelize');
const sequelize = require('./db');

// Persistent, recipient-specific dashboard alerts.  This complements the
// existing computed alerts without changing their behavior.
const AdminNotification = sequelize.define('AdminNotification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  recipientId: { type: DataTypes.INTEGER, allowNull: false, field: 'recipient_id' },
  type: { type: DataTypes.STRING, allowNull: false },
  resourceType: { type: DataTypes.STRING, allowNull: false, field: 'resource_type' },
  resourceId: { type: DataTypes.STRING, allowNull: false, field: 'resource_id' },
  payload: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  readAt: { type: DataTypes.DATE, allowNull: true, field: 'read_at' },
}, {
  tableName: 'admin_notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { name: 'admin_notifications_recipient_unread', fields: ['recipient_id', 'read_at'] },
    { name: 'admin_notifications_job_recipient_unique', unique: true, fields: ['recipient_id', 'type', 'resource_type', 'resource_id'] },
  ],
});

module.exports = AdminNotification;
