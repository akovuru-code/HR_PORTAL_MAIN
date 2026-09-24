import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import AdminTypography from "../components/admin/AdminTypography";
import { FaEye, FaUpload } from "react-icons/fa";
import placeholderLogo from "../assets/Company.png";
import { confirmOrRequestDelete } from '../utils/adminDeleteRequest';
const API_URL = import.meta.env.VITE_API_URL;

const emptySettings = { description: "", contactEmail: "", contactPhone: "", headquarters: "", canadaOffice: "", indiaOffice: "" };
const emptyJob = { role: "", technology: "", experience: "" };
const US_BRANCH_ADDRESS = "1600 W Golf Road, Suite 1200, Rolling Meadows, IL 60008";

function companyBranches(companyName, settings) {
    if (String(companyName || "").trim().toLowerCase() !== "siritek inc") {
        return [{ label: "US Branch", address: US_BRANCH_ADDRESS }];
    }

    return [
        { label: "Headquarters", field: "headquarters" },
        { label: "Canada", field: "canadaOffice" },
        { label: "India Office", field: "indiaOffice" },
        { label: "US Branch", address: US_BRANCH_ADDRESS },
    ].map(branch => ({ ...branch, address: branch.address || settings[branch.field] || "" }));
}

const authHeaders = (json = true) => {
    const token = localStorage.getItem("token");
    return { ...(json ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

export default function Company() {
    const { user } = useAuth();
    const accountType = String(user?.accountType || user?.role || "").toLowerCase();
    const adminRole = String(user?.adminRole || "").toLowerCase();
    const isRootAdmin = accountType === "root_admin";
    const isAdmin = isRootAdmin || accountType === "admin";
    const isRecruitingAdmin = accountType === "admin" && adminRole === "recruitment";
    const canWriteBenchCandidates = isRootAdmin || isRecruitingAdmin;
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
    const [candidates, setCandidates] = useState([]);
    const [candidateOpen, setCandidateOpen] = useState(false);
    const [candidateEmployees, setCandidateEmployees] = useState([]);
    const [candidateSearch, setCandidateSearch] = useState("");
    const [selectedCandidateEmployee, setSelectedCandidateEmployee] = useState(null);
    const [candidateLoading, setCandidateLoading] = useState(false);
    const [candidateError, setCandidateError] = useState("");
    const [resumeUploadingId, setResumeUploadingId] = useState(null);
    const resumeInputs = useRef({});
    const showJobOpenings = false;
    // The reusable Bench Candidates section now lives in More > Recruiting.
    // Its Company-page source is retained intentionally for future reuse.
    const showBenchCandidates = false;

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

    const loadBenchCandidates = async () => {
        try {
            const response = await fetch("/api/company/bench-candidates", { headers: authHeaders(false) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Unable to load Bench Candidates");
            setCandidates(data.candidates || []);
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
    const openCandidateModal = async () => {
        setCandidateOpen(true);
        setCandidateSearch("");
        setSelectedCandidateEmployee(null);
        setCandidateError("");
        setCandidateLoading(true);
        try {
            const response = await fetch("/api/company/bench-candidates/employees", { headers: authHeaders(false) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Unable to load employees");
            setCandidateEmployees(data.employees || []);
        } catch (err) { setCandidateError(err.message); }
        finally { setCandidateLoading(false); }
    };
    const selectCandidateEmployee = async employeeId => {
        setCandidateError("");
        setCandidateLoading(true);
        try {
            const response = await fetch(`/api/company/bench-candidates/employees/${employeeId}`, { headers: authHeaders(false) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Unable to load employee details");
            setSelectedCandidateEmployee(data.employee);
        } catch (err) { setCandidateError(err.message); }
        finally { setCandidateLoading(false); }
    };
    const saveCandidate = async () => {
        if (!selectedCandidateEmployee) return setCandidateError("Select an existing employee.");
        if (candidates.some(candidate => String(candidate.employeeId) === String(selectedCandidateEmployee.id))) return setCandidateError("Employee is already added to Bench Candidates.");
        try {
            setCandidateLoading(true);
            await request("/api/company/bench-candidates", { method: "POST", body: JSON.stringify({ employeeId: selectedCandidateEmployee.id }) });
            setCandidateOpen(false);
            await loadBenchCandidates();
        } catch (err) { setCandidateError(err.message); }
        finally { setCandidateLoading(false); }
    };
    const deleteCandidate = async id => {
        const candidate = candidates.find(item => item.id === id);
        if (!await confirmOrRequestDelete({ isRootAdmin, resourceType: 'bench_candidate', resourceId: id, resourceLabel: `bench candidate ${candidate?.employeeName || id}` })) return;
        try { await request(`/api/company/bench-candidates/${id}`, { method: "DELETE" }); await loadBenchCandidates(); }
        catch (err) { setError(err.message); }
    };
    const uploadCandidateResume = async (candidate, file) => {
        if (!file) return;
        const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        if (!['.pdf', '.doc', '.docx'].includes(extension)) {
            setError('Only PDF, DOC, and DOCX resume files are allowed.');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            setError('Resume must be 20 MB or smaller.');
            return;
        }
        try {
            setError('');
            setResumeUploadingId(candidate.id);
            const form = new FormData();
            form.append('resume', file);
            const response = await fetch(`/api/company/bench-candidates/${candidate.id}/resume`, {
                method: 'POST', headers: authHeaders(false), body: form,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Resume upload failed.');
            await loadBenchCandidates();
        } catch (err) { setError(err.message || 'Resume upload failed.'); }
        finally { setResumeUploadingId(null); }
    };
    const previewCandidateResume = async candidate => {
        try {
            setError('');
            const response = await fetch(`/api/company/bench-candidates/${candidate.id}/resume`, { headers: authHeaders(false) });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Unable to preview resume.');
            }
            const objectUrl = URL.createObjectURL(await response.blob());
            window.open(objectUrl, '_blank', 'noopener,noreferrer');
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
        } catch (err) { setError(err.message || 'Unable to preview resume.'); }
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
                                {isRootAdmin ? <input value={companyName} onChange={e => setCompanyName(e.target.value)} className="border rounded px-3 py-2 w-full text-center font-bold" /> : <AdminTypography.h1 className="text-3xl font-bold mb-2 text-center flex-1">{company.name}</AdminTypography.h1>}
                                <button onClick={handleNext} className="px-3 py-1 bg-blue-100 hover:bg-gray-300 rounded text-2xl" title="Next Company">&rarr;</button>
                            </div>
                            {isRootAdmin && <><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setLogoFile(e.target.files[0] || null)} /><AdminTypography.button variant="primary" onClick={handleCompanySave}>Save Company</AdminTypography.button></>}
                        </div>
                    ) : <AdminTypography.h1 className="text-3xl font-bold mb-2">{company.name}</AdminTypography.h1>}
                </div>
                {showJobOpenings && <>
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
                </>}
                {showBenchCandidates && isAdmin && <section className="mt-2">
                    <AdminTypography.h2 className="mb-4 text-2xl text-center">Bench Candidates</AdminTypography.h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200 rounded-lg bg-white">
                            <thead><tr className="bg-blue-50"><th className="px-4 py-2 text-left font-semibold text-gray-700">Employee Name</th><th className="px-4 py-2 text-left font-semibold text-gray-700">Company</th><th className="px-4 py-2 text-left font-semibold text-gray-700">Visa Type</th><th className="px-4 py-2 text-left font-semibold text-gray-700">Location</th><th className="px-4 py-2 text-left font-semibold text-gray-700">Date of Birth</th><th className="px-4 py-2 text-left font-semibold text-gray-700">Contact No</th><th className="px-4 py-2 text-left font-semibold text-gray-700">Resume</th>{canWriteBenchCandidates && <th className="px-4 py-2 text-left font-semibold text-gray-700">Action</th>}</tr></thead>
                            <tbody>
                                {candidates.map(candidate => <tr key={candidate.id} className="border-t border-gray-100"><td className="px-4 py-2 font-semibold">{candidate.employeeName}</td><td className="px-4 py-2 text-gray-700">{candidate.company}</td><td className="px-4 py-2 text-gray-700">{candidate.visaType}</td><td className="px-4 py-2 text-gray-700">{candidate.location}</td><td className="px-4 py-2 text-gray-700">{candidate.dateOfBirth}</td><td className="px-4 py-2 text-gray-700">{candidate.contactNo}</td><td className="px-4 py-2"><input ref={element => { resumeInputs.current[candidate.id] = element; }} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; uploadCandidateResume(candidate, file); }} />{candidate.resumeAvailable ? <div className="flex flex-wrap gap-2"><button type="button" className="rounded p-1.5 text-blue-700 hover:bg-blue-50" title="Preview Resume" aria-label="Preview Resume" onClick={() => previewCandidateResume(candidate)}><FaEye /></button>{canWriteBenchCandidates && <button type="button" className="rounded p-1.5 text-blue-700 hover:bg-blue-50 disabled:opacity-50" title="Replace Resume" aria-label="Replace Resume" disabled={resumeUploadingId === candidate.id} onClick={() => resumeInputs.current[candidate.id]?.click()}><FaUpload /></button>}</div> : canWriteBenchCandidates ? <button type="button" className="text-blue-700 hover:underline" disabled={resumeUploadingId === candidate.id} onClick={() => resumeInputs.current[candidate.id]?.click()}>{resumeUploadingId === candidate.id ? 'Uploading...' : 'Upload Resume'}</button> : <span className="text-gray-500">No Resume</span>}</td>{canWriteBenchCandidates && <td className="px-4 py-2"><AdminTypography.button variant="secondary" onClick={() => deleteCandidate(candidate.id)}>Delete</AdminTypography.button></td>}</tr>)}
                                {!candidates.length && <tr><td colSpan={canWriteBenchCandidates ? 8 : 7} className="px-4 py-8 text-center text-gray-500">No bench candidates found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    {canWriteBenchCandidates && <AdminTypography.button variant="primary" onClick={openCandidateModal} className="mt-4">+ Candidate</AdminTypography.button>}
                </section>}
                <div className="mt-10 border-t pt-6">
                    <div className="max-w-6xl mx-auto px-4 mb-12">
                        <AdminTypography.h2 className="text-center text-2xl font-semibold mb-8">Company Details</AdminTypography.h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 text-sm">{companyBranches(company?.name, settings).map(branch => <div key={branch.label} className="space-y-2"><AdminTypography.h3 className="font-semibold text-base">{branch.label}</AdminTypography.h3>{isRootAdmin && branch.field ? <textarea value={settingsDraft[branch.field]} onChange={e => updateSetting(branch.field, e.target.value)} className="border rounded px-3 py-2 w-full min-h-[130px]" /> : <p className="border rounded px-3 py-2 w-full min-h-[130px] whitespace-pre-line text-gray-800">{branch.address}</p>}</div>)}</div>
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm"><div className="space-y-2"><AdminTypography.h3 className="font-semibold text-base">Contact</AdminTypography.h3>{isRootAdmin ? <><input value={settingsDraft.contactEmail} onChange={e => updateSetting("contactEmail", e.target.value)} className="border rounded px-3 py-2 w-full" /><input value={settingsDraft.contactPhone} onChange={e => updateSetting("contactPhone", e.target.value)} className="border rounded px-3 py-2 w-full" /></> : <p><strong>Email:</strong> {settings.contactEmail}<br /><strong>Call:</strong> {settings.contactPhone}</p>}</div></div>
                        {isRootAdmin && <AdminTypography.button variant="primary" onClick={handleSettingsSave} className="mt-6">Save Details</AdminTypography.button>}
                    </div>
                    {isRootAdmin ? <textarea value={settingsDraft.description} onChange={e => updateSetting("description", e.target.value)} className="border rounded px-3 py-2 w-full min-h-[100px]" /> : <AdminTypography.p className="text-justify">{settings.description}</AdminTypography.p>}
                </div>
            </div>
            {candidateOpen && <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4"><div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"><div className="flex items-center justify-between mb-5"><AdminTypography.h2 className="text-xl">Add Bench Candidate</AdminTypography.h2><button type="button" className="text-2xl text-gray-500" onClick={() => setCandidateOpen(false)}>×</button></div>{candidateError && <div className="mb-4 text-sm text-red-600">{candidateError}</div>}<label className="block text-sm font-medium text-gray-700 mb-2">Employee Name</label><input type="search" value={candidateSearch} onChange={event => setCandidateSearch(event.target.value)} placeholder="Search or select employee" className="border rounded px-3 py-2 w-full" autoFocus />{candidateLoading && !selectedCandidateEmployee ? <p className="mt-3 text-sm text-gray-500">Loading employees...</p> : <div className="mt-2 max-h-44 overflow-y-auto border rounded">{candidateEmployees.filter(employee => employee.name.toLowerCase().includes(candidateSearch.toLowerCase())).map(employee => <button type="button" key={employee.id} onClick={() => selectCandidateEmployee(employee.id)} className={`block w-full px-3 py-2 text-left hover:bg-blue-50 ${String(selectedCandidateEmployee?.id) === String(employee.id) ? 'bg-blue-100' : ''}`}>{employee.name}</button>)}{!candidateEmployees.filter(employee => employee.name.toLowerCase().includes(candidateSearch.toLowerCase())).length && <p className="px-3 py-2 text-sm text-gray-500">No employees found.</p>}</div>}<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">{[["Company", "company"], ["Visa Type", "visaType"], ["Location", "location"], ["Date of Birth", "dateOfBirth"], ["Contact No", "contactNo"]].map(([label, field]) => <label key={field} className="block text-sm font-medium text-gray-700">{label}<input value={selectedCandidateEmployee?.[field] || ""} readOnly placeholder="Not Available" className="mt-1 border rounded px-3 py-2 w-full bg-gray-100 text-gray-700" /></label>)}</div><div className="flex justify-end gap-3 mt-6"><AdminTypography.button variant="secondary" onClick={() => setCandidateOpen(false)} disabled={candidateLoading}>Cancel</AdminTypography.button><AdminTypography.button variant="primary" onClick={saveCandidate} disabled={!selectedCandidateEmployee || candidateLoading}>Save</AdminTypography.button></div></div></div>}
        </div>

    );
}
