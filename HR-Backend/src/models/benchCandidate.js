const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const BenchCandidate = sequelize.define('BenchCandidate', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: 'Employee', key: 'employee_id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  resume_filename: { type: DataTypes.STRING, allowNull: true },
  resume_original_name: { type: DataTypes.STRING, allowNull: true },
  resume_mime_type: { type: DataTypes.STRING, allowNull: true },
  resume_uploaded_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'bench_candidates',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = BenchCandidate;
