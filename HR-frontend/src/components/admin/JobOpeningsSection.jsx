import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import AdminTypography from './AdminTypography';
import { confirmOrRequestDelete, requestOrUseAdminAction } from '../../utils/adminDeleteRequest';

const emptyJob = { role: '', technology: '', experience: '' };
const headers = () => ({ 'Content-Type': 'application/json', ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) });

// Reuses the hidden Company Job Openings data and endpoints.  No job records
// or backend workflow are duplicated by displaying it inside Recruiting.
export default function JobOpeningsSection() {
  const { user, isRootAdmin } = useAuth();
  const canManage = isRootAdmin || (String(user?.accountType || user?.role || '').toLowerCase() === 'admin' && String(user?.adminRole || '').toLowerCase() === 'recruitment');
  const [jobs, setJobs] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(emptyJob);
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState(emptyJob);
  const [error, setError] = useState('');

  const request = async (url, options = {}) => {
    const response = await fetch(url, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  };
  const loadJobs = async () => {
    try { setError(''); const data = await request('/api/company', { headers: { Authorization: headers().Authorization } }); setJobs(data.jobs || []); }
    catch (err) { setError(err.message); }
  };
  useEffect(() => { loadJobs(); }, []);
  const saveEdit = async () => {
    const job = jobs.find(item => item.id === editingId);
    if (!job) return;
    try { await request(`/api/company/jobs/${editingId}`, { method: 'PUT', body: JSON.stringify(editDraft) }); setEditingId(null); await loadJobs(); }
    catch (err) { setError(err.message); }
  };
  const beginEdit = async job => {
    if (!await requestOrUseAdminAction({ actionType: 'edit', resourceType: 'company_job', resourceId: job.id, resourceLabel: `job opening ${job.role}`, isRootAdmin })) return;
    setEditingId(job.id); setEditDraft({ role: job.role, technology: job.technology, experience: job.experience });
  };
  const deleteJob = async job => {
    if (!await confirmOrRequestDelete({ isRootAdmin, resourceType: 'company_job', resourceId: job.id, resourceLabel: `job opening ${job.role}` })) return;
    try { await request(`/api/company/jobs/${job.id}`, { method: 'DELETE' }); await loadJobs(); }
    catch (err) { setError(err.message); }
  };
  const saveNew = async () => {
    try { await request('/api/company/jobs', { method: 'POST', body: JSON.stringify(addDraft) }); setAdding(false); setAddDraft(emptyJob); await loadJobs(); }
    catch (err) { setError(err.message); }
  };

  return <section aria-labelledby="job-openings-heading">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><AdminTypography.h2 id="job-openings-heading">Job Openings</AdminTypography.h2>{canManage && <AdminTypography.button variant="primary" onClick={() => { setAdding(true); setAddDraft(emptyJob); }}>+ Add Opening</AdminTypography.button>}</div>
    {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
    <div className="overflow-x-auto"><table className="min-w-full border border-gray-200 rounded-lg bg-white"><thead><tr className="bg-blue-50"><th className="px-4 py-2 text-left">Role</th><th className="px-4 py-2 text-left">Technology</th><th className="px-4 py-2 text-left">Experience</th>{canManage && <th className="px-4 py-2">Action</th>}</tr></thead><tbody>
      {jobs.map(job => <tr key={job.id} className="border-t border-gray-100">{editingId === job.id ? <><td className="px-4 py-2"><input value={editDraft.role} onChange={event => setEditDraft(current => ({ ...current, role: event.target.value }))} className="border rounded px-3 py-2 w-full" /></td><td className="px-4 py-2"><input value={editDraft.technology} onChange={event => setEditDraft(current => ({ ...current, technology: event.target.value }))} className="border rounded px-3 py-2 w-full" /></td><td className="px-4 py-2"><input value={editDraft.experience} onChange={event => setEditDraft(current => ({ ...current, experience: event.target.value }))} className="border rounded px-3 py-2 w-full" /></td><td className="px-4 py-2 whitespace-nowrap"><AdminTypography.button variant="primary" onClick={saveEdit}>Save</AdminTypography.button> <AdminTypography.button variant="secondary" onClick={() => setEditingId(null)}>Cancel</AdminTypography.button></td></> : <><td className="px-4 py-2 font-semibold">{job.role}</td><td className="px-4 py-2">{job.technology}</td><td className="px-4 py-2">{job.experience} yrs</td>{canManage && <td className="px-4 py-2 whitespace-nowrap"><AdminTypography.button variant="primary" onClick={() => beginEdit(job)}>Edit</AdminTypography.button> <AdminTypography.button variant="secondary" onClick={() => deleteJob(job)}>Delete</AdminTypography.button></td>}</>}</tr>)}
      {adding && <tr className="border-t"><td className="px-4 py-2"><input value={addDraft.role} onChange={event => setAddDraft(current => ({ ...current, role: event.target.value }))} placeholder="Role" className="border rounded px-3 py-2 w-full" /></td><td className="px-4 py-2"><input value={addDraft.technology} onChange={event => setAddDraft(current => ({ ...current, technology: event.target.value }))} placeholder="Technology" className="border rounded px-3 py-2 w-full" /></td><td className="px-4 py-2"><input value={addDraft.experience} onChange={event => setAddDraft(current => ({ ...current, experience: event.target.value }))} placeholder="Experience (yrs)" className="border rounded px-3 py-2 w-full" /></td><td className="px-4 py-2 whitespace-nowrap"><AdminTypography.button variant="primary" onClick={saveNew}>Save</AdminTypography.button> <AdminTypography.button variant="secondary" onClick={() => setAdding(false)}>Cancel</AdminTypography.button></td></tr>}
      {!jobs.length && !adding && <tr><td colSpan={canManage ? 4 : 3} className="px-4 py-8 text-center text-gray-500">No job openings found.</td></tr>}
    </tbody></table></div>
  </section>;
}
