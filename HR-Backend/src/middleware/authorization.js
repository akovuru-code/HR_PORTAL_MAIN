function accountType(user) {
  return String(user?.accountType || user?.account_type || user?.role || '').toLowerCase();
}

function requireRootAdmin(req, res, next) {
  if (accountType(req.user) !== 'root_admin') return res.status(403).json({ error: 'Root Admin access required' });
  next();
}

function requireAdmin(req, res, next) {
  const type = accountType(req.user);
  if (type !== 'root_admin' && type !== 'admin') return res.status(403).json({ error: 'Administrator access required' });
  next();
}

function requireRootOrAdminRole(...allowedRoles) {
  const normalizedRoles = allowedRoles.map(role => String(role).toLowerCase());
  return (req, res, next) => {
    if (accountType(req.user) === 'root_admin') return next();
    const adminRole = String(req.user?.adminRole || req.user?.admin_role || '').toLowerCase();
    if (accountType(req.user) === 'admin' && normalizedRoles.includes(adminRole)) return next();
    return res.status(403).json({ error: 'Insufficient permission' });
  };
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (accountType(req.user) === 'root_admin') return next();
    const permissions = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    if (!permissions.includes(permission)) return res.status(403).json({ error: `Missing permission: ${permission}` });
    next();
  };
}

function requireAnyPermission(permissions) {
  return (req, res, next) => {
    if (accountType(req.user) === 'root_admin') return next();
    const granted = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    if (!permissions.some(permission => granted.includes(permission))) return res.status(403).json({ error: 'Insufficient permission' });
    next();
  };
}

function requireEmployeeSelfOrPermission(permission, paramName = 'id') {
  return (req, res, next) => {
    const type = accountType(req.user);
    if (type === 'employee') {
      if (String(req.user.employeeId) !== String(req.params[paramName])) return res.status(403).json({ error: 'Employee records may only be accessed by their owner' });
      return next();
    }
    return requirePermission(permission)(req, res, next);
  };
}

function requireEmployeeOrPermission(permission) {
  return (req, res, next) => {
    if (accountType(req.user) === 'employee') return next();
    return requirePermission(permission)(req, res, next);
  };
}

function requireEmployeeSelfOrAnyPermission(permissions, paramName = 'employeeId') {
  return (req, res, next) => {
    if (accountType(req.user) === 'employee') {
      if (String(req.user.employeeId) !== String(req.params[paramName])) return res.status(403).json({ error: 'Employee records may only be modified by their owner' });
      return next();
    }
    if (accountType(req.user) === 'root_admin') return next();
    const granted = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    if (!permissions.some(permission => granted.includes(permission))) return res.status(403).json({ error: 'Insufficient permission' });
    next();
  };
}

module.exports = { accountType, requireRootAdmin, requireAdmin, requireRootOrAdminRole, requirePermission, requireAnyPermission, requireEmployeeSelfOrPermission, requireEmployeeOrPermission, requireEmployeeSelfOrAnyPermission };
