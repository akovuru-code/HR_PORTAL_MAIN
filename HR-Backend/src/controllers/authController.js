const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user');
const Employee = require('../models/employee');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

const presentUser = (user, extras = {}) => ({
  id: user.id, email: user.email, role: user.role,
  accountType: user.accountType || (String(user.role).toLowerCase() === 'admin' ? 'admin' : 'employee'),
  adminRole: user.adminRole || null,
  permissions: Array.isArray(user.permissions) ? user.permissions : [],
  ...extras,
});


// Admin Login
exports.login = async (req, res) => {
  const { email, password, role: requestedLoginType } = req.body;
  try {
    const user = await userModel.getUserByEmail(email);
    if (!user || user.isActive === false) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    const expiredTemporaryPassword = !!user.mustChangePassword && !!user.temporaryPasswordExpiresAt && new Date(user.temporaryPasswordExpiresAt) < new Date();
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (expiredTemporaryPassword) {
      return res.status(401).json({ error: 'Temporary password has expired' });
    }
    const accountType = user.accountType || (String(user.role).toLowerCase() === 'admin' ? 'admin' : 'employee');
    const selectedLoginType = String(requestedLoginType || '').trim().toLowerCase();
    const normalizedAccountType = String(accountType).toLowerCase();
    const actualLoginType = ['root_admin', 'admin'].includes(normalizedAccountType)
      ? 'admin'
      : normalizedAccountType === 'employee' ? 'employee' : null;
    if (!['admin', 'employee'].includes(selectedLoginType) || selectedLoginType !== actualLoginType) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    let name = null;
    let employeeId = null;
    try {
      const employee = await Employee.findOne({ where: { email: user.email } });
      if (employee) {
        const emp = employee.get({ plain: true });
        name = emp.name || [emp.firstName, emp.lastName].filter(Boolean).join(' ') || null;
        employeeId = emp.employee_id;
      }
    } catch (_) { /* employee lookup is best-effort */ }
    const token = jwt.sign({ id: user.id, employeeId }, JWT_SECRET, { expiresIn: '1d' });
    res.json({
      token,
      user: presentUser(user, { name, employeeId, accountType }),
      mustChangePassword: !!user.mustChangePassword,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Public registration must never create privileged accounts. Employee creation
// is performed through authorized Admin flows.
exports.register = async (req, res) => {
  const { email, password, fillingCompany, name } = req.body;
  const userRole = 'employee';
  try {
    const existing = await userModel.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await userModel.createUser({ email, password: hash, role: userRole, accountType: 'employee', permissions: [], isActive: true });
    if (userRole === "employee") {
      const [employee] = await Employee.findOrCreate({
        where: { email },
        defaults: {
          name,
          email,
          presentEmployer: fillingCompany,
        },
      });

      await employee.update({
        presentEmployer: fillingCompany,
        name,
      });

    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: presentUser(user)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await userModel.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    let name = null;
    let employeeId = null;
    let profileFields = {};
    try {
      const employee = await Employee.findOne({ where: { email: user.email } });
      if (employee) {
        const emp = employee.get({ plain: true });
        name = emp.name || [emp.firstName, emp.lastName].filter(Boolean).join(' ') || null;
        employeeId = emp.employee_id;
        profileFields = {
          firstName: emp.firstName || null,
          lastName: emp.lastName || null,
          phone: emp.phone || null,
          phoneCountry: emp.phoneCountry || null,
          aboutMe: emp.aboutMe || null,
          jobRole: emp.jobRole || null,
          jobDescription: emp.jobDescription || null,
          profileStatus: emp.profileStatus || null,
          statusDetails: emp.statusDetails || null,
          taskNotes: emp.taskNotes || null,
          profileImage: emp.photoUrl || null,
          notifPrefs: emp.notifPrefs || null,
          presentEmployer: emp.presentEmployer || null,
        };
      }
    } catch (_) { /* best-effort */ }
    console.log(`[getMe] returning profile for user=${user.email}, employeeId=${employeeId}, fields=${Object.keys(profileFields).join(', ')}`);
    res.json({ ...presentUser(user), name, employeeId, ...profileFields });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/auth/profile — update profile fields
exports.updateProfile = async (req, res) => {
  try {
    const user = await userModel.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { firstName, lastName, phone, phoneCountry, aboutMe, jobRole, jobDescription, profileStatus, statusDetails, taskNotes, profileImage, notifPrefs } = req.body;
    // findOrCreate so settings work even before onboarding creates an Employee record
    const [employee, created] = await Employee.findOrCreate({
      where: { email: user.email },
      defaults: { email: user.email },
    });
    console.log(`[updateProfile] employee ${created ? 'CREATED' : 'FOUND'} for email=${user.email}`);
    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (phone !== undefined) {
      updates.phone = phone;
      if (employee.isWhatsappSame) updates.whatsappPhone = phone;
    }
    if (phoneCountry !== undefined) updates.phoneCountry = phoneCountry;
    if (aboutMe !== undefined) updates.aboutMe = aboutMe;
    if (jobRole !== undefined) updates.jobRole = jobRole;
    if (jobDescription !== undefined) updates.jobDescription = jobDescription;
    if (profileStatus !== undefined) updates.profileStatus = profileStatus;
    if (statusDetails !== undefined) updates.statusDetails = statusDetails;
    if (taskNotes !== undefined) updates.taskNotes = taskNotes;
    if (profileImage !== undefined) updates.photoUrl = profileImage;
    if (notifPrefs !== undefined) updates.notifPrefs = notifPrefs;
    console.log(`[updateProfile] saving fields: ${Object.keys(updates).join(', ')}`);
    await employee.update(updates);
    console.log(`[updateProfile] saved OK for employee_id=${employee.employee_id}`);
    const emp = employee.get({ plain: true });
    const name = emp.name || [emp.firstName, emp.lastName].filter(Boolean).join(' ') || null;
    res.json({
      success: true,
      user: {
        ...presentUser(user), name, employeeId: emp.employee_id,
        firstName: emp.firstName, lastName: emp.lastName, phone: emp.phone, phoneCountry: emp.phoneCountry,
        aboutMe: emp.aboutMe, jobRole: emp.jobRole, jobDescription: emp.jobDescription,
        profileStatus: emp.profileStatus, statusDetails: emp.statusDetails,
        taskNotes: emp.taskNotes, profileImage: emp.photoUrl, notifPrefs: emp.notifPrefs,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/auth/email — change email (requires current password)
exports.changeEmail = async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    if (!newEmail || !password) return res.status(400).json({ error: 'newEmail and password are required' });
    const user = await userModel.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });
    const existing = await userModel.getUserByEmail(newEmail);
    if (existing && existing.id !== user.id) return res.status(409).json({ error: 'Email already in use' });
    const { User } = userModel;
    await User.update({ email: newEmail }, { where: { id: req.user.id } });
    await Employee.update({ email: newEmail }, { where: { email: user.email } });
    res.json({ success: true, email: newEmail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/auth/password — change password (requires current password)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    const user = await userModel.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Incorrect current password' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const hash = await bcrypt.hash(newPassword, 10);
    const { User } = userModel;
    await User.update({ password: hash, mustChangePassword: false, temporaryPasswordExpiresAt: null }, { where: { id: req.user.id } });
    res.json({ success: true, mustChangePassword: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

