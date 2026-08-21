import { NavLink } from "react-router-dom";

const links = [
  { to: "/admin/dashboard", label: "Admin" },
  { to: "/employee/dashboard", label: "Employee" },
  { to: "/onboarding/EmpPersonalDetails", label: "Onboarding Doc" },
];

export default function Sidebar() {
  return (
    <aside className="w-60 p-4 bg-gray-100 dark:bg-gray-800">
      <h2 className="text-lg font-bold mb-6">HR Portal</h2>
      <nav className="space-y-2">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `block px-3 py-2 rounded ${isActive ? "bg-blue-600 text-white" : "hover:bg-gray-200 dark:hover:bg-gray-700"}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}