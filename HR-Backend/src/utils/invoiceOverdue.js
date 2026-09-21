const DAY_MS = 24 * 60 * 60 * 1000;
const CLOSED_STATUSES = new Set(['paid', 'void', 'cancelled', 'canceled']);

function parseDateOnlyLocal(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) || date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3]) ? null : date;
}

function localStartOfDay(value = new Date()) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function getInvoiceOverdueState(invoice, today = new Date()) {
  const dueDate = parseDateOnlyLocal(invoice?.dueDate);
  const balanceDue = Number(invoice?.balanceDue || 0);
  const isClosed = CLOSED_STATUSES.has(String(invoice?.status || '').trim().toLowerCase());

  if (!dueDate || !Number.isFinite(balanceDue) || balanceDue <= 0 || isClosed) {
    return { isOverdue: false, daysOverdue: 0 };
  }

  const daysOverdue = Math.floor((localStartOfDay(today).getTime() - dueDate.getTime()) / DAY_MS);
  return { isOverdue: daysOverdue > 0, daysOverdue: daysOverdue > 0 ? daysOverdue : 0 };
}

function overdueLabel(daysOverdue) {
  return `Overdue (${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'})`;
}

module.exports = { getInvoiceOverdueState, overdueLabel };
