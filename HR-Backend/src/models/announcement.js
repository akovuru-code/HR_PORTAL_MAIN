const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Announcement = sequelize.define('Announcement', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  message: { type: DataTypes.TEXT, allowNull: false },
  audience: { type: DataTypes.STRING, defaultValue: 'All Users' }, // 'All Users' | 'Only Admin Users' | 'Only Employees'
  status: { type: DataTypes.STRING, defaultValue: 'Posted' },      // 'Posted' | 'Scheduled' | 'Expired'
  createdBy: { type: DataTypes.STRING },
  scheduledAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'announcements',
  timestamps: true,
});

module.exports = Announcement;
