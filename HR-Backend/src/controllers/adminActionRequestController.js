const { Op } = require('sequelize');
const AdminActionRequest = require('../models/adminActionRequest');
const AuditLog = require('../models/auditLog');
const Document = require('../models/document');
const { accountType } = require('../middleware/authorization');

// This is deliberately a policy map, not a second role system.  It only says
// which existing permission is required before a non-root admin may request a
// one-time action for a record they can already access.
const RESOURCE_TYPES = new Set(['employee', 'invoice', 'payroll', 'recruiting', 'client', 'vendor', 'prime_vendor', 'project', 'announcement', 'bench_candidate', 'document', 'company_job', 'timesheet_entry', 'timesheet_employee', 'client_employee_assignment', 'vendor_employee_assignment', 'prime_vendor_employee_assignment', 'project_employee_assignment']);
const permissionFor = {
  employee: 'employee:update', invoice: 'invoice:manage', payroll: 'payroll:update', recruiting: 'recruiting:manage',
  client: 'operations:manage', vendor: 'operations:manage', prime_vendor: 'operations:manage', project: 'operations:manage',
  announcement: 'announcements:manage', bench_candidate: 'recruiting:manage', document: 'documents:manage',
  company_job: 'recruiting:manage', timesheet_entry: 'timesheet:update', timesheet_employee: 'timesheet:update',
  client_employee_assignment: 'operations:manage', vendor_employee_assignment: 'operations:manage',
  prime_vendor_employee_assignment: 'operations:manage', project_employee_assignment: 'operations:manage',
};
const ACTION_TYPES = new Set(['edit', 'delete']);
function canRequest(user, resourceType) { return accountType(user) === 'admin' && (user.permissions || []).includes(permissionFor[resourceType]); }
function isRecruitingAdmin(user) { return accountType(user) === 'admin' && String(user?.adminRole || user?.admin_role || '').toLowerCase() === 'recruitment'; }
function isWorkInfoDocument(document) { return /^(work_|present_employer_|previous_employer_)/i.test(String(document?.document_type || '')); }

exports.create = async (req, res) => {
  const actionType = String(req.body?.actionType || 'delete').trim().toLowerCase(); const resourceType = String(req.body?.resourceType || '').trim(); const resourceId = String(req.body?.resourceId || '').trim(); const resourceLabel = String(req.body?.resourceLabel || '').trim(); const reason = String(req.body?.reason || '').trim();
  if (!ACTION_TYPES.has(actionType) || !RESOURCE_TYPES.has(resourceType) || !resourceId || !resourceLabel) return res.status(400).json({ error: 'A valid action and target record are required.' });
  if (!reason) return res.status(400).json({ error: 'Reason is required.' });
  if (accountType(req.user) === 'root_admin') return res.status(400).json({ error: `Root Admin can ${actionType} directly.` });
  if (!canRequest(req.user, resourceType)) return res.status(403).json({ error: 'You are not authorized for this module.' });
  try {
    if (resourceType === 'document' && isRecruitingAdmin(req.user)) {
      const document = await Document.findByPk(resourceId);
      if (document && isWorkInfoDocument(document)) return res.status(403).json({ error: 'Recruiting Admin cannot access Work Info documents' });
    }
    if (await AdminActionRequest.findOne({ where: { requesterId: req.user.id, actionType, resourceType, resourceId, status: { [Op.in]: ['pending', 'approved'] } } })) return res.status(409).json({ error: `An ${actionType} request is already pending or approved for this record.` });
    const request = await AdminActionRequest.create({ requesterId: req.user.id, requesterRole: req.user.adminRole || 'admin', actionType, resourceType, resourceId, resourceLabel, reason, status: 'pending' });
    await AuditLog.create({ entity: 'AdminActionRequest', entityId: request.id, action: `${actionType}_request_created`, actorId: req.user.id, payload: { resourceType, resourceId, reason } });
    res.status(201).json({ request });
  } catch (err) { if (err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'Delete request already pending.' }); res.status(500).json({ error: err.message }); }
};
exports.mine = async (req, res) => { const resourceType = String(req.query.resourceType || '').trim(); const actionType = String(req.query.actionType || '').trim(); const ids = String(req.query.resourceIds || '').split(',').map(x => x.trim()).filter(Boolean); const where = { requesterId: req.user.id }; if (ACTION_TYPES.has(actionType)) where.actionType = actionType; if (resourceType) where.resourceType = resourceType; if (ids.length) where.resourceId = { [Op.in]: ids }; const requests = await AdminActionRequest.findAll({ where, order: [['created_at', 'DESC']] }); res.json({ requests }); };
exports.approve = async (req, res) => { const request = await AdminActionRequest.findByPk(req.params.id); if (!request) return res.status(404).json({ error: 'Action request not found.' }); if (request.status !== 'pending') return res.status(409).json({ error: 'Request has already been processed.' }); await request.update({ status: 'approved', reviewedBy: req.user.id, reviewedAt: new Date() }); await AuditLog.create({ entity: 'AdminActionRequest', entityId: request.id, action: `${request.actionType}_request_approved`, actorId: req.user.id, payload: {} }); res.json({ request }); };
exports.reject = async (req, res) => { const request = await AdminActionRequest.findByPk(req.params.id); if (!request) return res.status(404).json({ error: 'Action request not found.' }); if (request.status !== 'pending') return res.status(409).json({ error: 'Request has already been processed.' }); await request.update({ status: 'rejected', reviewedBy: req.user.id, reviewedAt: new Date() }); await AuditLog.create({ entity: 'AdminActionRequest', entityId: request.id, action: `${request.actionType}_request_rejected`, actorId: req.user.id, payload: {} }); res.json({ request }); };
