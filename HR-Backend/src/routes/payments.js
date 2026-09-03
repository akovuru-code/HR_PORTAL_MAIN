const express = require('express');
const { Op } = require('sequelize');
const authenticateToken = require('../middleware/auth');
const Invoice = require('../models/invoice');
const Payment = require('../models/payment');
const WorkClientDetail = require('../models/workClientDetail');

const router = express.Router();

router.use(authenticateToken);
router.use((req, res, next) => {
  if (String(req.user?.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
});

router.get('/open-invoices', async (req, res) => {
  const vendor = String(req.query.vendor || '').trim();
  const currency = String(req.query.currency || '').trim().toUpperCase();
  if (!vendor || !currency) {
    return res.status(400).json({ error: 'Vendor and currency are required.' });
  }

  try {
    const vendorRows = await WorkClientDetail.findAll({
      where: {
        employee_id: { [Op.ne]: null },
        [Op.or]: [
          { type: 'vendor', name: vendor },
          { vendor_name: vendor },
        ],
      },
      attributes: ['employee_id'],
    });
    const employeeIds = [...new Set(vendorRows.map((row) => row.employee_id).filter(Boolean))];
    if (!employeeIds.length) return res.json({ invoices: [] });

    const invoices = await Invoice.findAll({
      where: { employee_id: { [Op.in]: employeeIds } },
      order: [['generatedDate', 'ASC'], ['id', 'ASC']],
    });
    const excludedStatuses = new Set(['paid', 'void', 'cancelled', 'canceled']);
    const openInvoices = invoices
      .filter((invoice) => !excludedStatuses.has(String(invoice.status || '').toLowerCase()))
      .filter((invoice) => String(invoice.currency || 'USD').toUpperCase() === currency)
      .map((invoice) => ({
        id: invoice.id,
        employee_id: invoice.employee_id,
        invoiceNumber: invoice.invoiceNumber || '',
        status: invoice.status || 'Generated',
        currency: String(invoice.currency || 'USD').toUpperCase(),
        dueDate: invoice.dueDate || invoice.generatedDate || '',
        generatedDate: invoice.generatedDate || '',
        originalAmount: invoice.originalAmount ?? invoice.amount ?? null,
        openBalance: invoice.openBalance ?? invoice.balance ?? invoice.originalAmount ?? invoice.amount ?? null,
      }));

    res.json({ invoices: openInvoices });
  } catch (error) {
    console.error('Failed to fetch open invoices:', error);
    res.status(500).json({ error: 'Failed to fetch open invoices' });
  }
});

router.get('/', async (_req, res) => {
  try {
    const payments = await Payment.findAll({
      order: [['date', 'DESC'], ['id', 'DESC']],
    });
    res.json({ payments });
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

router.post('/', async (req, res) => {
  const {
    date,
    vendor,
    invoice,
    referenceNumber,
    paymentMethod,
    amount,
  } = req.body || {};

  const numericAmount = Number(amount);
  const errors = {};
  if (!date) errors.date = 'Date is required.';
  if (!String(vendor || '').trim()) errors.vendor = 'Vendor is required.';
  if (!String(invoice || '').trim()) errors.invoice = 'Invoice is required.';
  if (!String(referenceNumber || '').trim()) errors.referenceNumber = 'Reference Number is required.';
  if (!String(paymentMethod || '').trim()) errors.paymentMethod = 'Payment Method is required.';
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) errors.amount = 'Amount must be greater than zero.';

  if (Object.keys(errors).length) {
    return res.status(400).json({ error: 'Please correct the highlighted fields.', errors });
  }

  try {
    const payment = await Payment.create({
      date,
      vendor: String(vendor).trim(),
      invoice: String(invoice).trim(),
      referenceNumber: String(referenceNumber).trim(),
      paymentMethod: String(paymentMethod).trim(),
      amount: numericAmount.toFixed(2),
      createdBy: req.user?.name || req.user?.email || String(req.user?.id || ''),
    });
    res.status(201).json({ payment });
  } catch (error) {
    console.error('Failed to create payment:', error);
    res.status(500).json({ error: 'Failed to save payment' });
  }
});

module.exports = router;
