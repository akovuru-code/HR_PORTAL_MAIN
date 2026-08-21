import React, { useEffect, useState } from "react";
import GreetingHeader from "../../src/components/admin/GreetingHeader";
import AlertsPanel from "../../src/components/admin/AlertsPanel";
import StatusCard from "../../src/components/admin/StatusCard";
import GraphPanel from "../../src/components/admin/GraphPanel";

// Dummy API fetchers (replace with real API calls)
const fetchSession = async () => ({ name: "Admin User" });
const fetchAlerts = async () => [
    "Tharun's EAD is expiring soon",
    "Risheek's Driver license is expiring soon",
    "XYZ's project is ending soon",
];
const fetchStatus = async () => ([
    { color: "from-purple-400 to-purple-600", percent: 85, label: "Training" },
    { color: "from-yellow-400 to-yellow-600", percent: 85, label: "On job" },
    { color: "from-cyan-400 to-cyan-600", percent: 92, label: "Waiting" },
]);
const fetchGrowth = async () => ({
    growth: 2568,
    percent: 2.1,
    data: {
        last7days: [2, 3, 2, 4, 3, 6, 5],
        lastWeek: [1, 2, 2, 3, 2, 4],
    },
});

function SidebarNav({ active }) {
    const nav = [
        { label: "Dashboard", icon: "📊", href: "/admin/dashboard" },
        { label: "Employees", icon: "👥", href: "/admin/employees" },
        { label: "Timesheet", icon: "⏱️", href: "/admin/timesheet" },
        { label: "Onboarding", icon: "📋", href: "/admin/onboarding" },
        { label: "More", icon: "➕", href: "/admin/more" },
        { label: "Help", icon: "❓", href: "/admin/help" },
        { label: "Settings", icon: "⚙️", href: "/admin/settings" },
    ];
    return (
        <aside className="bg-slate-900 text-white w-56 min-h-screen flex flex-col py-6 px-4">
            <div className="text-2xl font-bold mb-8 pl-2">Siritek</div>
            <nav className="flex-1">
                {nav.map((item) => (
                    <a
                        key={item.label}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 text-base font-medium transition-colors ${active === item.label ? "bg-slate-800 text-blue-400" : "hover:bg-slate-800 hover:text-blue-300"}`}
                    >
                        <span className="text-xl">{item.icon}</span> {item.label}
                    </a>
                ))}
            </nav>
            <div className="mt-auto flex flex-col gap-2 text-xs text-slate-400 pl-2">
                <div>Help</div>
                <div>Settings</div>
            </div>
        </aside>
    );
}

export default function AdminDashboard() {
    const [session, setSession] = useState({ name: "" });
    const [alerts, setAlerts] = useState([]);
    const [status, setStatus] = useState([]);
    const [growth, setGrowth] = useState({ growth: 0, percent: 0, data: { last7days: [], lastWeek: [] } });

    useEffect(() => {
        fetchSession().then(setSession);
        fetchAlerts().then(setAlerts);
        fetchStatus().then(setStatus);
        fetchGrowth().then(setGrowth);
    }, []);

    return (
        <div className="flex min-h-screen bg-gray-50">
            <SidebarNav active="Dashboard" />
            <main className="flex-1 p-10">
                <GreetingHeader name={session.name} />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main dashboard area */}
                    <div className="lg:col-span-2 flex flex-col gap-8">
                        <div className="bg-white border rounded-xl shadow-sm min-h-[180px] mb-2" />
                        <div className="flex flex-wrap gap-8 items-end">
                            <div className="flex flex-col gap-2">
                                <div className="text-sm text-gray-500 mb-1">Status</div>
                                <div className="flex gap-4">
                                    {status.map((s, i) => (
                                        <StatusCard key={i} {...s} />
                                    ))}
                                </div>
                                <div className="text-xs text-gray-400 mt-2">Complete Report about the Employees Status</div>
                            </div>
                            <GraphPanel growth={growth.growth} percent={growth.percent} data={growth.data} />
                        </div>
                    </div>
                    {/* Alerts panel */}
                    <div>
                        <AlertsPanel alerts={alerts} />
                    </div>
                </div>
            </main>
        </div>
    );
}
