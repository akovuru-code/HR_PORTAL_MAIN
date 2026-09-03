const jwt = require('jsonwebtoken');
const request = require('supertest');

jest.mock('../src/models/payment', () => ({
  findAll: jest.fn(),
  create: jest.fn(),
}));
jest.mock('../src/models/invoice', () => ({
  findAll: jest.fn(),
}));
jest.mock('../src/models/workClientDetail', () => ({
  findAll: jest.fn(),
}));

const Invoice = require('../src/models/invoice');
const Payment = require('../src/models/payment');
const WorkClientDetail = require('../src/models/workClientDetail');
const app = require('../src/index');

const adminToken = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET || 'changeme');
const employeeToken = jwt.sign({ id: 2, role: 'employee' }, process.env.JWT_SECRET || 'changeme');

describe('Payments API', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns payments for an admin', async () => {
    Payment.findAll.mockResolvedValue([{ id: 1, vendor: 'Acme Staffing' }]);

    const response = await request(app)
      .get('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.payments).toEqual([{ id: 1, vendor: 'Acme Staffing' }]);
  });

  it('rejects non-admin access', async () => {
    const response = await request(app)
      .get('/api/payments')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(response.statusCode).toBe(403);
  });

  it('returns open invoices for the selected vendor and currency', async () => {
    WorkClientDetail.findAll.mockResolvedValue([{ employee_id: 42 }]);
    Invoice.findAll.mockResolvedValue([
      { id: 7, employee_id: 42, invoiceNumber: 'INV-7', status: 'Generated', generatedDate: '2026-09-03', currency: 'USD' },
      { id: 8, employee_id: 42, invoiceNumber: 'INV-8', status: 'Paid', generatedDate: '2026-09-03', currency: 'USD' },
      { id: 9, employee_id: 42, invoiceNumber: 'INV-9', status: 'Generated', generatedDate: '2026-09-03', currency: 'INR' },
    ]);

    const response = await request(app)
      .get('/api/payments/open-invoices?vendor=Acme%20Staffing&currency=USD')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.invoices).toEqual([
      expect.objectContaining({ id: 7, invoiceNumber: 'INV-7', currency: 'USD' }),
    ]);
  });

  it('validates required Add Payment fields', async () => {
    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 0 });

    expect(response.statusCode).toBe(400);
    expect(response.body.errors).toMatchObject({
      date: expect.any(String),
      vendor: expect.any(String),
      invoice: expect.any(String),
      referenceNumber: expect.any(String),
      paymentMethod: expect.any(String),
      amount: expect.any(String),
    });
  });

  it('creates a valid payment', async () => {
    Payment.create.mockResolvedValue({ id: 4, vendor: 'Acme Staffing', amount: '150.25' });

    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        date: '2026-09-02',
        vendor: 'Acme Staffing',
        invoice: 'INV-100',
        referenceNumber: 'REF-100',
        paymentMethod: 'ACH',
        amount: '150.25',
      });

    expect(response.statusCode).toBe(201);
    expect(Payment.create).toHaveBeenCalledWith(expect.objectContaining({
      date: '2026-09-02',
      vendor: 'Acme Staffing',
      amount: '150.25',
    }));
  });
});
