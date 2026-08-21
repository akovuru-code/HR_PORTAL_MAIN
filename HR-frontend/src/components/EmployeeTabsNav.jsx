import { NavLink } from "react-router-dom";

const tabs = [
  { id: "profile", label: "Profile" },
  { id: "timesheet", label: "Timesheet" },
  { id: "leave", label: "Leave" },
  { id: "projects", label: "Projects" },
];

export default function EmployeeTabsNav({ activeTab, onTabChange }) {
  const [selectedTab, setSelectedTab] = useState(activeTab || "profile");

  const handleTabClick = (tabId) => {
    setSelectedTab(tabId);
    onTabChange && onTabChange(tabId);
  };

  return (
    <div className="flex space-x-4 border-b border-gray-300 dark:border-gray-700 mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-t-md",
            selectedTab === tab.id
              ? "bg-white dark:bg-gray-900 text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
