import React, { useState, useRef, useEffect } from "react";
import AdminTypography from "../../components/admin/AdminTypography";
// --- Helpers ---
const authHeaders = () => {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};
const getLoggedInUser = () => {
  const stored = localStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : null;
  return { fullName: user?.name || "Unknown User" };
};
const computeStatus = (status, endDate) => {
  if (endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    if (end < today) return "Inactive";
  }
  return status;
};
const formatDate = (date) => date || "-";
// --- Empty Form Template ---
const emptyProject = () => ({
  name: "",
  status: "Active",
  startDate: "",
  endDate: "",
  members: 1,
  description: "",
  client: { enabled: false, name: "", startDate: "", endDate: "" },
  vendor: { enabled: false, name: "", startDate: "", endDate: "" },
  primeVendor: { enabled: false, name: "", startDate: "", endDate: "" },
});
// --- Input / Textarea helper styles ---
const inputCls =
  "border border-gray-300 rounded px-3 py-2 w-full mt-1 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition";
const checkboxSectionCls =
  "border border-gray-100 rounded-lg p-4 bg-gray-50 space-y-3";
// ============================================================
// Project Modal (Add / Edit)
// ============================================================
function ProjectModal({ open, onClose, onSave, initialData, isEdit }) {
  const [form, setForm] = useState(initialData || emptyProject());
  const modalRef = useRef();
  // Sync form when initialData / open changes
  useEffect(() => {
    setForm(initialData || emptyProject());
  }, [initialData, open]);
  // ESC to close
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);
  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);
  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    if (type === "date" && value) {
      const year = value.split("-")[0];

      if (year.length > 4) {
        return;
      }
    }
    if (name === "clientEnabled") {
      setForm((f) => ({ ...f, client: { ...f.client, enabled: checked } }));
    } else if (name.startsWith("client.")) {
      const field = name.split(".")[1];
      setForm((f) => ({ ...f, client: { ...f.client, [field]: value } }));
    } else if (name === "vendorEnabled") {
      setForm((f) => ({ ...f, vendor: { ...f.vendor, enabled: checked } }));
    } else if (name.startsWith("vendor.")) {
      const field = name.split(".")[1];
      setForm((f) => ({ ...f, vendor: { ...f.vendor, [field]: value } }));
    } else if (name === "primeVendorEnabled") {
      setForm((f) => ({ ...f, primeVendor: { ...f.primeVendor, enabled: checked } }));
    } else if (name.startsWith("primeVendor.")) {
      const field = name.split(".")[1];
      setForm((f) => ({ ...f, primeVendor: { ...f.primeVendor, [field]: value } }));
    } else if (name === "members") {
      setForm((f) => ({ ...f, members: Number(value) }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }
  function handleSubmit(e) {
    e.preventDefault();
    const status = computeStatus(form.status, form.endDate);
    const user = getLoggedInUser();
    const userMeta = isEdit
      ? { updatedBy: user.fullName }
      : { createdBy: user.fullName, updatedBy: "" };
    onSave({ ...form, status, ...userMeta });
  }
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2">
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-3xl md:max-w-4xl relative overflow-y-auto max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit Project" : "Add Project"}
      >
        {/* Close Button */}
        <AdminTypography.button
          className="absolute top-3 right-3 text-2xl text-gray-400 hover:text-gray-700 !min-w-0 px-2 py-0 border-0"
          aria-label="Close modal"
          onClick={onClose}
        >
          ×
        </AdminTypography.button>
        <AdminTypography.h2 className="mb-6 text-gray-900">
          {isEdit ? "Edit Project" : "Add Project"}
        </AdminTypography.h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* --- Core Fields --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <AdminTypography.label htmlFor="proj-name">Project Name *</AdminTypography.label>
              <input
                id="proj-name"
                name="name"
                type="text"
                className={inputCls}
                value={form.name}
                onChange={handleChange}
                required
                placeholder="e.g. HR Portal Revamp"
                aria-required="true"
              />
            </div>
            <div>
              <AdminTypography.label htmlFor="proj-status">Status</AdminTypography.label>
              <select
                id="proj-status"
                name="status"
                className={inputCls}
                value={form.status}
                onChange={handleChange}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <AdminTypography.label htmlFor="proj-startDate">Start Date *</AdminTypography.label>
              <input
                id="proj-startDate"
                name="startDate"
                type="date"
                className={inputCls}
                value={form.startDate}
                onChange={handleChange}
                max="9999-12-31"
                required
                aria-required="true"
              />
            </div>
            <div>
              <AdminTypography.label htmlFor="proj-endDate">End Date</AdminTypography.label>
              <input
                id="proj-endDate"
                name="endDate"
                type="date"
                className={inputCls}
                value={form.endDate}
                onChange={handleChange}
                max="9999-12-31"
              />
            </div>
            <div>
              <AdminTypography.label htmlFor="proj-members">No. of Members *</AdminTypography.label>
              <input
                id="proj-members"
                name="members"
                type="number"
                min="1"
                className={inputCls}
                value={form.members}
                onChange={handleChange}
                required
                aria-required="true"
              />
            </div>
          </div>
          <div>
            <AdminTypography.label htmlFor="proj-description">Description / Comment</AdminTypography.label>
            <textarea
              id="proj-description"
              name="description"
              rows={3}
              className={inputCls}
              value={form.description}
              onChange={handleChange}
              placeholder="Optional notes about this project..."
            />
          </div>
          {/* --- Optional Sections --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Client Toggle */}
            <div className={checkboxSectionCls}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="clientEnabled"
                  checked={form.client?.enabled || false}
                  onChange={handleChange}
                  aria-label="Enable Client"
                />
                <span className="font-semibold text-gray-700">Client</span>
              </label>
              {form.client?.enabled && (
                <div className="space-y-2 pt-1">
                  <div>
                    <AdminTypography.label htmlFor="client.name">Client Name *</AdminTypography.label>
                    <input
                      id="client.name"
                      name="client.name"
                      type="text"
                      className={inputCls}
                      value={form.client.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <AdminTypography.label htmlFor="client.startDate">Start Date *</AdminTypography.label>
                    <input
                      id="client.startDate"
                      name="client.startDate"
                      type="date"
                      className={inputCls}
                      value={form.client.startDate}
                      onChange={handleChange}
                      max="9999-12-31"
                      required
                    />
                  </div>
                  <div>
                    <AdminTypography.label htmlFor="client.endDate">End Date</AdminTypography.label>
                    <input
                      id="client.endDate"
                      name="client.endDate"
                      type="date"
                      className={inputCls}
                      value={form.client.endDate}
                      onChange={handleChange}
                      max="9999-12-31"
                    />
                  </div>
                </div>
              )}
            </div>
            {/* Vendor Toggle */}
            <div className={checkboxSectionCls}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="vendorEnabled"
                  checked={form.vendor?.enabled || false}
                  onChange={handleChange}
                  aria-label="Enable Vendor"
                />
                <span className="font-semibold text-gray-700">Vendor</span>
              </label>
              {form.vendor?.enabled && (
                <div className="space-y-2 pt-1">
                  <div>
                    <AdminTypography.label htmlFor="vendor.name">Vendor Name *</AdminTypography.label>
                    <input
                      id="vendor.name"
                      name="vendor.name"
                      type="text"
                      className={inputCls}
                      value={form.vendor.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <AdminTypography.label htmlFor="vendor.startDate">Start Date *</AdminTypography.label>
                    <input
                      id="vendor.startDate"
                      name="vendor.startDate"
                      type="date"
                      className={inputCls}
                      value={form.vendor.startDate}
                      onChange={handleChange}
                      max="9999-12-31"
                      required
                    />
                  </div>
                  <div>
                    <AdminTypography.label htmlFor="vendor.endDate">End Date</AdminTypography.label>
                    <input
                      id="vendor.endDate"
                      name="vendor.endDate"
                      type="date"
                      className={inputCls}
                      value={form.vendor.endDate}
                      onChange={handleChange}
                      max="9999-12-31"
                    />
                  </div>
                </div>
              )}
            </div>
            {/* Prime Vendor Toggle */}
            <div className={checkboxSectionCls}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="primeVendorEnabled"
                  checked={form.primeVendor?.enabled || false}
                  onChange={handleChange}
                  aria-label="Enable Prime Vendor"
                />
                <span className="font-semibold text-gray-700">Prime Vendor</span>
              </label>
              {form.primeVendor?.enabled && (
                <div className="space-y-2 pt-1">
                  <div>
                    <AdminTypography.label htmlFor="primeVendor.name">Prime Vendor Name *</AdminTypography.label>
                    <input
                      id="primeVendor.name"
                      name="primeVendor.name"
                      type="text"
                      className={inputCls}
                      value={form.primeVendor.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <AdminTypography.label htmlFor="primeVendor.startDate">Start Date *</AdminTypography.label>
                    <input
                      id="primeVendor.startDate"
                      name="primeVendor.startDate"
                      type="date"
                      className={inputCls}
                      value={form.primeVendor.startDate}
                      onChange={handleChange}
                      max="9999-12-31"
                      required
                    />
                  </div>
                  <div>
                    <AdminTypography.label htmlFor="primeVendor.endDate">End Date</AdminTypography.label>
                    <input
                      id="primeVendor.endDate"
                      name="primeVendor.endDate"
                      type="date"
                      className={inputCls}
                      value={form.primeVendor.endDate}
                      onChange={handleChange}
                      max="9999-12-31"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* --- Actions --- */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <AdminTypography.button
              type="button"
              variant="secondary"
              onClick={onClose}
              aria-label="Cancel"
            >
              Cancel
            </AdminTypography.button>
            <AdminTypography.button
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
              aria-label={isEdit ? "Save changes" : "Add project"}
            >
              {isEdit ? "Save Changes" : "Add Project"}
            </AdminTypography.button>
          </div>
        </form>
      </div>
    </div>
  );
}
// ============================================================
// View Details Modal
// ============================================================
function ViewDetailsModal({ project, onClose }) {
  const displayStatus = computeStatus(project.status, project.endDate);
  const modalRef = useRef();
  // ESC to close
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);
  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const Section = ({ title, children }) => (
    <section className="border border-gray-100 rounded-lg p-5 bg-gray-50">
      <AdminTypography.h3 className="mb-3 text-blue-700 border-b border-blue-100 pb-2">
        {title}
      </AdminTypography.h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </section>
  );
  const Field = ({ label, value }) => (
    <div>
      <AdminTypography.label>{label}</AdminTypography.label>
      <AdminTypography.p className="text-gray-900 mt-0.5">{value || "-"}</AdminTypography.p>
    </div>
  );
  const StatusBadge = ({ status }) => (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${status === "Active"
      ? "bg-green-100 text-green-700"
      : "bg-red-100 text-red-700"
      }`}>
      {status}
    </span>
  );
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2">
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-3xl md:max-w-4xl relative overflow-y-auto max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-label="Project Details"
      >
        <AdminTypography.button
          className="absolute top-3 right-3 text-2xl text-gray-400 hover:text-gray-700 !min-w-0 px-2 py-0 border-0"
          aria-label="Close details modal"
          onClick={onClose}
        >
          ×
        </AdminTypography.button>
        <AdminTypography.h2 className="mb-6 text-gray-900">Project Details</AdminTypography.h2>
        <div className="space-y-5">
          {/* Project Info */}
          <Section title="Project Information">
            <Field label="Project Name" value={project.name} />
            <div>
              <AdminTypography.label>Status</AdminTypography.label>
              <div className="mt-1"><StatusBadge status={displayStatus} /></div>
            </div>
            <Field label="Start Date" value={formatDate(project.startDate)} />
            <Field label="End Date" value={formatDate(project.endDate)} />
            <Field label="No. of Members" value={project.members?.toString()} />
            <Field label="Description" value={project.description} />
          </Section>
          {/* Client Info */}
          {project.client?.enabled && (
            <Section title="Client Information">
              <Field label="Client Name" value={project.client.name} />
              <Field label="Client Start Date" value={formatDate(project.client.startDate)} />
              <Field label="Client End Date" value={formatDate(project.client.endDate)} />
            </Section>
          )}
          {/* Vendor Info */}
          {project.vendor?.enabled && (
            <Section title="Vendor Information">
              <Field label="Vendor Name" value={project.vendor.name} />
              <Field label="Vendor Start Date" value={formatDate(project.vendor.startDate)} />
              <Field label="Vendor End Date" value={formatDate(project.vendor.endDate)} />
            </Section>
          )}
          {/* Prime Vendor Info */}
          {project.primeVendor?.enabled && (
            <Section title="Prime Vendor Information">
              <Field label="Prime Vendor Name" value={project.primeVendor.name} />
              <Field label="Prime Vendor Start Date" value={formatDate(project.primeVendor.startDate)} />
              <Field label="Prime Vendor End Date" value={formatDate(project.primeVendor.endDate)} />
            </Section>
          )}
          {/* Metadata */}
          <Section title="Metadata">
            <Field label="Created By" value={project.createdBy} />
            <Field label="Updated By" value={project.updatedBy} />
          </Section>
        </div>
        <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
          <AdminTypography.button
            variant="secondary"
            onClick={onClose}
            aria-label="Close"
          >
            Close
          </AdminTypography.button>
        </div>
      </div>
    </div>
  );
}
// ============================================================
// Status Badge (for table)
// ============================================================
function StatusBadge({ status }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${status === "Active"
      ? "bg-green-100 text-green-700"
      : "bg-red-100 text-red-700"
      }`}>
      {status}
    </span>
  );
}
// ============================================================
// Main AdminProjects Component
// ============================================================
export default function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [startDateFrom, setStartDateFrom] = useState("");
  const [startDateTo, setStartDateTo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [viewDetails, setViewDetails] = useState(null);
  const filterRef = useRef();

  function handleFilterDateChange(setDate) {
    return (e) => {
      const value = e.target.value;

      if (value) {
        const year = value.split("-")[0];

        // Allow only 4-digit years
        if (year.length > 4) {
          return;
        }
      }

      setDate(value);
    };
  }

  useEffect(() => {
    fetch("/api/admin/projects", { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
      .catch(() => { });
  }, []);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    };
    if (filterOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [filterOpen]);
  // --- Filtering Logic ---
  const filteredProjects = projects.filter((p) => {
    const displayStatus = computeStatus(p.status, p.endDate);
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "All" || displayStatus === filterStatus;
    const matchesFrom = !startDateFrom || (p.startDate && p.startDate >= startDateFrom);
    const matchesTo = !startDateTo || (p.startDate && p.startDate <= startDateTo);
    return matchesSearch && matchesStatus && matchesFrom && matchesTo;
  });
  // --- Handlers ---
  function handleAdd() {
    setEditProject(null);
    setModalOpen(true);
  }
  function handleEdit(project) {
    if (!project.editable) {
      alert("This project comes from active client data and cannot be edited here. Manage it from the Clients page.");
      return;
    }
    if (window.confirm("Warning: Changing the project details cannot be undone. Continue editing?")) {
      setEditProject(project);
      setModalOpen(true);
    }
  }
  async function handleDelete(project) {
    if (!project.editable) {
      alert("This project comes from active client data and cannot be deleted here. Manage it from the Clients page.");
      return;
    }
    if (!window.confirm(`Warning: Deleting project "${project.name}" cannot be undone. Proceed?`)) return;
    try {
      const res = await fetch(`/api/admin/projects/${project.id}`, { method: "DELETE", headers: authHeaders() });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== project.id));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete project.");
      }
    } catch {
      alert("Failed to delete project.");
    }
  }
  function handleViewDetails(project) {
    setViewDetails(project);
  }
  async function handleSave(data) {
    try {
      if (editProject) {
        const res = await fetch(`/api/admin/projects/${editProject.id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (res.ok && result.project) {
          setProjects((prev) => prev.map((p) => (p.id === editProject.id ? { ...result.project, employees: p.employees } : p)));
        } else {
          alert(result.error || "Failed to update project.");
          return;
        }
      } else {
        const res = await fetch("/api/admin/projects", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (res.ok && result.project) {
          setProjects((prev) => [...prev, result.project]);
        } else {
          alert(result.error || "Failed to add project.");
          return;
        }
      }
    } catch {
      alert("Failed to save project.");
      return;
    }
    setModalOpen(false);
    setEditProject(null);
  }
  function handleClearFilters() {
    setFilterStatus("All");
    setStartDateFrom("");
    setStartDateTo("");
  }
  const hasActiveFilters =
    filterStatus !== "All" || startDateFrom !== "" || startDateTo !== "";
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* --- Page Header --- */}
      <div className="flex flex-wrap gap-4 items-center mb-6 justify-between">
        <AdminTypography.h2 className="text-gray-900">Projects</AdminTypography.h2>
        <div className="flex gap-2 flex-wrap items-center">
          {/* Search */}
          <input
            type="text"
            placeholder="Search projects..."
            className="px-4 py-2 border border-gray-300 rounded-full min-w-[200px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search projects"
          />
          {/* Filter Dropdown */}
          <div className="relative" ref={filterRef}>
            <AdminTypography.button
              className={`px-4 py-2 rounded border text-sm ${hasActiveFilters
                ? "bg-blue-50 border-blue-400 text-blue-700"
                : "bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200"
                }`}
              onClick={() => setFilterOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={filterOpen}
              aria-label="Toggle filters"
            >
              {hasActiveFilters ? "🔵 Filter" : "Filter"}
            </AdminTypography.button>
            {filterOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-20 p-4 space-y-3">
                <AdminTypography.h4 className="text-gray-700 mb-1">Filter Projects</AdminTypography.h4>
                <div>
                  <AdminTypography.label htmlFor="filter-status">Status</AdminTypography.label>
                  <select
                    id="filter-status"
                    className="border border-gray-300 rounded px-3 py-2 w-full mt-1 text-sm"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="All">All</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <AdminTypography.label htmlFor="filter-start-from">Start Date From</AdminTypography.label>
                  <input
                    id="filter-start-from"
                    type="date"
                    className="border border-gray-300 rounded px-3 py-2 w-full mt-1 text-sm"
                    value={startDateFrom}
                    onChange={handleFilterDateChange(setStartDateFrom)}
                    max="9999-12-31"
                  />
                </div>
                <div>
                  <AdminTypography.label htmlFor="filter-start-to">Start Date To</AdminTypography.label>
                  <input
                    id="filter-start-to"
                    type="date"
                    className="border border-gray-300 rounded px-3 py-2 w-full mt-1 text-sm"
                    value={startDateTo}
                    onChange={handleFilterDateChange(setStartDateTo)}
                    max="9999-12-31"
                  />
                </div>
                <div className="flex justify-between items-center pt-1">
                  <button
                    type="button"
                    className="text-xs text-red-500 hover:underline"
                    onClick={handleClearFilters}
                  >
                    Clear Filters
                  </button>
                  <AdminTypography.button
                    type="button"
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                    onClick={() => setFilterOpen(false)}
                  >
                    Done
                  </AdminTypography.button>
                </div>
              </div>
            )}
          </div>
          {/* Add Project Button */}
          <AdminTypography.button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 border-blue-600"
            onClick={handleAdd}
            aria-label="Add new project"
          >
            + Project
          </AdminTypography.button>
        </div>
      </div>
      {/* --- Results Summary --- */}
      <div className="mb-3 text-sm text-gray-500">
        {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""} found
        {hasActiveFilters && (
          <span className="ml-2 text-blue-600">
            (filters active –{" "}
            <button
              className="underline hover:text-blue-800"
              onClick={handleClearFilters}
            >
              clear
            </button>
            )
          </span>
        )}
      </div>
      {/* --- Table --- */}
      <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl shadow-sm">
        <table className="min-w-full text-gray-900 text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
              <th className="px-4 py-3 text-left font-semibold">Project Name</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Start Date</th>
              <th className="px-4 py-3 text-left font-semibold">End Date</th>
              <th className="px-4 py-3 text-left font-semibold">Client</th>
              <th className="px-4 py-3 text-left font-semibold">Vendor</th>
              <th className="px-4 py-3 text-left font-semibold">Prime Vendor</th>
              <th className="px-4 py-3 text-center font-semibold">Members</th>
              <th className="px-4 py-3 text-center font-semibold">Actions</th>
              <th className="px-4 py-3 text-left font-semibold">Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">📂</span>
                    <span>No projects found.</span>
                    {hasActiveFilters && (
                      <button
                        className="text-blue-500 text-sm underline"
                        onClick={handleClearFilters}
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredProjects.map((project) => {
                const displayStatus = computeStatus(project.status, project.endDate);
                return (
                  <tr
                    key={project.id}
                    className="border-t border-gray-100 hover:bg-blue-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {project.name}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={displayStatus} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(project.startDate)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(project.endDate)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {project.client?.enabled ? project.client.name : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {project.vendor?.enabled ? project.vendor.name : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {project.primeVendor?.enabled ? project.primeVendor.name : "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 font-semibold">
                      {project.members ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <AdminTypography.button
                          className="px-2 py-1 text-xs bg-yellow-50 text-yellow-800 border-yellow-300 hover:bg-yellow-100 !min-w-0"
                          onClick={() => handleEdit(project)}
                          aria-label={`Edit ${project.name}`}
                          title="Edit Project"
                        >
                          ✎ Edit
                        </AdminTypography.button>
                        <AdminTypography.button
                          className="px-2 py-1 text-xs bg-red-50 text-red-700 border-red-300 hover:bg-red-100 !min-w-0"
                          onClick={() => handleDelete(project)}
                          aria-label={`Delete ${project.name}`}
                          title="Delete Project"
                        >
                          🗑 Delete
                        </AdminTypography.button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <AdminTypography.button
                        className="px-3 py-1 text-xs bg-gray-50 text-blue-700 border-blue-200 hover:bg-blue-50 !min-w-0"
                        onClick={() => handleViewDetails(project)}
                        aria-label={`View details for ${project.name}`}
                      >
                        View Details
                      </AdminTypography.button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* --- Add / Edit Modal --- */}
      <ProjectModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditProject(null); }}
        onSave={handleSave}
        initialData={editProject}
        isEdit={!!editProject}
      />
      {/* --- View Details Modal --- */}
      {viewDetails && (
        <ViewDetailsModal
          project={viewDetails}
          onClose={() => setViewDetails(null)}
        />
      )}
    </div>
  );
}