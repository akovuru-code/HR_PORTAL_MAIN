import React from "react";
import { FaChartBar, FaChartLine, FaUsers, FaClock, FaFileAlt, FaPlus, FaQuestionCircle, FaCog, FaCreditCard, FaFileInvoice } from "react-icons/fa";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from '../../hooks/useAuth';

const menuItems = [
    { label: "Dashboard", icon: <FaChartBar />, href: "/admin/dashboard" },
    { label: "Employees", icon: <FaUsers />, href: "/admin/employees", permission: 'employee:read' },
    { label: "Timesheet & Status Report", icon: <FaClock />, href: "/admin/timesheet", permission: 'timesheet:view' },
    { label: "Employee Performance Review", icon: <FaChartLine />, href: "/admin/employee-performance-reports", allowedAdminRoles: ['hr'] },
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
    const { isRootAdmin, permissions, user } = useAuth();
    const adminRole = String(user?.adminRole || user?.admin_role || '').toLowerCase();
    const billingActive = location.pathname.startsWith('/admin/options/payments') || location.pathname.startsWith('/admin/invoice');
    const canBill = isRootAdmin || permissions.includes('invoice:manage');
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
                {menuItems.filter(item => (
                    (isRootAdmin || (!item.rootOnly && (!item.allowedAdminRoles || item.allowedAdminRoles.includes(adminRole))))
                    && (isRootAdmin || !item.permission || permissions.includes(item.permission))
                )).map((item) => {
                    const isActive = location.pathname.startsWith(item.href);
                    return (<React.Fragment key={item.label}>
                        <Link
                            to={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 text-base font-medium transition-colors ${isActive ? "bg-slate-800 text-blue-400" : "hover:bg-slate-800 hover:text-blue-300"}`}
                            aria-current={isActive ? "page" : undefined}
                        >
                            <span className="text-xl">{item.icon}</span> {item.label}
                        </Link>
                        {item.label === 'Employees' && canBill && <div className="mb-1"><div className={`flex w-full items-center gap-3 px-3 py-2 text-base font-medium ${billingActive ? "text-blue-400" : "text-white"}`}><span className="text-xl"><FaCreditCard /></span> Billing</div><div className="ml-7 mt-1 flex flex-col gap-1"><Link to="/admin/options/payments" className={`rounded px-3 py-1.5 text-sm ${location.pathname.startsWith('/admin/options/payments') ? 'bg-slate-800 text-blue-400' : 'hover:bg-slate-800 hover:text-blue-300'}`}><FaCreditCard className="mr-2 inline" />Payments</Link><Link to="/admin/invoice" className={`rounded px-3 py-1.5 text-sm ${location.pathname.startsWith('/admin/invoice') ? 'bg-slate-800 text-blue-400' : 'hover:bg-slate-800 hover:text-blue-300'}`}><FaFileInvoice className="mr-2 inline" />Invoices</Link></div></div>}
                    </React.Fragment>);
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
