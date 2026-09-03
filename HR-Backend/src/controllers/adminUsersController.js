const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User } = require('../models/user');
const { ROLE_PRESETS, ALL_PERMISSIONS, permissionsForRole } = require('../config/permissions');

const safeUser = user => ({
  id: user.id, email: user.email, accountType: user.accountType, adminRole: user.adminRole,
  permissions: user.permissions || [], isActive: user.isActive, createdAt: user.created_at || user.createdAt,
});

function validateAdminInput(body, { creating = false } = {}) {
  const adminRole = String(body.adminRole || '').toLowerCase();
  if (!ROLE_PRESETS[adminRole]) return { error: 'A valid adminRole is required' };
  const requested = body.permissions === undefined ? permissionsForRole(adminRole) : body.permissions;
  if (!Array.isArray(requested) || requested.some(p => !ALL_PERMISSIONS.includes(p) || p === 'admin:manage')) {
    return { error: 'Invalid permissions requested' };
  }
  if (creating && (!body.email || !body.password)) return { error: 'email and password are required' };
  return { adminRole, permissions: [...new Set(requested)] };
}

exports.listAdmins = async (_req, res) => {
  const admins = await User.findAll({ where: { accountType: { [Op.in]: ['root_admin', 'admin'] } }, order: [['created_at', 'ASC']] });
  res.json({ admins: admins.map(safeUser), rolePresets: ROLE_PRESETS });
};

exports.createAdmin = async (req, res) => {
  const input = validateAdminInput(req.body, { creating: true });
  if (input.error) return res.status(400).json({ error: input.error });
  if (await User.findOne({ where: { email: req.body.email.trim().toLowerCase() } })) return res.status(409).json({ error: 'Email already exists' });
  const password = await bcrypt.hash(req.body.password, 10);
  const admin = await User.create({
    email: req.body.email.trim().toLowerCase(), password, role: 'admin', accountType: 'admin',
    adminRole: input.adminRole, permissions: input.permissions, isActive: true,
  });
  res.status(201).json({ admin: safeUser(admin) });
};

exports.updateAdmin = async (req, res) => {
  const admin = await User.findByPk(req.params.id);
  if (!admin) return res.status(404).json({ error: 'Admin not found' });
  if (admin.accountType === 'root_admin') return res.status(403).json({ error: 'Root Admin cannot be modified through this endpoint' });
  const input = validateAdminInput(req.body);
  if (input.error) return res.status(400).json({ error: input.error });
  await admin.update({ adminRole: input.adminRole, permissions: input.permissions });
  res.json({ admin: safeUser(admin) });
};

exports.setAdminStatus = async (req, res) => {
  const admin = await User.findByPk(req.params.id);
  if (!admin) return res.status(404).json({ error: 'Admin not found' });
  if (admin.accountType === 'root_admin') return res.status(403).json({ error: 'Root Admin cannot be deactivated' });
  if (typeof req.body.isActive !== 'boolean') return res.status(400).json({ error: 'isActive must be a boolean' });
  await admin.update({ isActive: req.body.isActive });
  res.json({ admin: safeUser(admin) });
};

exports.deleteAdmin = async (req, res) => {
  const admin = await User.findByPk(req.params.id);
  if (!admin) return res.status(404).json({ error: 'Admin not found' });
  if (admin.accountType === 'root_admin') return res.status(403).json({ error: 'Root Admin cannot be deleted' });
  await admin.destroy();
  res.json({ success: true });
};
