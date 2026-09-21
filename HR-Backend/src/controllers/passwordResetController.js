const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const NodeCache = require('node-cache');
const sequelize = require('../models/db');
const { User } = require('../models/user');
const Employee = require('../models/employee');
const PasswordResetRequest = require('../models/passwordResetRequest');
const AuditLog = require('../models/auditLog');
const { sendPasswordResetEmail } = require('../services/passwordResetEmailService');

const requestCache = new NodeCache({ stdTTL: 15 * 60, checkperiod: 5 * 60 });
const GENERIC_MESSAGE = 'If the account is eligible, your password reset request has been submitted.';
const TOKEN_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || 30);
const validEmail = value => /^\S+@\S+\.\S+$/.test(value);
const tokenHash = token => crypto.createHash('sha256').update(token).digest('hex');

function requestKey(req, email) {
  return `${req.ip || 'unknown'}:${crypto.createHash('sha256').update(email).digest('hex')}`;
}

function expiryDate() {
  return new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);
}

function safeMailError(error) {
  const message = String(error?.message || 'Unknown mail error')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig, '[redacted email]');
  return { code: error?.code || null, command: error?.command || null, responseCode: error?.responseCode || null, message };
}

async function invalidateExpiredRequest(request) {
  if (request.status === 'approved' && request.resetTokenExpiresAt && new Date(request.resetTokenExpiresAt) <= new Date()) {
    await request.update({ status: 'expired', resetTokenHash: null, resetTokenExpiresAt: null });
    return true;
  }
  return false;
}

exports.submit = async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const reason = String(req.body?.reason || '').trim();
  if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (reason.length < 10) return res.status(400).json({ error: 'Please provide a reason with at least 10 characters.' });

  const key = requestKey(req, email);
  const attempts = requestCache.get(key) || 0;
  if (attempts >= 5) return res.status(429).json({ success: true, message: GENERIC_MESSAGE });
  requestCache.set(key, attempts + 1);

  try {
    const user = await User.findOne({ where: { email } });
    // Root Admin recovery is deliberately excluded: the only Root Admin must
    // never be able to approve their own password-reset request.
    if (!user || !user.isActive || user.accountType === 'root_admin') {
      return res.status(200).json({ success: true, message: GENERIC_MESSAGE });
    }

    const pending = await PasswordResetRequest.findOne({ where: { userId: user.id, status: 'pending' } });
    if (!pending) {
      try {
        const request = await PasswordResetRequest.create({ userId: user.id, reason, status: 'pending' });
        await AuditLog.create({ entity: 'PasswordResetRequest', entityId: request.id, action: 'requested', actorId: user.id, payload: {} });
      } catch (error) {
        if (error?.name !== 'SequelizeUniqueConstraintError') throw error;
      }
    }
    return res.status(200).json({ success: true, message: GENERIC_MESSAGE });
  } catch (error) {
    // Do not reveal account state or internal errors to the unauthenticated caller.
    return res.status(200).json({ success: true, message: GENERIC_MESSAGE });
  }
};

async function findUsableRequest(rawToken, transaction) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const request = await PasswordResetRequest.findOne({
    where: { resetTokenHash: tokenHash(rawToken), status: 'approved' },
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
  if (!request || await invalidateExpiredRequest(request)) return null;
  return request;
}

exports.validateToken = async (req, res) => {
  try {
    const request = await findUsableRequest(req.body?.token);
    if (!request) return res.status(400).json({ error: 'This password reset link is invalid or has expired.' });
    return res.json({ valid: true });
  } catch {
    return res.status(400).json({ error: 'This password reset link is invalid or has expired.' });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  try {
    const completed = await sequelize.transaction(async transaction => {
      const request = await findUsableRequest(token, transaction);
      if (!request) return false;
      const user = await User.findByPk(request.userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user || !user.isActive) return false;
      const password = await bcrypt.hash(newPassword, 10);
      await user.update({ password, mustChangePassword: false, temporaryPasswordExpiresAt: null }, { transaction });
      await request.update({ status: 'completed', resetTokenHash: null, resetTokenExpiresAt: null, resetCompletedAt: new Date() }, { transaction });
      await AuditLog.create({ entity: 'PasswordResetRequest', entityId: request.id, action: 'completed', actorId: user.id, payload: {} }, { transaction });
      return true;
    });
    if (!completed) return res.status(400).json({ error: 'This password reset link is invalid or has expired.' });
    return res.json({ success: true, message: 'Password updated successfully. You can now sign in.' });
  } catch {
    return res.status(500).json({ error: 'Unable to reset password. Please try again.' });
  }
};

exports.approve = async (req, res) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  try {
    const result = await sequelize.transaction(async transaction => {
      const request = await PasswordResetRequest.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!request) return { error: 'Password reset request not found.', status: 404 };
      if (!['pending', 'delivery_failed'].includes(request.status)) return { error: 'Request has already been processed.', status: 409 };
      if (String(request.userId) === String(req.user.id)) return { error: 'You cannot approve your own password reset request.', status: 403 };
      const user = await User.findByPk(request.userId, { transaction });
      if (!user || !user.isActive || user.accountType === 'root_admin') return { error: 'Request is no longer eligible.', status: 409 };
      const employee = await Employee.findOne({ where: { email: user.email }, attributes: ['presentEmployer'], transaction });
      await request.update({
        status: 'approved', reviewedBy: req.user.id, reviewedAt: new Date(),
        resetTokenHash: tokenHash(rawToken), resetTokenExpiresAt: expiryDate(),
        emailDeliveryStatus: 'pending', emailSentAt: null,
      }, { transaction });
      await AuditLog.create({ entity: 'PasswordResetRequest', entityId: request.id, action: 'approved', actorId: req.user.id, payload: {} }, { transaction });
      return { request, user, company: employee?.presentEmployer || null };
    });
    if (result.error) return res.status(result.status).json({ error: result.error });
    try {
      await sendPasswordResetEmail({ to: result.user.email, token: rawToken, company: result.company });
      await result.request.update({ emailDeliveryStatus: 'sent', emailSentAt: new Date() });
      return res.json({ success: true });
    } catch (error) {
      console.error('[password-reset] email delivery failed', { requestId: result.request.id, ...safeMailError(error) });
      await result.request.update({ status: 'delivery_failed', resetTokenHash: null, resetTokenExpiresAt: null, emailDeliveryStatus: 'failed' });
      await AuditLog.create({ entity: 'PasswordResetRequest', entityId: result.request.id, action: 'email_delivery_failed', actorId: req.user.id, payload: {} });
      return res.status(502).json({ error: 'The reset email could not be sent. Retry delivery after checking email configuration.' });
    }
  } catch {
    return res.status(500).json({ error: 'Unable to approve password reset request.' });
  }
};

exports.reject = async (req, res) => {
  try {
    const request = await PasswordResetRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ error: 'Password reset request not found.' });
    if (!['pending', 'delivery_failed'].includes(request.status)) return res.status(409).json({ error: 'Request has already been processed.' });
    if (String(request.userId) === String(req.user.id)) return res.status(403).json({ error: 'You cannot reject your own password reset request.' });
    await request.update({ status: 'rejected', reviewedBy: req.user.id, reviewedAt: new Date(), resetTokenHash: null, resetTokenExpiresAt: null });
    await AuditLog.create({ entity: 'PasswordResetRequest', entityId: request.id, action: 'rejected', actorId: req.user.id, payload: {} });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Unable to reject password reset request.' });
  }
};
