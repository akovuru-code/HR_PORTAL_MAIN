import React, { useState, useEffect, useCallback } from "react";
import AdminTypography from "../../components/admin/AdminTypography";

const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

export default function AdminAnnouncements() {
    // --- State Management ---
    const [announcements, setAnnouncements] = useState([]);
    const [activeTab, setActiveTab] = useState("announcements"); // "announcements", "scheduled", "earlier"

    // Form states
    const [message, setMessage] = useState("");
    const [audience, setAudience] = useState("All Users");
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleTime, setScheduleTime] = useState("");

    const handleScheduleDateChange = (e) => {
        const value = e.target.value;

        if (value) {
            const year = value.split("-")[0];

            // Allow only 4-digit year
            if (year.length > 4) {
                return;
            }
        }

        setScheduleDate(value);
    };

    const fetchAnnouncements = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/announcements", { headers: authHeaders() });
            const data = await res.json();
            setAnnouncements(data.announcements || []);
        } catch { }
    }, []);

    useEffect(() => {
        fetchAnnouncements();
        const interval = setInterval(fetchAnnouncements, 30000);
        return () => clearInterval(interval);
    }, [fetchAnnouncements]);

    const handlePost = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        if (isScheduling) {
            if (!scheduleDate || !scheduleTime) {
                alert("Please select both date and time.");
                return;
            }

            const year = scheduleDate.split("-")[0];

            if (year.length !== 4) {
                alert("Please enter a valid date with a 4-digit year.");
                return;
            }

            const scheduledDateTime = new Date(
                `${scheduleDate}T${scheduleTime}`
            ).toISOString();
            if (new Date(scheduledDateTime) <= new Date()) { alert("Scheduled time must be in the future."); return; }
            await fetch("/api/admin/announcements", {
                method: "POST", headers: authHeaders(),
                body: JSON.stringify({ message, audience, scheduledAt: scheduledDateTime }),
            });
            setScheduleDate(""); setScheduleTime(""); setIsScheduling(false);
        } else {
            await fetch("/api/admin/announcements", {
                method: "POST", headers: authHeaders(),
                body: JSON.stringify({ message, audience }),
            });
        }
        setMessage("");
        setActiveTab(isScheduling ? "scheduled" : "announcements");
        fetchAnnouncements();
    };

    const handleExpire = async (id) => {
        if (!window.confirm("Move this announcement to 'Earlier Announcements'?")) return;
        await fetch(`/api/admin/announcements/${id}/expire`, { method: "PATCH", headers: authHeaders() });
        fetchAnnouncements();
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this announcement permanently?")) return;
        await fetch(`/api/admin/announcements/${id}`, { method: "DELETE", headers: authHeaders() });
        fetchAnnouncements();
    };

    // --- Derived Data ---
    const activeAnnouncements = announcements.filter(a => a.status === "Posted");
    const scheduledAnnouncements = announcements.filter(a => a.status === "Scheduled");
    const earlierAnnouncements = announcements.filter(a => a.status === "Expired");

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-6">
                <AdminTypography.h2 className="text-gray-900">Announcements</AdminTypography.h2>
                <div className="text-sm text-gray-500 mt-1">
                    Create and manage announcements for the system dashboard.
                </div>
            </div>

            {/* --- Create Announcement Form --- */}
            <div className="bg-white border rounded-xl shadow-sm p-6 mb-8">
                <AdminTypography.h3 className="mb-4 text-blue-700 border-b border-blue-50 pb-2">
                    Create New Announcement
                </AdminTypography.h3>
                <form onSubmit={handlePost} className="space-y-4">
                    <div>
                        <AdminTypography.label htmlFor="message">Message *</AdminTypography.label>
                        <textarea
                            id="message"
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            rows={3}
                            placeholder="Type your announcement here..."
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 mt-1 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
                            required
                        />
                    </div>

                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                            <AdminTypography.label htmlFor="audience">Target Audience</AdminTypography.label>
                            <select
                                id="audience"
                                value={audience}
                                onChange={e => setAudience(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 mt-1 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                                <option value="All Users">All Users (Admins + Employees)</option>
                                <option value="Only Admin Users">Only Admin Users</option>
                                <option value="Only Employees">Only Employees</option>
                            </select>
                        </div>

                        {/* Scheduler Toggle & Pickers */}
                        <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2 mt-7">
                                <input
                                    type="checkbox"
                                    id="scheduleToggle"
                                    checked={isScheduling}
                                    onChange={e => setIsScheduling(e.target.checked)}
                                    className="cursor-pointer h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="scheduleToggle" className="cursor-pointer text-gray-700 font-medium">
                                    Schedule for later
                                </label>
                            </div>

                            {isScheduling && (
                                <div className="flex gap-3 mt-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                    <div className="flex-1">
                                        <AdminTypography.label htmlFor="scheduleDate" className="text-xs">Date</AdminTypography.label>
                                        <input
                                            type="date"
                                            id="scheduleDate"
                                            value={scheduleDate}
                                            onChange={handleScheduleDateChange}
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 mt-1 text-sm bg-white"
                                            max="9999-12-31"
                                            required={isScheduling}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <AdminTypography.label htmlFor="scheduleTime" className="text-xs">Time</AdminTypography.label>
                                        <input
                                            type="time"
                                            id="scheduleTime"
                                            value={scheduleTime}
                                            onChange={e => setScheduleTime(e.target.value)}
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 mt-1 text-sm bg-white"
                                            required={isScheduling}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <AdminTypography.button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow border-blue-600"
                        >
                            {isScheduling ? "Schedule Announcement" : "Post Now"}
                        </AdminTypography.button>
                    </div>
                </form>
            </div>

            {/* --- Tabs & Lists --- */}
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                {/* Tab Headers */}
                <div className="flex border-b border-gray-200 bg-gray-50">
                    <button
                        className={`px-6 py-3 font-medium text-sm flex-1 sm:flex-none text-center transition-colors ${activeTab === "announcements" ? "text-blue-700 bg-white border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"}`}
                        onClick={() => setActiveTab("announcements")}
                    >
                        Announcements
                    </button>
                    <button
                        className={`px-6 py-3 font-medium text-sm flex-1 sm:flex-none text-center transition-colors ${activeTab === "scheduled" ? "text-blue-700 bg-white border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"}`}
                        onClick={() => setActiveTab("scheduled")}
                    >
                        Scheduled
                    </button>
                    <button
                        className={`px-6 py-3 font-medium text-sm flex-1 sm:flex-none text-center transition-colors ${activeTab === "earlier" ? "text-blue-700 bg-white border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"}`}
                        onClick={() => setActiveTab("earlier")}
                    >
                        Earlier Announcements
                    </button>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {/* Active Announcements Tab */}
                    {activeTab === "announcements" && (
                        <div>
                            {activeAnnouncements.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <div className="text-4xl mb-2">📢</div>
                                    <p>No active announcements right now.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeAnnouncements.map(ann => (
                                        <div key={ann.id} className="border border-blue-100 bg-blue-50/30 p-5 rounded-lg flex flex-col md:flex-row md:items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">Posted</span>
                                                    <span className="text-xs text-gray-500">
                                                        Audience: <span className="font-semibold">{ann.audience}</span>
                                                    </span>
                                                </div>
                                                <p className="text-gray-900 whitespace-pre-wrap">{ann.message}</p>
                                                <div className="mt-3 text-xs text-gray-500">
                                                    Posted by {ann.createdBy} on {new Date(ann.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <AdminTypography.button
                                                    onClick={() => handleExpire(ann.id)}
                                                    className="px-3 py-1 bg-yellow-50 text-yellow-800 border-yellow-300 hover:bg-yellow-100 text-xs !min-w-0"
                                                    title="Move to Earlier Announcements"
                                                >
                                                    Mark as Expired
                                                </AdminTypography.button>
                                                <AdminTypography.button
                                                    onClick={() => handleDelete(ann.id)}
                                                    className="px-3 py-1 bg-red-50 text-red-700 border-red-300 hover:bg-red-100 text-xs !min-w-0"
                                                    title="Delete permanently"
                                                >
                                                    🗑
                                                </AdminTypography.button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Scheduled Tab */}
                    {activeTab === "scheduled" && (
                        <div>
                            {scheduledAnnouncements.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <div className="text-4xl mb-2">⏳</div>
                                    <p>No scheduled announcements.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {scheduledAnnouncements.map(ann => (
                                        <div key={ann.id} className="border border-purple-100 bg-purple-50/30 p-5 rounded-lg flex flex-col md:flex-row md:items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">Scheduled</span>
                                                    <span className="text-xs text-gray-500">
                                                        Audience: <span className="font-semibold">{ann.audience}</span>
                                                    </span>
                                                </div>
                                                <p className="text-gray-900 whitespace-pre-wrap">{ann.message}</p>
                                                <div className="mt-3 text-xs font-medium text-purple-700">
                                                    Will post on: {new Date(ann.scheduledAt).toLocaleString()}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Created by {ann.createdBy}
                                                </div>
                                            </div>
                                            <div>
                                                <AdminTypography.button
                                                    onClick={() => handleDelete(ann.id)}
                                                    className="px-3 py-1 bg-red-50 text-red-700 border-red-300 hover:bg-red-100 text-xs !min-w-0"
                                                >
                                                    Cancel / Delete
                                                </AdminTypography.button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Earlier Tab */}
                    {activeTab === "earlier" && (
                        <div>
                            {earlierAnnouncements.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <div className="text-4xl mb-2">🗄️</div>
                                    <p>No past announcements found.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {earlierAnnouncements.map(ann => (
                                        <div key={ann.id} className="border border-gray-200 bg-gray-50 p-5 rounded-lg flex flex-col md:flex-row md:items-start justify-between gap-4">
                                            <div className="flex-1 opacity-80">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-bold rounded-full">Expired</span>
                                                    <span className="text-xs text-gray-500">
                                                        Audience: <span className="font-semibold">{ann.audience}</span>
                                                    </span>
                                                </div>
                                                <p className="text-gray-700 whitespace-pre-wrap">{ann.message}</p>
                                                <div className="mt-3 text-xs text-gray-500">
                                                    Originally posted by {ann.createdBy} on {new Date(ann.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                            <div>
                                                <AdminTypography.button
                                                    onClick={() => handleDelete(ann.id)}
                                                    className="px-3 py-1 bg-red-50 text-red-700 border-red-300 hover:bg-red-100 text-xs !min-w-0"
                                                >
                                                    Delete
                                                </AdminTypography.button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}