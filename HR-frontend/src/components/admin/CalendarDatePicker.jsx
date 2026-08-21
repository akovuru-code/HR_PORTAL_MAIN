import React from "react";
import moment from "moment";
//import AdminTypography from "./AdminTypography";
import AdminTypography from "../../components/admin/AdminTypography";

export default function CalendarDatePicker({ selectedDate, onChange, minDate, maxDate }) {
    // Generate year, month, day options
    const currentYear = moment().year();
    const years = [];
    for (let y = currentYear - 5; y <= currentYear + 5; y++) years.push(y);
    const months = moment.months();
    const daysInMonth = moment(selectedDate).daysInMonth();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const year = moment(selectedDate).year();
    const month = moment(selectedDate).month();
    const day = moment(selectedDate).date();

    function handleYear(e) {
        const newDate = moment(selectedDate).year(Number(e.target.value)).toDate();
        onChange(newDate);
    }
    function handleMonth(e) {
        const newDate = moment(selectedDate).month(Number(e.target.value)).toDate();
        onChange(newDate);
    }
    function handleDay(e) {
        const newDate = moment(selectedDate).date(Number(e.target.value)).toDate();
        onChange(newDate);
    }
    function handleReset() {
        onChange(new Date());
    }

    return (
        <div className="flex flex-wrap gap-2 items-center bg-white-50 p-2 rounded-lg border border-gray-200">

            <AdminTypography.select value={year} onChange={handleYear} className="px-2 py-1 rounded border border-gray-300 hover:bg-blue-200">
                {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                ))}
            </AdminTypography.select>
            <AdminTypography.select value={month} onChange={handleMonth} className="px-2 py-1 rounded border border-gray-300 hover:bg-blue-200">
                {months.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                ))}
            </AdminTypography.select>
            <AdminTypography.select value={day} onChange={handleDay} className="px-2 py-1 rounded border border-gray-300 hover:bg-blue-200">
                {days.map((d) => (
                    <option key={d} value={d}>{d}</option>
                ))}
            </AdminTypography.select>
            <AdminTypography.button type="button" className="ml-2 px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-blue-200" onClick={handleReset}>
                Today
            </AdminTypography.button>
        </div>
    );
}
