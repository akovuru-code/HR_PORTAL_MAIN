export const COUNTRY_CODES = [
  { value: 'US', code: '+1', label: 'United States', short: 'United States' },
  { value: 'CA', code: '+1', label: 'Canada', short: 'Canada' },
  { value: 'IN', code: '+91', label: 'India', short: 'India' },
];
export const LEGACY_COUNTRY_CODES = [
  { value: 'GB', code: '+44', label: 'United Kingdom', short: 'United Kingdom' },
  { value: 'AU', code: '+61', label: 'Australia', short: 'Australia' },
];
const allCountries = [...COUNTRY_CODES, ...LEGACY_COUNTRY_CODES];
export const getCountryCode = (country) => allCountries.find(item => item.value === country)?.code || '+1';
export function splitMobilePhone(value, savedCountry) {
  const normalized = String(value || '').replace(/\s+/g, '');
  const saved = allCountries.find(item => item.value === savedCountry);
  const country = saved && (!normalized || normalized.startsWith(saved.code))
    ? saved : allCountries.find(item => normalized.startsWith(item.code));
  return country ? { country: country.value, number: normalized.slice(country.code.length) }
    : { country: 'US', number: normalized };
}
export function splitPhone(value) {
  const { country, number } = splitMobilePhone(value);
  return { countryCode: getCountryCode(country), number };
}
export const formatSsn = value => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
};
export const canEnterSsn = value => /^\d{0,3}(?:-?\d{0,2})?(?:-?\d{0,4})?$/.test(value);
export function personalValidationError({ ssn, passportNumber }, label = 'Employee') {
  if (ssn != null && ssn !== '' && (typeof ssn !== 'string' || !/^\d{3}-\d{2}-\d{4}$/.test(ssn))) {
    return `${label} SSN must use the format 111-11-1111.`;
  }
  if (passportNumber != null && passportNumber !== '' && (typeof passportNumber !== 'string' || !/^[A-Za-z0-9]+$/.test(passportNumber))) {
    return `${label} passport number must contain letters and numbers only (no spaces or symbols).`;
  }
  return '';
}
export function parsePersonalDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value || '');
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(0);
  date.setFullYear(Number(year), Number(month) - 1, Number(day));
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day) ? date : null;
}
export function personalDateValue(date) {
  if (!date) return '';
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function formatPersonalDate(value) {
  const date = parsePersonalDate(value);
  return date ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
}
