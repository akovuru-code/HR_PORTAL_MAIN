const PERIOD_END_DAYS = { weekly: 7, 'bi-weekly': 14 };

const formatDate = date => `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;

export function getBillingPeriod(frequency, referenceDate = new Date()) {
  const normalizedFrequency = String(frequency || '').trim().toLowerCase();
  if (!['weekly', 'bi-weekly', 'monthly'].includes(normalizedFrequency)) return null;
  const reference = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  if (Number.isNaN(reference.getTime())) return null;
  const startDate = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
  const endDate = PERIOD_END_DAYS[normalizedFrequency]
    ? new Date(startDate.getFullYear(), startDate.getMonth(), PERIOD_END_DAYS[normalizedFrequency])
    : new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
  return { startDate, endDate, startLabel: formatDate(startDate), endLabel: formatDate(endDate) };
}

export function automaticInvoiceDescription(employeeName, frequency, referenceDate = new Date()) {
  const name = String(employeeName || '').trim();
  const period = getBillingPeriod(frequency, referenceDate);
  return name && period ? `${name} ${period.startLabel}-${period.endLabel} Invoice` : '';
}

export function isAutomaticInvoiceDescription(description, employeeName) {
  const name = String(employeeName || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const value = String(description || '').trim();
  const currentFormat = new RegExp(`^${name} \\d{2}/\\d{2}/\\d{4}-\\d{2}/\\d{2}/\\d{4} Invoice$`);
  const previousFormat = new RegExp(`^${name} - [A-Za-z]+ \\d{4} Invoice$`);
  return Boolean(name && (currentFormat.test(value) || previousFormat.test(value)));
}
