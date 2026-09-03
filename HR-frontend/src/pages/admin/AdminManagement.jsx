import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const API = '/api/admin-users';
const roleLabel = { hr: 'HR Admin', recruitment: 'Recruiting Admin', accounts: 'Accounts Admin', payroll: 'Accounts Admin (legacy)', operations: 'Operations Admin (legacy)', general: 'General Admin (legacy)' };

export default function AdminManagement() {
  const { user, isRootAdmin } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [roles, setRoles] = useState({});
  const [form, setForm] = useState({ email: '', password: '', adminRole: 'hr' });
  const [error, setError] = useState('');

  const request = async (url = '', options = {}) => {
    const response = await fetch(`${API}${url}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(options.headers || {}) } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  };
  const load = async () => { try { const data = await request(); setAdmins(data.admins); setRoles(data.rolePresets); } catch (e) { setError(e.message); } };
  useEffect(() => { if (isRootAdmin) load(); }, [isRootAdmin]);
  if (!isRootAdmin) return <div className="text-red-600 font-semibold">Unauthorized</div>;
  const create = async event => { event.preventDefault(); setError(''); try { await request('', { method: 'POST', body: JSON.stringify(form) }); setForm({ email: '', password: '', adminRole: 'hr' }); await load(); } catch (e) { setError(e.message); } };
  const toggle = async admin => { try { await request(`/${admin.id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: !admin.isActive }) }); await load(); } catch (e) { setError(e.message); } };
  const changeRole = async (admin, adminRole) => { try { await request(`/${admin.id}`, { method: 'PATCH', body: JSON.stringify({ adminRole, permissions: roles[adminRole] }) }); await load(); } catch (e) { setError(e.message); } };
  const assignableRoles = ['hr', 'recruitment', 'accounts'].filter(role => roles[role]);
  return <main className="max-w-5xl mx-auto space-y-8"><div><h1 className="text-3xl font-bold">Admin Management</h1><p className="text-gray-600">Only the Root Admin can create and manage administrator accounts.</p></div>{error && <p className="text-red-600">{error}</p>}<form onSubmit={create} className="grid md:grid-cols-4 gap-3 bg-white p-5 rounded shadow"><input required type="email" placeholder="Admin email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="border rounded p-2"/><input required minLength="8" type="password" placeholder="Temporary password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="border rounded p-2"/><select value={form.adminRole} onChange={e => setForm({ ...form, adminRole: e.target.value })} className="border rounded p-2">{assignableRoles.map(role => <option key={role} value={role}>{roleLabel[role]}</option>)}</select><button className="bg-[#1a3353] text-white rounded px-4 py-2">Create Admin</button></form><div className="bg-white rounded shadow overflow-x-auto"><table className="w-full"><thead><tr className="text-left border-b"><th className="p-3">Email</th><th>Account</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>{admins.map(admin => <tr key={admin.id} className="border-b"><td className="p-3">{admin.email}</td><td>{admin.accountType}</td><td>{admin.accountType === 'admin' ? <select value={admin.adminRole || 'general'} onChange={e => changeRole(admin, e.target.value)}>{[...assignableRoles, ...(admin.adminRole && !assignableRoles.includes(admin.adminRole) ? [admin.adminRole] : [])].map(role => <option key={role} value={role}>{roleLabel[role] || role}</option>)}</select> : '—'}</td><td>{admin.isActive ? 'Active' : 'Inactive'}</td><td>{admin.accountType === 'admin' && <button onClick={() => toggle(admin)} className="text-blue-700">{admin.isActive ? 'Deactivate' : 'Activate'}</button>}</td></tr>)}</tbody></table></div></main>;
}
