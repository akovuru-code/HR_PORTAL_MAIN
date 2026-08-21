const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const authenticateToken = require('../middleware/auth');
const Employee = require('../models/employee');
const EditRequest = require('../models/editRequest');
const Document = require('../models/document');
const TimesheetEntry = require('../models/timesheetEntry');


const AdminNote = require('../models/adminNote');
const nodemailer = require('nodemailer');

//Invitation mail configuration
const companyMailConfig = {
  "Siritek Inc": {
    service: "gmail",
    user: process.env.SIRITEK_EMAIL,
    pass: process.env.SIRITEK_PASS,
    displayName: "Siritek Inc HR Team",
  },

  "Gannusoftware": {
    service: "gmail",
    user: process.env.GANNU_EMAIL,
    pass: process.env.GANNU_PASS,
    displayName: "Gannusoftware HR Team",
  },

  "Savvyinfosystems": {
    service: "zoho",
    user: process.env.SAVVY_EMAIL,
    pass: process.env.SAVVY_PASS,
    displayName: "Savvyinfosystems HR Team",
  },

  "Globalinfotech Inc": {
    service: "gmail",
    user: process.env.GLOBAL_EMAIL,
    pass: process.env.GLOBAL_PASS,
    displayName: "Globalinfotech HR Team",
  },
};

const getTransporter = (company) => {

  const config =
    companyMailConfig[company] ||
    companyMailConfig["Siritek Inc"];

  // Zoho Mail
  if (config.service === "zoho") {
    return nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true,

      auth: {
        user: config.user,
        pass: config.pass,
      },

    });

  }

  // Gmail (default)
  return nodemailer.createTransport({
    service: "gmail",

    auth: {
      user: config.user,
      pass: config.pass,
    },

  });

};

const Announcement = require('../models/announcement');
const WorkEmployer = require('../models/workEmployer');
const WorkClientDetail = require('../models/workClientDetail');
const CompanySnapshot = require('../models/companySnapshot');
const Invoice = require('../models/invoice');
const Recruiting = require('../models/recruiting');

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
    const config =
      companyMailConfig[company] ||
      companyMailConfig["Siritek Inc"];

    // Check whether email is configured for the selected company
    if (!config.user || !config.pass) {
      return res.status(500).json({
        error: `Email is not configured for ${company}`
      });
    }
    const transporter = getTransporter(company);
    await transporter.sendMail({
      from: `"${config.displayName}" <${config.user}>`,
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

    // 1. Pending edit requests
    const editRequests = await EditRequest.findAll({
      where: { status: 'pending' },
    });
    if (editRequests.length > 0) {
      const erEmpIds = [...new Set(editRequests.map(er => er.employeeId).filter(Boolean))];
      const erEmployees = await Employee.findAll({
        where: { employee_id: { [Op.in]: erEmpIds } },
        attributes: ['employee_id', 'firstName', 'lastName'],
      });
      const erEmpMap = Object.fromEntries(erEmployees.map(e => [e.employee_id, e]));
      for (const er of editRequests) {
        const emp = erEmpMap[er.employeeId];
        const name = emp
          ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
          : 'An employee';
        const section = er.sectionKey || 'details';
        const isPasswordReset = er.requestType === 'PASSWORD_RESET_REQUEST';
        const message = isPasswordReset
          ? `${name} requested a password reset`
          : `${name} requested to edit ${section} details`;
        alerts.push({ type: 'request', message, id: er.id, canApprove: true });
      }
    }

    // 2. Pending timesheet entries — one alert per distinct employee
    const pendingTimesheets = await TimesheetEntry.findAll({
      where: { status: 'Submitted' },
      attributes: ['employee_id'],
      group: ['employee_id'],
    });
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

// GET /api/admin/timesheets — employees with submitted entries
router.get('/timesheets', authenticateToken, async (req, res) => {
  try {
    const entries = await TimesheetEntry.findAll({
      where: { status: ['Submitted', 'Approved', 'Rejected'] },
      attributes: ['employee_id', 'hours', 'project', 'client', 'status', 'adminComment'],
    });

    const empIds = [...new Set(entries.map(e => e.employee_id))];
    if (!empIds.length) return res.json({ employees: [] });

    const employees = await Employee.findAll({
      where: { employee_id: { [Op.in]: empIds } },
      attributes: ['employee_id', 'firstName', 'lastName', 'name'],
    });
    const empMap = Object.fromEntries(employees.map(e => [e.employee_id, e]));

    const grouped = {};
    for (const entry of entries) {
      const eid = entry.employee_id;
      if (!grouped[eid]) {
        const emp = empMap[eid];
        grouped[eid] = {
          id: eid,
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
      const empEntries = entries.filter(e => e.employee_id === parseInt(eid));
      const statuses = empEntries.map(e => e.status);
      if (statuses.every(s => s === 'Approved')) grouped[eid].status = 'Approved';
      else if (statuses.some(s => s === 'Rejected')) grouped[eid].status = 'Rejected';
      else grouped[eid].status = 'Submitted';
    }

    res.json({ employees: Object.values(grouped) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/timesheets/:employeeId/entries
router.get('/timesheets/:employeeId/entries', authenticateToken, async (req, res) => {
  try {
    const entries = await TimesheetEntry.findAll({
      where: { employee_id: req.params.employeeId },
      order: [['dateKey', 'ASC']],
    });
    res.json({ entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/timesheets/entry/:id — edit single entry
router.patch('/timesheets/entry/:id', authenticateToken, async (req, res) => {
  try {
    const entry = await TimesheetEntry.findByPk(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    const { hours, status, adminComment } = req.body;
    const updates = {};
    if (hours !== undefined) updates.hours = parseFloat(hours);
    if (status !== undefined) updates.status = status;
    if (adminComment !== undefined) updates.adminComment = adminComment;
    await entry.update(updates);
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
router.patch('/timesheets/:employeeId/edit', authenticateToken, async (req, res) => {
  try {
    const { hours } = req.body;
    const entries = await TimesheetEntry.findAll({
      where: { employee_id: req.params.employeeId, status: ['Submitted', 'Approved'] },
    });
    if (!entries.length) return res.status(404).json({ error: 'No entries found' });
    const hoursEach = parseFloat(hours) / entries.length;
    for (const entry of entries) await entry.update({ hours: hoursEach });
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
    const employees = await Employee.findAll({
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

// PATCH /api/admin/employees/:id/terminate-date
router.patch('/employees/:id/terminate-date', authenticateToken, async (req, res) => {
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
      status: emp.profileStatus || 'On Bench',
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
router.patch('/employees/:id/invoices/:invoiceId', authenticateToken, async (req, res) => {
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
    res.json({ invoice: formatInvoice(invoice) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/admin/employees/:id/invoices/:invoiceId
router.delete('/employees/:id/invoices/:invoiceId', authenticateToken, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ where: { id: req.params.invoiceId, employee_id: req.params.id } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    await invoice.destroy();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/documents/:id
router.patch('/documents/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const { name, expiry, url, filename, originalName, fileData } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (expiry !== undefined) updates.expiry = expiry || null;
    if (url !== undefined) updates.url = url;
    if (filename !== undefined) updates.filename = filename;
    if (originalName !== undefined) updates.originalName = originalName;
    if (fileData !== undefined) updates.fileData = fileData;
    await doc.update(updates);
    res.json({ document: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/documents
router.get('/documents', authenticateToken, async (req, res) => {
  try {
    const docs = await Document.findAll({
      where: { document_type: 'admin_doc' },
      order: [['document_id', 'DESC']],
    });
    res.json({ documents: docs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/status-summary
router.get('/status-summary', authenticateToken, async (req, res) => {
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
      attributes: ['employee_id', 'name'],
    });
    radioRows.forEach(r => {
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
        status: 'Active',
        members: 0,
        vendor: { enabled: false, name: '', startDate: '', endDate: '' },
        primeVendor: { enabled: false, name: '', startDate: '', endDate: '' },
        client: { enabled: false, name: '', startDate: '', endDate: '' },
        comment: '',
        createdBy: '',
        updatedBy: '',
        employees: [],
        editable: false,
        _employeeCount: 0,
        _metaMembers: null,
      };
    }

    if (meta && !meta.assignedByAdmin) {
      // Admin-created definition entry: use rich metadata as-is
      grouped[key].id = row.id;
      grouped[key].editable = true;
      grouped[key].startDate = row.start_date || grouped[key].startDate;
      grouped[key].endDate = row.end_date || grouped[key].endDate;
      grouped[key].address = row.address || grouped[key].address;
      grouped[key].contact = row.phone || grouped[key].contact;
      if (meta.status) grouped[key].status = meta.status;
      if (meta.comment) grouped[key].comment = meta.comment;
      if (meta.members !== undefined && meta.members !== null) grouped[key]._metaMembers = meta.members;
      if (meta.createdBy) grouped[key].createdBy = meta.createdBy;
      if (meta.updatedBy) grouped[key].updatedBy = meta.updatedBy;
      if (meta.vendor) grouped[key].vendor = meta.vendor;
      if (meta.primeVendor) grouped[key].primeVendor = meta.primeVendor;
      if (meta.client) grouped[key].client = meta.client;
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
  });

  const now = new Date();
  return Object.values(grouped).map(item => {
    item.members = item._metaMembers !== null ? item._metaMembers : item._employeeCount;
    delete item._employeeCount;
    delete item._metaMembers;
    if (item.endDate && new Date(item.endDate) < now) item.status = 'Inactive';
    return item;
  });
}

// Helper: build work_client_details columns + meta from a client/vendor/primeVendor form payload
function buildWorkClientFields(body, existingMeta = {}) {
  const { name, status, startDate, endDate, members, contact, address, comment, vendor, primeVendor, client, createdBy, updatedBy } = body;
  if (!name) throw new Error('name is required');

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
      status: status || 'Active',
      comment: comment || '',
      members: members ?? 0,
      createdBy: existingMeta.createdBy || createdBy || '',
      updatedBy: updatedBy || existingMeta.updatedBy || '',
      vendor: vendor || { enabled: false, name: '', startDate: '', endDate: '' },
      primeVendor: primeVendor || { enabled: false, name: '', startDate: '', endDate: '' },
      client: client || { enabled: false, name: '', startDate: '', endDate: '' },
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
    createdBy: meta.createdBy || '',
    updatedBy: meta.updatedBy || '',
    employees: [],
    editable: true,
  };
}

// Helper: create an admin-defined client/vendor/primeVendor entry (employee_id null)
async function createWorkClientEntry(type, body) {
  const { columns, meta } = buildWorkClientFields(body);
  const row = await WorkClientDetail.create({ employee_id: null, type, ...columns, meta });
  return formatWorkClientEntry(row);
}

// Helper: update an admin-defined entry (only allowed for employee_id IS NULL rows)
async function updateWorkClientEntry(type, id, body) {
  const row = await WorkClientDetail.findOne({ where: { id, type, employee_id: null } });
  if (!row) {
    const err = new Error('Entry not found or cannot be edited (employee-submitted data)');
    err.status = 404;
    throw err;
  }
  const { columns, meta } = buildWorkClientFields(body, row.meta || {});
  await row.update({ ...columns, meta });
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
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

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
router.post('/vendors', authenticateToken, async (req, res) => {
  try { res.json({ vendor: await createWorkClientEntry('vendor', req.body) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/prime-vendors
router.post('/prime-vendors', authenticateToken, async (req, res) => {
  try { res.json({ primeVendor: await createWorkClientEntry('primeVendor', req.body) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/clients/:id
router.patch('/clients/:id', authenticateToken, async (req, res) => {
  try { res.json({ client: await updateWorkClientEntry('client', req.params.id, req.body) }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// PATCH /api/admin/vendors/:id
router.patch('/vendors/:id', authenticateToken, async (req, res) => {
  try { res.json({ vendor: await updateWorkClientEntry('vendor', req.params.id, req.body) }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// PATCH /api/admin/prime-vendors/:id
router.patch('/prime-vendors/:id', authenticateToken, async (req, res) => {
  try { res.json({ primeVendor: await updateWorkClientEntry('primeVendor', req.params.id, req.body) }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// DELETE /api/admin/clients/:id
router.delete('/clients/:id', authenticateToken, async (req, res) => {
  try { await deleteWorkClientEntry('client', req.params.id); res.json({ success: true }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// DELETE /api/admin/vendors/:id
router.delete('/vendors/:id', authenticateToken, async (req, res) => {
  try { await deleteWorkClientEntry('vendor', req.params.id); res.json({ success: true }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// DELETE /api/admin/prime-vendors/:id
router.delete('/prime-vendors/:id', authenticateToken, async (req, res) => {
  try { await deleteWorkClientEntry('primeVendor', req.params.id); res.json({ success: true }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// POST /api/admin/clients/:id/assign-employee
router.post('/clients/:id/assign-employee', authenticateToken, async (req, res) => {
  try { await assignEmployeeToEntry('client', req.params.id, req.body.employeeId); res.json({ success: true }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// DELETE /api/admin/clients/:id/assign-employee/:employeeId
router.delete('/clients/:id/assign-employee/:employeeId', authenticateToken, async (req, res) => {
  try { await unassignEmployeeFromEntry('client', req.params.id, req.params.employeeId); res.json({ success: true }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// POST /api/admin/vendors/:id/assign-employee
router.post('/vendors/:id/assign-employee', authenticateToken, async (req, res) => {
  try { await assignEmployeeToEntry('vendor', req.params.id, req.body.employeeId); res.json({ success: true }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// DELETE /api/admin/vendors/:id/assign-employee/:employeeId
router.delete('/vendors/:id/assign-employee/:employeeId', authenticateToken, async (req, res) => {
  try { await unassignEmployeeFromEntry('vendor', req.params.id, req.params.employeeId); res.json({ success: true }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// POST /api/admin/prime-vendors/:id/assign-employee
router.post('/prime-vendors/:id/assign-employee', authenticateToken, async (req, res) => {
  try { await assignEmployeeToEntry('primeVendor', req.params.id, req.body.employeeId); res.json({ success: true }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// DELETE /api/admin/prime-vendors/:id/assign-employee/:employeeId
router.delete('/prime-vendors/:id/assign-employee/:employeeId', authenticateToken, async (req, res) => {
  try { await unassignEmployeeFromEntry('primeVendor', req.params.id, req.params.employeeId); res.json({ success: true }); }
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
router.patch('/projects/:id', authenticateToken, async (req, res) => {
  try {
    const { description, ...rest } = req.body;
    const project = await updateWorkClientEntry('project', req.params.id, { ...rest, comment: description });
    res.json({ project: { ...formatProjectEntry(project), source: 'project' } });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// DELETE /api/admin/projects/:id
router.delete('/projects/:id', authenticateToken, async (req, res) => {
  try { await deleteWorkClientEntry('project', req.params.id); res.json({ success: true }); }
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
router.delete('/projects/:id/assign-employee/:employeeId', authenticateToken, async (req, res) => {
  try {
    const row = await WorkClientDetail.findOne({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: 'Entry not found' });
    await unassignEmployeeFromEntry(row.type, row.id, req.params.employeeId);
    res.json({ success: true });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// GET /api/admin/growth
router.get('/growth', authenticateToken, async (req, res) => {
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
router.patch('/announcements/:id/expire', authenticateToken, async (req, res) => {
  try {
    const ann = await Announcement.findByPk(req.params.id);
    if (!ann) return res.status(404).json({ error: 'Not found' });
    await ann.update({ status: 'Expired' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/announcements/:id
router.delete('/announcements/:id', authenticateToken, async (req, res) => {
  try {
    const ann = await Announcement.findByPk(req.params.id);
    if (!ann) return res.status(404).json({ error: 'Not found' });
    await ann.destroy();
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
    if (er.status !== 'pending') return res.status(400).json({ error: 'Request is not pending' });
    await er.update({ status: 'approved' });
    res.json({ success: true });
  } catch (err) {
    console.error('[admin/edit-requests/approve] error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;