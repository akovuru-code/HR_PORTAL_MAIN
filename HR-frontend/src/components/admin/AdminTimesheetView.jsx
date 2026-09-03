import { useState, useMemo, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";

// ── Constants (exact match with employee Timesheet.jsx) ───────────────────
const ACCENT_COLOR_BG = "bg-blue-200";
const ACCENT_COLOR_HOVER = "hover:bg-blue-300";
const TEXT_COLOR_ACCENT = "text-black-600";
const BORDER_COLOR = "border-gray-200";
const WEEK_DAY_NAMES = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
const DAY_NAMES_MONTH = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const APPROVAL_STATUSES = { PENDING:'Pending', SUBMITTED:'Submitted', APPROVED:'Approved', REJECTED:'Rejected', NONE:'None' };

// ── Utilities (exact match) ───────────────────────────────────────────────
const getTodayDate = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const dateToKey = (date) => {
  const d = new Date(date);
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
};
const formatDateShort = (date) => `${date.getMonth()+1}/${date.getDate()}`;
const formatHoursToDisplay = (h) => {
  if (!h || h === 0) return '0:00';
  const m = Math.round(h * 60);
  return `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`;
};
const getWeekDays = (startDate) => {
  const d = new Date(startDate); d.setHours(0,0,0,0);
  const diff = d.getDay() === 0 ? 6 : d.getDay() - 1;
  d.setDate(d.getDate() - diff);
  return Array.from({length:7}, (_,i) => {
    const day = new Date(d); day.setDate(d.getDate()+i);
    return { day: WEEK_DAY_NAMES[i], date: formatDateShort(day), fullDate: day, dateKey: dateToKey(day) };
  });
};
const getCalendarGridDays = (date, monthlyEntries) => {
  const year = date.getFullYear(), month = date.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());
  const grid = []; let cur = new Date(start), count = 0;
  while (count < 6*7) {
    if (count >= 4*7 && cur.getMonth() === (month+1)%12 && cur.getDay() === 0) break;
    const key = dateToKey(cur);
    const entry = monthlyEntries[key] || { hours: 0, status: APPROVAL_STATUSES.NONE };
    grid.push({ date: cur.getDate(), isCurrentMonth: cur.getMonth()===month, hours: entry.hours, status: entry.status, dateKey: key, fullDate: new Date(cur) });
    cur.setDate(cur.getDate()+1); count++;
  }
  return grid;
};
const getTabClasses = (currentTab, tabName, index, count) => {
  const isActive = currentTab === tabName;
  let classes = `px-4 py-1 text-sm font-semibold transition-colors cursor-pointer`;
  if (isActive) classes += ` ${ACCENT_COLOR_BG} text-black shadow-inner`;
  else classes += ` bg-white text-gray-900 hover:bg-gray-50`;
  if (index < count - 1) classes += ` border-r ${BORDER_COLOR}`;
  if (index === 0) classes += ` rounded-l-lg`;
  else if (index === count - 1) classes += ` rounded-r-lg`;
  return classes;
};

// ── DaySelector (exact copy from employee) ────────────────────────────────
function DaySelector({ weekDays, currentDayKey, handleDayClick, monthlyTimeEntries }) {
  return (
    <div className="flex justify-center space-x-4 p-4 border-b border-gray-200 overflow-x-auto">
      {weekDays.map(day => {
        const isActive = day.dateKey === currentDayKey;
        const isWeekend = day.fullDate.getDay() === 0 || day.fullDate.getDay() === 6;
        const entryData = monthlyTimeEntries[day.dateKey] || { hours: 0 };
        let classes = `w-24 h-24 p-3 flex flex-col justify-between items-center rounded-lg transition-all duration-300 shadow-md cursor-pointer border-2 flex-shrink-0`;
        if (isActive) classes += ` border-blue-200 bg-white text-gray-900 shadow-lg scale-105`;
        else classes += ` border-gray-200 bg-gray-50 text-gray-500 opacity-50 hover:opacity-75`;
        if (isWeekend) classes += ' bg-red-50/50';
        return (
          <div key={day.dateKey} className={classes} onClick={() => handleDayClick(day.fullDate)}>
            <div className={`text-sm font-semibold ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>{day.day}</div>
            <div className="text-xl font-bold">{formatHoursToDisplay(entryData.hours)}</div>
            <div className="text-xs text-gray-500">{day.date}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── MonthYearSelectorDropdown (exact copy from employee) ──────────────────
function MonthYearSelectorDropdown({ open, onClose, currentMonth, currentYear, onDateSelect }) {
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const years = Array.from({length:101}, (_,i) => 2000+i);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  useEffect(() => { if (open) { setSelectedMonth(currentMonth); setSelectedYear(currentYear); } }, [open, currentMonth, currentYear]);
  const handleSelect = (e) => {
    e.preventDefault();
    const monthIndex = months.findIndex(m => m === selectedMonth);
    onDateSelect(new Date(selectedYear, monthIndex, 1));
    onClose();
  };
  if (!open) return null;
  return (
    <div className="absolute top-10 left-0 mt-2 z-50">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-64 p-4">
        <h2 className="text-lg font-bold mb-3 text-gray-800">Select Date</h2>
        <form onSubmit={handleSelect} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Month</label>
            <select className="w-full p-1.5 border border-gray-300 rounded-md text-sm" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Year</label>
            <select className="w-full p-1.5 border border-gray-300 rounded-md text-sm" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
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

// ── MonthView (exact copy from employee, without editing) ─────────────────
function MonthView({ currentWeekStart, monthlyEntries, handleDayClick }) {
  const grid = useMemo(() => getCalendarGridDays(currentWeekStart, monthlyEntries), [currentWeekStart, monthlyEntries]);
  const todayKey = dateToKey(getTodayDate());
  return (
    <div className="calendar-month-view">
      <div className="grid grid-cols-7 bg-blue-50 border-t border-l border-gray-200">
        {DAY_NAMES_MONTH.map(day => (
          <div key={day} className="py-2 text-center bg-gray-300">
            <span className="text-xs font-semibold text-gray-600">{day.substring(0,3).toUpperCase()}</span>
          </div>
        ))}
        {grid.map((day, index) => {
          const isToday = day.dateKey === todayKey;
          const isWeekend = day.fullDate.getDay()===0 || day.fullDate.getDay()===6;
          const hoursEntered = parseFloat(day.hours) > 0;
          const status = day.status;
          let cellClasses = `h-28 p-2 flex flex-col justify-between transition relative`;
          if (day.isCurrentMonth) {
            cellClasses += ` bg-blue text-gray-800 hover:bg-blue-100 cursor-pointer`;
            if (isWeekend) cellClasses = cellClasses.replace('bg-blue', 'bg-red-100/50');
            if (isToday) cellClasses += ` ring-2 ring-blue-200 ring-offset-1`;
          } else {
            cellClasses += ' text-gray-400 bg-gray-200/50 pointer-events-none cursor-default';
          }
          let statusDotClass = '';
          if (status === APPROVAL_STATUSES.APPROVED) statusDotClass = 'bg-green-600';
          else if (status === APPROVAL_STATUSES.PENDING) statusDotClass = 'bg-gray-900';
          else if (status === APPROVAL_STATUSES.SUBMITTED) statusDotClass = 'bg-orange-500';
          else if (status === APPROVAL_STATUSES.REJECTED) statusDotClass = 'bg-red-600';
          return (
            <div key={index} className={cellClasses} onClick={day.isCurrentMonth ? () => handleDayClick(day.fullDate) : undefined}>
              <div>
                <span className={`text-sm font-medium mb-1 ${day.isCurrentMonth ? '' : 'opacity-70'}`}>{day.date}</span>
                <div className="text-right">
                  <span className={`w-auto px-1 py-0.5 text-lg font-extrabold text-center transition ${day.isCurrentMonth ? TEXT_COLOR_ACCENT : 'text-gray-400'} ${!hoursEntered ? 'min-h-[28px] opacity-0' : ''}`}>
                    {hoursEntered ? day.hours.toFixed(2) : ''}
                  </span>
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

// ── Reusable editable entry cell ─────────────────────────────────────────
function EditableEntryCell({ entry, onAction }) {
  const { isRootAdmin, can } = useAuth();
  const canUpdate = isRootAdmin || can('timesheet:update');
  const canApprove = isRootAdmin || can('timesheet:approve');
  const [editing, setEditing] = useState(false);
  const [hours, setHours] = useState(entry.hours);

  const saveHours = () => {
    onAction(entry.id, null, parseFloat(hours));
    setEditing(false);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {editing ? (
        <div className="flex items-center gap-1">
          <input type="number" step="0.5" min="0" max="24" className="border rounded px-1 py-0.5 w-14 text-sm text-center" value={hours} onChange={e => setHours(e.target.value)} />
          <button onClick={saveHours} className="text-green-600 font-bold text-xs hover:text-green-800">✓</button>
          <button onClick={() => { setEditing(false); setHours(entry.hours); }} className="text-gray-400 text-xs hover:text-gray-600">✕</button>
        </div>
      ) : (
        <span
          className={`font-semibold text-gray-900 ${canUpdate ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`}
          title={canUpdate ? 'Click to edit' : undefined}
          onClick={canUpdate ? () => setEditing(true) : undefined}
        >
          {entry.hours.toFixed(2)}
        </span>
      )}
      {entry.status === 'Approved' && <span className="text-xs text-green-600 font-semibold">✓ Approved</span>}
      {entry.status === 'Rejected' && <span className="text-xs text-red-600 font-semibold">✕ Rejected</span>}
      {canApprove && (entry.status === 'Submitted' || entry.status === 'Pending') && (
        <div className="flex gap-1">
          <button onClick={() => onAction(entry.id,'Approved')} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 font-semibold">✓</button>
          <button onClick={() => onAction(entry.id,'Rejected')} className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 font-semibold">✕</button>
        </div>
      )}
    </div>
  );
}

// ── Week grid with per-cell approve/reject ────────────────────────────────
function WeekGrid({ weekDays, entries, onAction }) {
  const projectMap = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const key = `${e.type||'Project Time'}-${e.project||'—'}`;
      if (!map[key]) map[key] = { type: e.type||'Project Time', project: e.project||'—', days: {} };
      map[key].days[e.dateKey] = e;
    });
    return map;
  }, [entries]);
  const projects = Object.values(projectMap);
  const totals = weekDays.map(d => entries.filter(e=>e.dateKey===d.dateKey).reduce((s,e)=>s+e.hours,0));
  if (!projects.length) return <p className="text-gray-400 text-center py-8">No entries this week.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className={`bg-gray-50 border-b ${BORDER_COLOR}`}>
            <th className={`px-4 py-2 text-left border-r ${BORDER_COLOR} min-w-[160px]`}>Project / Type</th>
            {weekDays.map(d => (
              <th key={d.dateKey} className={`px-3 py-2 text-center border-r ${BORDER_COLOR} min-w-[80px]`}>
                <div className="font-semibold">{d.day}</div>
                <div className="text-xs text-gray-500">{d.date}</div>
              </th>
            ))}
            <th className={`px-3 py-2 text-center font-bold ${ACCENT_COLOR_BG}`}>TOTAL HOURS</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((proj, pi) => {
            const rowTotal = weekDays.reduce((s,d)=>s+(proj.days[d.dateKey]?.hours||0),0);
            return (
              <tr key={pi} className="border-b border-gray-100">
                <td className={`px-4 py-3 border-r ${BORDER_COLOR}`}>
                  <div className="text-xs text-gray-500">{proj.type}</div>
                  <div className="font-medium text-gray-900">{proj.project}</div>
                </td>
                {weekDays.map(d => {
                  const entry = proj.days[d.dateKey];
                  return (
                    <td key={d.dateKey} className={`px-2 py-2 text-center border-r ${BORDER_COLOR}`}>
                      {entry ? <EditableEntryCell entry={entry} onAction={onAction} /> : <span className="text-gray-300">—</span>}
                    </td>
                  );
                })}
                <td className={`px-3 py-2 text-center font-bold ${ACCENT_COLOR_BG}`}>{rowTotal.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className={`${ACCENT_COLOR_BG} font-bold`}>
            <td className={`px-4 py-2 border-r ${BORDER_COLOR}`}>Daily Totals:</td>
            {totals.map((t,i) => <td key={i} className={`px-3 py-2 text-center border-r ${BORDER_COLOR}`}>{t.toFixed(2)}</td>)}
            <td className="px-3 py-2 text-center">{totals.reduce((s,t)=>s+t,0).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Day detail view ────────────────────────────────────────────────────────
function DayEntryCard({ e, onAction }) {
  const { isRootAdmin, can } = useAuth();
  const canUpdate = isRootAdmin || can('timesheet:update');
  const [comment, setComment] = useState(e.adminComment || '');
  const [saving, setSaving] = useState(false);

  const saveComment = async () => {
    setSaving(true);
    await onAction(e.id, null, undefined, comment);
    setSaving(false);
  };

  return (
    <div className="border border-gray-200 rounded-lg px-4 py-3 bg-white shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-gray-800">{e.project || '—'}</div>
          <div className="text-xs text-gray-500">{e.type}{e.client ? ` · ${e.client}` : ''}</div>
          {e.notes && <div className="text-xs text-gray-400 mt-1">{e.notes}</div>}
        </div>
        <div className="flex items-center gap-3">
          <EditableEntryCell entry={e} onAction={onAction} />
        </div>
      </div>
      {canUpdate && (
        <div className="border-t pt-3">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Admin Note (visible to employee)</label>
          <div className="flex gap-2">
            <textarea
              className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-300"
              rows={2}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Leave a note for this entry..."
            />
            <button
              onClick={saveComment}
              disabled={saving}
              className={`self-end px-3 py-1.5 ${ACCENT_COLOR_BG} ${ACCENT_COLOR_HOVER} text-black text-sm font-semibold rounded`}
            >
              {saving ? '...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DayView({ dayKey, entries, onAction }) {
  const dayEntries = entries.filter(e => e.dateKey === dayKey);
  if (!dayEntries.length) return <p className="text-gray-400 text-center py-8">No entries for this day.</p>;
  return (
    <div className="space-y-3 p-4">
      {dayEntries.map(e => <DayEntryCard key={e.id} e={e} onAction={onAction} />)}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────
const viewModes = ["MONTH","WEEK","DAY"];

export default function AdminTimesheetView({ entries, onAction }) {
  const [activeTab, setActiveTab] = useState('WEEK');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const latest = entries.reduce((max,e) => e.dateKey > max ? e.dateKey : max, '2000-01-01');
    return getWeekDays(latest ? new Date(latest) : new Date())[0].fullDate;
  });
  const [currentDayKey, setCurrentDayKey] = useState(() => {
    return entries.reduce((max,e) => e.dateKey > max ? e.dateKey : max, dateToKey(new Date()));
  });
  const [showMonthYearSelector, setShowMonthYearSelector] = useState(false);

  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);
  const weekRange = weekDays.length === 7 ? `${weekDays[0].date} - ${weekDays[6].date}` : '';
  const currentMonthName = ["January","February","March","April","May","June","July","August","September","October","November","December"][currentWeekStart.getMonth()];
  const currentYear = currentWeekStart.getFullYear();

  const monthlyTimeEntries = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const cur = map[e.dateKey] || { hours: 0, status: APPROVAL_STATUSES.NONE };
      map[e.dateKey] = { hours: cur.hours + e.hours, status: e.status };
    });
    return map;
  }, [entries]);

  const handleDayClick = (date) => {
    setCurrentDayKey(dateToKey(date));
    setCurrentWeekStart(getWeekDays(date)[0].fullDate);
    setActiveTab('DAY');
  };

  const handleShift = (dir) => {
    const d = new Date(currentWeekStart);
    if (activeTab === 'MONTH') d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCurrentWeekStart(d);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-md">
      {/* Header — exact match with employee */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2 relative min-w-[250px]">
          <button onClick={() => handleShift(-1)} className="text-blue-300 hover:text-gray-700 transition text-lg px-1">‹</button>
          <span className="font-semibold text-gray-700">{weekRange}</span>
          <button onClick={() => handleShift(1)} className="text-blue-300 hover:text-gray-700 transition text-lg px-1">›</button>
          <button className="px-2 py-1 text-blue-600 hover:bg-blue-100 rounded" onClick={() => setShowMonthYearSelector(v=>!v)}>
            <span role="img" aria-label="Calendar">📅</span>
          </button>
          <MonthYearSelectorDropdown
            open={showMonthYearSelector}
            onClose={() => setShowMonthYearSelector(false)}
            currentMonth={currentMonthName}
            currentYear={currentYear}
            onDateSelect={(date) => { setCurrentWeekStart(getWeekDays(date)[0].fullDate); }}
          />
        </div>

        {/* Tabs — exact match */}
        <div className={`flex items-center border ${BORDER_COLOR} rounded-lg overflow-hidden`}>
          {viewModes.map((view, index) => (
            <button key={view} className={getTabClasses(activeTab, view, index, viewModes.length)} onClick={() => setActiveTab(view)}>
              {view}
            </button>
          ))}
        </div>

        <div className="min-w-[250px]" />
      </div>

      {/* Day selector */}
      {(activeTab === 'WEEK' || activeTab === 'DAY') && (
        <DaySelector weekDays={weekDays} currentDayKey={currentDayKey} handleDayClick={handleDayClick} monthlyTimeEntries={monthlyTimeEntries} />
      )}

      {/* Views */}
      {activeTab === 'MONTH' && <MonthView currentWeekStart={currentWeekStart} monthlyEntries={monthlyTimeEntries} handleDayClick={handleDayClick} />}
      {activeTab === 'WEEK' && <WeekGrid weekDays={weekDays} entries={entries.filter(e=>weekDays.some(d=>d.dateKey===e.dateKey))} onAction={onAction} />}
      {activeTab === 'DAY' && <DayView dayKey={currentDayKey} entries={entries} onAction={onAction} />}
    </div>
  );
}
