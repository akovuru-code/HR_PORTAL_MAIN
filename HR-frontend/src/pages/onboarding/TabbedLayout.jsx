import React, { useState, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
//import EmpLayout from '../../emp/EmpLayout';
import EmpPersonalDetails from "./EmpPersonalDetails";
import WorkClient from "./WorkClient";
import Education from "./Education";
import ProfileWork from "./ProfileWork";
import Skills from "./Skills";
import Documents from "./Documents";
import Invoices from "./Invoices";
import EmpLayout from "../../components/emp/EmpLayout.jsx";
import EmpTypography from "../../components/emp/EmpTypography";
EmpTypography._log && EmpTypography._log();
import ProfileInfo from "./EmpPersonalDetails";
//import WorkClient from "./WorkClient.jsx";

const ALL_TABS = [
    "Personal Info",
    "Work Info",
    "Education",
    "Resume & Skills",
    "Documents",
    "Invoices",
];

const ADMIN_ONLY_TABS = ["Invoices"];

export default function EmpOnboard() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'hr';
    const TABS = useMemo(() =>
        isAdmin ? ALL_TABS : ALL_TABS.filter(t => !ADMIN_ONLY_TABS.includes(t)),
        [isAdmin]
    );
    const [activeTab, setActiveTab] = useState(TABS[0]);

    function renderTabContent() {
        switch (activeTab) {
            case "Personal Info":
                return <ProfileInfo isEditable={true} />;
            case "Work Info":
                return <ProfileWork />;
            case "Education":
                return <Education />;
            case "Work Client":
                return <WorkClient />;
            case "Resume & Skills":
                return <Skills />;
            case "Documents":
                return <Documents />;
            case "Invoices":
                return <Invoices />;
            default:
                return <p className="text-gray-400 text-center">Tab content goes here...</p>;
        }
    }

    return (
        <>
            <div className="p-4">
                <div className="flex gap-3 mb-4 flex-wrap w-full items-center justify-between px-2" style={{ minWidth: 0 }}>
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            className={`px-6 py-2 rounded-full font-semibold border transition text-base whitespace-nowrap ${activeTab === tab ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50"}`}
                            style={{ minWidth: "120px" }}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                {/* Tab content */}
                <div className="bg-white rounded-lg shadow p-6 min-h-[300px]">
                    {renderTabContent()}
                </div>

            </div>
        </>
    );
}
