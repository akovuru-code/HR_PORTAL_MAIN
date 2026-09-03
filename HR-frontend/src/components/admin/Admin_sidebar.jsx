import React from "react";
import { FaChartBar, FaUsers, FaClock, FaFileAlt, FaPlus, FaQuestionCircle, FaCog } from "react-icons/fa";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from '../../hooks/useAuth';

const menuItems = [
    { label: "Dashboard", icon: <FaChartBar />, href: "/admin/dashboard" },
    { label: "Employees", icon: <FaUsers />, href: "/admin/employees", permission: 'employee:read' },
    { label: "Timesheet", icon: <FaClock />, href: "/admin/timesheet", permission: 'timesheet:view' },
    /* Hidden for Admin: Currently supports only a single user's details. 
    Requires enhancement to support multiple users before it can be enabled in a future release. */
    // { label: "Onboarding", icon: <FaFileAlt />, href: "/admin/onboarding" },
    { label: "More", icon: <FaPlus />, href: "/admin/options" },
];

const bottomItems = [
    { label: "Help", icon: <FaQuestionCircle />, href: "/admin/help" },
    { label: "Settings", icon: <FaCog />, href: "/admin/settings" },
];

export default function AdminSidebar() {
    // If using react-router, use useLocation for active route
    const location = useLocation();
    const { isRootAdmin, permissions } = useAuth();
    return (
        <aside
            className="bg-[#0b1229] text-white w-56 min-h-screen flex flex-col py-6 px-4 font-sans"
            aria-label="Admin Sidebar"
        >
            <div className="flex items-center gap-2 text-2xl font-bold mb-8 pl-2">
                <img src="/src/assets/Company.png" alt="Company" className="w-7 h-7" />
                Admin Panel
            </div>
            <nav className="flex-1" aria-label="Main menu">
                {menuItems.filter(item => isRootAdmin || !item.permission || permissions.includes(item.permission)).map((item) => {
                    const isActive = location.pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.label}
                            to={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 text-base font-medium transition-colors ${isActive ? "bg-slate-800 text-blue-400" : "hover:bg-slate-800 hover:text-blue-300"}`}
                            aria-current={isActive ? "page" : undefined}
                        >
                            <span className="text-xl">{item.icon}</span> {item.label}
                        </Link>
                    );
                })}
            </nav>
            <div className="mt-auto flex flex-col gap-2 text-base font-medium">
                {bottomItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.label}
                            to={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive ? "bg-slate-800 text-blue-400" : "hover:bg-slate-800 hover:text-blue-300"}`}
                            aria-current={isActive ? "page" : undefined}
                        >
                            <span className="text-xl">{item.icon}</span> {item.label}
                        </Link>
                    );
                })}
            </div>
        </aside>
    );
}
