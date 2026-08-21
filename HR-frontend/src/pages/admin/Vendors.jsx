import React, { useState, useRef, useEffect } from "react";
import AdminTypography from "../../components/admin/AdminTypography";

const getLoggedInUser = () => {
    const stored = localStorage.getItem("user");
    const user = stored ? JSON.parse(stored) : null;
    return { fullName: user?.name || "Unknown User" };
};

const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

function VendorModal({ open, onClose, onSave, initialData, isEdit }) {
    const [dropdownItems, setDropdownItems] = useState({ client: [], primeVendor: [] });
    const [form, setForm] = useState(
        initialData || {
            name: "",
            status: "Active",
            startDate: "",
            endDate: "",
            contact: "",
            address: "",
            comment: "",
            client: { enabled: false, name: "", startDate: "", endDate: "" },
            primeVendor: { enabled: false, name: "", startDate: "", endDate: "" },
        }
    );
    const modalRef = useRef();

    useEffect(() => {
        setForm(
            initialData || {
                name: "",
                status: "Active",
                startDate: "",
                endDate: "",
                contact: "",
                address: "",
                comment: "",
                client: { enabled: false, name: "", startDate: "", endDate: "" },
                primeVendor: { enabled: false, name: "", startDate: "", endDate: "" },
            }
        );
    }, [initialData, open]);

    useEffect(() => {
        function handleKey(e) {
            if (e.key === "Escape") onClose();
        }
        if (open) document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [open, onClose]);

    function handleClickOutside(e) {
        if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    }

    useEffect(() => {
        if (open) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const loadDropdownItems = async () => {
            try {
                const [clientRes, primeVendorRes] = await Promise.all([
                    fetch("/api/admin/client-vendors?type=client", { headers: authHeaders() }),
                    fetch("/api/admin/client-vendors?type=primeVendor", { headers: authHeaders() }),
                ]);

                const [clientData, primeVendorData] = await Promise.all([
                    clientRes.json().catch(() => ({ items: [] })),
                    primeVendorRes.json().catch(() => ({ items: [] })),
                ]);

                setDropdownItems({
                    client: clientData.items || [],
                    primeVendor: primeVendorData.items || [],
                });
            } catch {
                setDropdownItems({ client: [], primeVendor: [] });
            }
        };

        loadDropdownItems();
    }, [open]);

    function handleChange(e) {
        const { name, value, type, checked } = e.target;
        if (type === "date" && value) {
            const year = value.split("-")[0];

            if (year.length > 4) {
                return;
            }
        }
        if (name === "contact") {
            // Allow only a leading "+" and digits (strips letters/symbols as user types)
            let cleaned = value.replace(/[^\d+]/g, "");
            cleaned = cleaned.replace(/(?!^)\+/g, ""); // only one leading +
            if (cleaned.length > 15) cleaned = cleaned.slice(0, 15); // + up to 4-digit code + 10 digits
            setForm((f) => ({ ...f, contact: cleaned }));
        } else if (name === "clientEnabled") {
            setForm((f) => ({
                ...f,
                client: checked
                    ? { ...f.client, enabled: true }
                    : { ...f.client, enabled: false, name: "", startDate: "", endDate: "" }
            }));
        } else if (name.startsWith("client.")) {
            const field = name.split(".")[1];
            setForm((f) => ({ ...f, client: { ...f.client, [field]: value } }));
        } else if (name === "primeVendorEnabled") {
            setForm((f) => ({
                ...f,
                primeVendor: checked
                    ? { ...f.primeVendor, enabled: true }
                    : { ...f.primeVendor, enabled: false, name: "", startDate: "", endDate: "" }
            }));
        } else if (name.startsWith("primeVendor.")) {
            const field = name.split(".")[1];
            setForm((f) => ({ ...f, primeVendor: { ...f.primeVendor, [field]: value } }));
        } else {
            setForm((f) => ({ ...f, [name]: value }));
        }
    }

    function handleSubmit(e) {
        e.preventDefault();
        // If provided, contact must be country code + exactly 10 digit number, e.g. +919876543210
        const contactPattern = /^\+[1-9]\d{0,3}\d{10}$/;
        if (form.contact && !contactPattern.test(form.contact)) {
            alert("Please enter a valid contact number with country code, followed by exactly 10 digits (e.g. +919876543210).");
            return;
        }
        let status = form.status;
        if (form.endDate) {
            const today = new Date();
            const end = new Date(form.endDate);
            if (end < today) status = "Inactive";
        }
        const user = getLoggedInUser();
        const userMeta = isEdit
            ? { updatedBy: user.fullName }
            : { createdBy: user.fullName };
        onSave({ ...form, status, ...userMeta });
    }

    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div ref={modalRef} className="bg-white rounded-lg shadow-lg p-8 w-full max-w-3xl md:max-w-4xl relative overflow-y-auto max-h-[90vh]">
                <AdminTypography.button
                    className="absolute top-2 right-2 text-2xl text-gray-400 hover:text-gray-700"
                    aria-label="Close modal"
                    onClick={onClose}
                >
                    ×
                </AdminTypography.button>
                <AdminTypography.h2 className="mb-6 text-gray-900">{initialData ? "Edit Vendor" : "Add Vendor"}</AdminTypography.h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <AdminTypography.label htmlFor="name">Vendor Name</AdminTypography.label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                                value={form.name}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <AdminTypography.label htmlFor="status">Status</AdminTypography.label>
                            <select
                                id="status"
                                name="status"
                                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                                value={form.status}
                                onChange={handleChange}
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                        <div>
                            <AdminTypography.label htmlFor="startDate">Start Date</AdminTypography.label>
                            <input
                                id="startDate"
                                name="startDate"
                                type="date"
                                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                                value={form.startDate}
                                onChange={handleChange}
                                max="9999-12-31"
                                required
                            />
                        </div>
                        <div>
                            <AdminTypography.label htmlFor="endDate">End Date</AdminTypography.label>
                            <input
                                id="endDate"
                                name="endDate"
                                type="date"
                                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                                value={form.endDate}
                                onChange={handleChange}
                                max="9999-12-31"
                            />
                        </div>
                        <div>
                            <AdminTypography.label htmlFor="members">No. of Members</AdminTypography.label>
                            <input
                                id="members"
                                name="members"
                                type="number"
                                min="1"
                                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                                value={form.members}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <AdminTypography.label htmlFor="contact">Contact Number</AdminTypography.label>
                            <input
                                id="contact"
                                name="contact"
                                type="text"
                                inputMode="tel"
                                maxLength={15}
                                placeholder="Contact number with country code"
                                title="Enter country code followed by a 10-digit number, e.g. +919876543210"
                                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                                value={form.contact}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <AdminTypography.label htmlFor="address">Address</AdminTypography.label>
                            <textarea
                                id="address"
                                name="address"
                                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                                value={form.address}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name="clientEnabled"
                                    checked={form.client?.enabled || false}
                                    onChange={handleChange}
                                />
                                <span className="text-gray-700">Client</span>
                            </label>
                            {form.client?.enabled && (
                                <div className="pl-4 mt-2 space-y-2">
                                    <AdminTypography.label htmlFor="client.name">Client Name</AdminTypography.label>
                                    <select
                                        id="client.name"
                                        name="client.name"
                                        className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                                        value={form.client.name}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Select Client</option>
                                        {dropdownItems.client.map((item) => (
                                            <option key={item.id} value={item.name}>
                                                {item.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <AdminTypography.label htmlFor="client.startDate">Client Start Date</AdminTypography.label>
                                            <input
                                                id="client.startDate"
                                                name="client.startDate"
                                                type="date"
                                                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                                                value={form.client.startDate}
                                                onChange={handleChange}
                                                max="9999-12-31"
                                                required
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <AdminTypography.label htmlFor="client.endDate">Client End Date</AdminTypography.label>
                                            <input
                                                id="client.endDate"
                                                name="client.endDate"
                                                type="date"
                                                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                                                value={form.client.endDate}
                                                onChange={handleChange}
                                                max="9999-12-31"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name="primeVendorEnabled"
                                    checked={form.primeVendor?.enabled || false}
                                    onChange={handleChange}
                                />
                                <span className="text-gray-700">Prime Vendor</span>
                            </label>
                            {form.primeVendor?.enabled && (
                                <div className="pl-4 mt-2 space-y-2">
                                    <AdminTypography.label htmlFor="primeVendor.name">Prime Vendor Name</AdminTypography.label>
                                    <select
                                        id="primeVendor.name"
                                        name="primeVendor.name"
                                        className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                                        value={form.primeVendor.name}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Select Prime Vendor</option>
                                        {dropdownItems.primeVendor.map((item) => (
                                            <option key={item.id} value={item.name}>
                                                {item.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <AdminTypography.label htmlFor="primeVendor.startDate">Prime Vendor Start Date</AdminTypography.label>
                                            <input
                                                id="primeVendor.startDate"
                                                name="primeVendor.startDate"
                                                type="date"
                                                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                                                value={form.primeVendor.startDate}
                                                onChange={handleChange}
                                                max="9999-12-31"
                                                required
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <AdminTypography.label htmlFor="primeVendor.endDate">Prime Vendor End Date</AdminTypography.label>
                                            <input
                                                id="primeVendor.endDate"
                                                name="primeVendor.endDate"
                                                type="date"
                                                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                                                value={form.primeVendor.endDate}
                                                onChange={handleChange}
                                                max="9999-12-31"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <AdminTypography.label htmlFor="comment">Comment</AdminTypography.label>
                        <textarea
                            id="comment"
                            name="comment"
                            className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                            value={form.comment}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <AdminTypography.button
                            type="button"
                            className="px-4 py-2 bg-gray-200 rounded"
                            onClick={onClose}
                        >
                            Cancel
                        </AdminTypography.button>
                        <AdminTypography.button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded"
                            aria-label={initialData ? "Save changes" : "Add vendor"}
                        >
                            Save
                        </AdminTypography.button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function AdminVendors() {
    const [vendors, setVendors] = useState([]);

    useEffect(() => {
        fetch("/api/admin/vendors", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => setVendors(d.vendors || []))
            .catch(() => { });
    }, []);

    const [allEmployees, setAllEmployees] = useState([]);
    useEffect(() => {
        fetch("/api/admin/employees", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => setAllEmployees((d.employees || []).filter((emp) => !emp.terminateDate)))
            .catch(() => { });
    }, []);

    async function refreshVendors(viewId) {
        try {
            const res = await fetch("/api/admin/vendors", { headers: authHeaders() });
            const data = await res.json();
            const list = data.vendors || [];
            setVendors(list);
            if (viewId != null) {
                const updated = list.find((v) => v.id === viewId);
                if (updated) setViewDetails(updated);
            }
        } catch { /* ignore */ }
    }

    async function handleAssignEmployee(vendor, employeeId) {
        try {
            const res = await fetch(`/api/admin/vendors/${vendor.id}/assign-employee`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({ employeeId }),
            });
            const data = await res.json();
            if (res.ok) {
                await refreshVendors(vendor.id);
            } else {
                alert(data.error || "Failed to assign employee.");
            }
        } catch {
            alert("Failed to assign employee.");
        }
    }

    async function handleUnassignEmployee(vendor, employeeId) {
        if (!window.confirm("Remove this employee from the list?")) return;
        try {
            const res = await fetch(`/api/admin/vendors/${vendor.id}/assign-employee/${employeeId}`, {
                method: "DELETE",
                headers: authHeaders(),
            });
            const data = await res.json();
            if (res.ok) {
                await refreshVendors(vendor.id);
            } else {
                alert(data.error || "Failed to remove employee.");
            }
        } catch {
            alert("Failed to remove employee.");
        }
    }

    const [search, setSearch] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [filter, setFilter] = useState("All");
    const [startDateFrom, setStartDateFrom] = useState("");
    const [startDateTo, setStartDateTo] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editVendor, setEditVendor] = useState(null);
    const [viewDetails, setViewDetails] = useState(null);

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
    // Filtered and searched vendors with dynamic status override
    const filteredVendors = vendors.filter((v) => {
        let displayStatus = v.status;
        if (v.endDate) {
            const today = new Date();
            const end = new Date(v.endDate);
            if (end < today) displayStatus = "Inactive";
        }
        const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filter === "All" || displayStatus === filter;
        const matchesStartFrom = !startDateFrom || (v.startDate && v.startDate >= startDateFrom);
        const matchesStartTo = !startDateTo || (v.startDate && v.startDate <= startDateTo);
        return matchesSearch && matchesStatus && matchesStartFrom && matchesStartTo;
    });

    function handleAdd() {
        setEditVendor(null);
        setModalOpen(true);
    }

    function handleEdit(vendor) {
        if (!vendor.editable) {
            alert("This vendor comes from employee-submitted data and cannot be edited here.");
            return;
        }
        if (window.confirm("Warning: Changing the vendor cannot be retrieved. Continue editing?")) {
            setEditVendor(vendor);
            setModalOpen(true);
        }
    }

    async function handleDelete(vendor) {
        if (!vendor.editable) {
            alert("This vendor comes from employee-submitted data and cannot be deleted here.");
            return;
        }
        if (!window.confirm(`Warning: Deleting vendor details cannot be retrieved. Delete vendor ${vendor.name}?`)) return;
        try {
            const res = await fetch(`/api/admin/vendors/${vendor.id}`, { method: "DELETE", headers: authHeaders() });
            if (res.ok) {
                setVendors((prev) => prev.filter((v) => v.id !== vendor.id));
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || "Failed to delete vendor.");
            }
        } catch {
            alert("Failed to delete vendor.");
        }
    }

    function handleViewDetails(vendor) {
        setViewDetails(vendor);
    }

    async function handleSave(vendor) {
        if (editVendor) {
            try {
                const res = await fetch(`/api/admin/vendors/${editVendor.id}`, {
                    method: "PATCH",
                    headers: authHeaders(),
                    body: JSON.stringify(vendor),
                });
                const data = await res.json();
                if (res.ok && data.vendor) {
                    setVendors((prev) => prev.map((v) => (v.id === editVendor.id ? { ...data.vendor, employees: editVendor.employees } : v)));
                } else {
                    alert(data.error || "Failed to update vendor.");
                }
            } catch {
                alert("Failed to update vendor.");
            }
        } else {
            try {
                const res = await fetch("/api/admin/vendors", {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify(vendor),
                });
                const data = await res.json();
                if (res.ok && data.vendor) {
                    setVendors((prev) => [...prev, data.vendor]);
                } else {
                    setVendors((prev) => [...prev, { ...vendor, id: Date.now(), createdBy: vendor.createdBy, employees: [] }]);
                }
            } catch {
                setVendors((prev) => [...prev, { ...vendor, id: Date.now(), createdBy: vendor.createdBy, employees: [] }]);
            }
        }
        setModalOpen(false);
        setEditVendor(null);
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-wrap gap-4 items-center mb-6 justify-between">
                <AdminTypography.label className="text-gray-900">Vendors</AdminTypography.label>
                <div className="flex gap-2 flex-wrap items-center">
                    <input
                        type="text"
                        placeholder="Search vendors..."
                        className="px-4 py-2 border border-gray-300 rounded-full min-w-[200px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        aria-label="Search vendors"
                    />
                    <div className="relative">
                        <AdminTypography.button
                            className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 border border-gray-300"
                            onClick={() => setFilterOpen((v) => !v)}
                            aria-haspopup="true"
                            aria-expanded={filterOpen}
                        >
                            Filter
                        </AdminTypography.button>
                        {filterOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4 space-y-3">
                                <div>
                                    <AdminTypography.label htmlFor="filter-status">Status</AdminTypography.label>
                                    <select
                                        id="filter-status"
                                        className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                                        value={filter}
                                        onChange={e => setFilter(e.target.value)}
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
                                        className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
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
                                        className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                                        value={startDateTo}
                                        onChange={handleFilterDateChange(setStartDateTo)}
                                        max="9999-12-31"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <AdminTypography.button
                                        type="button"
                                        className="px-3 py-1 bg-blue-600 text-white rounded"
                                        onClick={() => setFilterOpen(false)}
                                    >
                                        Close
                                    </AdminTypography.button>
                                </div>
                            </div>
                        )}
                    </div>
                    <AdminTypography.button
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={handleAdd}
                        aria-label="Add vendor"
                    >
                        + Vendor
                    </AdminTypography.button>
                </div>
            </div>
            <div className="overflow-x-auto bg-white border rounded-xl shadow-sm">
                <table className="min-w-full text-gray-900">
                    <thead>
                        <tr className="bg-gray-50 text-gray-700">
                            <th className="px-4 py-2 text-left">Vendor Name</th>
                            <th className="px-4 py-2 text-left">Status</th>
                            <th className="px-4 py-2 text-left">Start Date</th>
                            <th className="px-4 py-2 text-left">End Date</th>
                            <th className="px-4 py-2 text-left">Client</th>
                            <th className="px-4 py-2 text-left">Prime Vendor</th>
                            <th className="px-4 py-2 text-center">Actions</th>
                            <th className="px-4 py-2 text-left">View Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredVendors.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="text-center py-8 text-gray-400">No vendors found.</td>
                            </tr>
                        ) : (
                            filteredVendors.map((vendor) => {
                                let displayStatus = vendor.status;
                                if (vendor.endDate) {
                                    const today = new Date();
                                    const end = new Date(vendor.endDate);
                                    if (end < today) displayStatus = "Inactive";
                                }
                                return (
                                    <tr key={vendor.id} className="border-t border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-2">{vendor.name}</td>
                                        <td className="px-4 py-2">{displayStatus}</td>
                                        <td className="px-4 py-2">{vendor.startDate}</td>
                                        <td className="px-4 py-2">{vendor.endDate}</td>
                                        <td className="px-4 py-2">{vendor.client?.enabled ? vendor.client.name : "-"}</td>
                                        <td className="px-4 py-2">{vendor.primeVendor?.enabled ? vendor.primeVendor.name : "-"}</td>
                                        <td className="px-4 py-2 flex justify-center gap-2">
                                            <AdminTypography.button
                                                className="px-2 py-1 text-sm bg-yellow-100 text-blue-800 rounded hover:bg-yellow-200"
                                                onClick={() => handleEdit(vendor)}
                                                aria-label={`Edit ${vendor.name}`}
                                            >
                                                ✎
                                            </AdminTypography.button>
                                            <AdminTypography.button
                                                className="px-2 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                                                onClick={() => handleDelete(vendor)}
                                                aria-label={`Delete ${vendor.name}`}
                                            >
                                                🗑️
                                            </AdminTypography.button>
                                        </td>
                                        <td className="px-4 py-2">
                                            <AdminTypography.button
                                                className="px-3 py-1 bg-gray-100 text-blue-700 rounded hover:bg-blue-100 border border-blue-200"
                                                onClick={() => handleViewDetails(vendor)}
                                                aria-label={`View details for ${vendor.name}`}
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
            <VendorModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditVendor(null); }}
                onSave={handleSave}
                initialData={editVendor}
                isEdit={!!editVendor}
            />
            {viewDetails && (
                <ViewDetailsModal vendor={viewDetails} onClose={() => setViewDetails(null)} />
            )}
        </div>
    );

    // View Details Modal
    function ViewDetailsModal({ vendor, onClose }) {
        const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
        let displayStatus = vendor.status;
        if (vendor.endDate) {
            const today = new Date();
            const end = new Date(vendor.endDate);
            if (end < today) displayStatus = "Inactive";
        }
        return (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-3xl md:max-w-4xl relative overflow-y-auto max-h-screen">
                    <AdminTypography.button
                        className="absolute top-2 right-2 text-3xl text-gray-500 hover:text-gray-800 focus:outline-none"
                        aria-label="Close details modal"
                        tabIndex={0}
                        onClick={onClose}
                    >
                        ×
                    </AdminTypography.button>
                    <AdminTypography.h2 className="mb-6 text-gray-900">Vendor Details</AdminTypography.h2>
                    <div className="space-y-8">
                        {/* Vendor Info */}
                        <section>
                            <AdminTypography.h3 className="mb-2 text-blue-700">Vendor Information</AdminTypography.h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <AdminTypography.label>Vendor Name</AdminTypography.label>
                                    <AdminTypography.p className="text-gray-900">{vendor.name}</AdminTypography.p>
                                </div>
                                <div>
                                    <AdminTypography.label>Status</AdminTypography.label>
                                    <AdminTypography.p className="text-gray-900">{displayStatus}</AdminTypography.p>
                                </div>
                                <div>
                                    <AdminTypography.label>Start Date</AdminTypography.label>
                                    <AdminTypography.p className="text-gray-900">{vendor.startDate}</AdminTypography.p>
                                </div>
                                <div>
                                    <AdminTypography.label>End Date</AdminTypography.label>
                                    <AdminTypography.p className="text-gray-900">{vendor.endDate || '-'}</AdminTypography.p>
                                </div>
                                <div>
                                    <AdminTypography.label>No. of Members</AdminTypography.label>
                                    <AdminTypography.p className="text-gray-900">{vendor.members}</AdminTypography.p>
                                </div>
                                <div>
                                    <AdminTypography.label>Comment</AdminTypography.label>
                                    <AdminTypography.p className="text-gray-900">{vendor.comment || '-'}</AdminTypography.p>
                                </div>
                            </div>
                        </section>
                        {/* Contact Info */}
                        <section>
                            <AdminTypography.h3 className="mb-2 text-blue-700">Contact Information</AdminTypography.h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <AdminTypography.label>Contact Number</AdminTypography.label>
                                    <AdminTypography.p className="text-gray-900">{vendor.contact}</AdminTypography.p>
                                </div>
                                <div>
                                    <AdminTypography.label>Address</AdminTypography.label>
                                    <AdminTypography.p className="text-gray-900">{vendor.address}</AdminTypography.p>
                                </div>
                            </div>
                        </section>
                        {/* Client Info */}
                        {vendor.client?.enabled && (
                            <section>
                                <AdminTypography.h3 className="mb-2 text-blue-700">Client Information</AdminTypography.h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <AdminTypography.label>Client Name</AdminTypography.label>
                                        <AdminTypography.p className="text-gray-900">{vendor.client.name}</AdminTypography.p>
                                    </div>
                                    <div>
                                        <AdminTypography.label>Client Start Date</AdminTypography.label>
                                        <AdminTypography.p className="text-gray-900">{vendor.client.startDate}</AdminTypography.p>
                                    </div>
                                    <div>
                                        <AdminTypography.label>Client End Date</AdminTypography.label>
                                        <AdminTypography.p className="text-gray-900">{vendor.client.endDate || '-'}</AdminTypography.p>
                                    </div>
                                </div>
                            </section>
                        )}
                        {/* Prime Vendor Info */}
                        {vendor.primeVendor?.enabled && (
                            <section>
                                <AdminTypography.h3 className="mb-2 text-blue-700">Prime Vendor Information</AdminTypography.h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <AdminTypography.label>Prime Vendor Name</AdminTypography.label>
                                        <AdminTypography.p className="text-gray-900">{vendor.primeVendor.name}</AdminTypography.p>
                                    </div>
                                    <div>
                                        <AdminTypography.label>Prime Vendor Start Date</AdminTypography.label>
                                        <AdminTypography.p className="text-gray-900">{vendor.primeVendor.startDate}</AdminTypography.p>
                                    </div>
                                    <div>
                                        <AdminTypography.label>Prime Vendor End Date</AdminTypography.label>
                                        <AdminTypography.p className="text-gray-900">{vendor.primeVendor.endDate || '-'}</AdminTypography.p>
                                    </div>
                                </div>
                            </section>
                        )}
                        {/* Employees Info */}
                        <section>
                            <AdminTypography.h3 className="mb-2 text-blue-700">Employees Working with this Vendor</AdminTypography.h3>
                            {vendor.employees && vendor.employees.length > 0 ? (
                                <div className="max-h-48 overflow-y-auto border border-gray-100 rounded p-2 mb-3">
                                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                        {vendor.employees.map((emp) => (
                                            <li key={emp.employeeId} className="text-gray-900 truncate flex items-center gap-2">
                                                <span>• {emp.name}</span>
                                                {emp.removable && (
                                                    <button
                                                        type="button"
                                                        className="text-red-500 hover:text-red-700 text-xs"
                                                        onClick={() => handleUnassignEmployee(vendor, emp.employeeId)}
                                                        aria-label={`Remove ${emp.name}`}
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <AdminTypography.p className="text-gray-500 mb-3">No employees found.</AdminTypography.p>
                            )}
                            <div className="flex gap-2 items-center">
                                <select
                                    className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                                    value={selectedEmployeeId}
                                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                    aria-label="Select employee to assign"
                                >
                                    <option value="">Select employee to add...</option>
                                    {allEmployees
                                        .filter((emp) => !(vendor.employees || []).some((e) => e.employeeId === emp.id))
                                        .map((emp) => (
                                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                                        ))}
                                </select>
                                <AdminTypography.button
                                    type="button"
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
                                    disabled={!selectedEmployeeId}
                                    onClick={() => {
                                        handleAssignEmployee(vendor, selectedEmployeeId);
                                        setSelectedEmployeeId("");
                                    }}
                                >
                                    Add
                                </AdminTypography.button>
                            </div>
                        </section>
                        {/* User Info */}
                        <section>
                            <AdminTypography.h3 className="mb-2 text-blue-700">User Metadata</AdminTypography.h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <AdminTypography.label>Created By</AdminTypography.label>
                                    <AdminTypography.p className="text-gray-900">{vendor.createdBy || '-'}</AdminTypography.p>
                                </div>
                                {vendor.updatedBy && (
                                    <div>
                                        <AdminTypography.label>Updated By</AdminTypography.label>
                                        <AdminTypography.p className="text-gray-900">{vendor.updatedBy}</AdminTypography.p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        );
    }
}