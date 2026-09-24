const { Op } = require('sequelize');
const Invoice = require('../models/invoice');
const InvoiceItem = require('../models/invoiceItem');
const Payment = require('../models/payment');
const PaymentAllocation = require('../models/paymentAllocation');
const Employee = require('../models/employee');
const WorkClientDetail = require('../models/workClientDetail');
const Company = require('../models/company');
const TimesheetEntry = require('../models/timesheetEntry');
const VendorEmployeeRate = require('../models/vendorEmployeeRate');
const { generateInvoicePdf } = require('../services/invoicePdfService');
const { getInvoiceTemplate } = require('../config/invoiceTemplates');
const { normalizeCurrency } = require('../config/currencies');
const { automaticInvoiceDescription, isAutomaticInvoiceDescription } = require('../utils/invoicePeriod');
const { getInvoiceOverdueState, overdueLabel } = require('../utils/invoiceOverdue');
const { consumeEditApproval } = require('../services/deleteAuthorizationService');

const TERMS = { 'Net 15': 15, 'Net 30': 30, 'Net 45': 45, 'Net 60': 60, Custom: null };
const STATUSES = new Set(['Draft', 'Generated', 'Sent', 'Due', 'Paid', 'Overdue', 'Cancelled']);
const BILLING_FREQUENCIES = new Set(['weekly', 'bi-weekly', 'monthly']);
const emailPattern = /^\S+@\S+\.\S+$/;

function dateOnly(value) { return value ? String(value).slice(0, 10) : null; }
function fullName(employee) { return [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') || employee?.name || employee?.email || ''; }
function normalizeBillingFrequency(value) {
  if (value === undefined || value === null || value === '') return null;
  const frequency = String(value).trim().toLowerCase();
  if (!BILLING_FREQUENCIES.has(frequency)) throw new Error('Invalid billing frequency');
  return frequency;
}
function billingFrequencyFor(invoice) {
  const value = invoice.toJSON ? invoice.toJSON() : invoice;
  if (value.billingFrequency) return value.billingFrequency;
  if (value.biWeekly === 'Yes') return 'bi-weekly';
  if (value.monthly === 'Yes') return 'monthly';
  return null;
}
function paymentJson(payment) {
  const value = payment.toJSON ? payment.toJSON() : payment;
  return { id: value.id, date: value.date, referenceNumber: value.referenceNumber, paymentMethod: value.paymentMethod, amount: Number(value.amount || 0) };
}
function invoiceJson(invoice, items = [], payments = []) {
  const paymentsApplied = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const value = invoice.toJSON();
  const overdue = getInvoiceOverdueState(value);
  return {
    ...value,
    billingFrequency: billingFrequencyFor(invoice),
    items: items.map(item => item.toJSON ? item.toJSON() : item),
    paymentsApplied: Number(paymentsApplied.toFixed(2)),
    payments: payments.map(paymentJson),
    pdfUrl: invoice.pdfPath ? `/api/invoices/records/${invoice.id}/pdf` : (invoice.url || null),
    ...overdue,
    displayStatus: overdue.isOverdue ? overdueLabel(overdue.daysOverdue) : value.status,
  };
}
function invoiceUpdateValues(body, subtotal, existing, company) {
  return {
    employee_id: body.employeeId, employeeName: body.employeeName || existing.employeeName,
    company_id: company.id, companyName: company.name, templateName: getInvoiceTemplate(company).label,
    project_id: body.projectId || null, projectName: body.projectName || null, client_id: body.clientId || null, clientName: body.clientName || null,
    vendor_id: body.vendorId || null, vendorName: body.vendorName || null, prime_vendor_id: body.primeVendorId || null, primeVendorName: body.primeVendorName || null,
    billToType: body.billToType, billToId: body.billToId, billToCompany: body.billToCompany, billingContactName: body.billingContactName || null,
    billingEmail: body.billingEmail || null, billingAddress: body.billingAddress || null, invoiceNumber: body.invoiceNumber.trim(),
    invoiceDate: dateOnly(body.invoiceDate), billingFromDate: dateOnly(body.invoiceDate), billingToDate: dateOnly(body.dueDate), poNumber: body.poNumber || null,
    billingFrequency: normalizeBillingFrequency(body.billingFrequency),
    paymentTerms: body.paymentTerms, customPaymentDays: body.paymentTerms === 'Custom' ? Number(body.customPaymentDays) : null, dueDate: dateOnly(body.dueDate), currency: normalizeCurrency(body.currency), subtotal, total: subtotal, balanceDue: subtotal,
    status: body.status || existing.status, updatedBy: body.updatedBy || existing.updatedBy,
  };
}
function calculateItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('At least one invoice item is required');
  return items.map(item => {
    const hours = Number(item.hours);
    const rate = Number(item.rate);
    if (!item.name?.trim() || !item.description?.trim()) throw new Error('Item name and description are required');
    if (!Number.isFinite(hours) || hours < 0 || !Number.isFinite(rate) || rate < 0) throw new Error('Hours and rate must be numeric values of 0 or greater');
    return { name: item.name.trim(), description: item.description.trim(), hours, rate, amount: Number((hours * rate).toFixed(2)) };
  });
}
function validate(body, items) {
  const required = ['companyId', 'employeeId', 'billToType', 'billToId', 'invoiceNumber', 'invoiceDate', 'paymentTerms', 'dueDate'];
  for (const field of required) if (!body[field]) throw new Error(`${field} is required`);
  if (!String(body.invoiceNumber || '').trim()) throw new Error('Invoice Number is required');
  if (!['Client', 'Vendor', 'Prime Vendor'].includes(body.billToType)) throw new Error('Invalid Bill To type');
  if (!(body.paymentTerms in TERMS)) throw new Error('Invalid payment terms');
  if (body.paymentTerms === 'Custom' && (!Number.isInteger(Number(body.customPaymentDays)) || Number(body.customPaymentDays) <= 0)) throw new Error('Custom Net Days must be a positive whole number');
  if (body.dueDate < body.invoiceDate) throw new Error('Due date cannot be before Invoice Date');
  if (body.billingEmail && !emailPattern.test(body.billingEmail)) throw new Error('Billing email is invalid');
  if (body.status && !STATUSES.has(body.status)) throw new Error('Invalid invoice status');
  normalizeBillingFrequency(body.billingFrequency);
  return calculateItems(items);
}
async function getItems(invoiceId) { return InvoiceItem.findAll({ where: { invoice_id: invoiceId }, order: [['id', 'ASC']] }); }
async function getPayments(invoiceId) {
  const [allocations, legacyPayments] = await Promise.all([
    PaymentAllocation.findAll({
      where: { invoice_id: invoiceId },
      include: [{ model: Payment, as: 'payment' }],
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
    }),
    Payment.findAll({
      where: { invoice_id: invoiceId },
      include: [{ model: PaymentAllocation, as: 'allocations', required: false }],
      order: [['date', 'DESC'], ['id', 'DESC']],
    }),
  ]);
  const allocatedPayments = allocations.map(allocation => {
    const payment = allocation.payment?.toJSON ? allocation.payment.toJSON() : allocation.payment;
    return { ...payment, amount: allocation.amount };
  }).filter(Boolean);
  const unallocatedLegacyPayments = legacyPayments.filter(payment => !(payment.allocations || []).length);
  return [...allocatedPayments, ...unallocatedLegacyPayments];
}
async function getInvoice(id) {
  const invoice = await Invoice.findByPk(id);
  if (!invoice) return null;
  return { invoice, items: await getItems(invoice.id), payments: await getPayments(invoice.id) };
}

exports.list = async (req, res) => {
  try {
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : null;
    if (req.query.employeeId && !Number.isInteger(employeeId)) return res.status(400).json({ error: 'employeeId must be a valid integer' });
    const invoices = await Invoice.findAll({ where: employeeId ? { employee_id: employeeId } : undefined, order: [['createdAt', 'DESC']] });
    const result = await Promise.all(invoices.map(async invoice => invoiceJson(invoice, await getItems(invoice.id), await getPayments(invoice.id))));
    const filtered = String(req.query.status || '').trim().toLowerCase() === 'overdue' ? result.filter(invoice => invoice.isOverdue) : result;
    res.json({ invoices: filtered });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.lookups = async (_req, res) => {
  try {
    const [companies, employees, parties] = await Promise.all([
      Company.findAll({ order: [['name', 'ASC']] }),
      Employee.findAll({ attributes: ['employee_id', 'name', 'firstName', 'lastName', 'email', 'clientName'], order: [['firstName', 'ASC']] }),
      WorkClientDetail.findAll({ where: { employee_id: null, type: { [Op.in]: ['client', 'vendor', 'primeVendor'] } }, order: [['name', 'ASC']] }),
    ]);
    const formatParty = row => ({ id: row.id, name: row.name, type: row.type, address: row.address || '', billingContactName: row.meta?.billingContactName || '', billingEmail: row.meta?.billingEmail || row.email || '', billingAddress: row.meta?.billingAddress || row.address || '', paymentTerms: row.meta?.paymentTerms || 'Net 30', customNetDays: row.meta?.customNetDays || null, currency: row.meta?.currency || 'USD', clientName: row.client_name || '', vendorName: row.vendor_name || '', primeVendorName: row.prime_vendor_name || '' });
    res.json({ companies: companies.map(company => ({ ...company.toJSON(), templateName: getInvoiceTemplate(company).label })), employees: employees.map(employee => ({ id: employee.employee_id, name: fullName(employee), clientName: employee.clientName || '' })), parties: parties.map(formatParty) });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.approvedHours = async (req, res) => {
  try {
    const { employeeId, billingFromDate, billingToDate, projectName } = req.query;
    if (!employeeId || !billingFromDate || !billingToDate) return res.status(400).json({ error: 'employeeId, billingFromDate and billingToDate are required' });
    const where = { employee_id: employeeId, status: 'Approved', dateKey: { [Op.between]: [billingFromDate, billingToDate] } };
    if (projectName) where.project = projectName;
    const entries = await TimesheetEntry.findAll({ where, attributes: ['hours'] });
    res.json({ hours: entries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0), entries: entries.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.vendorRate = async (req, res) => {
  try {
    const { vendorId, employeeId } = req.query;
    if (!vendorId || !employeeId) return res.status(400).json({ error: 'vendorId and employeeId are required' });
    const mapping = await VendorEmployeeRate.findOne({ where: { vendor_id: vendorId, employee_id: employeeId } });
    res.json({ rate: mapping ? Number(mapping.rate) : null });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.vendorsForEmployee = async (req, res) => {
  try {
    const employeeId = Number(req.query.employeeId);
    if (!Number.isInteger(employeeId)) return res.status(400).json({ error: 'employeeId must be a valid integer' });
    const mappings = await VendorEmployeeRate.findAll({ where: { employee_id: employeeId }, order: [['vendor_id', 'ASC']] });
    const vendorIds = mappings.map(mapping => mapping.vendor_id);
    const vendors = vendorIds.length ? await WorkClientDetail.findAll({ where: { id: { [Op.in]: vendorIds }, type: 'vendor', employee_id: null }, attributes: ['id', 'name'] }) : [];
    const vendorById = new Map(vendors.map(vendor => [vendor.id, vendor]));
    res.json({ vendors: mappings.map(mapping => {
      const vendor = vendorById.get(mapping.vendor_id);
      return vendor ? { id: vendor.id, name: vendor.name, rate: Number(mapping.rate) } : null;
    }).filter(Boolean) });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const items = validate(req.body, req.body.items);
    const employee = await Employee.findByPk(req.body.employeeId);
    const company = await Company.findByPk(req.body.companyId);
    if (!employee || !company) return res.status(400).json({ error: 'Selected employee or company was not found' });
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const invoice = await Invoice.create({
      employee_id: employee.employee_id, employeeName: fullName(employee), company_id: company.id, companyName: company.name,
      templateName: getInvoiceTemplate(company).label, project_id: req.body.projectId || null, projectName: req.body.projectName || null,
      client_id: req.body.clientId || null, clientName: req.body.clientName || null, vendor_id: req.body.vendorId || null, vendorName: req.body.vendorName || null,
      prime_vendor_id: req.body.primeVendorId || null, primeVendorName: req.body.primeVendorName || null,
      billToType: req.body.billToType, billToId: req.body.billToId, billToCompany: req.body.billToCompany,
      billingContactName: req.body.billingContactName || null, billingEmail: req.body.billingEmail || null, billingAddress: req.body.billingAddress || null,
      invoiceNumber: req.body.invoiceNumber.trim(), invoiceDate: dateOnly(req.body.invoiceDate), billingFromDate: dateOnly(req.body.invoiceDate), billingToDate: dateOnly(req.body.dueDate),
      poNumber: req.body.poNumber || null, paymentTerms: req.body.paymentTerms, customPaymentDays: req.body.paymentTerms === 'Custom' ? Number(req.body.customPaymentDays) : null, dueDate: dateOnly(req.body.dueDate), currency: normalizeCurrency(req.body.currency),
      billingFrequency: normalizeBillingFrequency(req.body.billingFrequency),
      subtotal, total: subtotal, balanceDue: subtotal, status: req.body.status || 'Draft', createdBy: req.body.createdBy || '', updatedBy: '',
    });
    const savedItems = await InvoiceItem.bulkCreate(items.map(item => ({ ...item, invoice_id: invoice.id })), { returning: true });
    res.status(201).json({ invoice: invoiceJson(invoice, savedItems, []) });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.get = async (req, res) => {
  try { const result = await getInvoice(req.params.id); if (!result) return res.status(404).json({ error: 'Invoice not found' }); res.json({ invoice: invoiceJson(result.invoice, result.items, result.payments) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
};

exports.update = async (req, res) => {
  try {
    const result = await getInvoice(req.params.id); if (!result) return res.status(404).json({ error: 'Invoice not found' });
    const items = validate(req.body, req.body.items);
    const company = await Company.findByPk(req.body.companyId);
    if (!company) return res.status(400).json({ error: 'Selected company was not found' });
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const paymentsApplied = result.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    if (subtotal + 0.00001 < paymentsApplied) return res.status(400).json({ error: 'Invoice total cannot be less than payments already applied.' });
    const values = invoiceUpdateValues(req.body, subtotal, result.invoice, company);
    values.balanceDue = Number((subtotal - paymentsApplied).toFixed(2));
    if (values.balanceDue === 0) values.status = 'Paid';
    await result.invoice.update(values);
    await InvoiceItem.destroy({ where: { invoice_id: result.invoice.id } });
    const savedItems = await InvoiceItem.bulkCreate(items.map(item => ({ ...item, invoice_id: result.invoice.id })), { returning: true });
    await result.invoice.reload();
    await consumeEditApproval(req, 'invoice', req.params.id);
    res.json({ invoice: invoiceJson(result.invoice, savedItems, result.payments) });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.generatePdf = async (req, res) => {
  try {
    const result = await getInvoice(req.params.id); if (!result) return res.status(404).json({ error: 'Invoice not found' });
    if (!String(result.invoice.invoiceNumber || '').trim()) return res.status(400).json({ error: 'Invoice Number is required before generating a PDF.' });
    const generatedAt = new Date();
    const automaticDescription = automaticInvoiceDescription(result.invoice.employeeName, result.invoice.billingFrequency, generatedAt);
    const automaticItems = automaticDescription
      ? result.items.filter(item => !item.description?.trim() || isAutomaticInvoiceDescription(item.description, result.invoice.employeeName))
      : [];
    if (automaticItems.length) {
      await Promise.all(automaticItems.map(item => item.update({ description: automaticDescription })));
      result.items = await getItems(result.invoice.id);
    }
    const company = await Company.findByPk(result.invoice.company_id);
    const pdf = await generateInvoicePdf({ invoice: result.invoice, items: result.items, company, generatedAt });
    await result.invoice.update({ pdfPath: pdf.outputPath, pdfVersion: pdf.version, filename: pdf.filename, originalName: pdf.downloadName, templateName: pdf.templateName, url: `/api/invoices/records/${result.invoice.id}/pdf`, status: result.invoice.status === 'Draft' ? 'Generated' : result.invoice.status, generatedDate: generatedAt.toISOString().slice(0, 10) });
    await result.invoice.reload();
    res.json({ invoice: invoiceJson(result.invoice, result.items, result.payments) });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.downloadPdf = async (req, res) => {
  try { const result = await getInvoice(req.params.id); if (!result?.invoice.pdfPath) return res.status(404).json({ error: 'Generated PDF not found' }); return res.download(result.invoice.pdfPath, result.invoice.originalName || result.invoice.filename); }
  catch (err) { res.status(500).json({ error: err.message }); }
};
