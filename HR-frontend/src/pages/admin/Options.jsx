
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import AdminSidebar from "../../components/admin/Admin_sidebar";
import { FaBuilding, FaHandshake, FaUsers, FaUserPlus, FaFileAlt, FaBriefcase, FaLaptop, FaCalendarAlt, FaFile, FaLifeRing, FaBullhorn, FaHandHolding, FaHandPaper, FaHandLizard, FaHandshakeSlash, FaRegHandshake, FaPaypal, FaPersonBooth } from "react-icons/fa";
import AdminTypography from "../../components/admin/AdminTypography";

const modules = [
  { label: "Recruiting", icon: <FaPersonBooth />, route: "/admin/recruiting" },
  { label: "Documents", icon: <FaFileAlt />, route: "/admin/documents" },
  { label: "Register", icon: <FaUserPlus />, route: "/admin/register" },
  { label: "Clients", icon: <FaUsers />, route: "/admin/clients" },
  { label: "Vendors", icon: <FaHandshake />, route: "/admin/vendors" },
  { label: "Prime Vendors", icon: <FaRegHandshake />, route: "/admin/prime-vendors" },
  { label: "Projects", icon: <FaBriefcase />, route: "/admin/projects" },
  { label: "Invoice", icon: <FaFile />, route: "/admin/invoice" },
  { label: "Payroll", icon: <FaPaypal />, route: "/admin/payroll" },
  { label: "Support Tickets", icon: <FaLifeRing />, route: "/admin/support-tickets" },
  { label: "Announcements", icon: <FaBullhorn />, route: "/admin/announcements" },
  { label: "Calendar", icon: <FaCalendarAlt />, route: "/admin/calendar" },
  // Hidden for Admin: Requires enhancement to support multiple users before it can be enabled in a future release.
  //{ label: "Assets", icon: <FaLaptop />, route: "/admin/assets" },
  //{ label: "Policies", icon: <FaFile />, route: "/admin/policies" },
  //{ label: "Department", icon: <FaBuilding />, route: "/admin/department" },
];

export default function AdminOptions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role && user.role.toLowerCase() === "admin";

  if (!isAdmin) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <AdminTypography.p className="text-xl text-red-600 font-semibold">Unauthorized: Admin access only</AdminTypography.p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8 bg-white min-h-screen">
      <AdminTypography.h1 className="mb-8">More Options:</AdminTypography.h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((mod) => (
          <div
            key={mod.label}
            className="flex flex-col items-center justify-center bg-gray-100 rounded-xl p-6 shadow-sm hover:bg-gray-200 hover:shadow-md transition cursor-pointer min-h-[120px] text-center outline-none focus:ring-2 focus:ring-blue-400"
            tabIndex={0}
            role="button"
            aria-label={`Go to ${mod.label}`}
            onClick={() => navigate(mod.route)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") navigate(mod.route); }}
          >
            <span className="w-8 h-8 mb-2 text-gray-500 text-3xl flex items-center justify-center">{mod.icon}</span>
            <AdminTypography.p className="text-lg font-medium text-gray-900">{mod.label}</AdminTypography.p>
          </div>
        ))}
      </div>
    </main>
  );
}