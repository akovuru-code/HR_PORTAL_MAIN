const Payroll = require('../models/payroll');
const Employee = require('../models/employee');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

const MIME_TYPES = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.zip': 'application/zip',
};

const getFileMimeType = (filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  return MIME_TYPES[extension] || 'application/octet-stream';
};

const formatPayroll = (payroll, employee) => ({
  id: payroll.id,
  employee_id: payroll.employee_id,
  employeeName: employee
    ? [employee.firstName, employee.lastName].filter(Boolean).join(' ') || employee.name || employee.email || ''
    : '',
  payrollNumber: payroll.nameOrNumber || payroll.payrollNumber || '',
  payChequeDate: payroll.payChequeDate || '',
  w2FileName: payroll.w2OriginalName || payroll.w2FileName || '',
  w2FileUrl: payroll.w2Url || payroll.w2FileUrl || '',
  payChequeFileName: payroll.payChequeOriginalName || payroll.payChequeFileName || '',
  payChequeFileUrl: payroll.payChequeUrl || payroll.payChequeFileUrl || '',
  createdBy: payroll.createdBy || '',
  updatedBy: payroll.updatedBy || '',
  createdAt: payroll.createdAt,
  updatedAt: payroll.updatedAt,
});

// GET /api/payroll
exports.getPayrolls = async (req, res) => {
  try {
    let where = {};

    if (req.user.role === "employee") {
      where.employee_id = req.user.employeeId;
    }
    const payrolls = await Payroll.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    const employeeIds = [...new Set(payrolls.map((payroll) => payroll.employee_id).filter(Boolean))];
    const employees = await Employee.findAll({
      where: { employee_id: employeeIds },
      attributes: ['employee_id', 'name', 'firstName', 'lastName', 'email'],
    });
    const employeeMap = Object.fromEntries(employees.map((employee) => [employee.employee_id, employee]));

    res.json({ payrolls: payrolls.map((payroll) => formatPayroll(payroll, employeeMap[payroll.employee_id])) });
  } catch (err) {
    console.error('[getPayrolls]', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.createPayroll = async (req, res) => {
  try {
    const {
      employee_id,
      payrollNumber,
      nameOrNumber,
      payChequeDate,
      w2OriginalName,
      w2Url,
      payChequeOriginalName,
      payChequeUrl,
      createdBy,
      employeeName,
    } = req.body;

    const payroll = await Payroll.create({
      employee_id,
      nameOrNumber: nameOrNumber || payrollNumber || '',
      payChequeDate,
      w2OriginalName: w2OriginalName || null,
      w2Url: w2Url || null,
      payChequeOriginalName: payChequeOriginalName || null,
      payChequeUrl: payChequeUrl || null,
      createdBy,
    });

    const employee = await Employee.findByPk(employee_id, {
      attributes: ['employee_id', 'name', 'firstName', 'lastName', 'email'],
    });

    res.json({ message: 'Payroll created', payroll: formatPayroll(payroll, employee) });
  } catch (err) {
    console.error('[createPayroll]', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.updatePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findByPk(req.params.id);
    if (!payroll) return res.status(404).json({ error: 'Payroll not found' });

    await payroll.update({
      employee_id: req.body.employee_id ?? payroll.employee_id,
      nameOrNumber: req.body.nameOrNumber ?? req.body.payrollNumber ?? payroll.nameOrNumber,
      payChequeDate: req.body.payChequeDate ?? payroll.payChequeDate,
      w2OriginalName: req.body.w2OriginalName ?? payroll.w2OriginalName,
      w2Url: req.body.w2Url ?? payroll.w2Url,
      payChequeOriginalName: req.body.payChequeOriginalName ?? payroll.payChequeOriginalName,
      payChequeUrl: req.body.payChequeUrl ?? payroll.payChequeUrl,
      updatedBy: req.body.updatedBy ?? payroll.updatedBy,
    });

    const employee = await Employee.findByPk(payroll.employee_id, {
      attributes: ['employee_id', 'name', 'firstName', 'lastName', 'email'],
    });

    res.json({ message: 'Payroll updated', payroll: formatPayroll(payroll, employee) });
  } catch (err) {
    console.error('[updatePayroll]', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.deletePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findByPk(req.params.id);
    if (!payroll) return res.status(404).json({ error: 'Payroll not found' });

    await payroll.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error('[deletePayroll]', err.message);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/payroll/file/:id?field=w2|paycheque&disposition=inline|attachment
exports.getFile = async (req, res) => {
  try {
    const record = await Payroll.findByPk(req.params.id);
    if (!record) return res.status(404).json({ error: 'Payroll record not found' });
    if (
      req.user.role === "employee" &&
      record.employee_id !== req.user.employeeId
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const field = req.query.field === 'paycheque' ? 'payChequeUrl' : 'w2Url';
    const originalName = req.query.field === 'paycheque' ? record.payChequeOriginalName : record.w2OriginalName;
    const fileUrl = record[field];
    if (!fileUrl) return res.status(404).json({ error: 'File not available' });

    const disposition = req.query.disposition === 'attachment' ? 'attachment' : 'inline';
    const filename = originalName || 'document.pdf';

    const normalizedPath = fileUrl.startsWith('http')
      ? new URL(fileUrl).pathname.replace(/^\/+/, '')
      : fileUrl.replace(/^\/api\/local-upload\/file\//, '').replace(/^\/+/, '');
    const localPath = path.join(UPLOAD_DIR, ...normalizedPath.split('/'));

    if (!fs.existsSync(localPath)) return res.status(404).json({ error: 'File not found on disk' });

    const contentType = getFileMimeType(localPath);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    fs.createReadStream(localPath).pipe(res);
  } catch (err) {
    console.error('[getFile]', err.message);
    res.status(500).json({ error: err.message });
  }
};
