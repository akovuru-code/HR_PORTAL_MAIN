const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const authenticateToken = require('../middleware/auth');
const { requireAdmin, requireRootAdmin, requireRootOrAdminRole, accountType } = require('../middleware/authorization');
const Employee = require('../models/employee');
const EditRequest = require('../models/editRequest');
const Document = require('../models/document');
const TimesheetEntry = require('../models/timesheetEntry');
const TimesheetWeeklySummary = require('../models/timesheetWeeklySummary');


const AdminNote = require('../models/adminNote');
const { getCompanyMailConfig, sendCompanyEmail } = require('../services/companyMailService');

const Announcement = require('../models/announcement');
const WorkEmployer = require('../models/workEmployer');
const WorkClientDetail = require('../models/workClientDetail');
const CompanySnapshot = require('../models/companySnapshot');
const Company = require('../models/company');
const Invoice = require('../models/invoice');
const VendorEmployeeRate = require('../models/vendorEmployeeRate');
const Recruiting = require('../models/recruiting');
const { User } = require('../models/user');
const AdminActionRequest = require('../models/adminActionRequest');
const AdminNotification = require('../models/adminNotification');
const PasswordResetRequest = require('../models/passwordResetRequest');
const PerformanceReportReplacementRequest = require('../models/performanceReportReplacementRequest');
const passwordResetController = require('../controllers/passwordResetController');
const { requireApprovedDelete, requireApprovedEdit, consumeDeleteApproval, consumeEditApproval } = require('../services/deleteAuthorizationService');
const { createTimesheetPdf, createMonthlyTimesheetPdf, safeFilenamePart } = require('../services/timesheetPdfService');
const { getTimesheetLetterhead } = require('../config/timesheetLetterheads');

function dateKeyFromUtcDate(date) { return date.toISOString().slice(0, 10); }
function canEditOrDeleteDocumentsDirectly(user) {
  return accountType(user) === 'root_admin';
}
function requireRootOrHrOrApprovedDocumentEdit(req, res, next) {
  if (canEditOrDeleteDocumentsDirectly(req.user)) return next();
  return requireApprovedEdit('document', request => request.params.id)(req, res, next);
}
function canViewCompanyDocuments(user) {
  const adminRole = String(user?.adminRole || user?.admin_role || '').toLowerCase();
  return accountType(user) === 'root_admin' || (accountType(user) === 'admin' && adminRole === 'hr');
}
function isCompanyDocument(document) {
  return String(document?.fileData?.categoryType || '').toLowerCase() === 'company' ||
    String(document?.document_type || '').toLowerCase().startsWith('admin_company_');
}
function isRecruitingAdmin(user) {
  return accountType(user) === 'admin' && String(user?.adminRole || user?.admin_role || '').toLowerCase() === 'recruitment';
}
function isWorkInfoDocument(document) {
  return /^(work_|present_employer_|previous_employer_)/i.test(String(document?.document_type || ''));
}
function normalizeWeekStart(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + (date.getUTCDay() === 0 ? -6 : 1 - date.getUTCDay()));
  return dateKeyFromUtcDate(date);
}
function weekDateKeys(weekStart) {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  return Array.from({ length: 7 }, (_, index) => { const date = new Date(start); date.setUTCDate(date.getUTCDate() + index); return dateKeyFromUtcDate(date); });
}
function monthDateBounds(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ''))) return null;
  const [year, month] = value.split('-').map(Number);
  if (month < 1 || month > 12) return null;
  const start = new Date(Date.UTC(year, month - 1, 1));
  if (start.getUTCFullYear() !== year || start.getUTCMonth() !== month - 1) return null;
  const end = new Date(Date.UTC(year, month, 0));
  return { start: dateKeyFromUtcDate(start), end: dateKeyFromUtcDate(end) };
}

async function timesheetLetterheadForEmployee(employee) {
  const registeredCompany = String(employee?.presentEmployer || '').trim();
  if (!registeredCompany) {
    const error = new Error('This employee does not have a registered company, so a timesheet letterhead cannot be selected.');
    error.status = 422;
    throw error;
  }

  const company = await Company.findOne({
    where: { name: registeredCompany },
    attributes: ['id', 'name'],
  });
  if (!company) {
    const error = new Error(`The registered company "${registeredCompany}" could not be found for this employee.`);
    error.status = 422;
    throw error;
  }

  const letterhead = getTimesheetLetterhead(company);
  if (!letterhead) {
    const error = new Error(`No timesheet letterhead is configured for ${company.name}.`);
    error.status = 422;
    throw error;
  }
  return letterhead;
}

function submissionStatus(entries) {
  const statuses = entries.map(entry => entry.status);
  if (statuses.some(status => status === 'Rejected')) return 'Rejected';
  if (statuses.every(status => status === 'Approved')) return 'Approved';
  return 'Submitted';
}

// Every /api/admin operation requires an administrative account. Fine-grained
// permission checks are applied as the RBAC rollout expands individual modules.
router.use(authenticateToken, requireAdmin, (req, res, next) => {
  if (accountType(req.user) === 'root_admin') return next();
  // Default-deny module policy for legacy /api/admin endpoints. New endpoints
  // should declare their permission explicitly instead of relying on this map.
  const path = req.path.toLowerCase();
  let permission = 'operations:manage';
  if (path === '/notes' || path.startsWith('/notes/')) return next();
  if (path === '/growth' || path === '/alerts' || path.startsWith('/alerts/') || path === '/status-summary') permission = 'dashboard:view';
  else if (path.includes('edit-requests')) permission = 'employee_modification:approve';
  else if (path.includes('timesheet')) {
    permission = (path.endsWith('/approve') || path.endsWith('/reject')) ? 'timesheet:approve'
      : req.method === 'GET' ? 'timesheet:view'
      : req.method === 'PATCH' && req.body?.status ? 'timesheet:approve'
      : 'timesheet:update';
  }
  else if (path.includes('invoice')) permission = 'invoice:manage';
  else if (path.includes('document')) permission = 'documents:manage';
  else if (path.includes('onboarding')) permission = 'onboarding:manage';
  else if (path === '/invite') permission = 'employee:create';
  else if (path.includes('employee')) permission = req.method === 'GET' ? 'employee:read' : 'employee:update';
  else if (path.includes('announcement')) permission = 'announcements:manage';
  else if (path.includes('client') || path.includes('vendor') || path.includes('project')) permission = 'operations:manage';
  if (!Array.isArray(req.user.permissions) || !req.user.permissions.includes(permission)) return res.status(403).json({ error: `Missing permission: ${permission}` });
  next();
});

// HR Admins retain Vendor read access through operations:manage, but Vendor
// mutations are intentionally reserved for the roles that already had them.
// This is route-specific so it does not change Client, Project, or any other
// operations-module permissions.
function denyHrVendorWrite(req, res, next) {
  const isHrAdmin = accountType(req.user) === 'admin'
    && String(req.user?.adminRole || req.user?.admin_role || '').toLowerCase() === 'hr';
  if (isHrAdmin) return res.status(403).json({ error: 'HR Admin has read-only Vendor access.' });
  next();
}

// Vendor audit metadata must be derived from the authenticated account, never
// from a display name supplied by the browser.
async function vendorAuditActor(req) {
  const email = String(req.user?.email || '').trim();
  if (email) {
    const employee = await Employee.findOne({ where: { email }, attributes: ['name', 'firstName', 'lastName'] });
    if (employee) {
      const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(' ').trim();
      if (fullName) return fullName;
      if (employee.name) return employee.name;
    }
    return email;
  }
  return 'Unknown User';
}

// POST /api/admin/invite
router.post('/invite', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, email, company, emailFrom, emailSubject, emailBody } = req.body;
    if (!email || !firstName) return res.status(400).json({ error: 'firstName and email are required' });

    const appUrl = process.env.APP_URL || 'http://44.205.69.161/login';
    const loginLink = `${appUrl}`;

    const emailBodyContent = `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">

<h2 style="color:#1a3353;">Welcome to ${company || 'the company'}, ${firstName}!</h2>
${emailBody ? `
<div style="margin-bottom:20px;">
  <p>${emailBody}</p>
</div>
` : ''}  
<p style="line-height:1.8;">
  Please use the following credentials to log in to the HR Portal.<br><br>

  <strong>Email ID:</strong> ${email}<br>
  <strong>Temporary Password:</strong> temp123<br><br>

  For security reasons, please change your password after your first login.
</p>

  <a href="${loginLink}" 
     style="display:inline-block;margin:16px 0;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
    Log In
  </a>
</div>
`;
    const config = getCompanyMailConfig(company);

    // Check whether email is configured for the selected company
    if (!config.user || !config.pass) {
      return res.status(500).json({
        error: `Email is not configured for ${company}`
      });
    }
    await sendCompanyEmail({
      company,
      to: email,
      subject: emailSubject || `Welcome to ${company || 'the company'} — Complete your Onboarding Process`,
      html: emailBodyContent,
    });

    res.json({ success: true, message: `Invitation sent to ${email}` });
  }

  catch (err) {
    console.error('[admin/invite] error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/alerts
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const alerts = [];

    const isRoot = accountType(req.user) === 'root_admin';
    const hasPermission = permission => isRoot || (req.user.permissions || []).includes(permission);
    const isHrAdmin = accountType(req.user) === 'admin'
      && String(req.user.adminRole || req.user.admin_role || '').toLowerCase() === 'hr';

    // Persistent, recipient-specific alerts currently used for Job Opening
    // notifications. Existing computed alerts below remain unchanged.
    const notifications = await AdminNotification.findAll({
      where: { recipientId: req.user.id, readAt: null },
      order: [['created_at', 'DESC']],
    });
    for (const notification of notifications) {
      if (notification.type !== 'job_opening_created') continue;
      // Do not expose legacy or misrouted job-opening notifications to a
      // non-HR account. Other alert types and their existing RBAC are intact.
      if (!isHrAdmin) continue;
      const data = notification.payload || {};
      alerts.push({
        type: 'job_opening',
        notificationId: notification.id,
        message: `New Job Opening: ${data.jobRole || `Job #${notification.resourceId}`}`,
        resourceType: notification.resourceType,
        resourceId: notification.resourceId,
        creatorName: data.createdBy || 'Admin',
        creatorRole: data.creatorRole || 'Admin',
        technology: data.technology || '',
        experience: data.experience || '',
        requestedAt: notification.createdAt,
      });
    }

    // 1. Pending edit requests are visible only to their authorized approvers.
    const editRequests = hasPermission('employee_modification:approve')
      ? await EditRequest.findAll({ where: { status: 'pending' } }) : [];
    if (editRequests.length > 0) {
      const erEmpIds = [...new Set(editRequests.map(er => er.employeeId).filter(Boolean))];
      const erEmployees = await Employee.findAll({
        where: { employee_id: { [Op.in]: erEmpIds } },
        attributes: ['employee_id', 'firstName', 'lastName'],
      });
      const erEmpMap = Object.fromEntries(erEmployees.map(e => [e.employee_id, e]));
      for (const er of editRequests) {
        // Password resets have a dedicated Root Admin-only workflow.
        if (er.requestType === 'PASSWORD_RESET_REQUEST') continue;
        const emp = erEmpMap[er.employeeId];
        const name = emp
          ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
          : 'An employee';
        const section = er.sectionKey || 'details';
        const message = `${name} requested to edit ${section} details`;
        alerts.push({ type: 'request', message, id: er.id, canApprove: true });
      }
    }

    // Dedicated password-reset alerts are visible to Root Admin only.
    if (isRoot) {
      const replacementRequests = await PerformanceReportReplacementRequest.findAll({
        where: { status: 'pending' },
        order: [['created_at', 'ASC']],
      });
      const replacementEmployeeIds = [...new Set(replacementRequests.map(request => request.employeeId))];
      const replacementEmployees = replacementEmployeeIds.length
        ? await Employee.findAll({ where: { employee_id: { [Op.in]: replacementEmployeeIds } }, attributes: ['employee_id', 'name', 'firstName', 'lastName', 'email'] })
        : [];
      const replacementEmployeeById = Object.fromEntries(replacementEmployees.map(employee => [employee.employee_id, employee]));
      for (const request of replacementRequests) {
        const employee = replacementEmployeeById[request.employeeId];
        const name = employee?.name || [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') || employee?.email || 'Employee';
        alerts.push({
          type: 'performance_report_replacement_request',
          requestKind: 'performance_report_replacement',
          id: request.id,
          canApprove: true,
          rootOnly: true,
          message: `${name} requested a Performance Report replacement`,
          employeeName: name,
          companyName: request.companyNameSnapshot,
          reviewType: request.reviewType === 'MID_YEAR' ? 'Mid-Year Performance Review' : 'Year-End Performance Review',
          reviewYear: request.reviewYear,
          reason: request.reason,
          requestedAt: request.createdAt,
          status: request.status,
        });
      }

      const resetRequests = await PasswordResetRequest.findAll({
        where: { status: { [Op.in]: ['pending', 'delivery_failed'] } },
        order: [['created_at', 'ASC']],
      });
      const requesterIds = [...new Set(resetRequests.map(request => request.userId))];
      const requesters = requesterIds.length
        ? await User.findAll({ where: { id: { [Op.in]: requesterIds } }, attributes: ['id', 'email'] })
        : [];
      const requesterById = Object.fromEntries(requesters.map(user => [user.id, user]));
      const emails = requesters.map(user => user.email).filter(Boolean);
      const employees = emails.length
        ? await Employee.findAll({ where: { email: { [Op.in]: emails } }, attributes: ['email', 'name', 'firstName', 'lastName'] })
        : [];
      const employeeByEmail = Object.fromEntries(employees.map(employee => [String(employee.email).toLowerCase(), employee]));
      for (const request of resetRequests) {
        const requester = requesterById[request.userId];
        const employee = employeeByEmail[String(requester?.email || '').toLowerCase()];
        const userName = employee?.name || [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') || requester?.email || 'User';
        alerts.push({
          type: 'password_reset_request',
          requestKind: 'password_reset',
          id: request.id,
          canApprove: true,
          deliveryFailed: request.status === 'delivery_failed',
          message: `${userName} requested a password reset`,
          resetUserName: userName,
          resetUserEmail: requester?.email || '',
          reason: request.reason,
          requestedAt: request.createdAt,
          status: request.status,
        });
      }
    }

    // Root Admin reviews one-time edit/delete permissions requested by other admins.
    if (isRoot) {
      const actionRequests = await AdminActionRequest.findAll({
        where: { status: 'pending' },
        order: [['created_at', 'ASC']],
      });
      const requesterIds = [...new Set(actionRequests.map(request => request.requesterId))];
      const requesters = requesterIds.length
        ? await User.findAll({ where: { id: { [Op.in]: requesterIds } }, attributes: ['id', 'email', 'adminRole'] })
        : [];
      const requesterById = Object.fromEntries(requesters.map(user => [user.id, user]));
      for (const request of actionRequests) {
        const requester = requesterById[request.requesterId];
        const requesterName = requester?.email || `Admin #${request.requesterId}`;
        alerts.push({
          type: 'admin_action_request',
          requestKind: 'admin_action',
          id: request.id,
          canApprove: true,
          message: `${requesterName} requested ${request.actionType} permission for ${request.resourceLabel}`,
          actionType: request.actionType,
          resourceType: request.resourceType,
          resourceLabel: request.resourceLabel,
          resourceId: request.resourceId,
          requesterName,
          requesterRole: requester?.adminRole || request.requesterRole || 'admin',
          status: request.status,
          reason: request.reason,
          requestedAt: request.createdAt,
        });
      }
    }

    // 2. Timesheet alerts go only to Root Admin and Timesheet approvers.
    const pendingTimesheets = hasPermission('timesheet:approve') ? await TimesheetEntry.findAll({
      where: { status: 'Submitted' },
      attributes: ['employee_id'],
      group: ['employee_id'],
    }) : [];
    if (pendingTimesheets.length > 0) {
      const empIds = pendingTimesheets.map(t => t.employee_id);
      const tsEmployees = await Employee.findAll({
        where: { employee_id: { [Op.in]: empIds } },
        attributes: ['employee_id', 'firstName', 'lastName'],
      });
      const empMap = Object.fromEntries(tsEmployees.map(e => [e.employee_id, e]));
      for (const t of pendingTimesheets) {
        const emp = empMap[t.employee_id];
        const name = emp
          ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
          : 'An employee';
        alerts.push({ type: 'pending', message: `${name}'s timesheet is pending approval` });
      }
    }

    // 3. Expiring documents from the Document table (expired or expiring within 60 days)
    const expiringDocs = await Document.findAll({
      where: { expiry: { [Op.lte]: in60Days, [Op.ne]: null } },
    });
    if (expiringDocs.length > 0) {
      const docEmpIds = [...new Set(expiringDocs.map(d => d.employee_id).filter(Boolean))];
      let docEmpMap = {};
      if (docEmpIds.length > 0) {
        const docEmps = await Employee.findAll({
          where: { employee_id: { [Op.in]: docEmpIds } },
          attributes: ['employee_id', 'firstName', 'lastName'],
        });
        docEmps.forEach(e => { docEmpMap[e.employee_id] = e; });
      }
      for (const doc of expiringDocs) {
        const emp = docEmpMap[doc.employee_id];
        const name = emp
          ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
          : 'An employee';
        const diffDays = Math.ceil((new Date(doc.expiry) - now) / (1000 * 60 * 60 * 24));
        const docType = doc.document_type || doc.name || 'document';
        const msg = diffDays < 0
          ? `${name}'s ${docType} expired ${Math.abs(diffDays)} days ago`
          : `${name}'s ${docType} is expiring in ${diffDays} days`;
        alerts.push({ type: 'expiry', message: msg });
      }
    }

    // 4. Expiring employee personal docs — query only the *Expiry fields (what the frontend writes to)
    const expiringPersonal = await Employee.findAll({
      where: {
        [Op.or]: [
          { passportExpiry: { [Op.lte]: in60Days, [Op.ne]: null } },
          { visaExpiry: { [Op.lte]: in60Days, [Op.ne]: null } },
          { dlExpiry: { [Op.lte]: in60Days, [Op.ne]: null } },
        ],
      },
      attributes: ['employee_id', 'firstName', 'lastName', 'passportExpiry', 'visaExpiry', 'dlExpiry'],
    });

    for (const emp of expiringPersonal) {
      const name =
        `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'An employee';
      const checks = [
        { date: emp.passportExpiry, label: 'passport' },
        { date: emp.visaExpiry, label: 'visa' },
        { date: emp.dlExpiry, label: 'driving license' },
      ];
      for (const { date, label } of checks) {
        if (!date) continue;
        const d = new Date(date);
        if (d <= in60Days) {
          const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
          const msg = diffDays < 0
            ? `${name}'s ${label} expired ${Math.abs(diffDays)} days ago`
            : `${name}'s ${label} is expiring in ${diffDays} days`;
          alerts.push({ type: 'expiry', message: msg });
        }
      }
    }

    const seen = new Set();
    const uniqueAlerts = alerts.filter(a => {
      if (seen.has(a.message)) return false;
      seen.add(a.message);
      return true;
    });

    res.json({ alerts: uniqueAlerts });
  } catch (err) {
    console.error('[admin/alerts] error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/timesheets — reviewable detailed entries and weekly quick submissions.
// Weekly quick entries are intentionally grouped by employee + Monday week start so an
// admin action can never accidentally affect another week for the same employee.
router.get('/timesheets', authenticateToken, async (req, res) => {
  try {
    const entries = await TimesheetEntry.findAll({
      where: { status: ['Submitted', 'Approved', 'Rejected'] },
      attributes: ['employee_id', 'dateKey', 'hours', 'project', 'client', 'status', 'adminComment', 'entrySource'],
    });

    const empIds = [...new Set(entries.map(e => e.employee_id))];
    if (!empIds.length) return res.json({ employees: [] });

    const [employees, weeklySummaries] = await Promise.all([
      Employee.findAll({
        where: { employee_id: { [Op.in]: empIds } },
        attributes: ['employee_id', 'firstName', 'lastName', 'name'],
      }),
      TimesheetWeeklySummary.findAll({
        where: { employeeId: { [Op.in]: empIds } },
      attributes: ['employeeId', 'weekStart', 'statusReport', 'projectName'],
      }),
    ]);
    const empMap = Object.fromEntries(employees.map(e => [e.employee_id, e]));
    const summaryMap = new Map(weeklySummaries.map(summary => [
      `${summary.employeeId}:${summary.weekStart}`,
      summary,
    ]));

    const grouped = {};
    const weeklyGroups = new Map();
    for (const entry of entries) {
      const eid = entry.employee_id;
      if (entry.entrySource === 'weekly_quick') {
        const weekStart = normalizeWeekStart(entry.dateKey);
        if (!weekStart) continue;
        const key = `${eid}:${weekStart}`;
        if (!weeklyGroups.has(key)) {
          const emp = empMap[eid];
          weeklyGroups.set(key, {
            id: `weekly:${eid}:${weekStart}`,
            employeeId: eid,
            submissionType: 'weekly_quick',
            weekStart,
            weekEnd: weekDateKeys(weekStart)[6],
            name: emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name : `Employee ${eid}`,
            // The source remains submissionType; project is an actual selected
            // project when the weekly submission has one.
            project: entry.project && entry.project !== 'Weekly Quick Entry' ? entry.project : '—',
            client: entry.client || '—',
            vendor: '—',
            hours: 0,
            status: 'Submitted',
            dailyHours: Object.fromEntries(weekDateKeys(weekStart).map(dateKey => [dateKey, 0])),
            adminComment: '',
            _entries: [],
          });
        }
        const group = weeklyGroups.get(key);
        group.hours += Number(entry.hours) || 0;
        group.dailyHours[entry.dateKey] = (group.dailyHours[entry.dateKey] || 0) + (Number(entry.hours) || 0);
        if (entry.adminComment) group.adminComment = entry.adminComment;
        if (entry.client && group.client === '—') group.client = entry.client;
        group._entries.push(entry);
        continue;
      }

      if (!grouped[eid]) {
        const emp = empMap[eid];
        grouped[eid] = {
          id: eid,
          employeeId: eid,
          submissionType: 'detailed',
          name: emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name : `Employee ${eid}`,
          project: entry.project || '—',
          client: entry.client || '—',
          vendor: '—',
          hours: 0,
          status: 'Submitted',
          adminComment: entry.adminComment || '',
        };
      }
      grouped[eid].hours += entry.hours || 0;
      if (entry.project && grouped[eid].project === '—') grouped[eid].project = entry.project;
      if (entry.client && grouped[eid].client === '—') grouped[eid].client = entry.client;
      if (entry.adminComment) grouped[eid].adminComment = entry.adminComment;
    }

    for (const eid of Object.keys(grouped)) {
      const empEntries = entries.filter(e => e.employee_id === parseInt(eid) && e.entrySource !== 'weekly_quick');
      grouped[eid].status = submissionStatus(empEntries);
    }

    const weeklySubmissions = Array.from(weeklyGroups.values()).map(group => {
      group.status = submissionStatus(group._entries);
      group.weeklyStatusReport = summaryMap.get(`${group.employeeId}:${group.weekStart}`)?.statusReport || '';
      delete group._entries;
      return group;
    });

    res.json({ employees: [...Object.values(grouped), ...weeklySubmissions] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/timesheets/:employeeId/weeks/:weekStart — exact weekly quick submission
router.get('/timesheets/:employeeId/weeks/:weekStart', authenticateToken, async (req, res) => {
  try {
    const weekStart = normalizeWeekStart(req.params.weekStart);
    if (!weekStart) return res.status(400).json({ error: 'weekStart must be a valid YYYY-MM-DD date' });
    const dateKeys = weekDateKeys(weekStart);
    const employeeId = Number(req.params.employeeId);
    if (!Number.isInteger(employeeId) || employeeId <= 0) return res.status(400).json({ error: 'Invalid employee ID' });

    const [entries, allWeekEntries, weeklySummary] = await Promise.all([
      TimesheetEntry.findAll({
        where: { employee_id: employeeId, dateKey: { [Op.in]: dateKeys }, entrySource: 'weekly_quick' },
        order: [['dateKey', 'ASC']],
      }),
      TimesheetEntry.findAll({
        where: { employee_id: employeeId, dateKey: { [Op.in]: dateKeys } },
        attributes: ['dateKey', 'hours'],
      }),
      TimesheetWeeklySummary.findOne({
        where: { employeeId, weekStart },
        attributes: ['weekStart', 'statusReport'],
      }),
    ]);
    if (!entries.length) return res.status(404).json({ error: 'Weekly quick-entry submission not found' });

    const dailyHours = Object.fromEntries(dateKeys.map(dateKey => [dateKey, 0]));
    allWeekEntries.forEach(entry => {
      dailyHours[entry.dateKey] = (dailyHours[entry.dateKey] || 0) + (Number(entry.hours) || 0);
    });
    res.json({
      submissionType: 'weekly_quick',
      employeeId,
      weekStart,
      weekEnd: dateKeys[6],
      entries: entries.map(entry => {
        const value = entry.toJSON();
        return value.project === 'Weekly Quick Entry' ? { ...value, project: null } : value;
      }),
      dailyHours,
      totalHours: Object.values(dailyHours).reduce((total, hours) => total + hours, 0),
      status: submissionStatus(entries),
      weeklyStatusReport: weeklySummary?.statusReport || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/timesheets/:employeeId/weeks/:weekStart/download
// The route is protected by the existing /api/admin timesheet:view policy.
router.get('/timesheets/:employeeId/weeks/:weekStart/download', authenticateToken, async (req, res) => {
  try {
    const weekStart = normalizeWeekStart(req.params.weekStart);
    const employeeId = Number(req.params.employeeId);
    if (!weekStart || !Number.isInteger(employeeId) || employeeId <= 0) return res.status(400).json({ error: 'A valid employee and week start date are required.' });
    const dates = weekDateKeys(weekStart);
    const [employee, entries, summary] = await Promise.all([
      Employee.findByPk(employeeId, { attributes: ['employee_id', 'firstName', 'lastName', 'name', 'presentEmployer'] }),
      TimesheetEntry.findAll({ where: { employee_id: employeeId, dateKey: { [Op.in]: dates } }, order: [['dateKey', 'ASC'], ['id', 'ASC']] }),
      TimesheetWeeklySummary.findOne({ where: { employeeId, weekStart }, attributes: ['weekStart', 'statusReport', 'projectName'] }),
    ]);
    if (!employee || !entries.length) return res.status(404).json({ error: 'Timesheet entries were not found for the selected employee and week.' });
    const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.name || `Employee ${employeeId}`;
    const letterhead = await timesheetLetterheadForEmployee(employee);
    const firstEntryWithValue = entries.find(entry => entry.client || entry.project);
    const pdf = await createTimesheetPdf({
      employeeName,
      letterhead,
      weekStart,
      weekEnd: dates[6],
      entries,
      status: submissionStatus(entries),
      statusReport: summary?.statusReport || '',
      projectName: summary?.projectName || firstEntryWithValue?.project || '',
      clientName: firstEntryWithValue?.client || '',
    });
    const filename = `${safeFilenamePart(employeeName).replace(/\s+/g, '_')}_Weekly_Timesheet_${weekStart}_to_${dates[6]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(pdf));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/admin/timesheets/:employeeId/months/:monthKey/download
// A calendar-month download deliberately queries dateKey boundaries rather
// than full weekly ranges, so overlapping weeks cannot leak adjacent dates.
router.get('/timesheets/:employeeId/months/:monthKey/download', authenticateToken, async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    const bounds = monthDateBounds(req.params.monthKey);
    if (!bounds || !Number.isInteger(employeeId) || employeeId <= 0) return res.status(400).json({ error: 'A valid employee and calendar month are required.' });

    const [employee, entries] = await Promise.all([
      Employee.findByPk(employeeId, { attributes: ['employee_id', 'firstName', 'lastName', 'name', 'presentEmployer'] }),
      TimesheetEntry.findAll({
        where: { employee_id: employeeId, dateKey: { [Op.between]: [bounds.start, bounds.end] } },
        order: [['dateKey', 'ASC'], ['id', 'ASC']],
      }),
    ]);
    if (!employee || !entries.length) return res.status(404).json({ error: 'Timesheet entries were not found for the selected employee and month.' });

    const weekStarts = [...new Set(entries.map(entry => normalizeWeekStart(entry.dateKey)).filter(Boolean))];
    const summaries = await TimesheetWeeklySummary.findAll({
      where: { employeeId, weekStart: { [Op.in]: weekStarts } },
      attributes: ['weekStart', 'statusReport'],
    });
    const summaryByWeek = new Map(summaries.map(summary => [summary.weekStart, summary]));
    const grouped = new Map();
    for (const entry of entries) {
      const weekStart = normalizeWeekStart(entry.dateKey);
      if (!grouped.has(weekStart)) grouped.set(weekStart, []);
      grouped.get(weekStart).push(entry);
    }
    const weeks = [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([weekStart, weekEntries]) => ({
      periodStart: weekEntries[0].dateKey,
      periodEnd: weekEntries[weekEntries.length - 1].dateKey,
      entries: weekEntries,
      status: submissionStatus(weekEntries),
      statusReport: summaryByWeek.get(weekStart)?.statusReport || '',
    }));
    const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.name || `Employee ${employeeId}`;
    const letterhead = await timesheetLetterheadForEmployee(employee);
    const pdf = await createMonthlyTimesheetPdf({ employeeName, letterhead, monthStart: bounds.start, monthEnd: bounds.end, weeks });
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(`${bounds.start}T00:00:00.000Z`)).replace(/\s+/g, '_');
    const filename = `${safeFilenamePart(employeeName).replace(/\s+/g, '_')}_Monthly_Timesheet_${monthName}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(pdf));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

async function updateWeeklyQuickSubmission(req, res, status) {
  const weekStart = normalizeWeekStart(req.params.weekStart);
  if (!weekStart) return res.status(400).json({ error: 'weekStart must be a valid YYYY-MM-DD date' });
  const employeeId = Number(req.params.employeeId);
  if (!Number.isInteger(employeeId) || employeeId <= 0) return res.status(400).json({ error: 'Invalid employee ID' });
  const [updated] = await TimesheetEntry.update(
    { status },
    {
      where: {
        employee_id: employeeId,
        dateKey: { [Op.in]: weekDateKeys(weekStart) },
        entrySource: 'weekly_quick',
        status: 'Submitted',
      },
    },
  );
  if (!updated) return res.status(404).json({ error: 'No submitted weekly quick-entry rows found for this week' });
  return res.json({ success: true, updated, status });
}

// These actions are scoped to the selected week, unlike the legacy employee-wide actions below.
router.post('/timesheets/:employeeId/weeks/:weekStart/approve', authenticateToken, async (req, res) => {
  try { await updateWeeklyQuickSubmission(req, res, 'Approved'); } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/timesheets/:employeeId/weeks/:weekStart/reject', authenticateToken, async (req, res) => {
  try { await updateWeeklyQuickSubmission(req, res, 'Rejected'); } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/timesheets/:employeeId/entries
router.get('/timesheets/:employeeId/entries', authenticateToken, async (req, res) => {
  try {
    const [entries, weeklySummaries] = await Promise.all([
      TimesheetEntry.findAll({
        where: { employee_id: req.params.employeeId },
        order: [['dateKey', 'ASC']],
      }),
      TimesheetWeeklySummary.findAll({
        where: { employeeId: req.params.employeeId },
        // The Admin viewer only needs the employee/week key and report text.
        // Requesting timestamp aliases here made PostgreSQL look for a quoted
        // "createdAt" column even though this table stores created_at.
        attributes: ['id', 'weekStart', 'statusReport'],
        order: [['week_start', 'ASC']],
      }),
    ]);
    // This additive field is keyed by the requested employee and is consumed
    // by the Admin Week view using the displayed Monday weekStart.
    // Legacy quick rows stored the source label in `project`. Preserve those
    // rows in the database, but never expose that method label as a project.
    const adminEntries = entries.map(entry => {
      const value = entry.toJSON();
      return value.entrySource === 'weekly_quick' && value.project === 'Weekly Quick Entry' ? { ...value, project: null } : value;
    });
    res.json({ entries: adminEntries, weeklySummaries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/timesheets/entry/:id — edit single entry
router.patch('/timesheets/entry/:id', authenticateToken, requireApprovedEdit('timesheet_entry'), async (req, res) => {
  try {
    const entry = await TimesheetEntry.findByPk(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    const { hours, status, adminComment } = req.body;
    const updates = {};
    if (hours !== undefined) updates.hours = parseFloat(hours);
    if (status !== undefined) updates.status = status;
    if (adminComment !== undefined) updates.adminComment = adminComment;
    await entry.update(updates);
    await consumeEditApproval(req, 'timesheet_entry', req.params.id);
    res.json({ entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/timesheets/:employeeId/approve
router.post('/timesheets/:employeeId/approve', authenticateToken, async (req, res) => {
  try {
    await TimesheetEntry.update(
      { status: 'Approved' },
      { where: { employee_id: req.params.employeeId, status: 'Submitted' } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/timesheets/:employeeId/reject
router.post('/timesheets/:employeeId/reject', authenticateToken, async (req, res) => {
  try {
    await TimesheetEntry.update(
      { status: 'Rejected' },
      { where: { employee_id: req.params.employeeId, status: 'Submitted' } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/timesheets/:employeeId/edit
router.patch('/timesheets/:employeeId/edit', authenticateToken, requireApprovedEdit('timesheet_employee', req => req.params.employeeId), async (req, res) => {
  try {
    const { hours } = req.body;
    const entries = await TimesheetEntry.findAll({
      where: { employee_id: req.params.employeeId, status: ['Submitted', 'Approved'] },
    });
    if (!entries.length) return res.status(404).json({ error: 'No entries found' });
    const hoursEach = parseFloat(hours) / entries.length;
    for (const entry of entries) await entry.update({ hours: hoursEach });
    await consumeEditApproval(req, 'timesheet_employee', req.params.employeeId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/timesheets/:employeeId/comment
router.post('/timesheets/:employeeId/comment', authenticateToken, async (req, res) => {
  try {
    const { comment } = req.body;
    await TimesheetEntry.update(
      { adminComment: comment },
      {
        where: {
          employee_id: req.params.employeeId, status: {
            [Op.in]: ['Submitted', 'Approved', 'Rejected']
          }
        }
      }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/employees
router.get('/employees', authenticateToken, async (req, res) => {
  try {
    // Employee profile rows can also be created for authenticated Admin users by
    // shared profile/dashboard flows. The Employee table itself has no account
    // type, so establish the authoritative employee-only set from users first.
    // This intentionally uses a positive account-type check so Root Admin and
    // every current/future Admin role are excluded without maintaining a list.
    const employeeAccounts = await User.findAll({
      where: { accountType: 'employee' },
      attributes: ['email'],
    });
    const employeeEmails = employeeAccounts
      .map(account => String(account.email || '').trim())
      .filter(Boolean);
    const normalizedEmployeeEmails = employeeEmails.map(email => email.toLowerCase());

    if (!employeeEmails.length) {
      return res.json({ employees: [] });
    }

    const employees = await Employee.findAll({
      where: Employee.sequelize.where(
        Employee.sequelize.fn('LOWER', Employee.sequelize.col('email')),
        { [Op.in]: normalizedEmployeeEmails },
      ),
      attributes: [
        'employee_id', 'firstName', 'lastName', 'name',
        'jobRole', 'visaType', 'clientName', 'address', 'presentAddress',
        'profileStatus', 'onboardingStatus', 'submittedTabs', 'createdAt', 'empTerminateDate', 'empTerminateComments',
      ],
    });

    const empIds = employees.map(e => e.employee_id);
    const workEmployers = await WorkEmployer.findAll({
      where: { employee_id: empIds },
      attributes: ['employee_id', 'type', 'designation', 'name'],
    });

    const presentSet = new Set(
      workEmployers.filter(w => w.type === 'present').map(w => w.employee_id)
    );
    const previousSet = new Set(
      workEmployers.filter(w => w.type === 'previous').map(w => w.employee_id)
    );
    // Map employee_id -> present employer designation, fallback to latest previous
    const designationMap = {};
    workEmployers.filter(w => w.designation).forEach(w => {
      if (w.type === 'present') designationMap[w.employee_id] = w.designation;
      else if (!designationMap[w.employee_id]) designationMap[w.employee_id] = w.designation;
    });

    const clientDetails = await WorkClientDetail.findAll({
      where: { employee_id: empIds, type: 'client' },
      attributes: ['employee_id', 'name'],
    });
    const clientMap = {};
    clientDetails.forEach(c => { if (!clientMap[c.employee_id]) clientMap[c.employee_id] = c.name; });

    const result = employees.map(emp => {
      const fullName = [emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.name || '—';
      const location = emp.presentAddress?.city || emp.presentAddress?.state || emp.address || '—';

      let empstat;

      if (emp.empTerminateDate) {
        empstat = 'previous';
      } else {
        empstat = 'present';
      }

      let endFormatted = '';
      if (emp.empTerminateDate) {
        const d = new Date(emp.empTerminateDate);
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        const yyyy = d.getUTCFullYear();
        endFormatted = `${mm}/${dd}/${yyyy}`;
      }

      return {
        id: emp.employee_id,
        name: fullName,
        title: designationMap[emp.employee_id] || emp.jobRole || '—',
        hired: emp.createdAt ? new Date(emp.createdAt).toLocaleDateString('en-US') : '—',
        terminateDate: endFormatted,
        empTerminateComments: emp.empTerminateComments || '',
        status: emp.profileStatus || 'On Bench',
        visa: emp.visaType || '—',
        location,
        client: clientMap[emp.employee_id] || emp.clientName || '—',
        empstat: empstat,
        onboardingStatus: emp.onboardingStatus,
        submittedTabs: emp.submittedTabs || {},
      };
    });

    res.json({ employees: result });
  } catch (err) {
    console.error('[admin/employees] error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/employee-training-status
// Read-only monitoring data. Employee Settings remains the sole writer for
// profileStatus and statusDetails; this route only projects saved values.
router.get('/employee-training-status', requireRootOrAdminRole('recruitment'), async (_req, res) => {
  try {
    const employeeAccounts = await User.findAll({
      where: { accountType: 'employee' },
      attributes: ['email'],
    });
    const employeeEmails = employeeAccounts
      .map(account => String(account.email || '').trim().toLowerCase())
      .filter(Boolean);

    if (!employeeEmails.length) return res.json({ employees: [] });

    const employees = await Employee.findAll({
      where: {
        profileStatus: 'In Training',
        [Op.and]: [Employee.sequelize.where(
          Employee.sequelize.fn('LOWER', Employee.sequelize.col('email')),
          { [Op.in]: employeeEmails },
        )],
      },
      attributes: ['employee_id', 'name', 'firstName', 'lastName', 'email', 'profileStatus', 'statusDetails'],
      order: [['firstName', 'ASC'], ['lastName', 'ASC'], ['name', 'ASC']],
    });

    res.json({
      employees: employees.map(employee => {
        const details = employee.statusDetails || {};
        return {
          employeeId: employee.employee_id,
          employeeName: [employee.firstName, employee.lastName].filter(Boolean).join(' ') || employee.name || employee.email || '—',
          email: employee.email || '',
          currentStatus: employee.profileStatus,
          trainingModules: details.trainingModules || '',
          certifications: details.certifications || '',
        };
      }),
    });
  } catch (err) {
    console.error('[admin/employee-training-status] error:', err);
    res.status(500).json({ error: 'Unable to load employee training status.' });
  }
});

// GET /api/admin/employee-associations
// Read-only consolidated view for Root, HR, Accounts, and Recruiting Admins. It derives
// every value from the existing employee, work-association, and vendor-rate
// records; this endpoint does not maintain a second copy of those fields.
router.get('/employee-associations', requireRootOrAdminRole('hr', 'accounts', 'payroll', 'recruitment'), async (req, res) => {
  try {
    // Employee profile rows also exist for some Admin accounts. The User
    // account type is the authoritative source for this employee-only view.
    const employeeAccounts = await User.findAll({
      where: { accountType: 'employee' },
      attributes: ['email'],
    });
    const employeeEmails = employeeAccounts
      .map(account => String(account.email || '').trim().toLowerCase())
      .filter(Boolean);
    if (!employeeEmails.length) {
      return res.json({ employees: [], filterOptions: { vendors: [], clients: [], visaStatuses: [] } });
    }

    const [employees, associationRows, vendorDefinitions, vendorRates] = await Promise.all([
      Employee.findAll({
        where: Employee.sequelize.where(
          Employee.sequelize.fn('LOWER', Employee.sequelize.col('email')),
          { [Op.in]: employeeEmails },
        ),
        attributes: ['employee_id', 'firstName', 'lastName', 'name', 'profileStatus', 'visaType'],
        order: [['firstName', 'ASC'], ['lastName', 'ASC'], ['name', 'ASC']],
      }),
      WorkClientDetail.findAll({
        where: {
          employee_id: { [Op.ne]: null },
          type: { [Op.in]: ['client', 'vendor', 'primeVendor'] },
        },
        attributes: ['employee_id', 'type', 'name'],
      }),
      WorkClientDetail.findAll({
        where: { employee_id: null, type: 'vendor' },
        attributes: ['id', 'name', 'meta'],
      }),
      VendorEmployeeRate.findAll({
        attributes: ['vendor_id', 'employee_id', 'rate'],
      }),
    ]);

    const uniqueValues = values => [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right));
    const associationMap = new Map();
    for (const row of associationRows) {
      const employeeId = row.employee_id;
      if (!associationMap.has(employeeId)) associationMap.set(employeeId, { client: [], vendor: [], primeVendor: [] });
      associationMap.get(employeeId)[row.type]?.push(row.name);
    }

    const vendorById = new Map(vendorDefinitions.map(vendor => [vendor.id, vendor]));
    const ratesByEmployee = new Map();
    for (const rate of vendorRates) {
      const vendor = vendorById.get(rate.vendor_id);
      const vendorName = String(vendor?.name || '').trim();
      const amount = Number(rate.rate);
      // A Vendor Employee Rate is valid for this view only when its Vendor ID
      // resolves to an existing, named Vendor definition. This prevents stale
      // rate records from being rendered as "—: 15.00/hr".
      if (!vendorName || !Number.isFinite(amount)) continue;
      if (!ratesByEmployee.has(rate.employee_id)) ratesByEmployee.set(rate.employee_id, []);
      ratesByEmployee.get(rate.employee_id).push({
        vendorId: vendor.id,
        vendorName,
        rate: amount,
        currency: String(vendor?.meta?.currency || '').trim() || null,
      });
    }

    const rows = employees.map(employee => {
      const associations = associationMap.get(employee.employee_id) || { client: [], vendor: [], primeVendor: [] };
      const employeeName = [employee.firstName, employee.lastName].filter(Boolean).join(' ') || String(employee.name || '').trim();
      // Employee records may be created as email-only placeholders before
      // Personal Info is completed. They are not association rows and are not
      // actionable in this named business overview, so leave them out here.
      if (!employeeName) return null;

      const validRateAssociations = ratesByEmployee.get(employee.employee_id) || [];
      const vendorNamesWithRates = new Set(validRateAssociations.map(item => item.vendorName.toLowerCase()));
      const vendorAssociations = [
        ...validRateAssociations,
        ...uniqueValues(associations.vendor)
          .filter(vendorName => !vendorNamesWithRates.has(vendorName.toLowerCase()))
          .map(vendorName => ({ vendorId: null, vendorName, rate: null, currency: null })),
      ].sort((left, right) => left.vendorName.localeCompare(right.vendorName));
      const vendorNames = uniqueValues(vendorAssociations.map(item => item.vendorName));
      const projectStatus = employee.profileStatus === 'In Project' ? 'In Project' : 'Not in Project';
      return {
        employeeId: employee.employee_id,
        employeeName,
        projectStatus,
        vendorNames,
        clientNames: uniqueValues(associations.client),
        primeVendorNames: uniqueValues(associations.primeVendor),
        vendorAssociations,
        visaStatus: String(employee.visaType || '').trim() || null,
      };
    }).filter(Boolean);

    const queryValue = key => String(req.query[key] || '').trim();
    const includesValue = (values, query) => !query || values.some(value => value.toLowerCase() === query.toLowerCase());
    const search = queryValue('search').toLowerCase();
    const projectStatus = queryValue('projectStatus');
    const vendor = queryValue('vendor');
    const client = queryValue('client');
    const visaStatus = queryValue('visaStatus');

    const filteredRows = rows.filter(row => (
      (!search || row.employeeName.toLowerCase().includes(search))
      && (!projectStatus || row.projectStatus === projectStatus)
      && includesValue(row.vendorNames, vendor)
      && includesValue(row.clientNames, client)
      && (!visaStatus || row.visaStatus?.toLowerCase() === visaStatus.toLowerCase())
    ));

    res.json({
      employees: filteredRows,
      filterOptions: {
        vendors: uniqueValues(rows.flatMap(row => row.vendorNames)),
        clients: uniqueValues(rows.flatMap(row => row.clientNames)),
        visaStatuses: uniqueValues(rows.map(row => row.visaStatus)),
      },
    });
  } catch (err) {
    console.error('[admin/employee-associations] error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/employees/:id/terminate-date
router.patch('/employees/:id/terminate-date', authenticateToken, requireApprovedEdit('employee'), async (req, res) => {
  try {
    const { empTerminateDate, empTerminateComments } = req.body;
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    let dbDate = null;
    if (empTerminateDate) {
      const parts = empTerminateDate.replace(/\//g, '-').split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // It's yyyy-mm-dd
          dbDate = `${parts[0]}-${parts[1]}-${parts[2]}T12:00:00.000Z`;
        } else {
          // It's mm-dd-yyyy
          dbDate = `${parts[2]}-${parts[0]}-${parts[1]}T12:00:00.000Z`;
        }
      }
    }
    const updates = {};

    if (empTerminateDate !== undefined && empTerminateDate !== '') {
      updates.empTerminateDate = dbDate;
    }

    if (empTerminateComments !== undefined && empTerminateComments !== '') {
      updates.empTerminateComments = empTerminateComments;
    }

    await employee.update(updates);
    await consumeEditApproval(req, 'employee', req.params.id);
    res.json({ success: true, empTerminateDate: employee.empTerminateDate });
  } catch (err) {
    console.error('[admin/employees/:id/terminate-date] error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/employees/:id
router.get('/employees/:id', authenticateToken, async (req, res) => {
  try {
    const emp = await Employee.findByPk(req.params.id, {
      attributes: [
        'employee_id', 'firstName', 'lastName', 'name', 'email',
        'visaType', 'ssn', 'sin', 'ni', 'tfn', 'pan', 'aadhaar', 'profileStatus', 'onboardingStatus',
        'address', 'presentAddress', 'jobRole', 'empTerminateDate',
        'empTerminateComments',
      ],
    });
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    // Fallback: get name/email from User table if Employee has no name
    let fallbackName = '';
    let fallbackEmail = emp.email || '';
    if (!emp.firstName && !emp.lastName && !emp.name) {
      try {
        const userModel = require('../models/user');
        const dbUser = await userModel.getUserByEmail(emp.email);
        if (dbUser) {
          fallbackName = dbUser.name || '';
          fallbackEmail = dbUser.email || fallbackEmail;
        }
      } catch (_) { }
    }

    const workEmployer = await WorkEmployer.findOne({
      where: { employee_id: emp.employee_id, type: 'present' },
      attributes: ['name', 'designation'],
    });
    const clientDetail = await WorkClientDetail.findOne({
      where: { employee_id: emp.employee_id, type: 'client' },
      attributes: ['name'],
    });

    res.json({
      id: emp.employee_id,
      name: [emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.name || fallbackName || '—',
      email: fallbackEmail || '—',
      ssn: emp.ssn || '—',
      sin: emp.sin || '—',
      ni: emp.ni || '—',
      tfn: emp.tfn || '—',
      pan: emp.pan || '—',
      aadhaar: emp.aadhaar || '—',
      visa: emp.visaType || '—',
      org: workEmployer?.name || '—',
      title: workEmployer?.designation || emp.jobRole || '—',
      client: clientDetail?.name || '—',
      location: emp.presentAddress?.city || emp.presentAddress?.state || emp.address || '—',
      status: emp.profileStatus || null,
      onboardingStatus: emp.onboardingStatus,
    });
  } catch (err) {
    console.error('[admin/employees/:id] error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper: shape an Invoice row for the frontend
function formatInvoice(inv) {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber || '',
    employeeName: inv.employeeName || '',
    status: inv.status || 'Generated',
    generatedDate: inv.generatedDate || '',
    invoiceFileName: inv.originalName || inv.filename || '',
    invoiceFileUrl: inv.url || '',
    createdBy: inv.createdBy || '',
    updatedBy: inv.updatedBy || '',
  };
}

// GET /api/admin/employees/:id/invoices
router.get('/employees/:id/invoices', authenticateToken, async (req, res) => {
  try {
    const invoices = await Invoice.findAll({ where: { employee_id: req.params.id }, order: [['id', 'ASC']] });
    res.json({ invoices: invoices.map(formatInvoice) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/employees/:id/invoices
router.post('/employees/:id/invoices', authenticateToken, async (req, res) => {
  try {
    const { invoiceNumber, employeeName, status, generatedDate, invoiceFileName, invoiceFileUrl, createdBy } = req.body;
    const invoice = await Invoice.create({
      employee_id: req.params.id,
      invoiceNumber,
      employeeName,
      status: status || 'Generated',
      generatedDate: generatedDate || null,
      url: invoiceFileUrl || null,
      originalName: invoiceFileName || null,
      createdBy: createdBy || '',
      updatedBy: '',
    });
    res.json({ invoice: formatInvoice(invoice) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/employees/:id/invoices/:invoiceId
router.patch('/employees/:id/invoices/:invoiceId', authenticateToken, requireApprovedEdit('invoice', req => req.params.invoiceId), async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ where: { id: req.params.invoiceId, employee_id: req.params.id } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const { invoiceNumber, employeeName, status, generatedDate, invoiceFileName, invoiceFileUrl, updatedBy } = req.body;
    await invoice.update({
      invoiceNumber: invoiceNumber ?? invoice.invoiceNumber,
      employeeName: employeeName ?? invoice.employeeName,
      status: status ?? invoice.status,
      generatedDate: generatedDate ?? invoice.generatedDate,
      url: invoiceFileUrl ?? invoice.url,
      originalName: invoiceFileName ?? invoice.originalName,
      updatedBy: updatedBy ?? invoice.updatedBy,
    });
    await invoice.reload();
    await consumeEditApproval(req, 'invoice', req.params.invoiceId);
    res.json({ invoice: formatInvoice(invoice) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/admin/employees/:id/invoices/:invoiceId
router.delete('/employees/:id/invoices/:invoiceId', authenticateToken, requireApprovedDelete('invoice', req => req.params.invoiceId), async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ where: { id: req.params.invoiceId, employee_id: req.params.id } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    await invoice.destroy();
    await consumeDeleteApproval(req, 'invoice', req.params.invoiceId);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/documents/:id
router.patch('/documents/:id', authenticateToken, requireRootOrHrOrApprovedDocumentEdit, async (req, res) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (isCompanyDocument(doc) && !canViewCompanyDocuments(req.user)) {
      return res.status(403).json({ error: 'Company documents are available only to Root Admin and HR Admin' });
    }
    if (isRecruitingAdmin(req.user) && isWorkInfoDocument(doc)) {
      return res.status(403).json({ error: 'Recruiting Admin cannot access Work Info documents' });
    }
    const { name, expiry, url, filename, originalName, fileData } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (expiry !== undefined) updates.expiry = expiry || null;
    if (url !== undefined) updates.url = url;
    if (filename !== undefined) updates.filename = filename;
    if (originalName !== undefined) updates.originalName = originalName;
    if (fileData !== undefined) updates.fileData = fileData;
    await doc.update(updates);
    await consumeEditApproval(req, 'document', req.params.id);
    res.json({ document: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/documents
router.get('/documents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const docs = await Document.findAll({
      order: [['document_id', 'DESC']],
    });
    const companyVisible = canViewCompanyDocuments(req.user) ? docs : docs.filter(document => !isCompanyDocument(document));
    res.json({ documents: isRecruitingAdmin(req.user) ? companyVisible.filter(document => !isWorkInfoDocument(document)) : companyVisible });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/status-summary
router.get('/status-summary', requireRootAdmin, async (req, res) => {
  try {
    const employees = await Employee.findAll({
      attributes: ['profileStatus'],
    });

    const counts = { 'In Project': 0, 'In Training': 0, 'On Bench': 0 };
    for (const emp of employees) {
      const s = emp.profileStatus || 'On Bench';
      if (counts[s] !== undefined) counts[s]++;
      else counts['On Bench']++;
    }

    const total = employees.length || 1;
    res.json({
      total: employees.length,
      inProject: { count: counts['In Project'], percent: Math.round((counts['In Project'] / total) * 100) },
      inTraining: { count: counts['In Training'], percent: Math.round((counts['In Training'] / total) * 100) },
      onBench: { count: counts['On Bench'], percent: Math.round((counts['On Bench'] / total) * 100) },
    });
  } catch (err) {
    console.error('[admin/status-summary] error:', err);
    res.status(500).json({ error: err.message });
  }
});

async function getDropdownItems(type) {
  const rows = await WorkClientDetail.findAll({
    attributes: ['id', 'type', 'name', 'meta', 'employee_id', 'vendor_name', 'client_name', 'prime_vendor_name'],
    order: [['name', 'ASC']],
  });

  const candidates = rows.flatMap((row) => {
    const meta = row.meta || {};
    const name = String(row.name || '').trim();
    const values = [];

    if (meta.status && String(meta.status).toLowerCase() === 'inactive') {
      return values;
    }

    if (row.type === type && name) {
      values.push({ id: row.id, name });
    }

    if (type === 'vendor') {
      const vendorName = String(row.vendor_name || '').trim();
      if (vendorName) values.push({ id: row.id, name: vendorName });
    } else if (type === 'client') {
      const clientName = String(row.client_name || '').trim();
      if (clientName) values.push({ id: row.id, name: clientName });
    } else if (type === 'primeVendor') {
      const primeVendorName = String(row.prime_vendor_name || '').trim();
      if (primeVendorName) values.push({ id: row.id, name: primeVendorName });
    }

    return values;
  });

  return candidates.filter((item, index, self) => {
    const normalized = item.name.toLowerCase();
    return self.findIndex((entry) => entry.name.toLowerCase() === normalized) === index;
  });
}

// Helper: group work_client_details by name for a given type
async function getGroupedByType(type) {
  const rows = await WorkClientDetail.findAll({ where: { type } });
  const empIds = [...new Set(rows.map(r => r.employee_id).filter(Boolean))];

  let empMap = {};
  let radioMap = {}; // employee_id -> parsed radioStates JSON

  if (empIds.length) {
    const emps = await Employee.findAll({
      where: { employee_id: { [Op.in]: empIds } },
      attributes: ['employee_id', 'firstName', 'lastName'],
    });
    emps.forEach(e => { empMap[e.employee_id] = `${e.firstName || ''} ${e.lastName || ''}`.trim(); });

    // Fetch radioStates for these employees
    const radioRows = await WorkClientDetail.findAll({
      where: { employee_id: { [Op.in]: empIds }, type: 'radioStates' },
      attributes: ['employee_id', 'name', 'meta'],
    });
    radioRows.forEach(r => {
      if (r.meta?.radioStates && typeof r.meta.radioStates === 'object') {
        radioMap[r.employee_id] = r.meta.radioStates;
        return;
      }
      // Legacy rows stored the same JSON string in `name`.
      try { radioMap[r.employee_id] = JSON.parse(r.name || '{}'); } catch { radioMap[r.employee_id] = {}; }
    });
  }

  const grouped = {};
  rows.forEach(row => {
    const key = row.name || '—';
    const radio = radioMap[row.employee_id] || {};
    const meta = row.meta || null;

    if (!grouped[key]) {
      grouped[key] = {
        id: row.id,
        name: key,
        startDate: row.start_date || '',
        endDate: row.end_date || '',
        address: row.address || '',
        contact: row.phone || row.email || '',
        // Employee Work Info stores the number and dialing code separately.
        // Keep the code in the Admin Vendors projection so View Details can
        // render it without modifying the stored phone number.
        contactCountryCode: row.country_code || meta?.phoneCountryCode || meta?.countryCode || '',
        status: 'Active',
        members: 0,
        vendor: { enabled: false, name: '', startDate: '', endDate: '' },
        primeVendor: { enabled: false, name: '', startDate: '', endDate: '' },
        client: { enabled: false, name: '', startDate: '', endDate: '' },
        comment: '',
        billingContactName: '',
        billingEmail: '',
        billingAddress: '',
        billingAddressSameAsVendorAddress: false,
        paymentTerms: 'Net 30',
        currency: 'USD',
        createdBy: '',
        updatedBy: '',
        employees: [],
        editable: false,
        _employeeCount: 0,
        _metaMembers: null,
      };
    }

    if (row.employee_id === null && meta && !meta.assignedByAdmin) {
      // Shared admin-created definition entry: use rich metadata as-is.
      // Employee Work Info rows can also have metadata, but must never be
      // exposed as editable admin entries.
      grouped[key].id = row.id;
      grouped[key].editable = true;
      grouped[key].startDate = row.start_date || grouped[key].startDate;
      grouped[key].endDate = row.end_date || grouped[key].endDate;
      grouped[key].address = row.address || grouped[key].address;
      grouped[key].contact = row.phone || grouped[key].contact;
      grouped[key].contactCountryCode = row.country_code || meta.phoneCountryCode || meta.countryCode || grouped[key].contactCountryCode;
      if (meta.status) grouped[key].status = meta.status;
      if (meta.comment) grouped[key].comment = meta.comment;
      if (meta.members !== undefined && meta.members !== null) grouped[key]._metaMembers = meta.members;
      if (meta.createdBy) grouped[key].createdBy = meta.createdBy;
      if (meta.updatedBy) grouped[key].updatedBy = meta.updatedBy;
      if (meta.vendor) grouped[key].vendor = meta.vendor;
      if (meta.primeVendor) grouped[key].primeVendor = meta.primeVendor;
      if (meta.client) grouped[key].client = meta.client;
      grouped[key].billingContactName = meta.billingContactName || '';
      grouped[key].billingEmail = meta.billingEmail || '';
      grouped[key].billingAddress = meta.billingAddress || '';
      grouped[key].billingAddressSameAsVendorAddress = !!meta.billingAddressSameAsVendorAddress;
      grouped[key].paymentTerms = meta.paymentTerms || 'Net 30';
      grouped[key].customNetDays = meta.customNetDays || null;
      grouped[key].currency = meta.currency || 'USD';
    } else if (row.employee_id) {
      // Employee association row: either self-submitted (no meta) or admin-assigned (meta.assignedByAdmin)
      const removable = !!meta?.assignedByAdmin;

      if (!removable) {
        // Self-submitted: derive vendor/primeVendor/client names from radioStates
        let vendorName = row.vendor_name || '';
        let primeVendorName = row.prime_vendor_name || '';
        let clientName = row.client_name || '';

        if (type === 'client') {
          if (!vendorName) vendorName = radio.clientVendorName || '';
          if (!primeVendorName) primeVendorName = radio.clientPrimeVendorName || '';
        } else if (type === 'vendor') {
          if (!clientName) clientName = radio.vendorClientNames?.[0] || '';
          if (!primeVendorName) primeVendorName = radio.vendorPrimeNames?.[0] || '';
        } else if (type === 'primeVendor') {
          if (!clientName) clientName = radio.primeClientNames?.[0] || '';
          if (!vendorName) vendorName = radio.primeVendorNames?.[0] || '';
        }

        if (!grouped[key].vendor.enabled && vendorName) grouped[key].vendor = { enabled: true, name: vendorName, startDate: '', endDate: '' };
        if (!grouped[key].primeVendor.enabled && primeVendorName) grouped[key].primeVendor = { enabled: true, name: primeVendorName, startDate: '', endDate: '' };
        if (!grouped[key].client.enabled && clientName) grouped[key].client = { enabled: true, name: clientName, startDate: '', endDate: '' };
      }

      grouped[key]._employeeCount++;
      const empName = empMap[row.employee_id];
      if (empName) {
        const existing = grouped[key].employees.find(e => e.employeeId === row.employee_id);
        if (existing) {
          existing.removable = existing.removable && removable;
        } else {
          grouped[key].employees.push({ employeeId: row.employee_id, name: empName, removable });
        }
      }
    }

    // Rows sharing a vendor name can be grouped together. Preserve the first
    // available dialing code even when the first grouped row had none.
    if (!grouped[key].contactCountryCode) {
      grouped[key].contactCountryCode = row.country_code || meta?.phoneCountryCode || meta?.countryCode || '';
    }
  });

  const now = new Date();
  const values = Object.values(grouped).map(item => {
    item.members = item._metaMembers !== null ? item._metaMembers : item._employeeCount;
    delete item._employeeCount;
    delete item._metaMembers;
    if (item.endDate && new Date(item.endDate) < now) item.status = 'Inactive';
    return item;
  });
  if (type === 'vendor') {
    const vendorIds = values.map(item => item.id).filter(Boolean);
    const rates = vendorIds.length ? await VendorEmployeeRate.findAll({ where: { vendor_id: { [Op.in]: vendorIds } } }) : [];
    const employeeIds = [...new Set(rates.map(rate => rate.employee_id))];
    const employees = employeeIds.length ? await Employee.findAll({ where: { employee_id: { [Op.in]: employeeIds } }, attributes: ['employee_id', 'firstName', 'lastName', 'name'] }) : [];
    const names = Object.fromEntries(employees.map(employee => [employee.employee_id, `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.name || 'Employee']));
    values.forEach(item => {
      const employeeRates = rates
        .filter(rate => rate.vendor_id === item.id)
        .map(rate => ({ employeeId: rate.employee_id, name: names[rate.employee_id] || 'Employee', rate: Number(rate.rate) }));
      item.employeeRates = employeeRates;

      // Employee/rate rows created in the Vendor form live in
      // vendor_employee_rates, not in work_client_details. Merge that same
      // persisted mapping into the details projection so the UI has one
      // complete employee list without creating duplicate associations.
      employeeRates.forEach(rateEntry => {
        const existingEmployee = item.employees.find(employee => employee.employeeId === rateEntry.employeeId);
        if (existingEmployee) {
          existingEmployee.rate = rateEntry.rate;
        } else {
          item.employees.push({ ...rateEntry, removable: false });
        }
      });
    });
  }
  return values;
}

async function syncVendorEmployeeRates(vendorId, employeeRates = []) {
  if (!Array.isArray(employeeRates)) throw new Error('employeeRates must be an array');
  const seen = new Set();
  const normalized = employeeRates.map(entry => {
    const employeeId = Number(entry.employeeId);
    const rate = Number(entry.rate);
    if (!Number.isInteger(employeeId) || !Number.isFinite(rate) || rate < 0) throw new Error('Each employee rate must use an existing employee and a rate of 0 or greater');
    if (seen.has(employeeId)) throw new Error('An employee can have only one rate per Vendor');
    seen.add(employeeId);
    return { employee_id: employeeId, rate };
  });
  const count = normalized.length ? await Employee.count({ where: { employee_id: { [Op.in]: normalized.map(item => item.employee_id) } } }) : 0;
  if (count !== normalized.length) throw new Error('One or more selected employees do not exist');
  await VendorEmployeeRate.destroy({ where: { vendor_id: vendorId } });
  if (normalized.length) await VendorEmployeeRate.bulkCreate(normalized.map(item => ({ ...item, vendor_id: vendorId })));
}

// Helper: build work_client_details columns + meta from a client/vendor/primeVendor form payload
function buildWorkClientFields(body, existingMeta = {}, auditActor = '') {
  const { name, status, startDate, endDate, members, contact, address, comment, vendor, primeVendor, client, billingContactName, billingEmail, billingAddress, billingAddressSameAsVendorAddress, paymentTerms, customNetDays, currency } = body;
  if (!name) throw new Error('name is required');
  if (paymentTerms === 'Custom' && (!Number.isInteger(Number(customNetDays)) || Number(customNetDays) <= 0)) throw new Error('Custom Net Days must be a positive whole number');

  return {
    columns: {
      name,
      address: address || null,
      start_date: startDate || null,
      end_date: endDate || null,
      phone: contact || null,
      has_vendor: !!(vendor && vendor.enabled),
      vendor_name: vendor?.enabled ? vendor.name : null,
      has_prime_vendor: !!(primeVendor && primeVendor.enabled),
      prime_vendor_name: primeVendor?.enabled ? primeVendor.name : null,
      has_client: !!(client && client.enabled),
      client_name: client?.enabled ? client.name : null,
    },
    meta: {
      source: existingMeta.source || 'admin_vendor',
      status: status || 'Active',
      comment: comment || '',
      members: members ?? 0,
      createdBy: existingMeta.createdBy || auditActor || '',
      updatedBy: auditActor || existingMeta.updatedBy || '',
      vendor: vendor || { enabled: false, name: '', startDate: '', endDate: '' },
      primeVendor: primeVendor || { enabled: false, name: '', startDate: '', endDate: '' },
      client: client || { enabled: false, name: '', startDate: '', endDate: '' },
      billingContactName: billingContactName || '',
      billingEmail: billingEmail || '',
      billingAddressSameAsVendorAddress: !!billingAddressSameAsVendorAddress,
      billingAddress: billingAddressSameAsVendorAddress ? (address || '') : (billingAddress || ''),
      paymentTerms: paymentTerms || 'Net 30',
      customNetDays: paymentTerms === 'Custom' ? Number(customNetDays) : null,
      currency: currency || 'USD',
    },
  };
}

// Helper: shape a work_client_details row (admin-created) for the frontend
function formatWorkClientEntry(row) {
  const meta = row.meta || {};
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    address: row.address || '',
    contact: row.phone || '',
    status: meta.status || 'Active',
    members: meta.members ?? 0,
    vendor: meta.vendor || { enabled: false, nyame: '', startDate: '', endDate: '' },
    primeVendor: meta.primeVendor || { enabled: false, name: '', startDate: '', endDate: '' },
    client: meta.client || { enabled: false, name: '', startDate: '', endDate: '' },
    comment: meta.comment || '',
    billingContactName: meta.billingContactName || '',
    billingEmail: meta.billingEmail || '',
    billingAddressSameAsVendorAddress: !!meta.billingAddressSameAsVendorAddress,
    billingAddress: meta.billingAddress || '',
    paymentTerms: meta.paymentTerms || 'Net 30',
    customNetDays: meta.customNetDays || null,
    currency: meta.currency || 'USD',
    createdBy: meta.createdBy || '',
    updatedBy: meta.updatedBy || '',
    employees: [],
    editable: true,
  };
}

// Helper: create an admin-defined client/vendor/primeVendor entry (employee_id null)
async function createWorkClientEntry(type, body, auditActor = '') {
  const { columns, meta } = buildWorkClientFields(body, {}, auditActor);
  const row = await WorkClientDetail.create({ employee_id: null, type, ...columns, meta });
  if (type === 'vendor' && body.employeeRates) await syncVendorEmployeeRates(row.id, body.employeeRates);
  const formatted = formatWorkClientEntry(row);
  if (type === 'vendor') formatted.employeeRates = (body.employeeRates || []).map(item => ({ employeeId: Number(item.employeeId), rate: Number(item.rate) }));
  return formatted;
}

// Helper: update an admin-defined entry (only allowed for employee_id IS NULL rows)
async function updateWorkClientEntry(type, id, body, auditActor = '') {
  const row = await WorkClientDetail.findOne({ where: { id, type, employee_id: null } });
  if (!row) {
    const err = new Error('Entry not found or cannot be edited (employee-submitted data)');
    err.status = 404;
    throw err;
  }
  const { columns, meta } = buildWorkClientFields(body, row.meta || {}, auditActor);
  await row.update({ ...columns, meta });
  if (type === 'vendor' && body.employeeRates) await syncVendorEmployeeRates(row.id, body.employeeRates);
  return formatWorkClientEntry(row);
}

// Helper: delete an admin-defined entry (only allowed for employee_id IS NULL rows)
async function deleteWorkClientEntry(type, id) {
  const row = await WorkClientDetail.findOne({ where: { id, type, employee_id: null } });
  if (!row) {
    const err = new Error('Entry not found or cannot be deleted (employee-submitted data)');
    err.status = 404;
    throw err;
  }
  await row.destroy();
}

// Helper: assign an employee to a client/vendor/primeVendor entry by name
async function assignEmployeeToEntry(type, id, employeeId) {
  if (!employeeId) throw new Error('employeeId is required');
  const row = await WorkClientDetail.findOne({ where: { id, type } });
  if (!row) {
    const err = new Error('Entry not found');
    err.status = 404;
    throw err;
  }
  const existing = await WorkClientDetail.findOne({ where: { type, name: row.name, employee_id: employeeId } });
  if (existing) {
    const err = new Error('Employee already assigned to this entry');
    err.status = 400;
    throw err;
  }
  await WorkClientDetail.create({
    employee_id: employeeId,
    type,
    name: row.name,
    address: row.address || null,
    start_date: row.start_date || null,
    end_date: row.end_date || null,
    meta: { assignedByAdmin: true },
  });
}

// Helper: unassign an employee from a client/vendor/primeVendor entry (only admin-assigned rows)
async function unassignEmployeeFromEntry(type, id, employeeId) {
  const row = await WorkClientDetail.findOne({ where: { id, type } });
  if (!row) {
    const err = new Error('Entry not found');
    err.status = 404;
    throw err;
  }
  const assignment = await WorkClientDetail.findOne({ where: { type, name: row.name, employee_id: employeeId } });
  if (!assignment) {
    const err = new Error('Assignment not found');
    err.status = 404;
    throw err;
  }
  if (!assignment.meta?.assignedByAdmin) {
    const err = new Error('Cannot remove an employee-submitted entry');
    err.status = 403;
    throw err;
  }
  await assignment.destroy();
}

// GET /api/admin/client-vendors?type=client|vendor|primeVendor
router.get('/client-vendors', authenticateToken, async (req, res) => {
  try {
    const type = String(req.query.type || '').trim();
    const normalizedType = {
      client: 'client',
      vendor: 'vendor',
      primeVendor: 'primeVendor',
    }[type];

    if (!normalizedType) {
      return res.status(400).json({ error: 'type query is required' });
    }

    res.json({ items: await getDropdownItems(normalizedType) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/clients
router.get('/clients', authenticateToken, async (req, res) => {
  try { res.json({ clients: await getGroupedByType('client') }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/vendors
router.get('/vendors', authenticateToken, async (req, res) => {
  try { res.json({ vendors: await getGroupedByType('vendor') }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/prime-vendors
router.get('/prime-vendors', authenticateToken, async (req, res) => {
  try { res.json({ primeVendors: await getGroupedByType('primeVendor') }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/clients
router.post('/clients', authenticateToken, async (req, res) => {
  try { res.json({ client: await createWorkClientEntry('client', req.body) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/vendors
router.post('/vendors', authenticateToken, denyHrVendorWrite, async (req, res) => {
  try { res.json({ vendor: await createWorkClientEntry('vendor', req.body, await vendorAuditActor(req)) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/prime-vendors
router.post('/prime-vendors', authenticateToken, async (req, res) => {
  try { res.json({ primeVendor: await createWorkClientEntry('primeVendor', req.body) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/clients/:id
router.patch('/clients/:id', authenticateToken, requireApprovedEdit('client'), async (req, res) => {
  try { const client = await updateWorkClientEntry('client', req.params.id, req.body); await consumeEditApproval(req, 'client', req.params.id); res.json({ client }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// PATCH /api/admin/vendors/:id
router.patch('/vendors/:id', authenticateToken, denyHrVendorWrite, requireApprovedEdit('vendor'), async (req, res) => {
  try { const vendor = await updateWorkClientEntry('vendor', req.params.id, req.body, await vendorAuditActor(req)); await consumeEditApproval(req, 'vendor', req.params.id); res.json({ vendor }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// PATCH /api/admin/prime-vendors/:id
router.patch('/prime-vendors/:id', authenticateToken, requireApprovedEdit('prime_vendor'), async (req, res) => {
  try { const primeVendor = await updateWorkClientEntry('primeVendor', req.params.id, req.body); await consumeEditApproval(req, 'prime_vendor', req.params.id); res.json({ primeVendor }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// DELETE /api/admin/clients/:id
router.delete('/clients/:id', authenticateToken, requireApprovedDelete('client'), async (req, res) => {
  try { await deleteWorkClientEntry('client', req.params.id); await consumeDeleteApproval(req, 'client', req.params.id); res.json({ success: true }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// DELETE /api/admin/vendors/:id
router.delete('/vendors/:id', authenticateToken, denyHrVendorWrite, requireApprovedDelete('vendor'), async (req, res) => {
  try { await deleteWorkClientEntry('vendor', req.params.id); await consumeDeleteApproval(req, 'vendor', req.params.id); res.json({ success: true }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// DELETE /api/admin/prime-vendors/:id
router.delete('/prime-vendors/:id', authenticateToken, requireApprovedDelete('prime_vendor'), async (req, res) => {
  try { await deleteWorkClientEntry('primeVendor', req.params.id); await consumeDeleteApproval(req, 'prime_vendor', req.params.id); res.json({ success: true }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// POST /api/admin/clients/:id/assign-employee
router.post('/clients/:id/assign-employee', authenticateToken, async (req, res) => {
  try { await assignEmployeeToEntry('client', req.params.id, req.body.employeeId); res.json({ success: true }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// DELETE /api/admin/clients/:id/assign-employee/:employeeId
router.delete('/clients/:id/assign-employee/:employeeId', authenticateToken, requireApprovedDelete('client_employee_assignment', req => `${req.params.id}:${req.params.employeeId}`), async (req, res) => {
  try { await unassignEmployeeFromEntry('client', req.params.id, req.params.employeeId); await consumeDeleteApproval(req, 'client_employee_assignment', `${req.params.id}:${req.params.employeeId}`); res.json({ success: true }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// POST /api/admin/vendors/:id/assign-employee
router.post('/vendors/:id/assign-employee', authenticateToken, denyHrVendorWrite, async (req, res) => {
  try { await assignEmployeeToEntry('vendor', req.params.id, req.body.employeeId); res.json({ success: true }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// DELETE /api/admin/vendors/:id/assign-employee/:employeeId
router.delete('/vendors/:id/assign-employee/:employeeId', authenticateToken, denyHrVendorWrite, requireApprovedDelete('vendor_employee_assignment', req => `${req.params.id}:${req.params.employeeId}`), async (req, res) => {
  try { await unassignEmployeeFromEntry('vendor', req.params.id, req.params.employeeId); await consumeDeleteApproval(req, 'vendor_employee_assignment', `${req.params.id}:${req.params.employeeId}`); res.json({ success: true }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// POST /api/admin/prime-vendors/:id/assign-employee
router.post('/prime-vendors/:id/assign-employee', authenticateToken, async (req, res) => {
  try { await assignEmployeeToEntry('primeVendor', req.params.id, req.body.employeeId); res.json({ success: true }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// DELETE /api/admin/prime-vendors/:id/assign-employee/:employeeId
router.delete('/prime-vendors/:id/assign-employee/:employeeId', authenticateToken, requireApprovedDelete('prime_vendor_employee_assignment', req => `${req.params.id}:${req.params.employeeId}`), async (req, res) => {
  try { await unassignEmployeeFromEntry('primeVendor', req.params.id, req.params.employeeId); await consumeDeleteApproval(req, 'prime_vendor_employee_assignment', `${req.params.id}:${req.params.employeeId}`); res.json({ success: true }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// Helper: shape a grouped work_client_details item as a "project" (comment -> description)
function formatProjectEntry(item) {
  const { comment, ...rest } = item;
  return { ...rest, description: comment || '' };
}

// GET /api/admin/projects
// Combines admin-created internal projects (type='project') with active clients
router.get('/projects', authenticateToken, async (req, res) => {
  try {
    const internalProjects = (await getGroupedByType('project'))
      .map(p => ({ ...formatProjectEntry(p), source: 'project' }));
    const clientProjects = (await getGroupedByType('client'))
      .filter(c => c.status === 'Active')
      .map(c => ({ ...formatProjectEntry(c), source: 'client', editable: false }));
    res.json({ projects: [...internalProjects, ...clientProjects] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/projects
router.post('/projects', authenticateToken, async (req, res) => {
  try {
    const { description, ...rest } = req.body;
    const project = await createWorkClientEntry('project', { ...rest, comment: description });
    res.json({ project: { ...formatProjectEntry(project), source: 'project' } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/projects/:id
router.patch('/projects/:id', authenticateToken, requireApprovedEdit('project'), async (req, res) => {
  try {
    const { description, ...rest } = req.body;
    const project = await updateWorkClientEntry('project', req.params.id, { ...rest, comment: description });
    await consumeEditApproval(req, 'project', req.params.id);
    res.json({ project: { ...formatProjectEntry(project), source: 'project' } });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// DELETE /api/admin/projects/:id
router.delete('/projects/:id', authenticateToken, requireApprovedDelete('project'), async (req, res) => {
  try { await deleteWorkClientEntry('project', req.params.id); await consumeDeleteApproval(req, 'project', req.params.id); res.json({ success: true }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// POST /api/admin/projects/:id/assign-employee
router.post('/projects/:id/assign-employee', authenticateToken, async (req, res) => {
  try {
    const row = await WorkClientDetail.findOne({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: 'Entry not found' });
    await assignEmployeeToEntry(row.type, row.id, req.body.employeeId);
    res.json({ success: true });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// DELETE /api/admin/projects/:id/assign-employee/:employeeId
router.delete('/projects/:id/assign-employee/:employeeId', authenticateToken, requireApprovedDelete('project_employee_assignment', req => `${req.params.id}:${req.params.employeeId}`), async (req, res) => {
  try {
    const row = await WorkClientDetail.findOne({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: 'Entry not found' });
    await unassignEmployeeFromEntry(row.type, row.id, req.params.employeeId);
    await consumeDeleteApproval(req, 'project_employee_assignment', `${req.params.id}:${req.params.employeeId}`);
    res.json({ success: true });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// GET /api/admin/growth
router.get('/growth', requireRootAdmin, async (req, res) => {
  try {
    const today = new Date();

    // Build date strings for last 7 days (this week) and the 7 days before (last week)
    const thisWeekDates = [];
    const lastWeekDates = [];
    for (let i = 6; i >= 0; i--) {
      const d1 = new Date(today); d1.setDate(today.getDate() - i);
      const d2 = new Date(today); d2.setDate(today.getDate() - i - 7);
      thisWeekDates.push(d1.toISOString().split('T')[0]);
      lastWeekDates.push(d2.toISOString().split('T')[0]);
    }

    const allDates = [...thisWeekDates, ...lastWeekDates];
    const snapshots = await CompanySnapshot.findAll({ where: { date: allDates } });
    const snapMap = Object.fromEntries(snapshots.map(s => [s.date, s]));

    const toPoints = (dates) => dates.map(d => snapMap[d]?.in_project ?? null);

    const thisWeek = toPoints(thisWeekDates);
    const lastWeek = toPoints(lastWeekDates);

    // Growth = latest in_project count
    const latest = snapMap[thisWeekDates[thisWeekDates.length - 1]];
    const prev = snapMap[lastWeekDates[lastWeekDates.length - 1]];
    const growth = latest?.in_project ?? 0;
    const percent = prev?.in_project
      ? Math.round(((growth - prev.in_project) / prev.in_project) * 100)
      : 0;

    res.json({ growth, percent, labels: thisWeekDates.map(d => d.slice(6)), data: { last7days: thisWeek, lastWeek } });
  } catch (err) {
    console.error('[admin/growth] error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Activate any scheduled announcements whose time has passed
async function activateScheduled() {
  await Announcement.update(
    { status: 'Posted' },
    { where: { status: 'Scheduled', scheduledAt: { [Op.lte]: new Date() } } }
  );
}

// GET /api/admin/announcements — all announcements (admin)
router.get('/announcements', authenticateToken, async (req, res) => {
  try {
    await activateScheduled();
    const announcements = await Announcement.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/announcements — create
router.post('/announcements', authenticateToken, async (req, res) => {
  try {
    const { message, audience, scheduledAt } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
    const createdBy = req.user?.name || req.user?.email || 'Admin';
    const status = scheduledAt && new Date(scheduledAt) > new Date() ? 'Scheduled' : 'Posted';
    const ann = await Announcement.create({
      message: message.trim(), audience: audience || 'All Users',
      status, createdBy, scheduledAt: scheduledAt || null,
    });
    res.json({ announcement: ann });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/announcements/:id/expire
router.patch('/announcements/:id/expire', authenticateToken, requireApprovedEdit('announcement'), async (req, res) => {
  try {
    const ann = await Announcement.findByPk(req.params.id);
    if (!ann) return res.status(404).json({ error: 'Not found' });
    await ann.update({ status: 'Expired' });
    await consumeEditApproval(req, 'announcement', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/announcements/:id
router.delete('/announcements/:id', authenticateToken, requireApprovedDelete('announcement'), async (req, res) => {
  try {
    const ann = await Announcement.findByPk(req.params.id);
    if (!ann) return res.status(404).json({ error: 'Not found' });
    await ann.destroy();
    await consumeDeleteApproval(req, 'announcement', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/notes
router.get('/notes', authenticateToken, async (req, res) => {
  try {
    const notes = await AdminNote.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'ASC']],
    });
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/notes
router.post('/notes', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Text is required' });
    const note = await AdminNote.create({ user_id: req.user.id, text: text.trim() });
    res.json({ note });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/notes/:id
router.delete('/notes/:id', authenticateToken, async (req, res) => {
  try {
    const note = await AdminNote.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    await note.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/edit-requests/:id/approve
router.patch('/edit-requests/:id/approve', authenticateToken, async (req, res) => {
  try {
    const er = await EditRequest.findByPk(req.params.id);
    if (!er) return res.status(404).json({ error: 'Edit request not found' });
    if (er.requestType === 'PASSWORD_RESET_REQUEST') return res.status(409).json({ error: 'Password reset requests must use the Root Admin reset workflow' });
    if (er.status !== 'pending') return res.status(400).json({ error: 'Request is not pending' });
    await er.update({ status: 'approved' });
    res.json({ success: true });
  } catch (err) {
    console.error('[admin/edit-requests/approve] error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/alerts/:id/read
router.patch('/alerts/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await AdminNotification.findOne({ where: { id: req.params.id, recipientId: req.user.id } });
    if (!notification) return res.status(404).json({ error: 'Alert not found' });
    if (!notification.readAt) await notification.update({ readAt: new Date() });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/vendors/:id/employee-rates
router.get('/vendors/:id/employee-rates', authenticateToken, async (req, res) => {
  try {
    const rates = await VendorEmployeeRate.findAll({ where: { vendor_id: req.params.id }, order: [['employee_id', 'ASC']] });
    res.json({ employeeRates: rates.map(rate => ({ employeeId: rate.employee_id, rate: Number(rate.rate) })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/edit-requests/:id/reject
router.patch('/edit-requests/:id/reject', authenticateToken, async (req, res) => {
  try {
    const er = await EditRequest.findByPk(req.params.id);
    if (!er) return res.status(404).json({ error: 'Edit request not found' });
    if (er.requestType === 'PASSWORD_RESET_REQUEST') return res.status(409).json({ error: 'Password reset requests must use the Root Admin reset workflow' });
    if (er.status !== 'pending') return res.status(409).json({ error: 'Request has already been processed' });
    await er.update({ status: 'denied' });
    res.json({ success: true });
  } catch (err) {
    console.error('[admin/edit-requests/reject] error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Root Admin-only: password reset approvals never use generic edit requests.
router.patch('/password-reset-requests/:id/approve', requireRootAdmin, passwordResetController.approve);
router.patch('/password-reset-requests/:id/reject', requireRootAdmin, passwordResetController.reject);

module.exports = router;
