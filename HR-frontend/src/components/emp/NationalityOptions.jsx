export default function NationalityOptions({ value }) {
  return <>
    <option value="">Select Nationality</option>
    <option value="US">US</option>
    <option value="INDIA">INDIA</option>
    <option value="CANADA">CANADA</option>
    {value && !['US', 'INDIA', 'CANADA'].includes(value) && <option value={value} disabled>{value} — saved value</option>}
  </>;
}
