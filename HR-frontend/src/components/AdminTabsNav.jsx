import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/timesheet", label: "Timesheet" },
  { to: "/admin/onboarding", label: "Onboarding" },
  { to: "/admin/payroll", label: "Payroll" },
  { to: "/admin/options", label: "More" },
  { to: "/admin/projects", label: "Projects" },
  { to: "/admin/profile", label: "Profile" }
];

export default function AdminTabsNav() {
  return (
    <div className="flex space-x-4">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `px-3 py-2 rounded-md text-sm font-medium ${
              isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}

