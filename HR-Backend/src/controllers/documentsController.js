const Document = require('../models/document');
const Employee = require('../models/employee');
const AuditLog = require('../models/auditLog');
const { consumeDeleteApproval } = require('../services/deleteAuthorizationService');
const { isAdmin, visibleDocuments } = require('../utils/documentVisibility');
const { assertVarcharLengths, logVarcharLengthError, storageLengthResponse } = require('../utils/varcharLengthValidation');

function canManageCompanyCategory(user) {
  const accountType = String(user?.accountType || user?.account_type || user?.role || '').toLowerCase();
  const adminRole = String(user?.adminRole || user?.admin_role || '').toLowerCase();
  return accountType === 'root_admin' || (accountType === 'admin' && adminRole === 'hr');
}

function isCompanyCategory(payload) {
  return String(payload?.fileData?.categoryType || '').toLowerCase() === 'company' ||
    String(payload?.document_type || '').toLowerCase().startsWith('admin_company_');
}

function isRecruitingAdmin(user) {
  return String(user?.accountType || user?.role || '').toLowerCase() === 'admin' &&
    String(user?.adminRole || user?.admin_role || '').toLowerCase() === 'recruitment';
}

function isWorkInfoDocument(document) {
  return /^(work_|present_employer_|previous_employer_)/i.test(String(document?.document_type || ''));
}

function visibleToViewer(documents, user, employeeId) {
  const visible = visibleDocuments(documents, user, employeeId);
  const companyFiltered = canManageCompanyCategory(user)
    ? visible
    : visible.filter(document => !isCompanyCategory(document));
  if (!isRecruitingAdmin(user)) return companyFiltered;
  return companyFiltered.filter(document => !isWorkInfoDocument(document));
}


async function resolveEmployee(userId) {
  const userModel = require('../models/user');
  const user = await userModel.getUserById(userId);
  if (!user) return null;
  const [employee] = await Employee.findOrCreate({
    where: { email: user.email },
    defaults: { email: user.email },
  });
  return employee;
}

async function resolveEmployeeById(employeeId) {
  if (!employeeId) return null;
  const id = Number(employeeId);
  if (!Number.isInteger(id)) return null;
  return Employee.findByPk(id);
}

// GET /api/documents
exports.getDocuments = async (req, res) => {
  try {
    const employee = await resolveEmployee(req.user.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    const docs = await Document.findAll({
      where: { employee_id: employee.employee_id },
      order: [['document_id', 'ASC']],
    });
    res.json({ documents: visibleToViewer(docs, req.user, employee.employee_id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/documents/employee/:employeeId
exports.getDocumentsForEmployee = async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    if (!employeeId) {
      return res.status(400).json({ error: 'A valid employeeId is required' });
    }

    const employee = await resolveEmployeeById(employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const isAdminUser = isAdmin(req.user);
    const isSameEmployee = String(req.user?.employeeId || req.user?.id) === String(employeeId);

    if (!isAdminUser && !isSameEmployee) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const docs = await Document.findAll({
      where: { employee_id: employeeId },
      order: [['document_id', 'ASC']],
    });

    res.json({ documents: visibleToViewer(docs, req.user, employeeId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/documents/register
// body: { name, url, filename, originalName, document_type, fileData }
// Upserts by (employee_id + document_type) so re-uploading same doc type replaces it.
// If no document_type provided, always inserts (for multi-file sections like onboard docs).
exports.registerDocument = async (req, res) => {
  try {
    if (isCompanyCategory(req.body) && !canManageCompanyCategory(req.user)) {
      return res.status(403).json({ error: 'Only Root Admin and HR Admin can upload Company-category documents' });
    }
    if (isRecruitingAdmin(req.user) && isWorkInfoDocument(req.body)) {
      return res.status(403).json({ error: 'Recruiting Admin cannot access Work Info documents' });
    }
    const requestedEmployeeId = req.body.employeeId;
    const isAdminUser = isAdmin(req.user);
    const employee = requestedEmployeeId
      ? await resolveEmployeeById(requestedEmployeeId)
      : await resolveEmployee(req.user.id);
    if (requestedEmployeeId && !isAdminUser && String(req.user?.employeeId || req.user?.id) !== String(requestedEmployeeId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const { name, url, filename, originalName, document_type, fileData, expiry } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });
    // A staged Work Info upload is intentionally not a final employee
    // document. It is promoted atomically by onboarding submit instead.
    if (String(url).startsWith('/api/local-upload/staged/')) {
      return res.status(409).json({ error: 'Work Info documents are added only when the employee submits Work Info' });
    }

    // Restricted documents are administered on behalf of an employee, so retain
    // the actual authenticated administrator in the audit-facing label.
    const userModel = require('../models/user');
    const authUser = await userModel.getUserById(req.user.id);
    const modifiedBy = String(document_type || '').startsWith('restricted_')
      ? authUser?.email || authUser?.name || 'Unknown'
      : (employee.firstName && employee.lastName)
      ? `${employee.firstName} ${employee.lastName}`.trim()
      : authUser?.email || authUser?.name || 'Unknown';

    const uploader = {
      userId: req.user.id,
      employeeId: isAdminUser ? (req.user.employeeId || null) : employee.employee_id,
      role: isAdminUser ? 'admin' : 'employee',
    };
    const storedFileData = { ...(fileData || {}), uploadedBy: uploader };
    const documentValues = { name, url, filename, originalName, document_type, modifiedBy };
    assertVarcharLengths(Document, documentValues);
    let doc;
    if (document_type && document_type !== 'admin_doc') {
      const existing = await Document.findOne({
        where: { employee_id: employee.employee_id, document_type },
      });
      if (existing) {
        await existing.update({ name, url, filename, originalName, fileData: storedFileData, modifiedBy, expiry: expiry || null });
        doc = existing;
      } else {
        doc = await Document.create({ employee_id: employee.employee_id, name, url, filename, originalName, document_type, fileData: storedFileData, modifiedBy, expiry: expiry || null });
      }
    } else {
      doc = await Document.create({ employee_id: employee.employee_id, name, url, filename, originalName, document_type, fileData: storedFileData, modifiedBy, expiry: expiry || null });
    }

    res.json({ document: doc });
  } catch (err) {
    if (logVarcharLengthError(err, 'documents.registerDocument')) {
      return res.status(422).json(storageLengthResponse(err));
    }
    res.status(500).json({ error: err.message });
  }
};

// POST /api/documents
// body: { employeeId, url, type, filename }
exports.createDocument = async (req, res) => {
  const { employeeId, url, type, filename } = req.body;
  if (!employeeId || !url) return res.status(400).json({ error: 'Missing employeeId or url' });
  if (!isAdmin(req.user) && req.user.employeeId !== employeeId) return res.status(403).json({ error: 'Forbidden' });
  try {
    const doc = await Document.create({ employeeId, url, type, filename });
    await AuditLog.create({ entity: 'Document', entityId: doc.id, action: 'created', actorId: req.user.id, payload: { filename, url } });
    res.status(201).json({ document: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/documents/type/:documentType
exports.deleteByType = async (req, res) => {
  try {
    if (isRecruitingAdmin(req.user) && isWorkInfoDocument({ document_type: req.params.documentType })) {
      return res.status(403).json({ error: 'Recruiting Admin cannot access Work Info documents' });
    }
    const requestedEmployeeId = req.query.employeeId;
    const isAdminUser = isAdmin(req.user);
    const employee = requestedEmployeeId
      ? await resolveEmployeeById(requestedEmployeeId)
      : await resolveEmployee(req.user.id);
    if (requestedEmployeeId && !isAdminUser && String(req.user?.employeeId || req.user?.id) !== String(requestedEmployeeId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    await Document.destroy({
      where: { employee_id: employee.employee_id, document_type: req.params.documentType },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/documents/:docId
exports.deleteDocument = async (req, res) => {
  const id = parseInt(req.params.docId, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    const doc = await Document.findByPk(id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (isCompanyCategory(doc) && !canManageCompanyCategory(req.user)) {
      return res.status(403).json({ error: 'Company documents are available only to Root Admin and HR Admin' });
    }
    if (isRecruitingAdmin(req.user) && isWorkInfoDocument(doc)) {
      return res.status(403).json({ error: 'Recruiting Admin cannot access Work Info documents' });
    }
    if (!isAdmin(req.user) && req.user.employeeId !== doc.employeeId) return res.status(403).json({ error: 'Forbidden' });
    await doc.destroy();
    await consumeDeleteApproval(req, 'document', id);
    await AuditLog.create({ entity: 'Document', entityId: id, action: 'deleted', actorId: req.user.id, payload: {} });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = exports;
