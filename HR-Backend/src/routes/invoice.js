const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/auth");
const { requirePermission } = require('../middleware/authorization');
const { requireApprovedDelete, requireApprovedEdit, consumeDeleteApproval, consumeEditApproval } = require('../services/deleteAuthorizationService');
const Invoice = require("../models/invoice");
const Employee = require("../models/employee");
const invoiceController = require('../controllers/invoiceController');

// Complete invoice workflow. The older root CRUD routes below remain intact
// for compatibility with existing upload-only integrations.
router.get('/records/lookups', authenticateToken, requirePermission('invoice:manage'), invoiceController.lookups);
router.get('/records/approved-hours', authenticateToken, requirePermission('invoice:manage'), invoiceController.approvedHours);
router.get('/records/vendors', authenticateToken, requirePermission('invoice:manage'), invoiceController.vendorsForEmployee);
router.get('/records/vendor-rate', authenticateToken, requirePermission('invoice:manage'), invoiceController.vendorRate);
router.get('/records', authenticateToken, requirePermission('invoice:manage'), invoiceController.list);
router.post('/records', authenticateToken, requirePermission('invoice:manage'), invoiceController.create);
router.get('/records/:id', authenticateToken, requirePermission('invoice:manage'), invoiceController.get);
router.patch('/records/:id', authenticateToken, requirePermission('invoice:manage'), requireApprovedEdit('invoice'), invoiceController.update);
router.post('/records/:id/generate-pdf', authenticateToken, requirePermission('invoice:manage'), invoiceController.generatePdf);
router.post('/records/:id/regenerate-pdf', authenticateToken, requirePermission('invoice:manage'), invoiceController.generatePdf);
router.get('/records/:id/pdf', authenticateToken, requirePermission('invoice:manage'), invoiceController.downloadPdf);

const billingFrequencyFor = invoice => invoice.billingFrequency || (invoice.biWeekly === 'Yes' ? 'bi-weekly' : invoice.monthly === 'Yes' ? 'monthly' : null);
const normalizeBillingFrequency = value => {
    if (value === undefined || value === null || value === '') return null;
    const normalized = String(value).trim().toLowerCase();
    if (!['bi-weekly', 'monthly'].includes(normalized)) throw new Error('Invalid billing frequency');
    return normalized;
};
const formatInvoice = (invoice, employee) => ({
    id: invoice.id,
    employee_id: invoice.employee_id,
    employeeName: employee
        ? [employee.firstName, employee.lastName].filter(Boolean).join(" ") || employee.name || employee.email || ""
        : "",
    invoiceNumber: invoice.invoiceNumber || "",
    billingFrequency: billingFrequencyFor(invoice),
    status: invoice.status || "Generated",
    generatedDate: invoice.generatedDate || "",
    invoiceFileName: invoice.originalName || invoice.filename || invoice.invoiceFileName || "",
    invoiceFileUrl: invoice.url || invoice.invoiceFileUrl || "",
    createdBy: invoice.createdBy || "",
    updatedBy: invoice.updatedBy || "",
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
});

// GET all invoices
router.get("/", authenticateToken, requirePermission('invoice:manage'), async (req, res) => {
    try {
        const invoices = await Invoice.findAll({
            order: [["createdAt", "DESC"]],
        });

        const employeeIds = [...new Set(invoices.map((invoice) => invoice.employee_id).filter(Boolean))];
        const employees = await Employee.findAll({
            where: { employee_id: employeeIds },
            attributes: ["employee_id", "name", "firstName", "lastName", "email"],
        });
        const employeeMap = Object.fromEntries(employees.map((employee) => [employee.employee_id, employee]));

        res.json({
            invoices: invoices.map((invoice) => formatInvoice(invoice, employeeMap[invoice.employee_id])),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch invoices" });
    }
});

// CREATE invoice
router.post("/", authenticateToken, requirePermission('invoice:manage'), async (req, res) => {
    try {
        const {
            employee_id,
            invoiceNumber,
            status,
            generatedDate,
            invoiceFileName,
            invoiceFileUrl,
            filename,
            url,
            originalName,
            createdBy,
            employeeName,
            billingFrequency,
        } = req.body;

        if (!String(invoiceNumber || '').trim()) {
            return res.status(400).json({ error: "Invoice Number is required" });
        }

        const invoice = await Invoice.create({
            employee_id,
            invoiceNumber: invoiceNumber.trim(),
            status,
            generatedDate,
            filename: filename || invoiceFileName || null,
            url: url || invoiceFileUrl || null,
            originalName: originalName || invoiceFileName || null,
            createdBy,
            billingFrequency: normalizeBillingFrequency(billingFrequency),
        });

        const employee = await Employee.findByPk(employee_id, {
            attributes: ["employee_id", "name", "firstName", "lastName", "email"],
        });

        res.json({
            message: "Invoice created",
            invoice: formatInvoice(invoice, employee),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create invoice" });
    }
});

// UPDATE invoice
router.patch("/:id", authenticateToken, requirePermission('invoice:manage'), requireApprovedEdit('invoice'), async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }
        if (req.body.invoiceNumber !== undefined && !String(req.body.invoiceNumber).trim()) {
            return res.status(400).json({ error: "Invoice Number is required" });
        }

        await invoice.update({
            employee_id: req.body.employee_id ?? invoice.employee_id,
            invoiceNumber: req.body.invoiceNumber === undefined ? invoice.invoiceNumber : String(req.body.invoiceNumber).trim(),
            status: req.body.status ?? invoice.status,
            generatedDate: req.body.generatedDate ?? invoice.generatedDate,
            filename: req.body.filename ?? req.body.invoiceFileName ?? invoice.filename,
            url: req.body.url ?? req.body.invoiceFileUrl ?? invoice.url,
            originalName: req.body.originalName ?? req.body.invoiceFileName ?? invoice.originalName,
            updatedBy: req.body.updatedBy ?? invoice.updatedBy,
            billingFrequency: req.body.billingFrequency === undefined ? invoice.billingFrequency : normalizeBillingFrequency(req.body.billingFrequency),
        });

        await consumeEditApproval(req, 'invoice', req.params.id);
        const employee = await Employee.findByPk(invoice.employee_id, {
            attributes: ["employee_id", "name", "firstName", "lastName", "email"],
        });

        res.json({
            message: "Invoice updated",
            invoice: formatInvoice(invoice, employee),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update invoice" });
    }
});

router.put("/:id", authenticateToken, requirePermission('invoice:manage'), requireApprovedEdit('invoice'), async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }
        if (req.body.invoiceNumber !== undefined && !String(req.body.invoiceNumber).trim()) {
            return res.status(400).json({ error: "Invoice Number is required" });
        }

        await invoice.update({
            employee_id: req.body.employee_id ?? invoice.employee_id,
            invoiceNumber: req.body.invoiceNumber === undefined ? invoice.invoiceNumber : String(req.body.invoiceNumber).trim(),
            status: req.body.status ?? invoice.status,
            generatedDate: req.body.generatedDate ?? invoice.generatedDate,
            filename: req.body.filename ?? req.body.invoiceFileName ?? invoice.filename,
            url: req.body.url ?? req.body.invoiceFileUrl ?? invoice.url,
            originalName: req.body.originalName ?? req.body.invoiceFileName ?? invoice.originalName,
            updatedBy: req.body.updatedBy ?? invoice.updatedBy,
            billingFrequency: req.body.billingFrequency === undefined ? invoice.billingFrequency : normalizeBillingFrequency(req.body.billingFrequency),
        });

        await consumeEditApproval(req, 'invoice', req.params.id);
        const employee = await Employee.findByPk(invoice.employee_id, {
            attributes: ["employee_id", "name", "firstName", "lastName", "email"],
        });

        res.json({
            message: "Invoice updated",
            invoice: formatInvoice(invoice, employee),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update invoice" });
    }
});

router.delete("/:id", authenticateToken, requirePermission('invoice:manage'), requireApprovedDelete('invoice'), async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }

        await invoice.destroy();
        await consumeDeleteApproval(req, 'invoice', req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete invoice" });
    }
});

module.exports = router;
