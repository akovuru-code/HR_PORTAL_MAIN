const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  let user;
  try {
    user = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
  req.user = user;
  // Authorization is resolved from the database on every protected request so
  // disabled accounts and role changes take effect before JWT expiry.
  try {
    const userModel = require('../models/user');
    const dbUser = await userModel.getUserById(user.id);
    if (!dbUser || dbUser.isActive === false) return res.status(403).json({ error: 'Account is inactive or unavailable' });
    req.user = {
      ...user,
      email: dbUser.email,
      role: dbUser.role,
      accountType: dbUser.accountType || (String(dbUser.role).toLowerCase() === 'admin' ? 'admin' : 'employee'),
      adminRole: dbUser.adminRole || null,
      permissions: Array.isArray(dbUser.permissions) ? dbUser.permissions : [],
    };
  } catch (_) {
    return res.status(403).json({ error: 'Unable to verify account authorization' });
  }
  // Resolve employeeId from DB if not present in token (handles old tokens)
  if (!req.user.employeeId) {
    try {
      const userModel = require('../models/user');
      const Employee = require('../models/employee');
      const dbUser = await userModel.getUserById(user.id);
      if (dbUser) {
        const employee = await Employee.findOne({ where: { email: dbUser.email } });
        if (employee) req.user.employeeId = employee.employee_id;
      }
    } catch (_) { /* best-effort */ }
  }
  next();
}

module.exports = authenticateToken;
