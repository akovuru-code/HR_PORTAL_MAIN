const SUPPORTED_CURRENCIES = new Set(['USD', 'INR', 'CAD']);

function normalizeCurrency(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized.includes('INR') || normalized.includes('₹')) return 'INR';
  if (normalized.includes('CAD')) return 'CAD';
  if (normalized.includes('USD') || normalized.includes('$')) return 'USD';
  return SUPPORTED_CURRENCIES.has(normalized) ? normalized : 'USD';
}

function formatCurrency(value, currency) {
  const code = normalizeCurrency(currency);
  const locale = code === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(Number(value || 0));
}

module.exports = { normalizeCurrency, formatCurrency, SUPPORTED_CURRENCIES };
