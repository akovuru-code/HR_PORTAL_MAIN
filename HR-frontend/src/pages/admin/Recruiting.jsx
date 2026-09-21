import React, { useState, useRef, useEffect } from "react";
import AdminTypography from "../../components/admin/AdminTypography";
import { confirmOrRequestDelete, requestOrUseAdminAction } from '../../utils/adminDeleteRequest';
import BenchCandidatesSection from '../../components/admin/BenchCandidatesSection';
import JobOpeningsSection from '../../components/admin/JobOpeningsSection';

// --- Helpers ---
const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const emptyRecruiter = () => ({
    name: "",
    phone_number: "",
    email: "",
    company: "",
});

const inputCls =
    "border border-gray-300 rounded px-3 py-2 w-full mt-1 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition";

// ============================================================
// Recruiter Modal (Add)
// ============================================================
function RecruiterModal({ open, onClose, onSave, initialData, isEdit, }) {
    const [form, setForm] = useState(initialData || emptyRecruiter());

    useEffect(() => {
        setForm(initialData || emptyRecruiter());
    }, [initialData, open]);
    const modalRef = useRef();

    useEffect(() => {
        const handleKey = (e) => { if (e.key === "Escape") onClose(); };
        if (open) document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [open, onClose]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
        };
        if (open) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    function handleChange(e) {
        const { name, value } = e.target;

        if (name === "phone_number") {
            // Allow empty value while typing
            if (value === "") {
                setForm((f) => ({ ...f, phone_number: "" }));
                return;
            }

            // Phone number must start with +
            if (!value.startsWith("+")) {
                return;
            }

            // Allow only + followed by digits
            const cleanedValue = "+" + value.slice(1).replace(/\D/g, "");

            // Maximum 15 digits after the + (E.164 international format)
            if (cleanedValue.length <= 16) {
                setForm((f) => ({
                    ...f,
                    phone_number: cleanedValue,
                }));
            }

            return;
        }

        setForm((f) => ({ ...f, [name]: value }));
    }
    function handleSubmit(e) {
        e.preventDefault();
        onSave(form);
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2">
            <div
                ref={modalRef}
                className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-xl relative overflow-y-auto max-h-[92vh]"
                role="dialog"
                aria-modal="true"
                aria-label="Add Recruiter"
            >
                <AdminTypography.button
                    className="absolute top-3 right-3 text-2xl text-gray-400 hover:text-gray-700 !min-w-0 px-2 py-0 border-0"
                    aria-label="Close modal"
                    onClick={onClose}
                >
                    ×
                </AdminTypography.button>
                <AdminTypography.h2 className="mb-6 text-gray-900"> {isEdit ? "Edit Recruiter" : "Add New Recruiter"}</AdminTypography.h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <AdminTypography.label htmlFor="rec-name">Staff Name *</AdminTypography.label>
                        <input
                            id="rec-name"
                            name="name"
                            type="text"
                            className={inputCls}
                            value={form.name}
                            onChange={handleChange}
                            required
                            placeholder="e.g. Jane Doe"
                        />
                    </div>

                    <div>
                        <AdminTypography.label htmlFor="rec-phone">Phone Number *</AdminTypography.label>
                        <input
                            id="rec-phone"
                            name="phone_number"
                            type="tel"
                            className={inputCls}
                            value={form.phone_number}
                            onChange={handleChange}
                            required
                            maxLength={15}
                            inputMode="tel"
                            pattern="^\+[0-9]{1,14}$"
                            title="Enter a valid international phone number with country code, e.g. +919876543210"
                            placeholder="e.g. +919876543210"
                        />
                    </div>

                    <div>
                        <AdminTypography.label htmlFor="rec-email">Email ID *</AdminTypography.label>
                        <input
                            id="rec-email"
                            name="email"
                            type="email"
                            className={inputCls}
                            value={form.email}
                            onChange={handleChange}
                            required
                            placeholder="e.g. jane.doe@company.com"
                        />
                    </div>

                    <div>
                        <AdminTypography.label htmlFor="rec-company">Company *</AdminTypography.label>
                        <input
                            id="rec-company"
                            name="company"
                            type="text"
                            className={inputCls}
                            value={form.company}
                            onChange={handleChange}
                            required
                            placeholder="e.g. Acme Corp"
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                        <AdminTypography.button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                        >
                            Cancel
                        </AdminTypography.button>
                        <AdminTypography.button
                            type="submit"
                            className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                        >
                            {isEdit ? "Save Changes" : "Add Recruiter"}
                        </AdminTypography.button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ============================================================
// Main AdminRecruiters Component
// ============================================================
// Retained for future restoration.  The former recruiter-management UI and
// its API integration are intentionally not deleted by this reorganization.
function LegacyRecruiterManagement() {
    const [recruiters, setRecruiters] = useState([]);
    const [search, setSearch] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterCompany, setFilterCompany] = useState("All");
    const [modalOpen, setModalOpen] = useState(false);
    const [editRecruiter, setEditRecruiter] = useState(null);
    const filterRef = useRef();

    useEffect(() => {
        fetchRecruiters();
    }, []);

    const fetchRecruiters = async () => {
        try {
            const res = await fetch("/api/recruiting", { headers: authHeaders() });
            const data = await res.json();
            setRecruiters(data.candidates || []);
        } catch (err) {
            console.error("Failed to fetch recruiting candidates:", err);
        }
    };

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

    // Unique companies list for the filter dropdown
    const uniqueCompanies = ["All", ...new Set(recruiters.map((r) => r.company))];

    // --- Filtering Logic ---
    const filteredRecruiters = recruiters.filter((r) => {
        const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
        const matchesCompany = filterCompany === "All" || r.company === filterCompany;
        return matchesSearch && matchesCompany;
    });

    async function handleSave(data) {
        try {
            if (editRecruiter) {
                const res = await fetch(
                    `/api/recruiting/${editRecruiter.id}`,
                    {
                        method: "PATCH",
                        headers: authHeaders(),
                        body: JSON.stringify(data),
                    }
                );

                const result = await res.json();

                if (res.ok && result.candidate) {
                    setRecruiters((prev) =>
                        prev.map((r) =>
                            r.id === editRecruiter.id
                                ? result.candidate
                                : r
                        )
                    );

                    setEditRecruiter(null);
                    setModalOpen(false);
                } else {
                    alert(result.error || "Failed to update recruiter.");
                }
            } else {
                const res = await fetch("/api/recruiting", {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify(data),
                });

                const result = await res.json();

                if (res.ok && result.candidate) {
                    setRecruiters((prev) => [
                        result.candidate,
                        ...prev,
                    ]);
                    setModalOpen(false);
                } else {
                    alert(result.error || "Failed to add recruiter.");
                }
            }
        } catch {
            alert("Failed to save recruiter.");
        }
    }


    async function handleEdit(recruiter) {
        if (!await requestOrUseAdminAction({ actionType: 'edit', resourceType: 'recruiting', resourceId: recruiter.id, resourceLabel: `recruiter ${recruiter.name}` })) return;
        if (
            window.confirm(
                `Edit recruiter "${recruiter.name}"?`
            )
        ) {
            setEditRecruiter(recruiter);
            setModalOpen(true);
        }
    }

    async function handleDelete(recruiter) {
        if (!await confirmOrRequestDelete({ resourceType: 'recruiting', resourceId: recruiter.id, resourceLabel: `recruiter ${recruiter.name}` })) return;
        try {
            const res = await fetch(`/api/recruiting/${recruiter.id}`, {
                method: "DELETE",
                headers: authHeaders(),
            });
            if (res.ok) {
                setRecruiters((prev) => prev.filter((r) => r.id !== recruiter.id));
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || "Failed to delete recruiter.");
            }
        } catch {
            alert("Failed to delete recruiter.");
        }
    }

    function handleClearFilters() {
        setFilterCompany("All");
        setSearch("");
    }

    const hasActiveFilters = filterCompany !== "All";

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* --- Page Header --- */}
            <div className="flex flex-wrap gap-4 items-center mb-6 justify-between">
                <AdminTypography.h2 className="text-gray-900">Recruiters</AdminTypography.h2>
                <div className="flex gap-2 flex-wrap items-center">
                    {/* Search by Name */}
                    <input
                        type="text"
                        placeholder="Search by name..."
                        className="px-4 py-2 border border-gray-300 rounded-full min-w-[200px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Search recruiters by name"
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
                        >
                            {hasActiveFilters ? "🔵 Filter" : "Filter"}
                        </AdminTypography.button>
                        {filterOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-20 p-4 space-y-3">
                                <AdminTypography.h4 className="text-gray-700 mb-1">Filter by Company</AdminTypography.h4>
                                <div>
                                    <select
                                        className="border border-gray-300 rounded px-3 py-2 w-full mt-1 text-sm"
                                        value={filterCompany}
                                        onChange={(e) => setFilterCompany(e.target.value)}
                                    >
                                        {uniqueCompanies.map((comp, idx) => (
                                            <option key={idx} value={comp}>
                                                {comp}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                    <button
                                        type="button"
                                        className="text-xs text-red-500 hover:underline"
                                        onClick={handleClearFilters}
                                    >
                                        Clear Filter
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

                    {/* Add Recruiter Button */}
                    <AdminTypography.button
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 border-blue-600"
                        onClick={() => {
                            setEditRecruiter(null);
                            setModalOpen(true);
                        }}
                    >
                        + Recruiter
                    </AdminTypography.button>
                </div>
            </div>

            {/* --- Results Summary --- */}
            <div className="mb-3 text-sm text-gray-500">
                {filteredRecruiters.length} recruiter{filteredRecruiters.length !== 1 ? "s" : ""} found
                {(hasActiveFilters || search) && (
                    <span className="ml-2 text-blue-600">
                        (active search/filters –{" "}
                        <button className="underline hover:text-blue-800" onClick={handleClearFilters}>
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
                            <th className="px-4 py-3 text-left font-semibold">Name</th>
                            <th className="px-4 py-3 text-left font-semibold">Phone Number</th>
                            <th className="px-4 py-3 text-left font-semibold">Email ID</th>
                            <th className="px-4 py-3 text-left font-semibold">Company</th>
                            <th className="px-4 py-3 text-center font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecruiters.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-12 text-gray-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-3xl">👥</span>
                                        <span>No recruiters found.</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredRecruiters.map((recruiter) => (
                                <tr key={recruiter.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                                    <td className="px-4 py-3 font-medium text-gray-900">{recruiter.name}</td>
                                    <td className="px-4 py-3 text-gray-600 ">{recruiter.phone_number}</td>
                                    <td className="px-4 py-3 text-gray-600">{recruiter.email}</td>
                                    <td className="px-4 py-3 text-gray-600">{recruiter.company}</td>
                                    <td className="px-4 py-3" text-center>
                                        <div className="flex justify-center gap-2">
                                            <AdminTypography.button
                                                className="px-2 py-1 text-sm bg-yellow-100 text-blue-800 rounded hover:bg-yellow-200"
                                                onClick={() => handleEdit(recruiter)}
                                                aria-label={`Edit ${recruiter.name}`}
                                            >
                                                ✎
                                            </AdminTypography.button>
                                            <AdminTypography.button
                                                className="px-2 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                                                onClick={() => handleDelete(recruiter)}
                                                aria-label={`Delete ${recruiter.name}`}
                                            >
                                                🗑️
                                            </AdminTypography.button >
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- Modal Component --- */}
            <RecruiterModal
                open={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setEditRecruiter(null);
                }}
                onSave={handleSave}
                initialData={editRecruiter}
                isEdit={!!editRecruiter}
            />
        </div>
    );
}

export default function Recruiting() {
    return (
        <main className="max-w-7xl mx-auto px-4 py-8">
            <AdminTypography.h1 className="mb-8">Bench & Opportunities</AdminTypography.h1>
            <BenchCandidatesSection />
            <div className="my-10 border-t border-gray-200" />
            <JobOpeningsSection />
        </main>
    );
}
