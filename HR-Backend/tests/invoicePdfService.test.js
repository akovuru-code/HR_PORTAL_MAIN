const { getInvoiceTemplate } = require('../src/config/invoiceTemplates');
const { downloadFilename, money } = require('../src/services/invoicePdfService');
const { ROLE_PRESETS } = require('../src/config/permissions');
const { normalizeCurrency } = require('../src/config/currencies');

describe('invoice template selection', () => {
  test.each([
    [1, 'Siritek Inc', 'siritek'],
    [2, 'Gannusoftware', 'gannu'],
    [3, 'Savvyinfosystems', 'savvy'],
    [4, 'Globalinfotech Inc', 'global'],
  ])('maps company %i to %s', (id, name, key) => {
    expect(getInvoiceTemplate({ id, name }).key).toBe(key);
  });

  test('keeps independent layout definitions and a same-row P.O. value cell', () => {
    const siritek = getInvoiceTemplate({ id: 1 });
    const gannu = getInvoiceTemplate({ id: 2 });
    expect(siritek.layout).not.toBe(gannu.layout);
    expect(siritek.layout.metadata.poNumber.top).toBeLessThan(siritek.layout.billTo.top);
    expect(siritek.layout.metadata.poNumber.x).toBeGreaterThan(siritek.layout.metadata.date.x);
    expect(siritek.layout.metadata.invoiceNumber.height).toBeGreaterThan(0);
  });

  test.each([1, 2, 3, 4])('centers all configured metadata fields for template %i', id => {
    const { layout } = getInvoiceTemplate({ id });
    Object.values(layout.metadata).forEach(cell => {
      expect(cell.height).toBeGreaterThan(0);
      expect(cell.width).toBeGreaterThan(0);
    });
  });

  test('renders the Gannu total as a bold currency amount in its fixed total cell', () => {
    const { layout } = getInvoiceTemplate({ id: 2 });
    expect(layout.total.fontWeight).toBe('bold');
    expect(layout.total.width).toBe(72);
    expect(layout.total.hideCurrencySymbol).toBeUndefined();
  });

  test('restores HR payroll create, update, and upload without delete', () => {
    expect(ROLE_PRESETS.hr).toEqual(expect.arrayContaining(['payroll:view', 'payroll:create', 'payroll:update', 'payroll:upload']));
    expect(ROLE_PRESETS.hr).not.toContain('payroll:delete');
  });

  test('uses the billing-period start for the requested download filename', () => {
    expect(downloadFilename({ employeeName: 'Venkat', billingFromDate: '2026-08-01', invoiceDate: '2026-09-01' })).toBe('Venkat August 2026 Invoice.pdf');
  });

  test('normalizes Indian Rupee values and formats them with the Rupee symbol', () => {
    expect(normalizeCurrency('INR — Indian Rupee')).toBe('INR');
    expect(normalizeCurrency('₹')).toBe('INR');
    expect(money(1234.56, 'INR')).toContain('₹');
  });
});
