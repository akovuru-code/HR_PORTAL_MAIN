import { NavLink } from "react-router-dom";
import { FaChartBar, FaUserFriends, FaWallet, FaCog, FaQuestionCircle, FaDollarSign, FaAddressCard } from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import companyLogo from "../../assets/Company.png";

import { ROUTES } from "../../routes";
const adminLinks = [
  { to: "/admin/dashboard", label: "Dashboard", icon: <FaChartBar size={18} /> },
  { to: "/admin/employees", label: "Employees", icon: <FaUserFriends size={18} /> },
  { to: "/admin/timesheets", label: "Timesheets", icon: <FaDollarSign size={18} /> },
  { to: ROUTES.ONBOARDING, label: "Onboarding", icon: <FaAddressCard size={18} /> },
  { to: "/admin/more", label: "More", icon: <FaWallet size={18} /> },
];
const adminBottomLinks = [
  { to: "/admin/help", label: "Help", icon: <FaQuestionCircle size={18} /> },
  { to: "/admin/settings", label: "Settings", icon: <FaCog size={18} /> },
];
const adminOnboardingLinks = [
  { to: "/admin/onboarding/emp-personal-details", label: "Personal Details" },
];

const empLinks = [
  { to: "/employee/dashboard", label: "Dashboard", icon: <FaChartBar size={18} /> },
  { to: ROUTES.ONBOARDING, label: "Onboarding", icon: <FaAddressCard size={18} /> },
  { to: "/employee/payroll", label: "Payroll", icon: <FaDollarSign size={18} /> },
  { to: "/employee/timesheet", label: "Timesheet", icon: <FaWallet size={18} /> },
];
const empBottomLinks = [
  { to: "/employee/help", label: "Help", icon: <FaQuestionCircle size={18} /> },
  { to: "/employee/settings", label: "Settings", icon: <FaCog size={18} /> },
];

export default function Sidebar() {
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();
  const isEmp = role === "emp" || role === "employee";
  const mainLinks = isEmp ? empLinks : adminLinks;
  const bottomLinks = isEmp ? empBottomLinks : adminBottomLinks;
  const onboardingLinks = isEmp ? [] : adminOnboardingLinks;

  return (
    <aside className="w-60 p-6 bg-[#16282f] min-h-screen flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3 mb-10">
          <img src={companyLogo} alt="Company" className="w-10 h-10 rounded-full object-contain bg-white" />
          <span className="text-2xl font-bold text-white tracking-wide">Company</span>
        </div>
        <nav className="space-y-2">
          {mainLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded text-white font-medium transition ${isActive ? "bg-blue-600" : "hover:bg-[#22313f]"}`
              }
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>
        {!isEmp && (
          <div className="mt-8">
            <div className="text-xs text-gray-400 mb-2">Onboarding</div>
            <nav className="space-y-2">
              {onboardingLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2 rounded text-white font-medium transition ${isActive ? "bg-blue-600" : "hover:bg-[#22313f]"}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </div>
      <div className="mb-2">
        <nav className="space-y-2">
          {bottomLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded text-white font-medium transition ${isActive ? "bg-blue-600" : "hover:bg-[#22313f]"}`
              }
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
