const jwt = require('jsonwebtoken');
const request = require('supertest');
jest.mock('../src/models/payment', () => ({ findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() }));
jest.mock('../src/models/invoice', () => ({ findAll: jest.fn(), findByPk: jest.fn() }));
jest.mock('../src/models/paymentAllocation', () => ({ findAll: jest.fn(), bulkCreate: jest.fn() }));
const Payment = require('../src/models/payment');
const Invoice = require('../src/models/invoice');
const PaymentAllocation = require('../src/models/paymentAllocation');
const app = require('../src/index');
const sequelize = require('../src/models/db');
const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET || 'changeme');

describe('Payments API allocations', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.spyOn(sequelize, 'transaction').mockImplementation(async callback => callback({ LOCK: { UPDATE: 'UPDATE' } })); });
  afterEach(() => jest.restoreAllMocks());
  it('loads only open invoices for the selected vendor ID and currency', async () => {
    Invoice.findAll.mockResolvedValue([{ id: 7, invoiceNumber: 'INV-7', status: 'Generated', currency: 'USD', total: '1000', balanceDue: '500' }]);
    const response = await request(app).get('/api/payments/open-invoices?vendorId=15&currency=USD').set('Authorization', `Bearer ${token}`);
    expect(response.statusCode).toBe(200); expect(response.body.invoices[0]).toMatchObject({ id: 7, originalAmount: 1000, openBalance: 500 });
    expect(Invoice.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ billToId: 15, billToType: 'Vendor', currency: 'USD' }) }));
  });
  it('rejects a save without allocations', async () => {
    const response = await request(app).post('/api/payments').set('Authorization', `Bearer ${token}`).send({ date: '2026-09-04', vendorId: 15, currency: 'USD', referenceNumber: 'R1', paymentMethod: 'ACH', allocations: [] });
    expect(response.statusCode).toBe(400); expect(response.body.errors.allocations).toBeTruthy();
  });
  it('creates allocations and updates every affected invoice in one transaction', async () => {
    const first = { id: 7, billToType: 'Vendor', billToId: 15, billToCompany: 'Acme', currency: 'USD', invoiceNumber: 'INV-7', status: 'Generated', balanceDue: '1000', update: jest.fn().mockResolvedValue() };
    const second = { id: 8, billToType: 'Vendor', billToId: 15, billToCompany: 'Acme', currency: 'USD', invoiceNumber: 'INV-8', status: 'Generated', balanceDue: '2000', update: jest.fn().mockResolvedValue() };
    Invoice.findAll.mockResolvedValue([first, second]); Payment.create.mockResolvedValue({ id: 4 }); PaymentAllocation.bulkCreate.mockResolvedValue([]);
    Payment.findByPk.mockResolvedValue({ toJSON: () => ({ id: 4, amount: '1250', currency: 'USD', allocations: [{ invoice_id: 7, amount: '500', invoice: { invoiceNumber: 'INV-7' } }, { invoice_id: 8, amount: '750', invoice: { invoiceNumber: 'INV-8' } }] }) });
    const response = await request(app).post('/api/payments').set('Authorization', `Bearer ${token}`).send({ date: '2026-09-04', vendorId: 15, currency: 'USD', referenceNumber: 'R1', paymentMethod: 'ACH', allocations: [{ invoiceId: 7, amount: 500 }, { invoiceId: 8, amount: 750 }] });
    expect(response.statusCode).toBe(201); expect(PaymentAllocation.bulkCreate).toHaveBeenCalled(); expect(first.update).toHaveBeenCalledWith({ balanceDue: 500, status: 'Generated' }, expect.any(Object)); expect(second.update).toHaveBeenCalledWith({ balanceDue: 1250, status: 'Generated' }, expect.any(Object));
  });
});
