
import { useState, useEffect, useCallback } from "react";
import AdminTimesheetView from "../../components/admin/AdminTimesheetView";
import { useLocation } from "react-router-dom";
import AdminTypography from '../../components/admin/AdminTypography';
import EmpTypography from '../../components/emp/EmpTypography';


const WEEK_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const dateToKey = (date) => {
  const d = new Date(date);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
};
const getWeekStart = (date) => {
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
};
const getWeekDays = (startDate) => Array.from({ length: 7 }, (_, i) => {
  const d = new Date(startDate); d.setDate(d.getDate() + i);
  return { day: WEEK_DAYS[i], dateKey: dateToKey(d), date: `${d.getMonth() + 1}/${d.getDate()}`, fullDate: d };
});

function AdminTimesheetCalendar({ entries, authHeaders, onUpdated }) {
  const [weekStart, setWeekStart] = useState(() => {
    const latest = entries.reduce((max, e) => e.dateKey > max ? e.dateKey : max, '2000-01-01');
    return getWeekStart(latest ? new Date(latest) : new Date());
  });

  const weekDays = getWeekDays(weekStart);
  const entryMap = Object.fromEntries(entries.map(e => [e.dateKey, e]));

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };

  const weekLabel = `${weekDays[0].date} - ${weekDays[6].date}`;

  const statusColor = (s) => s === 'Approved' ? 'bg-green-100 text-green-700' : s === 'Rejected' ? 'bg-red-100 text-red-700' : s === 'Submitted' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500';

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevWeek} className="px-3 py-1 border rounded hover:bg-gray-100 text-sm">← Prev</button>
        <span className="font-semibold text-gray-700">{weekLabel}</span>
        <button onClick={nextWeek} className="px-3 py-1 border rounded hover:bg-gray-100 text-sm">Next →</button>
      </div>

      {/* Day cards */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {weekDays.map(day => {
          const entry = entryMap[day.dateKey];
          const isWeekend = day.fullDate.getDay() === 0 || day.fullDate.getDay() === 6;
          return (
            <div key={day.dateKey} className={`flex flex-col items-center justify-between rounded-lg border-2 px-3 py-3 min-w-[80px] ${entry ? 'border-blue-300 bg-white shadow' : isWeekend ? 'border-gray-200 bg-red-50 opacity-60' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
              <div className="text-xs font-semibold text-gray-500">{day.day}</div>
              <div className="text-xl font-bold text-gray-900 my-1">{entry ? entry.hours : '—'}</div>
              <div className="text-xs text-gray-400">{day.date}</div>
              {entry && <span className={`mt-1 text-xs px-1.5 py-0.5 rounded-full font-semibold ${statusColor(entry.status)}`}>{entry.status}</span>}
            </div>
          );
        })}
      </div>

      {/* Entries for this week */}
      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Project</th>
              <th className="px-4 py-2 text-left">Client</th>
              <th className="px-4 py-2 text-center w-28">Hours</th>
              <th className="px-4 py-2 text-center">Status</th>
              <th className="px-4 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {weekDays.filter(d => entryMap[d.dateKey]).length === 0 ? (
              <tr><td colSpan={6} className="text-center py-6 text-gray-400">No entries for this week</td></tr>
            ) : weekDays.filter(d => entryMap[d.dateKey]).map(day => (
              <EntryRow key={day.dateKey} entry={entryMap[day.dateKey]} authHeaders={authHeaders} onUpdated={onUpdated} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EntryRow({ entry, authHeaders, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [hours, setHours] = useState(entry.hours);

  const saveHours = async () => {
    await fetch(`/api/admin/timesheets/entry/${entry.id}`, {
      method: "PATCH", headers: authHeaders(),
      body: JSON.stringify({ hours }),
    });
    setEditing(false);
    onUpdated();
  };

  const setStatus = async (status) => {
    await fetch(`/api/admin/timesheets/entry/${entry.id}`, {
      method: "PATCH", headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    onUpdated();
  };

  const statusColor = entry.status === 'Approved' ? 'bg-green-100 text-green-700'
    : entry.status === 'Rejected' ? 'bg-red-100 text-red-700'
      : 'bg-yellow-100 text-yellow-700';

  return (
    <tr className="odd:bg-white even:bg-gray-50">
      <td className="border px-3 py-2 font-medium">{entry.dateKey}</td>
      <td className="border px-3 py-2">{entry.project || '—'}</td>
      <td className="border px-3 py-2">{entry.client || '—'}</td>
      <td className="border px-3 py-2">{entry.type || '—'}</td>
      <td className="border px-3 py-2 text-center">
        {editing ? (
          <div className="flex items-center gap-1">
            <input type="number" className="border rounded px-1 py-0.5 w-16 text-sm" value={hours} onChange={e => setHours(e.target.value)} />
            <button className="text-green-600 font-bold text-xs" onClick={saveHours}>✓</button>
            <button className="text-gray-400 text-xs" onClick={() => { setEditing(false); setHours(entry.hours); }}>✕</button>
          </div>
        ) : (
          <span className="cursor-pointer hover:text-blue-600" onClick={() => setEditing(true)} title="Click to edit">{entry.hours}</span>
        )}
      </td>
      <td className="border px-3 py-2 text-center">
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>{entry.status}</span>
      </td>
      <td className="border px-3 py-2 text-center">
        <div className="flex gap-1 justify-center">
          {entry.status !== 'Approved' && (
            <button onClick={() => setStatus('Approved')} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200">Approve</button>
          )}
          {entry.status !== 'Rejected' && (
            <button onClick={() => setStatus('Rejected')} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200">Reject</button>
          )}
        </div>
      </td>
    </tr>
  );
}

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

export default function AdminTimesheet() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({ month: "", project: "", client: "", vendor: "" });
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [modalTab, setModalTab] = useState("month");
  const [employeesData, setEmployeesData] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [editHours, setEditHours] = useState("");
  const [empEntries, setEmpEntries] = useState([]);
  const isAdmin = useLocation().pathname.startsWith('/admin');
  const Typography = isAdmin ? AdminTypography : EmpTypography;

  const fetchTimesheetData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/timesheets", { headers: authHeaders() });
      const data = await res.json();
      setEmployeesData(data.employees || []);
    } catch { }
  }, []);

  useEffect(() => { fetchTimesheetData(); }, [fetchTimesheetData]);

  const handleApprove = async (emp) => {
    await fetch(`/api/admin/timesheets/${emp.id}/approve`, { method: "POST", headers: authHeaders() });
    setSelectedEmp(prev => prev ? { ...prev, status: "Approved" } : null);
    fetchTimesheetData();
  };

  const handleReject = async (emp) => {
    await fetch(`/api/admin/timesheets/${emp.id}/reject`, { method: "POST", headers: authHeaders() });
    setSelectedEmp(prev => prev ? { ...prev, status: "Rejected" } : null);
    fetchTimesheetData();
  };

  const handleEditSave = async () => {
    await fetch(`/api/admin/timesheets/${selectedEmp.id}/edit`, {
      method: "PATCH", headers: authHeaders(),
      body: JSON.stringify({ hours: parseFloat(editHours) }),
    });
    setShowEditModal(false);
    setEditHours("");
    fetchTimesheetData();
  };

  const openEmployee = async (emp) => {
    setSelectedEmp(emp);
    setModalTab("day");
    try {
      const res = await fetch(`/api/admin/timesheets/${emp.id}/entries`, { headers: authHeaders() });
      const data = await res.json();
      setEmpEntries(data.entries || []);
    } catch { setEmpEntries([]); }
  };

  const handleCommentSave = async () => {
    await fetch(`/api/admin/timesheets/${selectedEmp.id}/comment`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ comment: commentText }),
    });
    setShowCommentModal(false);
    setCommentText("");
    fetchTimesheetData();
  };


  // Dummy breakdown data
  const monthData = [
    { week: 1, days: [8, 8, 8, 8, 8, 0, 0] },
    { week: 2, days: [8, 8, 8, 8, 8, 0, 0] },
    { week: 3, days: [8, 8, 8, 8, 8, 0, 0] },
    { week: 4, days: [8, 8, 8, 8, 8, 0, 0] },
  ];
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Filtered employees
  const filtered = employeesData.filter(e =>
    (!search || e.name.toLowerCase().includes(search.toLowerCase()) || e.project.toLowerCase().includes(search.toLowerCase()) || e.client.toLowerCase().includes(search.toLowerCase()) || e.vendor.toLowerCase().includes(search.toLowerCase())) &&
    (!filter.project || e.project === filter.project) &&
    (!filter.client || e.client === filter.client) &&
    (!filter.vendor || e.vendor === filter.vendor)
  );

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6 font-admin">
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-200">
        <Typography.label className="text-gray-900">Timesheet Dashboard</Typography.label>
        <Typography.button className="primary" onClick={fetchTimesheetData}>Refresh</Typography.button>
      </div>
      {/* Search & Filters */}
      <div className="flex flex-wrap gap-4 items-center my-4">
        <input
          type="text"
          placeholder="Search by employee, project, client, vendor..."
          className="px-4 py-2 border border-gray-300 rounded-full min-w-[260px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={filter.project} onChange={e => setFilter(f => ({ ...f, project: e.target.value }))}>
          <option value="">All Projects</option>
          {[...new Set(employeesData.map(e => e.project))].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={filter.client} onChange={e => setFilter(f => ({ ...f, client: e.target.value }))}>
          <option value="">All Clients</option>
          {[...new Set(employeesData.map(e => e.client))].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={filter.vendor} onChange={e => setFilter(f => ({ ...f, vendor: e.target.value }))}>
          <option value="">All Vendors</option>
          {[...new Set(employeesData.map(e => e.vendor))].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      {/* Timesheet Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 mb-4 text-gray-900">
          <thead>
            <tr className="bg-gray-50 text-gray-700">
              <th className="border-b border-gray-200 px-4 py-2 text-left">Employee</th>
              <th className="border-b border-gray-200 px-4 py-2 text-left">Project</th>
              <th className="border-b border-gray-200 px-4 py-2 text-left">Client</th>
              <th className="border-b border-gray-200 px-4 py-2 text-left">Vendor</th>
              <th className="border-b border-gray-200 px-4 py-2 text-left">Hours</th>
              <th className="border-b border-gray-200 px-4 py-2 text-left">Status</th>
              <th className="border-b border-gray-200 px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp, idx) => (
              <tr key={emp.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border-b border-gray-200 px-4 py-2 text-blue-700 font-medium cursor-pointer hover:underline" onClick={() => openEmployee(emp)}>{emp.name}</td>
                <td className="border-b border-gray-200 px-4 py-2">{emp.project}</td>
                <td className="border-b border-gray-200 px-4 py-2">{emp.client}</td>
                <td className="border-b border-gray-200 px-4 py-2">{emp.vendor}</td>
                <td className="border-b border-gray-200 px-4 py-2">{emp.hours}</td>
                <td className="border-b border-gray-200 px-4 py-2">{emp.status}</td>
                <td className="border-b border-gray-200 px-4 py-2 flex gap-2 justify-start">
                  <Typography.button variant="secondary" onClick={() => openEmployee(emp)} className="bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200">View</Typography.button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Employee Timesheet Modal */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white text-gray-900 rounded-lg shadow-lg w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button className="absolute top-2 right-2 text-2xl text-gray-400 hover:text-gray-700" onClick={() => setSelectedEmp(null)}>×</button>
            <Typography.h2 className="mb-1 text-gray-900">Timesheet — {selectedEmp.name}</Typography.h2>
            <p className="text-sm text-gray-500 mb-4">Review and action individual entries below.</p>

            {/* Calendar view — same layout as employee side */}
            {empEntries.length === 0 ? (
              <p className="text-gray-400 text-sm py-6 text-center">No timesheet entries found.</p>
            ) : (
              <div className="mb-6">
                <AdminTimesheetView
                  entries={empEntries}
                  onAction={async (entryId, status, hours, comment) => {
                    const body = {};
                    if (status) body.status = status;
                    if (hours !== undefined) body.hours = hours;
                    if (comment !== undefined) body.adminComment = comment;
                    await fetch(`/api/admin/timesheets/entry/${entryId}`, {
                      method: "PATCH", headers: authHeaders(),
                      body: JSON.stringify(body),
                    });
                    const res = await fetch(`/api/admin/timesheets/${selectedEmp.id}/entries`, { headers: authHeaders() });
                    const data = await res.json();
                    setEmpEntries(data.entries || []);
                    fetchTimesheetData();
                  }}
                />
              </div>
            )}


          </div>
        </div>
      )}
    </div>
  );
}