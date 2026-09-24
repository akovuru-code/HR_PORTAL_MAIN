const { getInvoiceDueState, getInvoiceOverdueState } = require('../src/utils/invoiceOverdue');

describe('invoice due status', () => {
  const today = new Date(2026, 8, 25, 14, 30, 0);

  test.each([
    ['future unpaid invoice', { dueDate: '2026-09-26', balanceDue: '500', status: 'Generated' }, true],
    ['today unpaid invoice', { dueDate: '2026-09-25', balanceDue: '500', status: 'Generated' }, true],
    ['partially paid future invoice', { dueDate: '2026-09-26', balanceDue: '250', status: 'Generated' }, true],
    ['fully paid future invoice', { dueDate: '2026-09-26', balanceDue: '0', status: 'Paid' }, false],
    ['past-due invoice', { dueDate: '2026-09-24', balanceDue: '500', status: 'Generated' }, false],
  ])('%s has the expected Due state', (_name, invoice, expected) => {
    expect(getInvoiceDueState(invoice, today).isDue).toBe(expected);
  });

  test('does not alter the existing overdue result', () => {
    const invoice = { dueDate: '2026-09-24', balanceDue: '500', status: 'Generated' };
    expect(getInvoiceDueState(invoice, today).isDue).toBe(false);
    expect(getInvoiceOverdueState(invoice, today)).toEqual({ isOverdue: true, daysOverdue: 1 });
  });
});
