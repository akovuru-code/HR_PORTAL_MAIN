import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { parsePersonalDate, personalDateValue } from '../../utils/personalInfo';

export default function PersonalDateField({
  value,
  onChange,
  min = '1900-01-01',
  max = '9999-12-31',
  className,
  placeholder,
  placeholderText,
  wrapperClassName,
  disabled,
  ...props
}) {
  return <DatePicker
    {...props}
    selected={parsePersonalDate(value)}
    onChange={date => {
      if (onChange) {
        onChange({ target: { value: personalDateValue(date) } });
      }
    }}
    dateFormat="MMMM d, yyyy"
    minDate={parsePersonalDate(min)}
    maxDate={parsePersonalDate(max)}
    disabled={disabled}
    className={className}
    wrapperClassName={`w-full [&_.react-datepicker__input-container]:w-full ${wrapperClassName || ''}`}
    popperClassName="z-50"
    popperPlacement="bottom-start"
    popperModifiers={[
      { name: 'offset', options: { offset: [0, 4] } },
      { name: 'preventOverflow', options: { padding: 8 } },
    ]}
    placeholderText={placeholderText || placeholder || "Month DD, YYYY"}
    showMonthDropdown
    showYearDropdown
    dropdownMode="select"
    scrollableYearDropdown
    yearDropdownItemNumber={100}
  />;
}
