const { User } = require('../models/user');
const { Op, fn, col, where } = require('sequelize');
const AdminNotification = require('../models/adminNotification');

function displayName(user) {
  return user?.name || user?.email || `Admin #${user?.id || ''}`;
}

async function createJobOpeningNotifications({ job, creator, transaction }) {
  const recipients = await User.findAll({
    // Authentication accepts legacy role casing. Keep alert delivery aligned
    // with that behavior, while still targeting only active HR Admin accounts.
    where: {
      accountType: 'admin',
      isActive: true,
      [Op.and]: where(fn('LOWER', col('admin_role')), 'hr'),
    },
    attributes: ['id'],
    transaction,
  });
  if (!recipients.length) return [];

  const creatorRole = String(creator?.accountType || '').toLowerCase() === 'root_admin'
    ? 'Root Admin'
    : String(creator?.adminRole || creator?.admin_role || '').toLowerCase() === 'recruitment'
      ? 'Recruiting Admin'
      : 'Admin';
  const payload = {
    jobRole: job.role,
    technology: job.technology,
    experience: job.experience,
    createdBy: displayName(creator),
    creatorRole,
    createdAt: job.createdAt || new Date(),
  };
  return AdminNotification.bulkCreate(recipients.map(recipient => ({
    recipientId: recipient.id,
    type: 'job_opening_created',
    resourceType: 'company_job',
    resourceId: String(job.id),
    payload,
  })), { transaction });
}

module.exports = { createJobOpeningNotifications };
