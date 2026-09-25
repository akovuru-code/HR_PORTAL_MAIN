import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaEye, FaUpload } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import AdminTypography from './AdminTypography';
import { confirmOrRequestDelete } from '../../utils/adminDeleteRequest';

const headers = (json = true) => {
  const token = localStorage.getItem('token');
  return { ...(json ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

// This component is the former Company-page Bench Candidates section.  It
// continues to use the original company APIs and bench_candidates records.
export default function BenchCandidatesSection() {
  const { user, isRootAdmin } = useAuth();
  const adminRole = String(user?.adminRole || '').toLowerCase();
  const canWrite = isRootAdmin || (String(user?.accountType || user?.role || '').toLowerCase() === 'admin' && adminRole === 'recruitment');
  const [candidates, setCandidates] = useState([]);
  const [candidateOpen, setCandidateOpen] = useState(false);
  const [candidateEmployees, setCandidateEmployees] = useState([]);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const fileInputs = useRef({});

  const request = async (url, options = {}) => {
    const isFormData = options.body instanceof FormData;
    const response = await fetch(url, {
      ...options,
      // The browser must set multipart/form-data (including its boundary).
      // Adding application/json here prevents Multer from receiving the resume.
      headers: { ...headers(Boolean(options.body) && !isFormData), ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || 'Request failed');
    return data;
  };
  const loadCandidates = async () => {
    try { setError(''); const data = await request('/api/company/bench-candidates', { headers: headers(false) }); setCandidates(data.candidates || []); }
    catch (err) { setError(err.message); }
  };
  useEffect(() => { loadCandidates(); }, []);

  const openAdd = async () => {
    setCandidateOpen(true); setCandidateSearch(''); setSelectedEmployee(null); setError(''); setLoading(true);
    try { const data = await request('/api/company/bench-candidates/employees', { headers: headers(false) }); setCandidateEmployees(data.employees || []); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  const selectEmployee = async employeeId => {
    setLoading(true); setError('');
    try { const data = await request(`/api/company/bench-candidates/employees/${employeeId}`, { headers: headers(false) }); setSelectedEmployee(data.employee); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  const saveCandidate = async () => {
    if (!selectedEmployee) return setError('Select an existing employee.');
    try { setLoading(true); await request('/api/company/bench-candidates', { method: 'POST', body: JSON.stringify({ employeeId: selectedEmployee.id }) }); setCandidateOpen(false); await loadCandidates(); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  const deleteCandidate = async candidate => {
    if (!await confirmOrRequestDelete({ isRootAdmin, resourceType: 'bench_candidate', resourceId: candidate.id, resourceLabel: `bench candidate ${candidate.employeeName || candidate.id}` })) return;
    try { await request(`/api/company/bench-candidates/${candidate.id}`, { method: 'DELETE' }); await loadCandidates(); }
    catch (err) { setError(err.message); }
  };
  const uploadResume = async (candidate, file) => {
    if (!file) return;
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.pdf', '.doc', '.docx'].includes(extension)) return setError('Only PDF, DOC, and DOCX resume files are allowed.');
    if (file.size > 20 * 1024 * 1024) return setError('Resume must be 20 MB or smaller.');
    try {
      setUploadingId(candidate.id); setError(''); const form = new FormData(); form.append('resume', file);
      await request(`/api/company/bench-candidates/${candidate.id}/resume`, { method: 'POST', body: form }); await loadCandidates();
    } catch (err) { setError(err.message); } finally { setUploadingId(null); }
  };
  const previewResume = async candidate => {
    try {
      setError('');
      const response = await fetch(`/api/company/bench-candidates/${candidate.id}/resume`, { headers: headers(false) });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Unable to preview resume.'); }
      const filename = candidate.resumeOriginalName || 'Resume';
      setPreview({
        url: URL.createObjectURL(await response.blob()),
        filename,
        isPdf: response.headers.get('content-type')?.includes('application/pdf') || /\.pdf$/i.test(filename),
      });
    } catch (err) { setError(err.message); }
  };
  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };
  const matches = candidateEmployees.filter(employee => employee.name.toLowerCase().includes(candidateSearch.toLowerCase()));

  return <section aria-labelledby="bench-candidates-heading">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><AdminTypography.h2 id="bench-candidates-heading">Bench Candidates</AdminTypography.h2>{canWrite && <AdminTypography.button variant="primary" onClick={openAdd}>+ Candidate</AdminTypography.button>}</div>
    {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
    <div className="overflow-x-auto"><table className="min-w-full border border-gray-200 rounded-lg bg-white"><thead><tr className="bg-blue-50"><th className="px-4 py-2 text-left">Employee Name</th><th className="px-4 py-2 text-left">Email ID</th><th className="px-4 py-2 text-left">Company</th><th className="px-4 py-2 text-left">Visa Type</th><th className="px-4 py-2 text-left">Location</th><th className="px-4 py-2 text-left">Date of Birth</th><th className="px-4 py-2 text-left">Contact No</th><th className="px-4 py-2 text-left">Resume</th>{canWrite && <th className="px-4 py-2 text-left">Action</th>}</tr></thead><tbody>
      {candidates.map(candidate => <tr key={candidate.id} className="border-t border-gray-100"><td className="px-4 py-2 font-semibold">{candidate.employeeName}</td><td className="px-4 py-2">{candidate.employeeEmail || '—'}</td><td className="px-4 py-2">{candidate.company}</td><td className="px-4 py-2">{candidate.visaType}</td><td className="px-4 py-2">{candidate.location}</td><td className="px-4 py-2">{candidate.dateOfBirth}</td><td className="px-4 py-2">{candidate.contactNo}</td><td className="px-4 py-2"><input ref={element => { fileInputs.current[candidate.id] = element; }} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; uploadResume(candidate, file); }} />{candidate.resumeAvailable ? <div className="flex gap-2"><button type="button" title="Preview Resume" className="rounded p-1.5 text-blue-700 hover:bg-blue-50" onClick={() => previewResume(candidate)}><FaEye /></button>{canWrite && <button type="button" title="Replace Resume" className="rounded p-1.5 text-blue-700 hover:bg-blue-50 disabled:opacity-50" disabled={uploadingId === candidate.id} onClick={() => fileInputs.current[candidate.id]?.click()}><FaUpload /></button>}</div> : canWrite ? <button type="button" className="text-blue-700 hover:underline" disabled={uploadingId === candidate.id} onClick={() => fileInputs.current[candidate.id]?.click()}>{uploadingId === candidate.id ? 'Uploading...' : 'Upload Resume'}</button> : <span className="text-gray-500">No Resume</span>}</td>{canWrite && <td className="px-4 py-2"><AdminTypography.button variant="secondary" onClick={() => deleteCandidate(candidate)}>Delete</AdminTypography.button></td>}</tr>)}
      {!candidates.length && <tr><td colSpan={canWrite ? 9 : 8} className="px-4 py-8 text-center text-gray-500">No bench candidates found.</td></tr>}
    </tbody></table></div>
    {candidateOpen && <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4"><div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"><div className="flex items-center justify-between mb-5"><AdminTypography.h2>Add Bench Candidate</AdminTypography.h2><button type="button" className="text-2xl text-gray-500" onClick={() => setCandidateOpen(false)}>×</button></div><input type="search" value={candidateSearch} onChange={event => setCandidateSearch(event.target.value)} placeholder="Search employee" className="border rounded px-3 py-2 w-full" autoFocus />{loading && !selectedEmployee ? <p className="mt-3 text-sm text-gray-500">Loading employees...</p> : <div className="mt-2 max-h-44 overflow-y-auto border rounded">{matches.map(employee => <button type="button" key={employee.id} onClick={() => selectEmployee(employee.id)} className={`block w-full px-3 py-2 text-left hover:bg-blue-50 ${String(selectedEmployee?.id) === String(employee.id) ? 'bg-blue-100' : ''}`}>{employee.name}</button>)}</div>}<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">{[['Company', 'company'], ['Visa Type', 'visaType'], ['Location', 'location'], ['Date of Birth', 'dateOfBirth'], ['Contact No', 'contactNo']].map(([label, field]) => <label key={field} className="block text-sm font-medium text-gray-700">{label}<input value={selectedEmployee?.[field] || ''} readOnly className="mt-1 border rounded px-3 py-2 w-full bg-gray-100" /></label>)}</div><div className="flex justify-end gap-3 mt-6"><AdminTypography.button variant="secondary" onClick={() => setCandidateOpen(false)}>Cancel</AdminTypography.button><AdminTypography.button variant="primary" onClick={saveCandidate} disabled={!selectedEmployee || loading}>Save</AdminTypography.button></div></div></div>}
    {preview && createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={`Preview ${preview.filename}`}>
        <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b px-4 py-3"><span className="truncate pr-4 font-medium text-gray-800">{preview.filename}</span><button type="button" onClick={closePreview} className="rounded px-3 py-1 text-sm text-gray-700 hover:bg-gray-100">Close</button></div>
          <div className="min-h-0 flex-1 bg-gray-100">{preview.isPdf ? <iframe title={`Preview: ${preview.filename}`} src={preview.url} className="h-full w-full border-0" /> : <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-gray-700"><p>This resume is a Microsoft Word document. Its original filename is shown above.</p><a href={preview.url} target="_blank" rel="noreferrer" className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Open file</a></div>}</div>
        </div>
      </div>, document.body
    )}
  </section>;
}
