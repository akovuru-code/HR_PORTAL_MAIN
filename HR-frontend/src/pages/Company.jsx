import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import AdminTypography from "../components/admin/AdminTypography";
import placeholderLogo from "../assets/Company.png";
const API_URL = import.meta.env.VITE_API_URL;

const emptySettings = { description: "", contactEmail: "", contactPhone: "", headquarters: "", canadaOffice: "", indiaOffice: "" };
const emptyJob = { role: "", technology: "", experience: "" };

const authHeaders = (json = true) => {
    const token = localStorage.getItem("token");
    return { ...(json ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

export default function Company() {
    const { user } = useAuth();
    const isAdmin = user?.role?.toLowerCase() === "admin";
    const navigate = useNavigate();
    const [company, setCompany] = useState(null);
    const [companyList, setCompanyList] = useState([]);
    const [settings, setSettings] = useState(emptySettings);
    const [jobs, setJobs] = useState([]);
    const [editIndex, setEditIndex] = useState(null);
    const [editDraft, setEditDraft] = useState(emptyJob);
    const [adding, setAdding] = useState(false);
    const [addDraft, setAddDraft] = useState(emptyJob);
    const [companyName, setCompanyName] = useState("");
    const [settingsDraft, setSettingsDraft] = useState(emptySettings);
    const [logoFile, setLogoFile] = useState(null);
    const [error, setError] = useState("");

    const loadCompany = async (targetId = null) => {
        try {
            let url = "/api/company";
            if (targetId) url += `?companyId=${targetId}`;
            else if (company && company.id) url += `?companyId=${company.id}`;
            const response = await fetch(url, { headers: authHeaders(false) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Unable to load company information");
            setCompany(data.company);
            setCompanyName(data.company.name);
            setSettings(data.settings || emptySettings);
            setSettingsDraft(data.settings || emptySettings);
            setJobs(data.jobs || []);
            if (data.companyList) setCompanyList(data.companyList);
        } catch (err) { setError(err.message); }
    };

    useEffect(() => { loadCompany(); }, []);

    const handleNext = () => {
        if (!companyList.length || !company) return;
        const currentIndex = companyList.findIndex(c => c.id === company.id);
        if (currentIndex !== -1) {
            const nextIndex = (currentIndex + 1) % companyList.length;
            loadCompany(companyList[nextIndex].id);
        }
    };

    const handlePrev = () => {
        if (!companyList.length || !company) return;
        const currentIndex = companyList.findIndex(c => c.id === company.id);
        if (currentIndex !== -1) {
            const prevIndex = (currentIndex - 1 + companyList.length) % companyList.length;
            loadCompany(companyList[prevIndex].id);
        }
    };

    const request = async (url, options) => {
        const response = await fetch(url, { ...options, headers: { ...authHeaders(), ...(options?.headers || {}) } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Request failed");
        return data;
    };

    const handleCompanySave = async () => {
        try {
            await request(`/api/company/${company.id}`, { method: "PUT", body: JSON.stringify({ name: companyName }) });
            if (logoFile) {
                const form = new FormData();
                form.append("companyId", company.id);
                form.append("logo", logoFile);
                const response = await fetch("/api/company/logo", { method: "POST", headers: authHeaders(false), body: form });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Logo upload failed");
            }
            setLogoFile(null);
            await loadCompany(company.id);
        } catch (err) { setError(err.message); }
    };

    const handleSettingsSave = async () => {
        try { await request("/api/company/settings", { method: "PUT", body: JSON.stringify(settingsDraft) }); await loadCompany(); }
        catch (err) { setError(err.message); }
    };

    const handleEditSave = async () => {
        try { await request(`/api/company/jobs/${jobs[editIndex].id}`, { method: "PUT", body: JSON.stringify(editDraft) }); setEditIndex(null); await loadCompany(); }
        catch (err) { setError(err.message); }
    };
    const handleAddSave = async () => {
        try { await request("/api/company/jobs", { method: "POST", body: JSON.stringify(addDraft) }); setAdding(false); await loadCompany(); }
        catch (err) { setError(err.message); }
    };
    const handleDelete = async (id) => {
        try { await request(`/api/company/jobs/${id}`, { method: "DELETE" }); await loadCompany(); }
        catch (err) { setError(err.message); }
    };
    const updateSetting = (field, value) => setSettingsDraft(prev => ({ ...prev, [field]: value }));

    if (!company) return <div className="p-10 text-center">{error || "Loading company information..."}</div>;

    return (
        <div className="w-full">
            <div className="bg-white rounded-xl shadow p-10 w-full">
                {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
                <div className="flex flex-col items-center mb-6">
                    <img src={company.logoUrl || placeholderLogo} alt={company.name} className="w-40 h-40 rounded-full object-contain mb-3 border border-gray-200 bg-white" />
                    {/*<img src={company.logoUrl ? `${API_URL}${company.logoUrl}` : placeholderLogo} alt={company.name} className="w-40 h-40 rounded-full object-contain mb-3 border border-gray-200 bg-white" />*/}
                    {isAdmin ? (
                        <div className="flex flex-col gap-2 items-center w-full max-w-md">
                            <div className="flex items-center gap-4 w-full justify-center mb-2">
                                <button onClick={handlePrev} className="px-3 py-1 bg-blue-100 hover:bg-gray-300 rounded text-2xl" title="Previous Company">&larr;</button>
                                <input value={companyName} onChange={e => setCompanyName(e.target.value)} className="border rounded px-3 py-2 w-full text-center font-bold" />
                                <button onClick={handleNext} className="px-3 py-1 bg-blue-100 hover:bg-gray-300 rounded text-2xl" title="Next Company">&rarr;</button>
                            </div>
                            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setLogoFile(e.target.files[0] || null)} />
                            <AdminTypography.button variant="primary" onClick={handleCompanySave}>Save Company</AdminTypography.button>
                        </div>
                    ) : <AdminTypography.h1 className="text-3xl font-bold mb-2">{company.name}</AdminTypography.h1>}
                </div>
                <AdminTypography.h2 className="mb-4 text-2xl text-center">Job Openings</AdminTypography.h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200 rounded-lg bg-white">
                        <thead><tr className="bg-blue-50"><th className="px-4 py-2 text-left font-semibold text-gray-700">Role</th><th className="px-4 py-2 text-left font-semibold text-gray-700">Technology</th><th className="px-4 py-2 text-left font-semibold text-gray-700">Experience</th>{isAdmin && <th className="px-4 py-2" />}</tr></thead>
                        <tbody>
                            {jobs.map((job, idx) => <tr key={job.id} className="border-t border-gray-100">{editIndex === idx ? <>{["role", "technology", "experience"].map(field => <td key={field} className="px-4 py-2"><input value={editDraft[field]} onChange={e => setEditDraft(prev => ({ ...prev, [field]: e.target.value }))} className="border rounded px-3 py-2 w-full min-w-[100px]" /></td>)}<td className="px-4 py-2 whitespace-nowrap"><AdminTypography.button variant="primary" onClick={handleEditSave}>Save</AdminTypography.button> <AdminTypography.button variant="secondary" onClick={() => setEditIndex(null)}>Cancel</AdminTypography.button></td></> : <><td className="px-4 py-2 font-semibold">{job.role}</td><td className="px-4 py-2 text-gray-700">{job.technology}</td><td className="px-4 py-2 text-gray-500">{job.experience} yrs</td>{isAdmin && <td className="px-4 py-2 whitespace-nowrap"><AdminTypography.button variant="primary" onClick={() => { setEditIndex(idx); setEditDraft({ role: job.role, technology: job.technology, experience: job.experience }); }}>Edit</AdminTypography.button> <AdminTypography.button variant="secondary" onClick={() => handleDelete(job.id)}>Delete</AdminTypography.button></td>}</>}</tr>)}
                            {isAdmin && <tr><td colSpan={4} className="px-4 py-2">{!adding ? <AdminTypography.button variant="primary" onClick={() => { setAdding(true); setAddDraft(emptyJob); }}>+ Add Opening</AdminTypography.button> : <div className="flex flex-col md:flex-row gap-2 mt-2">{["role", "technology", "experience"].map(field => <input key={field} value={addDraft[field]} onChange={e => setAddDraft(prev => ({ ...prev, [field]: e.target.value }))} className="border rounded px-3 py-2 flex-1 min-w-[120px]" placeholder={field === "experience" ? "Experience (yrs)" : field[0].toUpperCase() + field.slice(1)} />)}<AdminTypography.button variant="primary" onClick={handleAddSave}>Save</AdminTypography.button><AdminTypography.button variant="secondary" onClick={() => setAdding(false)}>Cancel</AdminTypography.button></div>}</td></tr>}
                        </tbody>
                    </table>
                </div>
                <div className="mt-10 border-t pt-6">
                    <div className="max-w-6xl mx-auto px-4 mb-12">
                        <AdminTypography.h2 className="text-center text-2xl font-semibold mb-8">Company Details</AdminTypography.h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">{[["Headquarters", "headquarters"], ["Main Office (Canada)", "canadaOffice"], ["India Office", "indiaOffice"]].map(([label, field]) => <div key={field} className="space-y-2"><AdminTypography.h3 className="font-semibold text-base">{label}</AdminTypography.h3>{isAdmin ? <textarea value={settingsDraft[field]} onChange={e => updateSetting(field, e.target.value)} className="border rounded px-3 py-2 w-full min-h-[130px]" /> : <p className="whitespace-pre-line">{settings[field]}</p>}</div>)}</div>
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm"><div className="space-y-2"><AdminTypography.h3 className="font-semibold text-base">Contact</AdminTypography.h3>{isAdmin ? <><input value={settingsDraft.contactEmail} onChange={e => updateSetting("contactEmail", e.target.value)} className="border rounded px-3 py-2 w-full" /><input value={settingsDraft.contactPhone} onChange={e => updateSetting("contactPhone", e.target.value)} className="border rounded px-3 py-2 w-full" /></> : <p><strong>Email:</strong> {settings.contactEmail}<br /><strong>Call:</strong> {settings.contactPhone}</p>}</div></div>
                        {isAdmin && <AdminTypography.button variant="primary" onClick={handleSettingsSave} className="mt-6">Save Details</AdminTypography.button>}
                    </div>
                    {isAdmin ? <textarea value={settingsDraft.description} onChange={e => updateSetting("description", e.target.value)} className="border rounded px-3 py-2 w-full min-h-[100px]" /> : <AdminTypography.p className="text-justify">{settings.description}</AdminTypography.p>}
                </div>
            </div>
        </div>

    );
}