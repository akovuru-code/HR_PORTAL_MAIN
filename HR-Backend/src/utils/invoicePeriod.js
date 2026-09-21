function previousCalendarMonth(referenceDate = new Date()) {
  const reference = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  if (Number.isNaN(reference.getTime())) throw new Error('A valid reference date is required');
  return new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
}

function previousMonthLabel(referenceDate = new Date()) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(previousCalendarMonth(referenceDate));
}

const PERIOD_END_DAYS = { weekly: 7, 'bi-weekly': 14 };

function previousMonthDateRange(referenceDate = new Date(), frequency = 'monthly') {
  const start = previousCalendarMonth(referenceDate);
  const normalizedFrequency = String(frequency || '').trim().toLowerCase();
  const end = PERIOD_END_DAYS[normalizedFrequency]
    ? new Date(start.getFullYear(), start.getMonth(), PERIOD_END_DAYS[normalizedFrequency])
    : new Date(start.getFullYear(), start.getMonth() + 1, 0);
  const format = date => `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  return { start, end, startLabel: format(start), endLabel: format(end) };
}

function automaticInvoiceDescription(employeeName, frequency, referenceDate = new Date()) {
  const name = String(employeeName || '').trim();
  const normalizedFrequency = String(frequency || '').trim().toLowerCase();
  if (!['weekly', 'bi-weekly', 'monthly'].includes(normalizedFrequency)) return '';
  const { startLabel, endLabel } = previousMonthDateRange(referenceDate, normalizedFrequency);
  return name ? `${name} ${startLabel}-${endLabel} Invoice` : '';
}

function isAutomaticInvoiceDescription(description, employeeName) {
  const name = String(employeeName || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const value = String(description || '').trim();
  const currentFormat = new RegExp(`^${name} \\d{2}/\\d{2}/\\d{4}-\\d{2}/\\d{2}/\\d{4} Invoice$`);
  const previousFormat = new RegExp(`^${name} - [A-Za-z]+ \\d{4} Invoice$`);
  return Boolean(name && (currentFormat.test(value) || previousFormat.test(value)));
}

module.exports = { previousCalendarMonth, previousMonthLabel, previousMonthDateRange, automaticInvoiceDescription, isAutomaticInvoiceDescription };
