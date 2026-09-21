import React, { useState, useRef, useEffect } from "react";
import { FaUser, FaHome, FaCog, FaSignOutAlt, FaBuilding, FaUsers, FaChartBar } from "react-icons/fa";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import AdminSidebar from "./admin/Admin_sidebar";
import EmpSidebar from "./emp/Emp_sidebar";
import { ADMIN_FEATURE_VISIBILITY } from "../utils/adminFeatureVisibility";

const getInitials = (name = "", email = "") => {
    const source = String(name || email || "User").trim();
    const parts = source.split(" ");
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0]?.slice(0, 2)?.toUpperCase() || "US";
};


export default function CompanyLayout({ children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);
    const role = user?.role?.toLowerCase();
    const isAdmin = role === "admin";
    const [search, setSearch] = useState("");

    //Loading pages for search navigation
    const adminPages = [
        { name: "Dashboard", path: "/admin/dashboard" },
        { name: "Employees", path: "/admin/employees" },
        { name: "Projects", path: "/admin/projects" },
        { name: "Payroll", path: "/admin/payroll" },
        { name: "Timesheet", path: "/admin/timesheet" },
        { name: "Settings", path: "/admin/settings" },
        { name: "Help", path: "/admin/help" },
        { name: "Profile", path: "/admin/profile" },
        { name: "Clients", path: "/admin/clients" },
        { name: "Vendors", path: "/admin/vendors" },
        { name: "Prime Vendors", path: "/admin/prime-vendors" },
        { name: "Calendar", path: "/admin/calendar" },
        { name: "Announcements", path: "/admin/announcements" },
        { name: "Documents", path: "/admin/documents" },
        { name: "Bench & Opportunities", path: "/admin/recruiting" },
        { name: "Department", path: "/admin/department" },
        ...(ADMIN_FEATURE_VISIBILITY.supportTickets ? [{ name: "Support Tickets", path: "/admin/support-tickets" }] : []),
        { name: "Register", path: "/admin/register" },
        { name: "Company", path: "/company" },
    ];

    const employeePages = [
        { name: "Dashboard", path: "/employee/dashboard" },
        { name: "Projects", path: "/employee/projects" },
        { name: "Payroll", path: "/employee/payroll" },
        { name: "Profile", path: "/employee/profile" },
        { name: "Timesheet", path: "/employee/timesheet" },
        { name: "Help", path: "/employee/help" },
        { name: "Settings", path: "/employee/settings" },
        { name: "My Details", path: "/employee/onboarding" },
        { name: "Company", path: "/company" },
    ];

    const pages = isAdmin ? adminPages : employeePages;

    // Function to handle search navigation
    const handleSearch = () => {
        const page = pages.find((p) =>
            p.name.toLowerCase().includes(search.trim().toLowerCase())
        );

        if (page) {
            navigate(page.path);
            setSearch("");
        } else {
            alert("Page not found");
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setProfileOpen(false);
            }
        }
        if (profileOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [profileOpen]);

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    const goHome = () => navigate(isAdmin ? "/admin/dashboard" : "/employee/dashboard");
    const goProfile = () => navigate(isAdmin ? "/admin/profile" : "/employee/profile");
    const goSettings = () => navigate(isAdmin ? "/admin/settings" : "/employee/settings");
    const goEmployees = () => navigate("/admin/employees");
    const goCompany = () => navigate("/company");

    const closeProfile = (action) => {
        setProfileOpen(false);
        action();
    };

    return (
        <div className="flex h-screen bg-[#f5f6fa] text-gray-800 overflow-hidden">
            {role === "admin" ? <AdminSidebar /> : role === "employee" ? <EmpSidebar /> : null}
            <div className="flex-1 flex flex-col h-screen min-h-0">
                <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200 relative flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            className="bg-blue-100 hover:bg-gray-300 rounded-full p-2"
                            onClick={() => navigate(-1)}
                        >
                            <svg
                                width="24"
                                height="24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-gray-600"
                            >
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex-1 flex justify-center">
                        <input
                            type="text"
                            placeholder="Search pages"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-[400px] px-4 py-2 border border-blue-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                        />
                        <button
                            className="-ml-10 text-gray-400 hover:text-blue-600"
                            onClick={handleSearch}
                        >
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="9" cy="9" r="7" />
                                <path d="M16 16l-3.5-3.5" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative" ref={profileRef}>
                            <div
                                className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full cursor-pointer select-none"
                                onClick={() => setProfileOpen((value) => !value)}
                            >
                                {user?.profileImage ? (
                                    <img src={user.profileImage} alt="Profile" className="w-9 h-9 rounded-full object-cover" />
                                ) : (
                                    <span className="bg-[#e9edf4] text-[#1a3353] font-bold rounded-full px-2 py-1 text-xs border border-blue-300 flex items-center justify-center" style={{ width: 36, height: 36, fontSize: 18 }}>
                                        {getInitials(user?.name, user?.email)}
                                    </span>
                                )}
                                <span className="text-sm text-gray-700 font-medium">{user?.name || ""}</span>
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className={`ml-1 text-gray-400 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}><path d="M6 9l6-6M6 3v6h6" /></svg>
                            </div>
                            <div className={`absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border z-50 transition-all duration-200 ${profileOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"}`} style={{ minWidth: 320 }}>
                                <div className="bg-blue-200 h-20 rounded-t-xl w-full"></div>
                                <div className="flex flex-col items-center -mt-10 pb-4 px-8">
                                    {user?.profileImage ? (
                                        <img src={user.profileImage} alt="Profile" className="w-20 h-20 rounded-full border-2 border-white object-cover" />
                                    ) : (
                                        <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-3xl border-2 border-white">
                                            {getInitials(user?.name, user?.email)}
                                        </div>
                                    )}
                                    <span className="font-bold text-xl text-gray-900 mt-3 mb-1 text-center w-full truncate">{user?.name || ""}</span>
                                    <span className="text-gray-500 text-sm mb-2 text-center w-full truncate">{user?.email || ""}</span>
                                </div>
                                <div className="flex flex-col gap-1 px-4 pb-4">
                                    <button onClick={() => closeProfile(goHome)} className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-gray-800 hover:bg-blue-100 transition text-base">
                                        {isAdmin ? <FaChartBar className="text-lg" /> : <FaHome className="text-lg" />} {isAdmin ? "Dashboard" : "Home"}
                                    </button>
                                    {isAdmin ? (
                                        <button onClick={() => closeProfile(goEmployees)} className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-gray-800 hover:bg-blue-100 transition text-base">
                                            <FaUsers className="text-lg" /> Employees
                                        </button>
                                    ) : (
                                        <button onClick={() => closeProfile(goProfile)} className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-gray-800 hover:bg-blue-100 transition text-base">
                                            <FaUser className="text-lg" /> Profile
                                        </button>
                                    )}
                                    <button onClick={() => closeProfile(goSettings)} className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-gray-800 hover:bg-blue-100 transition text-base">
                                        <FaCog className="text-lg" /> Settings
                                    </button>
                                    <button onClick={() => closeProfile(goCompany)} className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-gray-800 hover:bg-blue-100 transition text-base">
                                        <FaBuilding className="text-lg" /> Company
                                    </button>
                                </div>
                                <div className="border-t px-4 py-3">
                                    <button className="flex items-center gap-3 text-red-600 hover:text-red-800 font-semibold py-2 w-full justify-center" onClick={handleSignOut}>
                                        <FaSignOutAlt className="text-lg" /> Sign Out
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex-1 p-8 overflow-auto min-h-0 scroll-smooth">
                    {children || <Outlet />}
                </div>
            </div>
        </div>
    );
}
