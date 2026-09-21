import { COUNTRY_CODES, LEGACY_COUNTRY_CODES } from '../../utils/personalInfo';

export default function PhoneCountryOptions({ value }) {
  const legacy = LEGACY_COUNTRY_CODES.find(country => country.value === value);
  return <>
    {COUNTRY_CODES.map(country => <option key={country.value} value={country.value}>{country.label} ({country.code})</option>)}
    {legacy && <option value={legacy.value} disabled>{legacy.label} ({legacy.code}) — saved value</option>}
  </>;
}
