require('dotenv').config();

const sequelize = require('../src/models/db');
const { User } = require('../src/models/user');

const PAYROLL_WRITE_PERMISSIONS = ['payroll:create', 'payroll:update', 'payroll:upload'];

async function synchronizeHrPayrollPermissions() {
  await sequelize.authenticate();
  const admins = await User.findAll({ where: { accountType: 'admin', adminRole: 'hr' } });
  let updated = 0;

  for (const admin of admins) {
    const permissions = Array.isArray(admin.permissions) ? admin.permissions : [];
    const synchronized = [...new Set([...permissions, ...PAYROLL_WRITE_PERMISSIONS])];
    if (synchronized.length !== permissions.length) {
      await admin.update({ permissions: synchronized });
      updated += 1;
    }
  }

  console.log(`HR Admin payroll permissions synchronized: ${updated} updated, ${admins.length} checked.`);
}

synchronizeHrPayrollPermissions()
  .catch(error => {
    console.error('Failed to synchronize HR Admin payroll permissions:', error);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
