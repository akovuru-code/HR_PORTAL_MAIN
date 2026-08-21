import DashboardLayout from "../../Layouts/DashboardLayout";
import { FaUserPlus, FaSort, FaFilter, FaEllipsisV, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { useNavigate, useSearchParams } from "react-router-dom";
import React, { useState, useMemo, useRef, useEffect } from "react";
import AdminTypography from "../../components/admin/AdminTypography";
import { useAuth } from "../../hooks/useAuth";


const employees = []; // replaced by API

const parsePay = (pay) => parseInt((pay || "").replace(/[^\d]/g, ""), 10) || 0;
const parseDate = (d) => d ? new Date(d.split("-").reverse().join("-")) : null;

const formatDateForInput = (dateStr) => {
  if (!dateStr) return "";
  if (dateStr.includes("/")) {
    const [m, d, y] = dateStr.split("/");
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts[0].length === 4) return dateStr;
    if (parts[2].length === 4) return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  return dateStr.substring(0, 10);
};
const sortOptions = [
  { key: "name", label: "Name" },
  { key: "hired", label: "Hired Date" },
  { key: "terminateDate", label: "Terminate Date" },
  // Future Use { key: "paycheck", label: "Paycheck" },
];

export default function AdminEmpList() {
  const { user: authUser } = useAuth();
  const [employeeData, setEmployeeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editedTerminateDates, setEditedTerminateDates] = useState({});
  const [editedComments, setEditedComments] = useState({});

  const fetchEmployees = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/employees", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load employees");
      setEmployeeData(data.employees || []);
    } catch (err) {
      setEmployeeData([]);
      setLoadError(err.message || "Unable to load employees");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data
  useEffect(() => {
    fetchEmployees();
  }, []);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ firstName: "", lastName: "", email: "" });
  const [inviteStatus, setInviteStatus] = useState({ success: null, message: "" });
  const [sending, setSending] = useState(false);

  // const loginUrl = inviteForm.email ? `https://yourdomain.com/login?email=${encodeURIComponent(inviteForm.email)}` : "";

  function handleInviteInput(e) {
    const { name, value } = e.target;
    setInviteForm(f => ({ ...f, [name]: value }));
    setInviteStatus({ success: null, message: "" });
  }

  function validateInvite() {
    return (
      inviteForm.firstName.trim() &&
      inviteForm.lastName.trim() &&
      inviteForm.email.trim() &&
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inviteForm.email)
    );
  }

  // Handle Terminate Date Save
  const handleTerminateDateSave = async (employeeId) => {
    try {
      const token = localStorage.getItem("token");

      const empTerminateDate = editedTerminateDates[employeeId] || "";
      const empTerminateComments = editedComments[employeeId] || "";

      const res = await fetch(`/api/admin/employees/${employeeId}/terminate-date`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          empTerminateDate,
          empTerminateComments
        }),

      });

      if (!res.ok) throw new Error("Failed to update termination date");


      setEditedTerminateDates(prev => {
        const next = { ...prev };
        delete next[employeeId];
        return next;
      });

      setEditedComments(prev => {
        const next = { ...prev };
        delete next[employeeId];
        return next;
      });

      refreshData();

    } catch (err) {
      console.error(err);
    }
  };

  // Inside your component
  const [selectedCompany, setSelectedCompany] = useState("Siritek Inc");
  const [emailFrom, setEmailFrom] = useState("siri44@siritek.com");
  const [emailSubject, setEmailSubject] = useState("Welcome to Company");
  const [emailBody, setEmailBody] = useState("");

  // Prefill templates for different companies
  const companyTemplates = {
    "Siritek Inc": {
      from: "siri44@siritek.com",
      subject: "Welcome to Siritek Inc",
      body: "",
    },
    "Gannusoftware": {
      from: "accounts@gannusoftware.com",
      subject: "Welcome to Gannusoftware",
      body: "",
    },
    "Savvyinfosystems": {
      from: "accounts@savvyinfosystems.com",
      subject: "Welcome to Savvyinfosystems",
      body: "",
    },
    "Globalinfotech Inc": {
      from: "accounts@globalinfotechinc.net",
      subject: "Welcome to Globalinfotech Inc",
      body: "",
    },
  };

  // When company selection changes, auto-fill the email fields (but allow editing afterward)
  useEffect(() => {
    const tpl = companyTemplates[selectedCompany] || companyTemplates["Siritek Inc"];
    setEmailFrom(tpl.from);
    setEmailSubject(tpl.subject);
    setEmailBody(tpl.body);
  }, [selectedCompany]);

  async function sendInvitation() {
    if (!validateInvite()) {
      setInviteStatus({ success: false, message: "Please fill all fields with valid info." });
      return;
    }
    setSending(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          firstName: inviteForm.firstName,
          lastName: inviteForm.lastName,
          email: inviteForm.email,
          company: selectedCompany,
          emailFrom,
          emailSubject,
          emailBody,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setInviteStatus({ success: true, message: data.message });
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteForm({ firstName: "", lastName: "", email: "" });
        setInviteStatus({ success: null, message: "" });
      }, 1500);
    } catch (err) {
      setInviteStatus({ success: false, message: err.message });
    } finally {
      setSending(false);
    }
  }
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs = ["present", "left", "all", "pending"];
  const [filter, setFilter] = useState(() => {
    const tab = searchParams.get("tab");
    return validTabs.includes(tab) ? tab : "all";
  });
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({ title: "", visa: "", status: "" }); // Future Use: payMin: "", payMax: "" });
  const [showMenu, setShowMenu] = useState(false);
  const [visibleCols, setVisibleCols] = useState({
    name: true, title: true, hired: true, terminateDate: false, status: true, visa: true, location: true, client: true
  }); // Future use paycheck: true

  const menuRef = useRef();

  useEffect(() => {
    const tab = searchParams.get("tab");
    setFilter(validTabs.includes(tab) ? tab : "all");
  }, [searchParams]);

  // Filter options
  const allTitles = useMemo(() => Array.from(new Set(employeeData.map(e => e.title).filter(Boolean))), [employeeData]);
  const allVisas = useMemo(() => Array.from(new Set(employeeData.map(e => e.visa).filter(Boolean))), [employeeData]);
  const allStatuses = useMemo(() => Array.from(new Set(employeeData.map(e => e.status).filter(Boolean))), [employeeData]);
  /* Future Use
   const paychecks = useMemo(() => employeeData.map(e => parsePay(e.paycheck || "0")), [employeeData]);
   const minPay = paychecks.length ? Math.min(...paychecks) : 0;
   const maxPay = paychecks.length ? Math.max(...paychecks) : 0; */

  const hasTerminateDate = true;

  const allClients = useMemo(() => Array.from(new Set(employeeData.map(e => e.client).filter(c => c && c !== "—" && c !== ""))), [employeeData]);
  const filteredEmployees = useMemo(() => {
    let list = employeeData;
    const isFullyOnboarded = (emp) => {
      const tabs = emp.submittedTabs || {};
      const hasPersonal = !!tabs.personal;
      const hasOnboardDocs = !!tabs.onboardDocs;
      return (hasPersonal && hasOnboardDocs) || emp.onboardingStatus === "submitted" || emp.onboardingStatus === "approved";
    };

    if (filter === "present") {
      list = list.filter(emp => !emp.terminateDate && isFullyOnboarded(emp));
    }
    else if (filter === "left") {
      list = list.filter(emp => emp.terminateDate);
    }
    else if (filter === "pending") {
      list = list.filter(emp => !emp.terminateDate && !isFullyOnboarded(emp));
    }
    // Apply combinational filters
    if (filters.title) list = list.filter(emp => emp.title === filters.title);
    if (filters.visa) list = list.filter(emp => emp.visa === filters.visa);
    if (filters.status) list = list.filter(emp => emp.status === filters.status);
    /* Future Use
     if (filters.payMin) list = list.filter(emp => parsePay(emp.paycheck) >= parseInt(filters.payMin));
     if (filters.payMax) list = list.filter(emp => parsePay(emp.paycheck) <= parseInt(filters.payMax)); */
    return list;
  }, [filter, filters, employeeData]);

  // Sort employees
  const sortedEmployees = useMemo(() => {
    const arr = [...filteredEmployees];
    arr.sort((a, b) => {
      let v1, v2;
      switch (sortKey) {
        case "name":
          v1 = (a.name || "").toLowerCase(); v2 = (b.name || "").toLowerCase();
          break;
        case "hired":
          v1 = a.hired ? new Date(a.hired) : null;
          v2 = b.hired ? new Date(b.hired) : null;
          break;
        case "terminateDate":
          v1 = a.terminateDate ? new Date(a.terminateDate) : null;
          v2 = b.terminateDate ? new Date(b.terminateDate) : null;
          break;
        /* Future Use
         case "paycheck":
            v1 = parsePay(a.paycheck || "0"); v2 = parsePay(b.paycheck || "0");
            break; */
        default:
          v1 = a[sortKey]; v2 = b[sortKey];
      }
      if (v1 === null || v1 === undefined) return 1;
      if (v2 === null || v2 === undefined) return -1;
      if (v1 < v2) return sortDir === "asc" ? -1 : 1;
      if (v1 > v2) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filteredEmployees, sortKey, sortDir]);

  // Handlers
  const handleSortSelect = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setShowSort(false);
  };
  const handleFilterChange = (field, value) => {
    setFilters(f => ({ ...f, [field]: value }));
  };
  const selectTab = (nextTab) => {
    setFilter(nextTab);
    setSearchParams(nextTab === "all" ? {} : { tab: nextTab });
  };
  const handlePayRange = (type, value) => {
    setFilters(f => ({ ...f, [type]: value.replace(/[^\d]/g, "") }));
  };
  const clearFilters = () => setFilters({ title: "", visa: "", status: "" }); // Future Use: payMin: "", payMax: "" });

  // CSV Export
  function downloadCSV() {
    const cols = Object.keys(visibleCols).filter(k => visibleCols[k]);
    const header = cols.map(col => {
      if (col === "visa") return "Visa Type";
      //if (col === "paycheck") return "Paycheck";
      if (col === "hired") return "Hired Date";
      if (col === "terminateDate") return "Terminate Date";
      if (col === "status") return "Job Status";
      return col.charAt(0).toUpperCase() + col.slice(1);
    });
    const rows = sortedEmployees.map(emp =>
      cols.map(col => emp[col] || "-").join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function refreshData() {
    fetchEmployees();
  }

  // Reset Filters and Sort
  function resetAll() {
    setFilters({ title: "", visa: "", status: "" }); // Future Use: payMin: "", payMax: "" });
    setSortKey("name");
    setSortDir("asc");
    selectTab("all");
  }

  // Print Table
  function printTable() {
    window.print();
    <div className="mb-2">
      <AdminTypography.label className="block text-xs font-semibold mb-1">Client</AdminTypography.label>
      <select className="w-full border rounded px-2 py-1" value={filters.client || ""} onChange={e => handleFilterChange("client", e.target.value)}>
        <option value="">All</option>
        {allClients.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  }

  // Column Visibility Toggle
  function toggleCol(col) {
    setVisibleCols(cols => ({ ...cols, [col]: !cols[col] }));
  }

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    function handle(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showMenu]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center mt-2 mb-4">
        <div>
          <AdminTypography.h1>Employees</AdminTypography.h1>
          <AdminTypography.p className="mt-1">The list of all employees you can see here</AdminTypography.p>
        </div>
        <AdminTypography.button className="flex items-center gap-2 px-5 py-2 bg-white text-[#1a3353] font-semibold rounded-full shadow hover:bg-blue-100 transition" onClick={() => setShowInviteModal(true)}>
          <FaUserPlus /> New Employee
        </AdminTypography.button>
        {/* New Employee Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl border relative">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <AdminTypography.h2 className="text-xl font-semibold">Invite New Employee</AdminTypography.h2>
                  <AdminTypography.p className="text-sm text-gray-500">Create and send an invitation link to a new employee</AdminTypography.p>
                </div>
                <button className="text-blue-500 hover:text-blue-700 px-2 py-1 border rounded bg-white border-blue-200 bg-blue-50 transition" onClick={() => setShowInviteModal(false)} title="Close">✕</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: form inputs */}
                <div>
                  <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); sendInvitation(); }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <AdminTypography.label className="block mb-1">First Name</AdminTypography.label>
                        <input name="firstName" type="text" className="w-full border rounded px-3 py-2" value={inviteForm.firstName} onChange={handleInviteInput} required />
                      </div>
                      <div>
                        <AdminTypography.label className="block mb-1">Last Name</AdminTypography.label>
                        <input name="lastName" type="text" className="w-full border rounded px-3 py-2" value={inviteForm.lastName} onChange={handleInviteInput} required />
                      </div>
                    </div>

                    <div>
                      <AdminTypography.label className="block mb-1">Email</AdminTypography.label>
                      <input name="email" type="email" className="w-full border rounded px-3 py-2" value={inviteForm.email} onChange={handleInviteInput} required />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <AdminTypography.label className="block mb-1">Company</AdminTypography.label>
                        <select className="w-full border rounded px-3 py-2" value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}>
                          <option>Siritek Inc</option>
                          <option>Gannusoftware</option>
                          <option>Savvyinfosystems</option>
                          <option>Globalinfotech Inc</option>
                        </select>
                      </div>
                      {/* Future use 
                      <div>
                        <AdminTypography.label className="block mb-1">Login Link</AdminTypography.label>
                        <input type="text" className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-600" value={registrationUrl} readOnly />
                      </div> */}
                    </div>

                    <div className="flex flex-col gap-2 mt-4">
                      <AdminTypography.button type="submit" variant="primary" className="w-full sm:w-auto" disabled={sending || !validateInvite()}>
                        {sending ? "Sending..." : "Send Invitation"}
                      </AdminTypography.button>
                      {inviteStatus.message && (
                        <div className={`text-sm ${inviteStatus.success ? "text-green-600" : "text-red-600"}`}>{inviteStatus.message}</div>
                      )}
                    </div>
                  </form>
                </div>

                {/* Right: email preview / editable fields */}
                <div className="border-l pl-4">
                  <div className="mb-3">
                    <AdminTypography.label className="block mb-1">From</AdminTypography.label>
                    <input type="text" className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed" value={emailFrom} readOnly /> {/* onChange={e => setEmailFrom(e.target.value)} */}
                  </div>
                  <div className="mb-3">
                    <AdminTypography.label className="block mb-1">Subject</AdminTypography.label>
                    <input type="text" className="w-full border rounded px-3 py-2" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
                  </div>
                  <div>
                    <AdminTypography.label className="block mb-1">Body</AdminTypography.label>
                    <textarea className="w-full border rounded px-3 py-2 min-h-[160px]" placeholder="Welcome note with credentials will be populated automatically, enter only if any additional instructions needed." value={emailBody} onChange={e => setEmailBody(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2 mb-2">
        <AdminTypography.button
          className={`px-4 py-1 rounded border border-gray-400 font-medium ${filter === "present" ? "bg-blue-100 text-blue-900" : "bg-white"}`}
          onClick={() => selectTab("present")}
        >Present Employees</AdminTypography.button>
        <AdminTypography.button
          className={`px-4 py-1 rounded border border-gray-400 font-medium ${filter === "left" ? "bg-blue-100 text-blue-900" : "bg-white"}`}
          onClick={() => selectTab("left")}
        >Previous Employees</AdminTypography.button>
        <AdminTypography.button
          className={`px-4 py-1 rounded border border-gray-400 font-medium ${filter === "all" ? "bg-blue-100 text-blue-900" : "bg-white"}`}
          onClick={() => selectTab("all")}
        >All</AdminTypography.button>
        <AdminTypography.button
          className={`px-4 py-1 rounded border border-gray-400 font-medium ${filter === "pending" ? "bg-blue-100 text-blue-900" : "bg-white"}`}
          onClick={() => selectTab("pending")}
        >Pending Onboarding</AdminTypography.button>
      </div>
      <div className="flex justify-end gap-2 mb-2 relative">
        {/* Sort Dropdown */}
        <div className="relative">
          <AdminTypography.button onClick={() => setShowSort(s => !s)} className="flex items-center gap-1 px-3 py-1 border rounded bg-white text-gray-700 hover:bg-gray-100">
            <FaSort /> Sort <FaChevronDown className="ml-1" />
          </AdminTypography.button>
          {showSort && (
            <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow z-10">
              {sortOptions.map(opt => (
                <AdminTypography.button
                  key={opt.key}
                  className={`w-full text-left px-4 py-2 border rounded bg-white hover:bg-blue-50 flex items-center justify-between ${sortKey === opt.key ? "font-bold text-blue-700" : ""}`}
                  onClick={() => handleSortSelect(opt.key)}
                >
                  {opt.label}
                  {sortKey === opt.key && (sortDir === "asc" ? <FaChevronUp /> : <FaChevronDown />)}
                </AdminTypography.button>
              ))}
            </div>
          )}
        </div>
        {/* Filter Dropdown */}
        <div className="relative">
          <AdminTypography.button onClick={() => setShowFilter(f => !f)} className="flex items-center gap-1 px-3 py-1 border rounded bg-white text-gray-700 hover:bg-gray-100">
            <FaFilter /> Filters <FaChevronDown className="ml-1" />
          </AdminTypography.button>
          {showFilter && (
            <div className="absolute right-0 mt-2 w-72 bg-white border rounded shadow z-20 p-4">
              <div className="mb-2">
                <AdminTypography.label className="block text-xs font-semibold mb-1">Title</AdminTypography.label>
                <select className="w-full border rounded px-2 py-1" value={filters.title} onChange={e => handleFilterChange("title", e.target.value)}>
                  <option value="">All</option>
                  {allTitles.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="mb-2">
                <AdminTypography.label className="block text-xs font-semibold mb-1">Visa Type</AdminTypography.label>
                <select className="w-full border rounded px-2 py-1" value={filters.visa} onChange={e => handleFilterChange("visa", e.target.value)}>
                  <option value="">All</option>
                  {allVisas.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="mb-2">
                <AdminTypography.label className="block text-xs font-semibold mb-1">Job Status</AdminTypography.label>
                <select className="w-full border rounded px-2 py-1" value={filters.status} onChange={e => handleFilterChange("status", e.target.value)}>
                  <option value="">All</option>
                  {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {/* Future Use: Paycheck Filters 

              <div className="mb-2 flex gap-2 items-end">
                <div className="flex-1">
                  <AdminTypography.label className="block text-xs font-semibold mb-1">Paycheck Min</AdminTypography.label>
                  <input type="number" className="w-full border rounded px-2 py-1" min={minPay} max={maxPay} value={filters.payMin} onChange={e => handlePayRange("payMin", e.target.value)} placeholder={minPay} />
                </div>
                <div className="flex-1">
                  <AdminTypography.label className="block text-xs font-semibold mb-1">Paycheck Max</AdminTypography.label>
                  <input type="number" className="w-full border rounded px-2 py-1" min={minPay} max={maxPay} value={filters.payMax} onChange={e => handlePayRange("payMax", e.target.value)} placeholder={maxPay} />
                </div>
              </div>*/}
              <div className="flex justify-between mt-3">
                <AdminTypography.button className="text-xs text-blue-700 hover:underline" onClick={clearFilters}>Clear Filters</AdminTypography.button>
                <AdminTypography.button className="text-xs text-gray-600 hover:underline" onClick={() => setShowFilter(false)}>Close</AdminTypography.button>
              </div>
            </div>
          )}
        </div>
        {/* 3-dot Overflow Menu */}

        <div className="relative" ref={menuRef}>
          <AdminTypography.button onClick={() => setShowMenu(m => !m)} className="flex items-center gap-1 px-3 py-1 border rounded bg-white text-gray-700 hover:bg-gray-100">
            <FaEllipsisV />
          </AdminTypography.button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border rounded shadow z-30 p-2">
              <AdminTypography.button className="w-full text-left px-4 py-2 border rounded bg-white hover:bg-blue-50" onClick={() => { downloadCSV(); setShowMenu(false); }}>Export to CSV</AdminTypography.button>
              <AdminTypography.button className="w-full text-left px-4 py-2 border rounded bg-white hover:bg-blue-50" onClick={() => { refreshData(); setShowMenu(false); }}>Refresh Data</AdminTypography.button>
              <AdminTypography.button className="w-full text-left px-4 py-2 border rounded bg-white hover:bg-blue-50" onClick={() => { resetAll(); setShowMenu(false); }}>Reset Filters and Sort</AdminTypography.button>
              <AdminTypography.button className="w-full text-left px-4 py-2 border rounded bg-white hover:bg-blue-50" onClick={() => { printTable(); setShowMenu(false); }}>Print Table View</AdminTypography.button>
              <div className="border-t my-2" />
              <div className="px-4 py-2 text-xs font-semibold text-gray-500">Column Visibility</div>
              {Object.entries(visibleCols).map(([col, vis]) => (
                <AdminTypography.label key={col} className="flex items-center gap-2 px-4 py-1 text-sm cursor-pointer">
                  <input type="checkbox" checked={vis} onChange={() => toggleCol(col)} />
                  {col === "visa" ? "Visa Type" : col === "paycheck" ? "Paycheck" : col === "hired" ? "Hired Date" : col === "terminateDate" ? "Terminate Date" : col === "status" ? "Job Status" : col.charAt(0).toUpperCase() + col.slice(1)}
                </AdminTypography.label>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="w-full overflow-x-auto bg-white shadow-md rounded-lg max-h-full">
          <table className="w-full table-auto border border-gray-200">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                {visibleCols.name && <th className="px-4 py-2 border">Name</th>}
                {visibleCols.title && <th className="px-4 py-2 border">Title</th>}
                {visibleCols.hired && <th className="px-4 py-2 border">Hired Date</th>}
                {hasTerminateDate && visibleCols.terminateDate && <th className="px-4 py-2 border">Terminated Date</th>}
                {visibleCols.status && <th className="px-4 py-2 border">Job Status</th>}
                {visibleCols.visa && <th className="px-4 py-2 border">Visa Type</th>}
                {visibleCols.location && <th className="px-4 py-2 border">Location</th>}
                {visibleCols.client && <th className="px-4 py-2 border">Client</th>}
                {/* Future use: {visibleCols.paycheck && <th className="px-4 py-2 border">Paycheck</th>} */}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={Object.values(visibleCols).filter(Boolean).length}>Loading employees...</td></tr>
              ) : loadError ? (
                <tr><td className="px-4 py-6 text-center text-red-600" colSpan={Object.values(visibleCols).filter(Boolean).length}>{loadError}</td></tr>
              ) : sortedEmployees.length === 0 ? (
                <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={Object.values(visibleCols).filter(Boolean).length}>No employees found for this tab.</td></tr>
              ) : sortedEmployees.map((emp) => (
                <tr key={emp.id} className="text-center hover:bg-blue-50">
                  {visibleCols.name && <td className="px-4 py-2 border text-blue-700 font-medium cursor-pointer hover:underline" onClick={() => navigate(`/admin/employees/${emp.id}${filter === "all" ? "" : `?tab=${filter}`}`)}>{emp.name}</td>}
                  {visibleCols.title && <td className="px-4 py-2 border">{emp.title}</td>}
                  {visibleCols.hired && <td className="px-4 py-2 border">{emp.hired}</td>}
                  {hasTerminateDate && visibleCols.terminateDate && <td className="px-4 py-2 border">
                    <div className="flex items-center gap-2 justify-center">
                      <input
                        type="date"
                        value={editedTerminateDates[emp.id] !== undefined ? formatDateForInput(editedTerminateDates[emp.id]) : formatDateForInput(emp.terminateDate)}
                        onChange={(e) => {
                          const value = e.target.value; // yyyy-mm-dd
                          if (value) {
                            const [y, m, d] = value.split("-");
                            if (y.length <= 4) {
                              setEditedTerminateDates(prev => ({ ...prev, [emp.id]: `${m}/${d}/${y}` }));
                            }
                          } else {
                            setEditedTerminateDates(prev => ({ ...prev, [emp.id]: "" }));
                          }
                        }}

                        className="border rounded px-2 py-1 text-sm"
                      />
                      {(emp.terminateDate || editedTerminateDates[emp.id]) && (
                        <input
                          type="text"
                          placeholder="Reason for leaving"
                          value={
                            editedComments[emp.id] !== undefined
                              ? editedComments[emp.id]
                              : emp.empTerminateComments || ""
                          }
                          onChange={(e) =>
                            setEditedComments(prev => ({
                              ...prev,
                              [emp.id]: e.target.value
                            }))
                          }
                          className="border rounded px-2 py-1 text-sm w-48"
                        />
                      )}
                      {(editedTerminateDates[emp.id] !== undefined ||
                        editedComments[emp.id] !== undefined) && (
                          <button
                            onClick={() => handleTerminateDateSave(emp.id)}
                            className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                          >
                            Save
                          </button>
                        )}
                    </div>
                  </td>}
                  {visibleCols.status && <td className="px-4 py-2 border">{emp.status}</td>}
                  {visibleCols.visa && <td className="px-4 py-2 border">{emp.visa}</td>}
                  {visibleCols.location && <td className="px-4 py-2 border">{emp.location}</td>}
                  {visibleCols.client && <td className="px-4 py-2 border">{emp.client}</td>}
                  {/* Future use: {visibleCols.paycheck && <td className="px-4 py-2 border">{emp.paycheck}</td>} */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}