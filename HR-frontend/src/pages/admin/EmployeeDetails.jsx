import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import EmpPersonalDetails from "../onboarding/EmpPersonalDetails";
import OnboardDocs from "../onboarding/OnboardDocs";
import WorkClient from "../onboarding/WorkClient";
import Education from "../onboarding/Education";
import ProfileWork from "../onboarding/ProfileWork";
import Skills from "../onboarding/Skills";
import Documents from "../onboarding/Documents";
import InvoiceWorkspaceV2 from "./InvoiceWorkspaceV2";
import AdminTypography from "../../components/admin/AdminTypography";
import { AdminViewContext } from "../../contexts/AdminViewContext";
import { useAuth } from '../../hooks/useAuth';

const TABS = [
  "Personal Info",
  "Onboard Docs",
  "Work Info",
  "Education",
  "Resume & Skills",
  "Documents",
  "Invoices",
];

export default function EmployeeDetails() {
  const { isRootAdmin, permissions } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setEmployee(null);
    const token = localStorage.getItem("token");
    fetch(`/api/admin/employees/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load employee details");
        return data;
      })
      .then(data => {
        if (!cancelled) setEmployee(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Unable to load employee details");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  function renderTabContent() {
    switch (activeTab) {
      case "Personal Info": return <EmpPersonalDetails />;
      case "Onboard Docs": return <OnboardDocs />;
      case "Work Info": return <ProfileWork />;
      case "Education": return <Education />;
      case "Resume & Skills": return <Skills />;
      case "Documents": return <Documents />;
      case "Invoices": return <InvoiceWorkspaceV2 employeeId={Number(id)} />;
      default: return null;
    }
  }

  const initials = employee?.name ? employee.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() : "?";
  const projectStatus = typeof employee?.status === "string" ? employee.status.trim() : "";

  return (
    <AdminViewContext.Provider value={{ targetEmployeeId: parseInt(id, 10) }}>
      <div className="p-4">
        {/* Back button */}
        <button
          className="mb-4 text-sm text-blue-600 hover:underline flex items-center gap-1"
          onClick={() => navigate(`/admin/employees${searchParams.get("tab") ? `?tab=${searchParams.get("tab")}` : ""}`)}
        >
          ← Back to Employees
        </button>

        {/* Top Card */}
        <div className="bg-white rounded-lg shadow p-6 flex flex-wrap gap-8 items-center mb-6">
          <div className="flex flex-col items-center min-w-[120px]">
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-3xl font-bold text-gray-500 mb-2">
              {initials}
            </div>
          </div>
          {loading ? (
            <div className="text-gray-400 text-sm">Loading...</div>
          ) : error ? (
            <div className="text-red-600 text-sm">{error}</div>
          ) : (
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><AdminTypography.small className="font-semibold">Name</AdminTypography.small>: {employee?.name}</div>
              <div><AdminTypography.small className="font-semibold">SSN</AdminTypography.small>: {employee?.ssn}</div>
              <div><AdminTypography.small className="font-semibold">Visa Status</AdminTypography.small>: {employee?.visa}</div>
              <div><AdminTypography.small className="font-semibold">Present Employer</AdminTypography.small>: {employee?.org}</div>
              <div><AdminTypography.small className="font-semibold">Title</AdminTypography.small>: {employee?.title}</div>
              <div><AdminTypography.small className="font-semibold">Client Name</AdminTypography.small>: {employee?.client}</div>
              <div><AdminTypography.small className="font-semibold">Work Location</AdminTypography.small>: {employee?.location}</div>
              <div><AdminTypography.small className="font-semibold">Status</AdminTypography.small>: {projectStatus ? <span className="inline-block px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">{projectStatus}</span> : "—"}</div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-4 flex-wrap">
          {TABS.filter(tab => tab !== 'Invoices' || isRootAdmin || permissions.includes('invoice:manage')).map(tab => (
            <AdminTypography.button
              key={tab}
              className={`px-6 py-2 rounded-full font-semibold border transition text-base whitespace-nowrap ${activeTab === tab ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50"}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </AdminTypography.button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow p-6 min-h-[300px]">
          {renderTabContent()}
        </div>
      </div>
    </AdminViewContext.Provider>
  );
}
