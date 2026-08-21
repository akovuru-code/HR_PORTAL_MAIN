const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const OnboardingDraft = sequelize.define('OnboardingDraft', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  tab: { type: DataTypes.STRING, allowNull: false, defaultValue: 'personal' },
  data: { type: DataTypes.JSONB, allowNull: false },
}, {
  tableName: 'onboarding_drafts',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['employeeId', 'tab'] },
  ],
});

// Ensure table is updated with new column

module.exports = OnboardingDraft;
