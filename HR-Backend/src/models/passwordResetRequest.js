const { DataTypes } = require('sequelize');
const sequelize = require('./db');
const { User } = require('./user');

// A dedicated record keeps password-reset state separate from ordinary employee
// edit requests and never stores a raw reset token or a password.
const PasswordResetRequest = sequelize.define('PasswordResetRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id', references: { model: User, key: 'user_id' } },
  reason: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
  reviewedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'reviewed_by', references: { model: User, key: 'user_id' } },
  reviewedAt: { type: DataTypes.DATE, allowNull: true, field: 'reviewed_at' },
  resetTokenHash: { type: DataTypes.STRING, allowNull: true, field: 'reset_token_hash' },
  resetTokenExpiresAt: { type: DataTypes.DATE, allowNull: true, field: 'reset_token_expires_at' },
  resetCompletedAt: { type: DataTypes.DATE, allowNull: true, field: 'reset_completed_at' },
  emailDeliveryStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: 'not_sent', field: 'email_delivery_status' },
  emailSentAt: { type: DataTypes.DATE, allowNull: true, field: 'email_sent_at' },
}, {
  tableName: 'password_reset_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { name: 'password_reset_requests_pending_user_unique', unique: true, fields: ['user_id'], where: { status: 'pending' } },
    { name: 'password_reset_requests_status_created', fields: ['status', 'created_at'] },
  ],
});

PasswordResetRequest.belongsTo(User, { as: 'requester', foreignKey: 'userId' });
PasswordResetRequest.belongsTo(User, { as: 'reviewer', foreignKey: 'reviewedBy' });

module.exports = PasswordResetRequest;
