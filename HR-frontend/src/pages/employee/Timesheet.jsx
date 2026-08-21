import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import EmpTypography from "../../components/emp/EmpTypography";
import { getTimesheetEntries, submitTimesheetEntries, getMyProfile } from "../../api/onboarding";

// --- Constants & Configuration ---
const ACCENT_COLOR_BG = "bg-blue-200";
const ACCENT_COLOR_HOVER = "hover:bg-blue-300";
const TEXT_COLOR_PRIMARY = "text-gray-900";
const TEXT_COLOR_ACCENT = "text-black-600";
const BORDER_COLOR = "border-gray-200";
const SIDEBAR_WIDTH_PX = 250;

const APPROVAL_STATUSES = {
  PENDING: 'Pending',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  NONE: 'None',
};

// Mock data (unchanged)
const USER_CONFIG_WEEKLY_TARGET = 40;
const USER_CONFIG_MONTHLY_TARGET = 160;
const viewModes = ["MONTH", "WEEK", "DAY"];
const DAY_NAMES_MONTH = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEK_DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MOCK_PROJECTS = [
  { id: 1, name: "Project Alpha - Mobile App" },
  { id: 2, name: "Project Beta - Backend API" },
  { id: 3, name: "Internal - R&D" },
];
const MOCK_Designations = [
  { id: 1, name: "Sample-Role" }
];
const ENTRY_TYPES = ["Project Time", "Time Off"];
const TIME_OFF_REASONS = ["Personal", "Vacation", "Client Holiday", "Sick Leave"];
const MAX_DATE = "9999-12-31";

// Utility functions (unchanged)
const getTodayDate = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};
const dateToKey = (date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();
  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  return [year, month, day].join('-');
};
const formatDateShort = (date) => `${date.getMonth() + 1}/${date.getDate()}`;
const formatInputDate = (date) => dateToKey(date);
const formatHoursToDisplay = (decimalHours) => {
  if (!decimalHours || decimalHours === 0) return '0:00';
  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes < 10 ? '0' : ''}${minutes}`;
};
const getWeekDays = (startDate) => {
  const week = [];
  let currentDay = new Date(startDate);
  const day = currentDay.getDay();
  const diff = (day === 0 ? 6 : day - 1);
  currentDay.setDate(currentDay.getDate() - diff);
  currentDay.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(currentDay);
    week.push({
      day: WEEK_DAY_NAMES[i],
      date: formatDateShort(dayDate),
      fullDate: dayDate,
      dateKey: dateToKey(dayDate),
    });
    currentDay.setDate(currentDay.getDate() + 1);
  }
  return week;
};
const getCalendarGridDays = (date, monthlyEntries) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const grid = [];
  const firstOfMonth = new Date(year, month, 1);
  const startOfWeekDay = firstOfMonth.getDay();
  const startDate = new Date(firstOfMonth);
  startDate.setDate(firstOfMonth.getDate() - startOfWeekDay);
  let currentDate = new Date(startDate);
  let count = 0;
  while (count < 6 * 7) {
    if (count >= 4 * 7 && currentDate.getMonth() === (month + 1) % 12 && currentDate.getDay() === 0) break;
    const isCurrentMonth = currentDate.getMonth() === month;
    const dateKey = dateToKey(currentDate);
    const entryData = monthlyEntries[dateKey] || { hours: 0.00, status: APPROVAL_STATUSES.NONE };
    const hours = entryData.hours;
    grid.push({
      date: currentDate.getDate(),
      isCurrentMonth: isCurrentMonth,
      hours: hours,
      fullDate: new Date(currentDate),
      dateKey: dateKey,
      status: entryData.status,
      notes: entryData.notes,
    });
    currentDate.setDate(currentDate.getDate() + 1);
    count++;
  }
  return grid;
};
const getTabClasses = (currentTab, tabName, index, count) => {
  const isActive = currentTab === tabName;
  let classes = `px-4 py-1 text-sm font-semibold transition-colors cursor-pointer`;
  if (isActive) {
    classes += ` ${ACCENT_COLOR_BG} text-black shadow-inner`;
  } else {
    classes += ` bg-white ${TEXT_COLOR_PRIMARY} hover:bg-gray-50`;
  }
  if (index < count - 1) classes += ` border-r ${BORDER_COLOR}`;
  if (index === 0) classes += ` rounded-l-lg`;
  else if (index === count - 1) classes += ` rounded-r-lg`;
  return classes;
};

// Components (unchanged until final return)
function DaySelector({ weekDays, currentDayKey, handleDayClick, monthlyTimeEntries }) {
  const daysToRender = weekDays;
  const alignmentClass = "justify-center";
  const overflowClass = "overflow-x-auto";
  return (
    <div className={`flex ${alignmentClass} space-x-4 p-4 border-b border-gray-200 ${overflowClass}`}>
      {daysToRender.map((day) => {
        const isActive = day.dateKey === currentDayKey;
        const isWeekend = day.fullDate.getDay() === 0 || day.fullDate.getDay() === 6;
        const entryData = monthlyTimeEntries[day.dateKey] || { hours: 0 };
        const hours = entryData.hours;
        const displayTime = formatHoursToDisplay(hours);
        let classes = `w-24 h-24 p-3 flex flex-col justify-between items-center rounded-lg transition-all duration-300 shadow-md cursor-pointer border-2 flex-shrink-0`;
        if (isActive) {
          classes += ` border-blue-200 bg-white text-gray-900 shadow-lg scale-105`;
        } else {
          classes += ` border-gray-200 bg-gray-50 text-gray-500 opacity-50 hover:opacity-75`;
        }
        if (isWeekend) classes += ' bg-red-50/50';
        return (
          <div key={day.dateKey} className={classes} onClick={() => handleDayClick(day.fullDate)}>
            <div className={`text-sm font-semibold ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>{day.day}</div>
            <div className="text-xl font-bold">{displayTime}</div>
            <div className="text-xs text-gray-500">{day.date}</div>
          </div>
        );
      })}
    </div>
  );
}

function MonthYearSelectorDropdown({ open, onClose, currentMonth, currentYear, onDateSelect }) {
  if (!open) return null;
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const startYear = 2000;
  const endYear = 2100;
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  useEffect(() => {
    if (open) {
      setSelectedMonth(currentMonth);
      setSelectedYear(currentYear);
    }
  }, [open, currentMonth, currentYear]);
  const handleSelect = (e) => {
    e.preventDefault();
    const monthIndex = months.findIndex(m => m === selectedMonth);
    onDateSelect(new Date(selectedYear, monthIndex, 1));
    onClose();
  };
  return (
    <div className="absolute top-10 left-0 mt-2 z-50">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-64 p-4">
        <h2 className="text-lg font-bold mb-3 text-gray-800">Select Date</h2>
        <form onSubmit={handleSelect} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Month</label>
            <select className="w-full p-1.5 border border-gray-300 rounded-md text-sm"
              value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="year-select" className="block text-xs font-medium text-gray-700 mb-0.5">Year</label>
            <select id="year-select" className="w-full p-1.5 border border-gray-300 rounded-md text-sm"
              value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button type="submit" className={`px-3 py-1 text-sm font-medium text-black ${ACCENT_COLOR_BG} rounded-md ${ACCENT_COLOR_HOVER}`}>Go</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MonthView({ currentWeekStart, monthlyEntries, handleDayClick, getDayStatus }) {
  const monthGridDaysData = useMemo(() => getCalendarGridDays(currentWeekStart, monthlyEntries), [currentWeekStart, monthlyEntries]);
  const todayKey = dateToKey(getTodayDate());
  return (
    <div className="calendar-month-view">
      <div className="grid grid-cols-7 bg-blue-50 border-t border-l border-gray-200">
        {DAY_NAMES_MONTH.map(day => (
          <div key={day} className="py-2 text-center bg-gray-300">
            <EmpTypography.small className="font-semibold text-gray-600">
              {day.substring(0, 3).toUpperCase()}
            </EmpTypography.small>
          </div>
        ))}
        {monthGridDaysData.map((day, index) => {
          const isToday = day.dateKey === todayKey;
          const isWeekend = day.fullDate.getDay() === 0 || day.fullDate.getDay() === 6;
          const hoursEntered = parseFloat(day.hours) > 0;
          const status = day.status;
          const notes = day.notes || [];
          const hasTimeOff = notes.some(note => note.includes('Time Off'));
          let cellClasses = `h-28 p-2 flex flex-col justify-between transition relative`;
          if (day.isCurrentMonth) {
            cellClasses += ` bg-blue text-gray-800 hover:bg-blue-100 cursor-pointer`;
            if (hasTimeOff) {
              cellClasses = cellClasses.replace('bg-blue', 'bg-red-300/50');
              cellClasses = cellClasses.replace('hover:bg-blue-100', 'hover:bg-red-400/50');
            }
            if (isWeekend && !hasTimeOff) {
              cellClasses = cellClasses.replace('bg-blue', 'bg-red-100/50');
            }
            if (isToday) cellClasses += ` ring-2 ring-blue-200 ring-offset-1`;
          } else {
            cellClasses += ' text-gray-400 bg-gray-200/50 pointer-events-none cursor-default';
          }
          const dayCellClickHandler = () => handleDayClick(day.fullDate);
          let statusDotClass = '';
          if (status === APPROVAL_STATUSES.APPROVED) statusDotClass = 'bg-green-600';
          else if (status === APPROVAL_STATUSES.PENDING) statusDotClass = 'bg-gray-900';
          else if (status === APPROVAL_STATUSES.SUBMITTED) statusDotClass = 'bg-orange-500';
          else if (status === APPROVAL_STATUSES.REJECTED) statusDotClass = 'bg-red-600';
          return (
            <div key={index} className={cellClasses} onClick={day.isCurrentMonth ? dayCellClickHandler : undefined}>
              <div>
                <EmpTypography.small className={`text-sm font-medium mb-1 ${day.isCurrentMonth ? '' : 'opacity-70'}`}>{day.date}</EmpTypography.small>
                <div className="text-right">
                  <EmpTypography.h4 className={`w-auto px-1 py-0.5 text-lg font-extrabold text-center transition ${day.isCurrentMonth ? TEXT_COLOR_ACCENT : 'text-gray-400'} ${!hoursEntered ? 'min-h-[28px] opacity-0' : ''}`}>
                    {hoursEntered ? day.hours.toFixed(2) : ''}
                  </EmpTypography.h4>
                  {notes.length > 0 && (
                    <div className="text-xs ml-1 overflow-hidden">
                      {notes.map((note, i) => (
                        <EmpTypography.small key={i} className="truncate" title={note}>
                          - {note}
                        </EmpTypography.small>
                      ))}
                    </div>
                  )}
                </div>
                {day.isCurrentMonth && status !== APPROVAL_STATUSES.NONE && (
                  <div className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full ${statusDotClass} shadow-md`} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ projects, grandTotal, weeklyDayTotals, handleEntryChange, setShowAddTimeRow, currentWeekStart }) {
  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);
  const calculateRowTotalImpl = (entries) =>
    entries.reduce((sum, entry) => sum + (parseFloat(entry.rawHours) || 0), 0).toFixed(2);
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b border-t border-gray-300 h-16">
            <th className="w-1/4 text-left p-3 sticky left-0 bg-gray-100 z-10"><EmpTypography.h4>Project / Type</EmpTypography.h4></th>
            {weekDays.map(d => (
              <th key={d.day} className="w-[8%] text-center">
                <EmpTypography.h4 className="font-bold">{d.day}</EmpTypography.h4>
                <EmpTypography.p className="text-xs text-gray-500">{d.date}</EmpTypography.p>
              </th>
            ))}
            <th className="w-[10%] text-center p-3 sticky right-0 z-10 bg-gray-200">
              <EmpTypography.h4>TOTAL HOURS</EmpTypography.h4>
              <EmpTypography.h3 className="text-center">{grandTotal}</EmpTypography.h3>
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map(project => (
            <tr key={project.id} className="border-b border-gray-200 bg-white hover:bg-gray-50">
              <td className="p-3 align-top sticky left-0 bg-white z-10">
                <EmpTypography.small>{project.role}</EmpTypography.small>
                <EmpTypography.h4 className="truncate">{project.project}</EmpTypography.h4>
                <EmpTypography.small>{project.client}</EmpTypography.small>
              </td>
              {project.entries.map((entry, dayIndex) => {
                const isLocked = entry.status !== APPROVAL_STATUSES.PENDING && entry.status !== APPROVAL_STATUSES.NONE && entry.status !== APPROVAL_STATUSES.REJECTED;
                return (
                  <td key={dayIndex} className="p-2 text-center align-middle">
                    <EmpTypography.input
                      type="text"
                      inputMode="decimal"
                      value={entry.displayValue}
                      onChange={e => handleEntryChange(project.id, dayIndex, e.target.value)}
                      className={`w-16 h-8 text-sm font-semibold text-center ${parseFloat(entry.rawHours) > 0 ? 'text-blue-700' : 'text-gray-400'} ${isLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      disabled={isLocked}
                      placeholder=""
                    />
                  </td>
                );
              })}
              <td className="p-3 text-center align-middle font-bold bg-gray-50 sticky right-0 z-10">
                <EmpTypography.p>{calculateRowTotalImpl(project.entries)}</EmpTypography.p>
              </td>
            </tr>
          ))}
          <tr className="bg-white">
            <td colSpan={1} className="p-3 sticky left-0 bg-white">
              <EmpTypography.button onClick={() => setShowAddTimeRow(getTodayDate())} className="flex items-center space-x-1" variant="primary">
                <span>+Add Time Row</span>
              </EmpTypography.button>
            </td>
            <td colSpan={7}></td>
            <td className="sticky right-0 bg-white"></td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="bg-blue-100 border-t border-gray-300 h-12">
            <td className="p-3 text-left sticky left-0 bg-gray-100"><EmpTypography.h4>Daily Totals:</EmpTypography.h4></td>
            {weeklyDayTotals.map((total, i) => (
              <td key={`total-${i}`} className="text-center font-extrabold p-1">
                <EmpTypography.p>{(parseFloat(total) || 0).toFixed(2)}</EmpTypography.p>
              </td>
            ))}
            <td className="text-center font-extrabold bg-blue-200 sticky right-0">
              <EmpTypography.h3>{grandTotal}</EmpTypography.h3>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function DayView({ dailyTotal, setShowAddTimeRow, currentWeekStart, isLocked, dailyEntries, onEditEntry, onDeleteEntry }) {
  const dayName = currentWeekStart.toLocaleString('en-US', { weekday: 'long' });
  const dayDate = formatDateShort(currentWeekStart);
  const getStatusColors = (status) => {
    switch (status) {
      case APPROVAL_STATUSES.APPROVED: return { text: 'text-green-800', bg: 'bg-green-100' };
      case APPROVAL_STATUSES.SUBMITTED: return { text: 'text-orange-800', bg: 'bg-orange-100' };
      case APPROVAL_STATUSES.PENDING: return { text: 'text-gray-800', bg: 'bg-gray-200' };
      case APPROVAL_STATUSES.REJECTED: return { text: 'text-red-800', bg: 'bg-red-100' };
      default: return { text: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };
  const timeOffEntries = dailyEntries.filter(e => e.isTimeOff);
  const billableEntries = dailyEntries.filter(e => !e.isTimeOff);
  const timeOffTotal = timeOffEntries.reduce((sum, entry) => sum + entry.hours, 0).toFixed(2);
  const renderEntryRow = (entry, isTimeOff = false) => {
    const isLocked = entry.status !== APPROVAL_STATUSES.PENDING && entry.status !== APPROVAL_STATUSES.NONE && entry.status !== APPROVAL_STATUSES.REJECTED;
    const colors = getStatusColors(entry.status);
    return (
      <div key={entry.id} className={`p-3 border rounded-lg flex justify-between items-center transition ${isTimeOff ? 'border-red-300 bg-red-50 hover:bg-red-100' : 'border-gray-200 hover:bg-gray-50'}`}>
        <div className="flex-1 min-w-0 pr-4">
          <EmpTypography.h4 className="truncate">{entry.project}</EmpTypography.h4>
          <EmpTypography.small className="truncate">{entry.notes || 'No notes'}</EmpTypography.small>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>{entry.status}</span>
          <span className="font-extrabold text-lg min-w-[50px] text-right">{entry.hours.toFixed(2)}</span>
          <button onClick={() => onEditEntry(entry)} disabled={isLocked} className="px-2 py-1 text-blue-600 hover:bg-blue-100">✎</button>
          <button type="button" className="text-red-600 px-2 py-1 rounded hover:bg-red-100" onClick={() => onDeleteEntry(entry)} disabled={isLocked}>🗑️</button>
        </div>
      </div>
    );
  };
  return (
    <div className="day-view">
      <div className="p-6 border border-blue-200 bg-white rounded-lg shadow-md">
        <EmpTypography.h3>{dayName} — {dayDate}</EmpTypography.h3>
        <EmpTypography.p>Total Hours Logged: <span className="font-extrabold text-blue-500">{dailyTotal}</span></EmpTypography.p>
        <div className="flex justify-between text-lg text-gray-600 mb-4">
          <span>Time Off</span>
          <span className="font-bold ml-4 text-red-400">{timeOffTotal}</span>
        </div>
        <div className="mt-6 border-t pt-4">
          {timeOffEntries.length > 0 && (
            <>
              <EmpTypography.h4 className="font-extrabold text-red-600 mb-3 text-lg border-b pt-4 pb-2">Time Off Entries ({timeOffEntries.length})</EmpTypography.h4>
              <div className="space-y-3 mb-6">{timeOffEntries.map(entry => renderEntryRow(entry, true))}</div>
            </>
          )}
          <EmpTypography.h4 className={`font-extrabold ${billableEntries.length > 0 ? 'text-blue-600' : 'text-gray-700'} mb-3 text-lg ${timeOffEntries.length > 0 ? 'border-t pt-4' : ''} pb-2`}>
            Billable Entries ({billableEntries.length})
          </EmpTypography.h4>
          <div className="space-y-3">
            {billableEntries.length > 0 ? billableEntries.map(entry => renderEntryRow(entry)) : <EmpTypography.p className="text-center py-4">No billable entries logged for this day.</EmpTypography.p>}
          </div>
        </div>
        <div className="mt-6 border-t pt-6 text-center">
          <EmpTypography.button onClick={() => setShowAddTimeRow(currentWeekStart)} disabled={isLocked}>New Time Entry</EmpTypography.button>
        </div>
      </div>
    </div>
  );
}

function AddTimeRowModel({ open, onClose, currentDate, onSaveEntry, entryToEdit, designationOptions }) {
  if (!open) return null;
  const parseTimeOffNotes = (notes) => {
    if (!notes.startsWith('Time Off:')) return { reason: '', custom: '', notes: notes };
    const reasonPart = notes.substring('Time Off:'.length).trim();
    const parts = reasonPart.split(' - ');
    let reason = parts[0];
    let remainingNotes = parts.length > 1 ? parts.slice(1).join(' - ') : '';
    return { reason, custom: '', notes: remainingNotes };
  };
  const initialDate = currentDate || new Date();
  const initialEntryData = useMemo(() => {
    if (entryToEdit) {
      const timeOffDetails = entryToEdit.type === 'Time Off' ? parseTimeOffNotes(entryToEdit.notes) : {};
      return {
        id: entryToEdit.id,
        date: entryToEdit.dateKey,
        timeInput: formatHoursToDisplay(entryToEdit.hours),
        timeHours: entryToEdit.hours,
        type: entryToEdit.type,
        project: entryToEdit.project,
        notes: timeOffDetails.notes || (entryToEdit.type !== 'Time Off' ? entryToEdit.notes : ''),
        timeOffReason: timeOffDetails.reason || '',
        customTimeOffReason: timeOffDetails.custom || '',
      };
    } else {
      return {
        id: null,
        date: formatInputDate(initialDate),
        timeInput: '',
        timeHours: 0,
        type: ENTRY_TYPES[0],
        project: MOCK_PROJECTS[0].name,
        role: designationOptions?.[0]?.name || MOCK_Designations[0].name,
        notes: '',
        timeOffReason: '',
        customTimeOffReason: '',
      };
    }
  }, [entryToEdit, initialDate]);
  const [entryData, setEntryData] = useState(initialEntryData);
  useEffect(() => {
    if (open) setEntryData(initialEntryData);
  }, [open, initialEntryData]);
  const parseTimeToHours = (timeString) => {
    timeString = timeString.trim();
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':').map(Number);
      return hours + (minutes / 60);
    }
    return parseFloat(timeString) || 0;
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'timeInput') {
      if (value !== '' && !/^[0-9.:]*$/.test(value)) return;
      const hours = parseTimeToHours(value);
      setEntryData(prev => ({ ...prev, timeInput: value, timeHours: hours }));
    } else if (name === 'date') {
      setEntryData(prev => ({ ...prev, [name]: value }));
    } else if (name === 'type' && value === 'Time Off') {
      setEntryData(prev => ({
        ...prev,
        [name]: value,
        project: MOCK_PROJECTS.find(p => p.name.includes("Time Off"))?.name || 'Time Off',
        timeOffReason: TIME_OFF_REASONS[0],
        notes: '',
        customTimeOffReason: '',
      }));
    } else if (name === 'type' && value !== 'Time Off') {
      setEntryData(prev => ({
        ...prev,
        [name]: value,
        project: MOCK_PROJECTS[0].name,
        timeOffReason: '',
        customTimeOffReason: '',
      }));
    } else if (name === 'timeOffReason') {
      setEntryData(prev => ({
        ...prev,
        [name]: value,
        customTimeOffReason: (value !== 'Other' ? '' : prev.customTimeOffReason)
      }));
    } else {
      setEntryData(prev => ({ ...prev, [name]: value }));
    }
  };
  const handleTimeBlur = () => {
    if (entryData.timeInput.trim() !== '') {
      const formattedTime = formatHoursToDisplay(entryData.timeHours);
      setEntryData(prev => ({ ...prev, timeInput: formattedTime }));
    }
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (entryData.timeHours <= 0) {
      alert("Please enter a time greater than 0.");
      return;
    }
    let finalNotes = entryData.notes;
    if (entryData.type === 'Time Off') {
      let reasonText = entryData.timeOffReason;
      finalNotes = `Time Off: ${reasonText}${entryData.notes ? ` - ${entryData.notes}` : ''}`;
    }
    const newEntry = {
      id: entryData.id,
      date: entryData.date,
      hours: entryData.timeHours,
      project: entryData.project,
      type: entryData.type,
      notes: finalNotes,
    };
    onSaveEntry(newEntry);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-end">
      <div className="h-full w-full max-w-lg bg-white shadow-2xl flex flex-col">
        <div className={`p-6 border-b border-gray-200`}>
          <h2 className="text-2xl font-bold text-gray-900">{entryToEdit ? 'Edit Entry' : 'New Entry'}</h2>
        </div>
        <form className="flex-1 p-6 overflow-y-auto" onSubmit={handleSubmit}>
          <h3 className="text-sm font-semibold uppercase text-gray-500 mb-4">Time</h3>
          <div className="space-y-6">
            <div className="border border-gray-300 rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-semibold uppercase text-gray-500">Entry Details</h4>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label htmlFor="date" className="block text-xs font-medium text-gray-700">Date</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input id="date" name="date" type="date" max={MAX_DATE} value={entryData.date} onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm cursor-pointer" required />
                  </div>
                </div>
                <div className="w-1/4">
                  <label htmlFor="timeInput" className="block text-xs font-medium text-gray-700">Time</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input id="timeInput" name="timeInput" type="text" inputMode="decimal" value={entryData.timeInput}
                      onChange={handleChange} onBlur={handleTimeBlur}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-200 focus:border-blue-200 text-sm pr-10 text-right"
                      placeholder="0:00" required />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-xs">HRS</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <label htmlFor="type" className="block text-xs font-medium text-gray-700">Type</label>
                  <select id="type" name="type" value={entryData.type} onChange={handleChange}
                    className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-200 focus:border-blue-200 text-sm" required>
                    {ENTRY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
              </div>
              {(entryData.type === 'Time Off') && (
                <div className="pt-2">
                  <label htmlFor="timeOffReason" className="block text-xs font-medium text-gray-700">Time Off Reason</label>
                  <select id="timeOffReason" name="timeOffReason" value={entryData.timeOffReason} onChange={handleChange}
                    className="mt-1 w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-200 focus:border-blue-200 text-sm" required>
                    <option value="" disabled>Select Reason</option>
                    {TIME_OFF_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
            </div>
            {entryData.type !== 'Time Off' && (
              <>
                <div>
                  <label htmlFor="project" className="block text-sm font-medium text-gray-700">Project</label>
                  <select id="project" name="project" value={entryData.project} onChange={handleChange}
                    className="mt-1 w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-200 focus:border-blue-200 text-sm" required>
                    <option value="" disabled>Select a project</option>
                    {MOCK_PROJECTS.map(proj => <option key={proj.id} value={proj.name}>{proj.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                  <select id="role" name="role" value={entryData.role || designationOptions?.[0]?.name} onChange={handleChange}
                    className="mt-1 w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-200 focus:border-blue-200 text-sm" required>
                    <option value="" disabled>Select a Designation</option>
                    {designationOptions?.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              </>
            )}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
              <textarea id="notes" name="notes" rows="4" value={entryData.notes} onChange={handleChange}
                className="mt-1 w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-200 focus:border-blue-200 text-sm"></textarea>
            </div>
          </div>
        </form>
        <div className={`p-4 border-t border-gray-200 flex justify-end space-x-3`}>
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            Close
          </button>
          <button type="submit" onClick={handleSubmit}
            className={`px-4 py-2 text-sm font-medium text-black rounded-lg transition shadow-md ${ACCENT_COLOR_BG} ${ACCENT_COLOR_HOVER}`}>
            {entryToEdit ? 'Save Changes' : 'Submit Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==============================
// 🔷 MAIN COMPONENT STARTS HERE
// ==============================
export default function Timesheet() {
  const [allTimeEntries, setAllTimeEntries] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(getTodayDate());
  const [activeTab, setActiveTab] = useState("WEEK");
  const [showAddTimeRow, setShowAddTimeRow] = useState(false);
  const [showMonthYearSelector, setShowMonthYearSelector] = useState(false);
  const [newEntryDate, setNewEntryDate] = useState(getTodayDate());
  const [entryToEdit, setEntryToEdit] = useState(null);
  const [designationOptions, setDesignationOptions] = useState(MOCK_Designations);


  // 🔷 NEW: Upload state
  const [uploadState, setUploadState] = useState({
    loading: false,
    message: null,
    messageType: null, // 'info' | 'warning' | 'error'
  });
  const fileInputRef = useRef(null);

  // Load saved/submitted entries from DB on mount
  useEffect(() => {
    getTimesheetEntries()
      .then(res => {
        const dbEntries = (res.data.entries || []).map(e => ({
          id: `db-${e.id}`,
          dbId: e.id,
          dateKey: e.dateKey,
          hours: e.hours,
          project: e.project || '',
          client: e.client || '',
          role: e.role || '',
          type: e.type || 'Project Time',
          notes: e.notes || '',
          status: e.status,
          adminComment: e.adminComment || '',
        }));
        setAllTimeEntries(dbEntries);
      })
      .catch(err => console.error('[Timesheet] Failed to load entries:', err?.response?.data?.error || err.message));
  }, []);

  useEffect(() => {
    getMyProfile()
      .then((res) => {
        const jobRole = res.data?.jobRole?.trim();

        if (jobRole) {
          setDesignationOptions((prev) => {
            const exists = prev.some(
              (d) => d.name.toLowerCase() === jobRole.toLowerCase()
            );

            if (exists) return prev;

            return [
              ...prev,
              {
                id: prev.length + 1,
                name: jobRole,
              },
            ];
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load profile role", err);
      });
  }, []);


  // --- Existing logic (unchanged until core data aggregation) ---
  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);
  const weekKeys = useMemo(() => weekDays.map(d => d.dateKey), [weekDays]);
  const weekRange = useMemo(() => weekDays.length === 7 ? `${weekDays[0].date} - ${weekDays[6].date}` : "Loading Date...", [weekDays]);
  const currentDayKey = dateToKey(currentWeekStart);
  const currentPeriodKeys = useMemo(() => {
    if (activeTab === 'WEEK') return weekKeys;
    if (activeTab === 'DAY') return [currentDayKey];
    if (activeTab === 'MONTH') {
      const year = currentWeekStart.getFullYear();
      const month = currentWeekStart.getMonth();
      const monthKeys = [];
      let date = new Date(year, month, 1);
      while (date.getMonth() === month) {
        monthKeys.push(dateToKey(date));
        date.setDate(date.getDate() + 1);
      }
      return monthKeys;
    }
    return [];
  }, [activeTab, weekKeys, currentDayKey, currentWeekStart]);

  const getStatusColors = useCallback((status) => {
    switch (status) {
      case APPROVAL_STATUSES.APPROVED:
        return { bg: 'bg-green-100', text: 'text-green-800', badgeBg: 'bg-green-500', icon: '✅' };
      case APPROVAL_STATUSES.SUBMITTED:
        return { bg: 'bg-orange-100', text: 'text-orange-800', badgeBg: 'bg-orange-500', icon: '🟡' };
      case APPROVAL_STATUSES.PENDING:
        return { bg: 'bg-gray-200', text: 'text-gray-800', badgeBg: 'bg-gray-600', icon: '⚪' };
      case APPROVAL_STATUSES.REJECTED:
        return { bg: 'bg-red-100', text: 'text-red-800', badgeBg: 'bg-red-500', icon: '❌' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600', badgeBg: 'bg-gray-500', icon: '---' };
    }
  }, []);

  const getDayStatus = useCallback((dateKey) => {
    const entries = allTimeEntries.filter(e => e.dateKey === dateKey);
    if (entries.length === 0) return APPROVAL_STATUSES.NONE;
    const hasRejected = entries.some(e => e.status === APPROVAL_STATUSES.REJECTED);
    const hasPending = entries.some(e => e.status === APPROVAL_STATUSES.PENDING);
    const hasSubmitted = entries.some(e => e.status === APPROVAL_STATUSES.SUBMITTED);
    const allApproved = entries.every(e => e.status === APPROVAL_STATUSES.APPROVED);
    if (hasRejected) return APPROVAL_STATUSES.REJECTED;
    if (hasPending) return APPROVAL_STATUSES.PENDING;
    if (hasSubmitted) return APPROVAL_STATUSES.SUBMITTED;
    if (entries.length > 0 && allApproved) return APPROVAL_STATUSES.APPROVED;
    return APPROVAL_STATUSES.NONE;
  }, [allTimeEntries]);

  const dailyStatus = getDayStatus(currentDayKey);
  const isDayLocked = dailyStatus !== APPROVAL_STATUSES.PENDING && dailyStatus !== APPROVAL_STATUSES.NONE && dailyStatus !== APPROVAL_STATUSES.REJECTED;

  const openModelForDate = useCallback((date) => {
    const dateKey = dateToKey(date);
    const status = getDayStatus(dateKey);
    if ([APPROVAL_STATUSES.SUBMITTED, APPROVAL_STATUSES.APPROVED, APPROVAL_STATUSES.REJECTED].includes(status)) {
      alert(`Cannot add/edit time. The entry for ${formatDateShort(date)} is already ${status}.`);
      return;
    }
    setEntryToEdit(null);
    setNewEntryDate(date);
    setShowAddTimeRow(true);
  }, [getDayStatus]);

  const openEditModal = useCallback((entry) => {
    if (entry.status !== APPROVAL_STATUSES.PENDING && entry.status !== APPROVAL_STATUSES.NONE && entry.status !== APPROVAL_STATUSES.REJECTED) {
      alert(`Cannot edit. The entry is already ${entry.status}.`);
      return;
    }
    setEntryToEdit(entry);
    setShowAddTimeRow(true);
  }, []);

  const handleDeleteEntry = useCallback((entry) => {
    if (!window.confirm(`Are you sure you want to delete "${entry.project}"?`)) return;
    // 🟡 Replace with real API later
    console.log('Deleting entry:', entry);
    setAllTimeEntries(prev => prev.filter(e => e.id !== entry.id));
  }, []);

  const closeEntryModal = useCallback(() => {
    setShowAddTimeRow(false);
    setEntryToEdit(null);
  }, []);

  const periodApprovalStatus = useMemo(() => {
    const currentPeriodEntries = allTimeEntries.filter(entry => currentPeriodKeys.includes(entry.dateKey));
    if (currentPeriodEntries.length === 0) return APPROVAL_STATUSES.NONE;
    const statuses = currentPeriodEntries.map(e => e.status);
    if (statuses.some(s => s === APPROVAL_STATUSES.REJECTED)) return APPROVAL_STATUSES.REJECTED;
    if (statuses.some(s => s === APPROVAL_STATUSES.PENDING)) return APPROVAL_STATUSES.PENDING;
    if (statuses.some(s => s === APPROVAL_STATUSES.SUBMITTED)) return APPROVAL_STATUSES.SUBMITTED;
    return APPROVAL_STATUSES.APPROVED;
  }, [allTimeEntries, currentPeriodKeys]);

  const statusColors = getStatusColors(periodApprovalStatus);

  const periodAdminComments = useMemo(() => {
    return allTimeEntries
      .filter(e => currentPeriodKeys.includes(e.dateKey) && e.adminComment)
      .map(e => ({ dateKey: e.dateKey, comment: e.adminComment }));
  }, [allTimeEntries, currentPeriodKeys]);

  const pendingEntryCount = useMemo(() => {
    return allTimeEntries.filter(entry =>
      entry.status === APPROVAL_STATUSES.PENDING &&
      currentPeriodKeys.includes(entry.dateKey)
    ).length;
  }, [allTimeEntries, currentPeriodKeys]);

  const handleSubmitForApproval = useCallback(async () => {
    if (pendingEntryCount === 0) return;
    const submissionMessage = `Are you sure you want to submit ${pendingEntryCount} pending entries for approval in the current ${activeTab} view?`;
    if (!window.confirm(submissionMessage)) return;

    const entriesToSubmit = allTimeEntries.filter(entry =>
      entry.status === APPROVAL_STATUSES.PENDING && currentPeriodKeys.includes(entry.dateKey)
    );

    try {
      const res = await submitTimesheetEntries(entriesToSubmit.map(e => ({
        dbId: e.dbId || null,
        dateKey: e.dateKey,
        hours: e.hours,
        project: e.project,
        client: e.client,
        role: e.role,
        type: e.type,
        notes: e.notes,
      })));

      const savedEntries = res.data.saved || [];
      // Build a map from dateKey+project+type -> new dbId for matching
      const savedMap = {};
      savedEntries.forEach(s => {
        const key = `${s.dateKey}|${s.project}|${s.type}`;
        savedMap[key] = s.id;
      });

      setAllTimeEntries(prev => prev.map(entry => {
        const isInCurrentPeriod = currentPeriodKeys.includes(entry.dateKey);
        if (entry.status === APPROVAL_STATUSES.PENDING && isInCurrentPeriod) {
          const key = `${entry.dateKey}|${entry.project}|${entry.type}`;
          const newDbId = savedMap[key] || entry.dbId;
          return { ...entry, status: APPROVAL_STATUSES.SUBMITTED, dbId: newDbId, id: newDbId ? `db-${newDbId}` : entry.id };
        }
        return entry;
      }));
    } catch (err) {
      console.error('[handleSubmitForApproval]', err?.response?.data?.error || err.message);
      alert('Failed to submit entries. Please try again.');
    }
  }, [pendingEntryCount, currentPeriodKeys, activeTab, allTimeEntries]);

  const handleModifyPeriod = useCallback(() => {
    const recallMessage = `Are you sure you want to recall the current period (${activeTab})? This will revert all entries in this period (Submitted, Approved, Rejected) to 'Pending' status and allow editing.`;
    if (window.confirm(recallMessage)) {
      setAllTimeEntries(prev => prev.map(entry => {
        const isInCurrentPeriod = currentPeriodKeys.includes(entry.dateKey);
        if (isInCurrentPeriod && ![APPROVAL_STATUSES.PENDING, APPROVAL_STATUSES.NONE, APPROVAL_STATUSES.REJECTED].includes(entry.status)) {
          return { ...entry, status: APPROVAL_STATUSES.PENDING };
        }
        return entry;
      }));
    }
  }, [currentPeriodKeys, activeTab]);

  const mockApproveAll = useCallback(() => {
    setAllTimeEntries(prev => prev.map(entry => {
      const isInCurrentPeriod = currentPeriodKeys.includes(entry.dateKey);
      if (entry.status === APPROVAL_STATUSES.SUBMITTED && isInCurrentPeriod) {
        return { ...entry, status: APPROVAL_STATUSES.APPROVED };
      }
      return entry;
    }));
  }, [currentPeriodKeys]);

  // --- Core Data Aggregation (unchanged) ---
  const {
    projects,
    monthlyTimeEntries,
    grandTotal,
    grandBillableTotal,
    weeklyDayTotals,
    monthlyTotal,
    dailyTotal,
    dailyNotes,
    dailyEntries
  } = useMemo(() => {
    const projectsMap = new Map();
    let grandTotal = 0;
    let grandBillableTotal = 0;
    const weeklyDayTotals = new Array(7).fill(0);
    const derivedMonthlyTimeEntries = {};
    allTimeEntries.forEach(entry => {
      const currentEntryData = derivedMonthlyTimeEntries[entry.dateKey] || { hours: 0, status: APPROVAL_STATUSES.NONE, notes: [] };
      const newHours = currentEntryData.hours + entry.hours;
      const isTimeOff = entry.type === 'Time Off';
      if (entry.notes && entry.notes.trim() !== '') currentEntryData.notes.push(entry.notes);
      const consolidatedStatus = getDayStatus(entry.dateKey);
      derivedMonthlyTimeEntries[entry.dateKey] = {
        hours: newHours,
        status: consolidatedStatus,
        notes: currentEntryData.notes,
      };
      const dateIndexInWeek = weekKeys.indexOf(entry.dateKey);
      if (dateIndexInWeek !== -1) {
        grandTotal += entry.hours;
        weeklyDayTotals[dateIndexInWeek] += entry.hours;
        if (!isTimeOff) grandBillableTotal += entry.hours;
        const projectKey = `${entry.type}-${entry.project}`;
        if (!projectsMap.has(projectKey)) {
          projectsMap.set(projectKey, {
            id: projectKey,
            client: entry.type,
            project: entry.project,
            role: entry.type,
            entries: new Array(7).fill({ rawHours: 0, status: APPROVAL_STATUSES.NONE, displayValue: "" }),
          });
        }
        const projectRow = projectsMap.get(projectKey);
        const currentEntry = projectRow.entries[dateIndexInWeek];
        projectRow.entries[dateIndexInWeek] = {
          rawHours: currentEntry.rawHours + entry.hours,
          status: entry.status,
        };
      }
    });
    const projects = Array.from(projectsMap.values()).map(projectRow => ({
      ...projectRow,
      entries: projectRow.entries.map(obj => ({
        displayValue: obj.rawHours > 0 ? obj.rawHours.toFixed(2) : "",
        rawHours: obj.rawHours,
        status: obj.status,
      })),
    }));
    const monthlyTotal = Object.entries(derivedMonthlyTimeEntries)
      .filter(([dateKey]) => {
        const entryDate = new Date(dateKey);
        return entryDate.getMonth() === currentWeekStart.getMonth() && entryDate.getFullYear() === currentWeekStart.getFullYear();
      })
      .reduce((sum, [, data]) => sum + data.hours, 0);
    const dailyTotal = derivedMonthlyTimeEntries[currentDayKey] ? derivedMonthlyTimeEntries[currentDayKey].hours : 0.00;
    const dailyNotes = allTimeEntries
      .filter(entry => entry.dateKey === currentDayKey && entry.notes && entry.notes.trim() !== '')
      .map(entry => ({ project: entry.project.includes("Time Off") ? entry.project.split(" - ")[0] : entry.project, notes: entry.notes }));
    const dailyEntries = allTimeEntries
      .filter(entry => entry.dateKey === currentDayKey)
      .map(entry => ({ ...entry, hours: parseFloat(entry.hours) }))
      .sort((a, b) => a.project.localeCompare(b.project));
    return {
      projects,
      monthlyTimeEntries: derivedMonthlyTimeEntries,
      grandTotal: grandTotal.toFixed(2),
      grandBillableTotal: grandBillableTotal.toFixed(2),
      weeklyDayTotals: weeklyDayTotals.map(t => t.toFixed(2)),
      monthlyTotal: monthlyTotal.toFixed(2),
      dailyTotal: dailyTotal.toFixed(2),
      dailyNotes,
      dailyEntries
    };
  }, [allTimeEntries, currentWeekStart, currentDayKey, weekKeys, getDayStatus]);

  const parseTimeInput = (value) => {
    if (value === '') return 0;
    if (/^[0-9]+:[0-5][0-9]$/.test(value)) {
      const [h, m] = value.split(':').map(Number);
      return h + m / 60;
    }
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const handleEntryChange = useCallback((projectId, dayIndex, value) => {
    const numericValue = parseTimeInput(value);
    if (numericValue < 0 || numericValue > 24) {
      alert(`Time entry must be between 0 and 24 hours.`);
      return;
    }
    const parts = projectId.split('-');
    const type = parts[0];
    const project = parts.slice(1).join('-');
    if (!weekDays || !weekDays[dayIndex]) return;
    const targetDateKey = weekDays[dayIndex].dateKey;
    setAllTimeEntries(prevEntries => {
      const entryToPreserve = prevEntries.find(entry =>
        entry.dateKey === targetDateKey &&
        entry.type === type &&
        entry.project === project &&
        [APPROVAL_STATUSES.PENDING, APPROVAL_STATUSES.NONE, APPROVAL_STATUSES.REJECTED].includes(entry.status)
      );
      let currentHoursForDay = 0;
      prevEntries.forEach(entry => {
        const isTargetEditableEntry = (
          entry.dateKey === targetDateKey &&
          entry.type === type &&
          entry.project === project &&
          [APPROVAL_STATUSES.PENDING, APPROVAL_STATUSES.NONE, APPROVAL_STATUSES.REJECTED].includes(entry.status)
        );
        if (!isTargetEditableEntry && entry.dateKey === targetDateKey) {
          currentHoursForDay += entry.hours;
        }
      });
      const potentialTotal = currentHoursForDay + numericValue;
      if (potentialTotal > 24) {
        alert(`🛑 Validation Error: Maximum 24 hours allowed per day. This action would result in ${potentialTotal.toFixed(2)} hours on ${targetDateKey}.`);
        return prevEntries;
      }
      const entriesToKeep = prevEntries.filter(entry => {
        const isTargetEditableEntry = (
          entry.dateKey === targetDateKey &&
          entry.type === type &&
          entry.project === project &&
          [APPROVAL_STATUSES.PENDING, APPROVAL_STATUSES.NONE, APPROVAL_STATUSES.REJECTED].includes(entry.status)
        );
        return !isTargetEditableEntry;
      });
      if (numericValue === 0) return entriesToKeep;
      const newEntry = {
        id: entryToPreserve ? entryToPreserve.id : Date.now() + Math.random(),
        dateKey: targetDateKey,
        hours: numericValue,
        project: project,
        type: type,
        notes: entryToPreserve ? entryToPreserve.notes : 'Grid entry',
        status: APPROVAL_STATUSES.PENDING,
      };
      return [...entriesToKeep, newEntry];
    });
  }, [weekDays]);

  const handleSaveEntry = useCallback((entryData) => {
    if (entryData.hours === 0) return;
    const isTimeOffEntry = entryData.type === 'Time Off';
    const numericValue = entryData.hours;
    const targetDateKey = entryData.date;
    setAllTimeEntries(prev => {
      let currentHoursForDay = 0;
      prev.forEach(entry => {
        if (entry.dateKey === targetDateKey) {
          if (entryData.id && entry.id === entryData.id) return;
          currentHoursForDay += entry.hours;
        }
      });
      const potentialTotal = currentHoursForDay + numericValue;
      if (potentialTotal > 24) {
        alert(`🛑 Validation Error: Maximum 24 hours allowed per day. This action would result in ${potentialTotal.toFixed(2)} hours on ${targetDateKey}.`);
        return prev;
      }
      if (entryData.id) {
        return prev.map(entry => entry.id === entryData.id ? {
          ...entry,
          dateKey: entryData.date,
          hours: entryData.hours,
          project: entryData.project,
          type: entryData.type,
          notes: entryData.notes,
          status: APPROVAL_STATUSES.PENDING,
          isTimeOff: isTimeOffEntry,
        } : entry);
      } else {
        return [...prev, {
          id: Date.now() + Math.random(),
          dateKey: entryData.date,
          hours: entryData.hours,
          project: entryData.project,
          type: entryData.type,
          notes: entryData.notes,
          status: APPROVAL_STATUSES.PENDING,
          isTimeOff: isTimeOffEntry,
        }];
      }
    });
    closeEntryModal();
  }, [closeEntryModal]);

  // --- Navigation Handlers (unchanged) ---
  const currentMonthName = currentWeekStart.toLocaleString('en-US', { month: 'long' });
  const currentYear = currentWeekStart.getFullYear();
  const currentDayName = currentWeekStart.toLocaleString('en-US', { weekday: 'long' });
  const currentDayDateShort = formatDateShort(currentWeekStart);
  const handleShift = (increment) => {
    setCurrentWeekStart(prev => {
      const newDate = new Date(prev);
      if (activeTab === "MONTH") {
        newDate.setMonth(newDate.getMonth() + increment);
        newDate.setDate(1);
      } else if (activeTab === "WEEK") {
        newDate.setDate(newDate.getDate() + (increment * 7));
      } else if (activeTab === "DAY") {
        newDate.setDate(newDate.getDate() + increment);
      }
      return newDate;
    });
  };
  const handleMonthYearSelect = useCallback((newDate) => {
    setCurrentWeekStart(newDate);
    setShowMonthYearSelector(false);
  }, []);
  const handleDayClick = useCallback((date) => {
    setCurrentWeekStart(date);
    setActiveTab("DAY");
  }, []);

  // --- Summary Calculations (unchanged) ---
  const currentTotal = useMemo(() => {
    if (activeTab === "WEEK") return grandTotal;
    if (activeTab === "DAY") return dailyTotal;
    if (activeTab === "MONTH") return monthlyTotal;
    return '0.00';
  }, [activeTab, grandTotal, dailyTotal, monthlyTotal]);

  const currentBillable = useMemo(() => {
    if (activeTab === "WEEK") return grandBillableTotal;
    if (activeTab === "DAY") {
      return dailyEntries
        .filter(entry => entry.type !== 'Time Off')
        .reduce((sum, entry) => sum + parseFloat(entry.hours), 0)
        .toFixed(2);
    }
    if (activeTab === "MONTH") {
      const year = currentWeekStart.getFullYear();
      const month = currentWeekStart.getMonth();
      return allTimeEntries
        .filter(entry => {
          const entryDate = new Date(entry.dateKey);
          return entry.type !== 'Time Off' &&
            entryDate.getMonth() === month &&
            entryDate.getFullYear() === year;
        })
        .reduce((sum, entry) => sum + entry.hours, 0)
        .toFixed(2);
    }
    return '0.00';
  }, [activeTab, grandBillableTotal, dailyEntries, allTimeEntries, currentWeekStart]);

  const timeOffTotal = useMemo(() => {
    return allTimeEntries
      .filter(entry => entry.type === 'Time Off' && currentPeriodKeys.includes(entry.dateKey))
      .reduce((sum, entry) => sum + entry.hours, 0)
      .toFixed(2);
  }, [allTimeEntries, currentPeriodKeys]);

  const periodTargetHours = useMemo(() => {
    if (activeTab === "WEEK") return USER_CONFIG_WEEKLY_TARGET;
    if (activeTab === "DAY") return 8;
    if (activeTab === "MONTH") return USER_CONFIG_MONTHLY_TARGET;
    return 0;
  }, [activeTab]);

  const utilizationPercent = useMemo(() => {
    const billable = parseFloat(currentBillable) || 0;
    const target = periodTargetHours;
    if (target === 0) return '0.0%';
    const percent = (billable / target) * 100;
    return `${percent.toFixed(1)}%`;
  }, [currentBillable, periodTargetHours]);

  const progressBarWidth = `${Math.min(parseFloat(utilizationPercent.replace('%', '')), 100)}%`;

  // 🔷 NEW: Upload Logic
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setUploadState({
        loading: false,
        message: "Uploaded timesheet inappropriate. Please import a proper timesheet.",
        messageType: 'error',
      });
      return;
    }

    setUploadState({ loading: true, message: null, messageType: null });

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('timesheet', file);

      const response = await fetch('http://localhost:5001/api/timesheet/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      // 🧩 Defensive parsing: handle non-JSON or empty responses
      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (parseErr) {
        console.error('Failed to parse JSON from timesheet upload:', parseErr, 'raw:', text);
        setUploadState({
          loading: false,
          message: 'Server returned invalid response. Please try again.',
          messageType: 'error',
        });
        return;
      }

      // 🛑 Handle HTTP errors gracefully
      if (!response.ok) {
        const message = (data && data.message)
          ? data.message
          : `Upload failed (${response.status})`;
        setUploadState({
          loading: false,
          message,
          messageType: 'error',
        });
        return;
      }

      // 🚫 Handle invalid or missing extracted data
      if (!data || !data.success || !data.extractedData) {
        const message = (data && data.message)
          ? data.message
          : 'Uploaded timesheet inappropriate. Please import a proper timesheet.';
        setUploadState({
          loading: false,
          message,
          messageType: 'error',
        });
        return;
      }

      // ✅ Successfully parsed timesheet
      const { employeeName, projectName, clientName, role, hours } = data.extractedData;
      const extractedHours = parseFloat(hours) || 0;

      // ✅ Determine current date and existing entries
      const targetDateKey = dateToKey(getTodayDate());
      const existingEntriesOnDay = allTimeEntries.filter(e => e.dateKey === targetDateKey);
      const existingHours = existingEntriesOnDay.reduce((sum, e) => sum + e.hours, 0);
      const wasEmpty = existingHours === 0;
      const conflict = !wasEmpty && Math.abs(existingHours - extractedHours) > 0.01;

      // ✅ Create a new auto-filled entry
      const newEntry = {
        id: Date.now() + Math.random(),
        dateKey: targetDateKey,
        hours: extractedHours,
        project: projectName || MOCK_PROJECTS[0].name,
        type: "Project Time",
        notes: `Auto-filled from uploaded timesheet`,
        status: APPROVAL_STATUSES.PENDING,
      };

      // ✅ Replace today's entry
      setAllTimeEntries(prev => {
        const filtered = prev.filter(e => e.dateKey !== targetDateKey);
        return [...filtered, newEntry];
      });

      // ✅ Determine message for user
      let message = '';
      if (wasEmpty) {
        message = "Hours are filled based on uploaded timesheet. Please review before you submit.";
      } else if (conflict) {
        message = "Manual entered timesheet is different from uploaded timesheet. Please review before submission.";
      } else {
        message = "Existing hours are overridden with uploaded timesheet. Please review before you submit.";
      }

      setUploadState({
        loading: false,
        message,
        messageType: 'info',
      });
    } catch (err) {
      console.error('Upload error:', err);
      setUploadState({
        loading: false,
        message: "Uploaded timesheet inappropriate. Please import a proper timesheet.",
        messageType: 'error',
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  const triggerFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Clear message after 5 seconds
  useEffect(() => {
    if (uploadState.message) {
      const timer = setTimeout(() => {
        setUploadState(prev => ({ ...prev, message: null }));
      }, 5001);
      return () => clearTimeout(timer);
    }
  }, [uploadState.message]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm p-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <EmpTypography.label className={`${TEXT_COLOR_PRIMARY}`}>Timesheet</EmpTypography.label>
        </div>
        <div className="flex items-center space-x-4"></div>
      </div>

      {/* Notification Banner (Soft Message) */}
      {uploadState.message && (
        <div className={`fixed top-16 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-md text-center font-medium ${uploadState.messageType === 'error' ? 'bg-red-100 text-red-800' :
          uploadState.messageType === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-blue-100 text-blue-800'
          }`}>
          {uploadState.message}
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-6 pb-20">
        {/* Timesheet Header & Date Navigation */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 text-lg font-semibold min-w-[250px] relative">
              <button
                onClick={() => handleShift(-1)}
                aria-label={`Previous ${activeTab.toLowerCase()}`}
                title={`Previous ${activeTab.toLowerCase()}`}
                className="flex items-center justify-center w-8 h-8 rounded-full text-blue-500 hover:bg-blue-100 hover:text-blue-700 transition text-lg font-bold"
              >
                ‹
              </button>
              <span className={`${TEXT_COLOR_PRIMARY} cursor-pointer hover:text-blue-600 transition`}

                onClick={() => setShowMonthYearSelector(true)}>
                {activeTab === "MONTH"
                  ? `${currentMonthName} ${currentYear}`
                  : activeTab === "DAY"
                    ? `${currentDayName}, ${currentDayDateShort}`
                    : weekRange
                }
              </span>

              <button
                onClick={() => handleShift(1)}
                aria-label={`Next ${activeTab.toLowerCase()}`}
                title={`Next ${activeTab.toLowerCase()}`}
                className="flex items-center justify-center w-8 h-8 rounded-full text-blue-500 hover:bg-blue-100 hover:text-blue-700 transition text-lg font-bold"
              >
                ›
              </button>
              <button className="px-2 py-1 text-blue-600 hover:bg-blue-100"
                onClick={() => setCurrentWeekStart(getTodayDate())}>
                <span role="img" aria-label="Calendar">📅</span>
              </button>
              <MonthYearSelectorDropdown
                open={showMonthYearSelector}
                onClose={() => setShowMonthYearSelector(false)}
                currentMonth={currentMonthName}
                currentYear={currentYear}
                onDateSelect={handleMonthYearSelect}
              />
            </div>
            <div className="flex-1 flex justify-center">
              <div className={`flex items-center border ${BORDER_COLOR} rounded-lg overflow-hidden`}>
                {viewModes.map((view, index) => (
                  <button key={view} className={getTabClasses(activeTab, view, index, viewModes.length)}
                    onClick={() => setActiveTab(view)}>
                    {view}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-w-[250px] h-6"> </div>
          </div>

          {(activeTab === "DAY" || activeTab === "WEEK") && (
            <DaySelector
              weekDays={weekDays}
              currentDayKey={currentDayKey}
              handleDayClick={handleDayClick}
              monthlyTimeEntries={monthlyTimeEntries}
            />
          )}

          {activeTab === "WEEK" && (
            <WeekView
              projects={projects}
              grandTotal={grandTotal}
              weeklyDayTotals={weeklyDayTotals}
              handleEntryChange={handleEntryChange}
              setShowAddTimeRow={openModelForDate}
              currentWeekStart={currentWeekStart}
            />
          )}
          {activeTab === "DAY" && (
            <DayView
              dailyTotal={dailyTotal}
              setShowAddTimeRow={openModelForDate}
              currentWeekStart={currentWeekStart}
              isLocked={isDayLocked}
              dailyNotes={dailyNotes}
              dailyEntries={dailyEntries}
              onEditEntry={openEditModal}
              onDeleteEntry={handleDeleteEntry}
            />
          )}
          {activeTab === "MONTH" && (
            <MonthView
              currentWeekStart={currentWeekStart}
              monthlyEntries={monthlyTimeEntries}
              handleDayClick={handleDayClick}
              getDayStatus={getDayStatus}
            />
          )}
        </div>

        {/* Summary Panels */}
        <div className="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-6">
          <div className="flex-1 bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <EmpTypography.h3 className="mb-4">HOURS SUMMARY</EmpTypography.h3>
            <div className="flex justify-between items-center">
              <div className="text-center">
                <div className={`text-4xl font-bold ${TEXT_COLOR_ACCENT}`}>{currentTotal}</div>
                <EmpTypography.small className="mt-1 block">TOTAL HOURS</EmpTypography.small>
              </div>
              <div className="space-y-2 text-sm font-medium">
                <div className="flex justify-between">
                  <EmpTypography.p>Billable</EmpTypography.p>
                  <EmpTypography.h4 className="ml-4">{currentBillable}</EmpTypography.h4>
                </div>
                <div className="flex justify-between">
                  <EmpTypography.p>Time Off</EmpTypography.p>
                  <EmpTypography.h4 className="ml-4 text-red-600">{timeOffTotal}</EmpTypography.h4>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <EmpTypography.h3 className="mb-4 flex justify-between items-center">
              <span>APPROVAL STATUS</span>
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${statusColors.bg} ${statusColors.text}`}>
                {statusColors.icon} {periodApprovalStatus}
              </span>
            </EmpTypography.h3>
            <div className="relative pt-2">
              <div className="flex mb-2 items-center justify-between">
                <EmpTypography.h4 className={`text-lg font-bold ${statusColors.text}`}>{currentTotal} HRS</EmpTypography.h4>
                <EmpTypography.small className="text-gray-600">Target: {periodTargetHours} HRS</EmpTypography.small>
              </div>
              <div className="flex h-2 mb-4 overflow-hidden bg-gray-200 rounded">
                <div style={{ width: progressBarWidth }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-black justify-center ${statusColors.badgeBg}`}></div>
              </div>
            </div>
            {periodAdminComments.length > 0 && (
              <div className="border-t pt-3 mt-2 space-y-1">
                {periodAdminComments.map((c, i) => (
                  <div key={i} className="flex items-start gap-1 bg-yellow-50 border border-yellow-200 rounded px-2 py-1.5">
                    <span className="text-yellow-600 text-xs font-bold shrink-0">Admin ({c.dateKey}):</span>
                    <span className="text-xs text-yellow-800">{c.comment}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <EmpTypography.h3 className="mb-4">UTILIZATION</EmpTypography.h3>
            <div className="flex justify-center items-center h-full pb-8">
              <div className="text-center">
                <div className={`text-4xl font-bold ${TEXT_COLOR_ACCENT}`}>{utilizationPercent}</div>
                <EmpTypography.small className="mt-1 block">BILLABLE UTILIZATION</EmpTypography.small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div
        className="fixed bottom-0 right-0 p-4 bg-white border-t border-gray-200 shadow-xl flex justify-end space-x-4 z-20"
        style={{ left: `${SIDEBAR_WIDTH_PX}px`, width: `calc(100% - ${SIDEBAR_WIDTH_PX}px)` }}
      >
        {/* Upload Button — hidden until PDF parsing is fully implemented
        <EmpTypography.button
          className="px-6 py-2 border-blue-200 bg-blue-100 text-blue-900 rounded-full font-semibold hover:bg-blue-200 transition"
          onClick={triggerFileInput}
          disabled={uploadState.loading}
          variant="primary"
        >
          {uploadState.loading ? 'Uploading…' : 'Upload Timesheet'}
        </EmpTypography.button>
        */}

        {/* Add Time Button — only when period is editable */}
        {(periodApprovalStatus === APPROVAL_STATUSES.PENDING || periodApprovalStatus === APPROVAL_STATUSES.NONE || periodApprovalStatus === APPROVAL_STATUSES.REJECTED) && (
          <EmpTypography.button
            className="px-6 py-2 border-blue-200 text-black rounded-full font-semibold hover:bg-blue-50 transition"
            onClick={() => openModelForDate(currentWeekStart)}
            variant="primary"
          >
            {activeTab === "WEEK" || activeTab === "MONTH" ? "Add Time Row" : "New Time Entry"}
          </EmpTypography.button>
        )}

        {/* Submit Button */}
        <EmpTypography.button
          className="relative px-6 py-2 rounded-full font-semibold"
          onClick={handleSubmitForApproval}
          disabled={pendingEntryCount === 0}
          style={{ backgroundColor: ACCENT_COLOR_BG }}
        >
          {(periodApprovalStatus !== APPROVAL_STATUSES.PENDING && periodApprovalStatus !== APPROVAL_STATUSES.NONE && periodApprovalStatus !== APPROVAL_STATUSES.REJECTED)
            ? "Resubmit for Approval"
            : "Submit for Approval"
          }
          {pendingEntryCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full shadow-lg">
              {pendingEntryCount}
            </span>
          )}
        </EmpTypography.button>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: 'none' }}
        />
      </div>

      {/* Modals */}
      <AddTimeRowModel
        open={showAddTimeRow}
        onClose={closeEntryModal}
        currentDate={newEntryDate}
        onSaveEntry={handleSaveEntry}
        entryToEdit={entryToEdit}
        designationOptions={designationOptions}
      />
    </div>
  );
}
