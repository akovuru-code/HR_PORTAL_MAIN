const ROLE_PRESETS = {
  hr: ['dashboard:view', 'employee:read', 'employee:create', 'employee:update', 'employee:deactivate', 'employee_modification:approve', 'onboarding:manage', 'documents:manage', 'operations:manage', 'timesheet:view', 'payroll:view', 'payroll:create', 'payroll:update', 'payroll:upload', 'announcements:manage', 'support_tickets:view', 'calendar:view', 'recruiting:view'],
  // Legacy name retained so existing Admin records continue to work. It has
  // the same effective access as the new Accounts role.
  payroll: ['dashboard:view', 'employee:read', 'employee:invoice:view', 'timesheet:view', 'timesheet:approve', 'timesheet:update', 'payroll:view', 'payroll:create', 'payroll:update', 'payroll:upload', 'payroll:delete', 'invoice:manage', 'documents:manage', 'operations:manage', 'announcements:manage', 'support_tickets:view', 'calendar:view'],
  accounts: ['dashboard:view', 'employee:read', 'employee:invoice:view', 'timesheet:view', 'timesheet:approve', 'timesheet:update', 'payroll:view', 'payroll:create', 'payroll:update', 'payroll:upload', 'payroll:delete', 'invoice:manage', 'documents:manage', 'operations:manage', 'announcements:manage', 'support_tickets:view', 'calendar:view'],
  recruitment: ['dashboard:view', 'employee:read', 'recruiting:manage', 'documents:manage', 'calendar:view'],
  operations: ['employee:read', 'employee:create', 'employee:update', 'operations:manage'],
  general: ['dashboard:view', 'employee:read', 'employee:create', 'employee:update'],
};

const ALL_PERMISSIONS = [...new Set(Object.values(ROLE_PRESETS).flat().concat([
  'dashboard:view', 'employee:invoice:view', 'employee_modification:approve', 'timesheet:view', 'timesheet:approve', 'timesheet:update', 'payroll:view', 'payroll:create', 'payroll:update', 'payroll:upload', 'payroll:delete', 'announcements:manage', 'support_tickets:view', 'calendar:view', 'company:manage', 'admin:manage', 'recruiting:view',
]))];

function permissionsForRole(adminRole) {
  return ROLE_PRESETS[adminRole] ? [...ROLE_PRESETS[adminRole]] : [];
}

module.exports = { ROLE_PRESETS, ALL_PERMISSIONS, permissionsForRole };
