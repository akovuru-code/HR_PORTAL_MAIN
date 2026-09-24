const express = require('express');
const { Op } = require('sequelize');
const authenticateToken = require('../middleware/auth');
const { requirePermission, accountType } = require('../middleware/authorization');
const sequelize = require('../models/db');
const Invoice = require('../models/invoice');
const Payment = require('../models/payment');
const PaymentAllocation = require('../models/paymentAllocation');

const router = express.Router();
const EXCLUDED_STATUSES = new Set(['paid', 'void', 'cancelled', 'canceled']);
const invoiceAttributes = ['id', 'invoiceNumber', 'employee_id', 'employeeName', 'billToId', 'billToCompany', 'currency', 'total', 'balanceDue', 'status'];

router.use(authenticateToken);
router.use(requirePermission('invoice:manage'));

function paymentJson(payment) {
  const value = payment.toJSON ? payment.toJSON() : payment;
  const allocations = (value.allocations || []).map(allocation => ({
    id: allocation.id,
    invoiceId: allocation.invoice_id,
    invoiceNumber: allocation.invoice?.invoiceNumber || '',
    amount: Number(allocation.amount || 0),
  }));
  return {
    ...value,
    amount: Number(value.amount || 0),
    currency: value.currency || value.invoiceRecord?.currency || 'USD',
    invoiceNumbers: allocations.length ? allocations.map(item => item.invoiceNumber).filter(Boolean).join(', ') : (value.invoice || ''),
    allocations,
  };
}

router.get('/open-invoices', async (req, res) => {
  const vendorId = Number(req.query.vendorId);
  const currency = String(req.query.currency || '').trim().toUpperCase();
  if (!Number.isInteger(vendorId) || !currency) return res.status(400).json({ error: 'Vendor and currency are required.' });

  try {
    const invoices = await Invoice.findAll({
      where: {
        billToType: 'Vendor',
        billToId: vendorId,
        currency,
        status: { [Op.notIn]: ['Paid', 'Void', 'Cancelled', 'Canceled'] },
        balanceDue: { [Op.gt]: 0 },
      },
      order: [['dueDate', 'ASC'], ['id', 'ASC']],
    });
    const openInvoices = invoices
      .filter(invoice => !EXCLUDED_STATUSES.has(String(invoice.status || '').toLowerCase()))
      .filter(invoice => String(invoice.currency || 'USD').toUpperCase() === currency)
      .filter(invoice => Number(invoice.balanceDue || 0) > 0)
      .map(invoice => ({
        id: invoice.id,
        employee_id: invoice.employee_id,
        invoiceNumber: invoice.invoiceNumber || '',
        status: invoice.status || 'Generated',
        currency: String(invoice.currency || 'USD').toUpperCase(),
        dueDate: invoice.dueDate || invoice.generatedDate || '',
        generatedDate: invoice.generatedDate || '',
        originalAmount: Number(invoice.total || 0),
        openBalance: Number(invoice.balanceDue || 0),
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
      include: [
        { model: Invoice, as: 'invoiceRecord', attributes: invoiceAttributes },
        { model: PaymentAllocation, as: 'allocations', include: [{ model: Invoice, as: 'invoice', attributes: ['id', 'invoiceNumber'] }] },
      ],
      order: [['date', 'DESC'], ['id', 'DESC']],
    });
    res.json({ payments: payments.map(paymentJson) });
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

router.post('/', async (req, res) => {
  const { date, vendorId, currency, referenceNumber, paymentMethod } = req.body || {};
  const allocations = Array.isArray(req.body?.allocations) ? req.body.allocations : [];
  const normalizedCurrency = String(currency || '').trim().toUpperCase();
  const errors = {};
  if (!date) errors.date = 'Date is required.';
  if (!Number.isInteger(Number(vendorId))) errors.vendorId = 'Vendor is required.';
  if (!normalizedCurrency) errors.currency = 'Currency is required.';
  const isRootAdmin = accountType(req.user) === 'root_admin';
  const isAccountsAdmin = String(req.user?.adminRole || req.user?.admin_role || '').toLowerCase() === 'accounts';
  if (!isRootAdmin && !isAccountsAdmin && !String(referenceNumber || '').trim()) errors.referenceNumber = 'Reference Number is required.';
  if (!String(paymentMethod || '').trim()) errors.paymentMethod = 'Payment Method is required.';

  const allocationsByInvoice = new Map();
  for (const allocation of allocations) {
    const invoiceId = Number(allocation?.invoiceId);
    const amount = Number(allocation?.amount);
    if (!Number.isInteger(invoiceId) || !Number.isFinite(amount) || amount < 0) {
      errors.allocations = 'Each payment allocation must contain a valid invoice and amount.';
      continue;
    }
    if (amount > 0) allocationsByInvoice.set(invoiceId, Number(((allocationsByInvoice.get(invoiceId) || 0) + amount).toFixed(2)));
  }
  if (!allocationsByInvoice.size) errors.allocations = 'Enter a payment amount for at least one invoice.';
  const totalAmount = [...allocationsByInvoice.values()].reduce((sum, amount) => sum + amount, 0);
  if (totalAmount <= 0) errors.allocations = 'Payment amount must be greater than zero.';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please correct the highlighted fields.', errors });

  try {
    const payment = await sequelize.transaction(async transaction => {
      const invoiceIds = [...allocationsByInvoice.keys()].sort((a, b) => a - b);
      const invoices = await Invoice.findAll({
        where: { id: { [Op.in]: invoiceIds } },
        transaction,
        lock: transaction.LOCK.UPDATE,
        order: [['id', 'ASC']],
      });
      if (invoices.length !== invoiceIds.length) {
        const error = new Error('One or more selected invoices were not found.'); error.status = 404; throw error;
      }
      for (const invoice of invoices) {
        const amount = allocationsByInvoice.get(invoice.id);
        if (invoice.billToType !== 'Vendor' || Number(invoice.billToId) !== Number(vendorId)) {
          const error = new Error('Each selected invoice must belong to the selected vendor.'); error.status = 400; throw error;
        }
        if (String(invoice.currency || '').toUpperCase() !== normalizedCurrency) {
          const error = new Error('Each selected invoice must use the selected currency.'); error.status = 400; throw error;
        }
        if (EXCLUDED_STATUSES.has(String(invoice.status || '').toLowerCase()) || Number(invoice.balanceDue || 0) <= 0) {
          const error = new Error('Payments cannot be applied to a closed invoice.'); error.status = 400; throw error;
        }
        if (amount > Number(invoice.balanceDue) + 0.00001) {
          const error = new Error(`Payment for invoice ${invoice.invoiceNumber || invoice.id} cannot exceed its balance due.`); error.status = 400; throw error;
        }
      }

      const vendorName = invoices[0].billToCompany || '';
      const created = await Payment.create({
        date,
        vendor: vendorName,
        vendor_id: Number(vendorId),
        currency: normalizedCurrency,
        // These legacy fields remain populated for compatibility with existing exports.
        invoice_id: invoices.length === 1 ? invoices[0].id : null,
        invoice: invoices.map(invoice => invoice.invoiceNumber || String(invoice.id)).join(', '),
        referenceNumber: String(referenceNumber || '').trim() || null,
        paymentMethod: String(paymentMethod).trim(),
        amount: Number(totalAmount.toFixed(2)),
        createdBy: req.user?.name || req.user?.email || String(req.user?.id || ''),
      }, { transaction });
      await PaymentAllocation.bulkCreate(invoices.map(invoice => ({ payment_id: created.id, invoice_id: invoice.id, amount: allocationsByInvoice.get(invoice.id) })), { transaction });
      await Promise.all(invoices.map(invoice => {
        const nextBalance = Math.max(0, Number((Number(invoice.balanceDue) - allocationsByInvoice.get(invoice.id)).toFixed(2)));
        return invoice.update({ balanceDue: nextBalance, status: nextBalance === 0 ? 'Paid' : invoice.status }, { transaction });
      }));
      return created;
    });
    const saved = await Payment.findByPk(payment.id, {
      include: [
        { model: Invoice, as: 'invoiceRecord', attributes: invoiceAttributes },
        { model: PaymentAllocation, as: 'allocations', include: [{ model: Invoice, as: 'invoice', attributes: ['id', 'invoiceNumber'] }] },
      ],
    });
    res.status(201).json({ payment: paymentJson(saved) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Failed to create payment:', error);
    res.status(500).json({ error: 'Failed to save payment' });
  }
});

module.exports = router;
