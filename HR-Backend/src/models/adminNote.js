const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const AdminNote = sequelize.define('AdminNote', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  text: { type: DataTypes.TEXT, allowNull: false },
}, {
  tableName: 'admin_notes',
  timestamps: true,
});

module.exports = AdminNote;
