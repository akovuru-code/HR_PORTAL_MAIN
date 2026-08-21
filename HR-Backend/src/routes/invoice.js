const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/auth");
const Invoice = require("../models/invoice");
const Employee = require("../models/employee");

const formatInvoice = (invoice, employee) => ({
    id: invoice.id,
    employee_id: invoice.employee_id,
    employeeName: employee
        ? [employee.firstName, employee.lastName].filter(Boolean).join(" ") || employee.name || employee.email || ""
        : "",
    invoiceNumber: invoice.invoiceNumber || "",
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
router.get("/", authenticateToken, async (req, res) => {
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
router.post("/", authenticateToken, async (req, res) => {
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
        } = req.body;

        const invoice = await Invoice.create({
            employee_id,
            invoiceNumber,
            status,
            generatedDate,
            filename: filename || invoiceFileName || null,
            url: url || invoiceFileUrl || null,
            originalName: originalName || invoiceFileName || null,
            createdBy,
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
router.patch("/:id", authenticateToken, async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }

        await invoice.update({
            employee_id: req.body.employee_id ?? invoice.employee_id,
            invoiceNumber: req.body.invoiceNumber ?? invoice.invoiceNumber,
            status: req.body.status ?? invoice.status,
            generatedDate: req.body.generatedDate ?? invoice.generatedDate,
            filename: req.body.filename ?? req.body.invoiceFileName ?? invoice.filename,
            url: req.body.url ?? req.body.invoiceFileUrl ?? invoice.url,
            originalName: req.body.originalName ?? req.body.invoiceFileName ?? invoice.originalName,
            updatedBy: req.body.updatedBy ?? invoice.updatedBy,
        });

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

router.put("/:id", authenticateToken, async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }

        await invoice.update({
            employee_id: req.body.employee_id ?? invoice.employee_id,
            invoiceNumber: req.body.invoiceNumber ?? invoice.invoiceNumber,
            status: req.body.status ?? invoice.status,
            generatedDate: req.body.generatedDate ?? invoice.generatedDate,
            filename: req.body.filename ?? req.body.invoiceFileName ?? invoice.filename,
            url: req.body.url ?? req.body.invoiceFileUrl ?? invoice.url,
            originalName: req.body.originalName ?? req.body.invoiceFileName ?? invoice.originalName,
            updatedBy: req.body.updatedBy ?? invoice.updatedBy,
        });

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

router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }

        await invoice.destroy();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete invoice" });
    }
});

module.exports = router;