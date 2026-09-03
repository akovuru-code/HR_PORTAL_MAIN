const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'user_id'
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'password_hash'
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false
  },
  accountType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'employee',
    field: 'account_type',
  },
  adminRole: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'admin_role',
  },
  permissions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
  },
  mustChangePassword: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'must_change_password'
  },
  temporaryPasswordExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'temporary_password_expires_at'
  },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// User model functions
const createUser = async ({ email, password, role, accountType, adminRole, permissions, isActive }) => {
  const user = await User.create({ email, password, role, accountType, adminRole, permissions, isActive });
  return user.get({ plain: true });
};

const getUserByEmail = async (email) => {
  const user = await User.findOne({ where: { email } });
  return user ? user.get({ plain: true }) : null;
};

const getUserById = async (id) => {
  const user = await User.findByPk(id);
  return user ? user.get({ plain: true }) : null;
};

// Ensure users table exists on startup
User.sync();

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
  User,
};
