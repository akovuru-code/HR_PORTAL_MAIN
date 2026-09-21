import React from "react";
import {
    FaChartBar,
    FaFileAlt,
    FaDollarSign,
    FaClock,
    FaChartLine,
    FaQuestionCircle,
    FaCog,
} from "react-icons/fa";
import { useLocation, NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const menuItems = [
    {
        label: "Dashboard",
        icon: <FaChartBar />,
        href: "/employee/dashboard",
    },
    {
        label: "My Details",
        icon: <FaFileAlt />,
        href: "/employee/onboarding",
    },
    {
        label: "Payroll",
        icon: <FaDollarSign />,
        href: "/employee/payroll",
    },
    {
        label: "Timesheet",
        icon: <FaClock />,
        href: "/employee/timesheet",
    },
    {
        label: "Performance Report",
        icon: <FaChartLine />,
        href: "/employee/performance-report",
    },
];

const bottomItems = [
    {
        label: "Help",
        icon: <FaQuestionCircle />,
        href: "/employee/help",
    },
    {
        label: "Settings",
        icon: <FaCog />,
        href: "/employee/settings",
    },
];

export default function EmpSidebar() {
    const { user } = useAuth();
    const location = useLocation();

    // ✅ Match both "emp" and "employee"
    const role = (user?.role || "").toLowerCase();
    const isEmp = role === "employee" || role === "emp";
    if (!isEmp) return null;

    return (
        <aside
            className="w-60 p-6 bg-[#16282f] min-h-screen flex flex-col justify-between"
            aria-label="Employee Sidebar"
        >
            {/* Top logo area */}
            <div>
                <div className="flex items-center gap-3 mb-10">
                    {/*<span className="bg-[#5a6ace] text-white font-bold rounded-full w-10 h-10 flex items-center justify-center text-lg">
                        {user?.name ? user.name[0].toUpperCase() : "E"}
                    </span>*/}
                    <span className="flex items-center gap-2 text-2xl font-bold text-white tracking-wide">
                        {/*<img src="/src/assets/Company.png" alt="Company" className="w-7 h-7" />*/}
                        Employee's Panel
                    </span>
                    {/* <span className="text-2xl font-bold text-white tracking-wide">Company</span> */}
                </div>

                {/* Main navigation */}
                <nav className="space-y-2">
                    {menuItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.href);
                        return (
                            <NavLink
                                key={item.label}
                                to={item.href}
                                className={({ isActive: navActive }) =>
                                    `flex items-center gap-3 px-4 py-2 rounded text-white font-medium transition ${isActive || navActive
                                        ? "bg-blue-600"
                                        : "hover:bg-[#22313f]"
                                    }`
                                }
                            >
                                {item.icon}
                                {item.label}
                            </NavLink>
                        );
                    })}
                </nav>
            </div>

            {/* Bottom links */}
            <div className="mb-2">
                <nav className="space-y-2">
                    {bottomItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.href);
                        return (
                            <NavLink
                                key={item.label}
                                to={item.href}
                                className={({ isActive: navActive }) =>
                                    `flex items-center gap-3 px-4 py-2 rounded text-white font-medium transition ${isActive || navActive
                                        ? "bg-blue-600"
                                        : "hover:bg-[#22313f]"
                                    }`
                                }
                            >
                                {item.icon}
                                {item.label}
                            </NavLink>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
}
