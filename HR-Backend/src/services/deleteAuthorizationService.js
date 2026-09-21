const AdminActionRequest = require('../models/adminActionRequest');
const AuditLog = require('../models/auditLog');
const { accountType } = require('../middleware/authorization');

function requireApprovedAction(actionType, resourceType, idFromRequest = req => req.params.id) {
  return async (req, res, next) => {
    // Approval requests govern delegated admin CRUD only. Employee
    // self-service continues to use its existing ownership checks.
    if (accountType(req.user) !== 'admin') return next();
    const resourceId = String(idFromRequest(req));
    const request = await AdminActionRequest.findOne({ where: { requesterId: req.user.id, actionType, resourceType, resourceId, status: 'approved' }, order: [['reviewed_at', 'DESC']] });
    if (!request) return res.status(403).json({ error: `Root Admin approval is required to ${actionType} this specific record.` });
    req.adminActionApprovalRequest = request;
    next();
  };
}

function requireApprovedDelete(resourceType, idFromRequest = req => req.params.id) {
  return requireApprovedAction('delete', resourceType, idFromRequest);
}

function requireApprovedEdit(resourceType, idFromRequest = req => req.params.id) {
  return requireApprovedAction('edit', resourceType, idFromRequest);
}

async function consumeApprovedAction(req, actionType, resourceType, resourceId) {
  const request = req.adminActionApprovalRequest;
  if (!request) return;
  const [updated] = await AdminActionRequest.update({ status: 'consumed', consumedAt: new Date() }, { where: { id: request.id, requesterId: req.user.id, actionType, resourceType, resourceId: String(resourceId), status: 'approved' } });
  if (updated !== 1) throw new Error('Action approval is no longer valid.');
  await AuditLog.create({ entity: 'AdminActionRequest', entityId: request.id, action: `${actionType}_request_consumed`, actorId: req.user.id, payload: { resourceType, resourceId: String(resourceId) } });
}

function consumeDeleteApproval(req, resourceType, resourceId) { return consumeApprovedAction(req, 'delete', resourceType, resourceId); }
function consumeEditApproval(req, resourceType, resourceId) { return consumeApprovedAction(req, 'edit', resourceType, resourceId); }

module.exports = { requireApprovedAction, requireApprovedDelete, requireApprovedEdit, consumeApprovedAction, consumeDeleteApproval, consumeEditApproval };
