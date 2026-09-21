import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const API_URL = '/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [state, setState] = useState({ checking: true, valid: false, error: '', success: '' });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function validate() {
      if (!token) {
        if (active) setState({ checking: false, valid: false, error: 'This password reset link is invalid or has expired.', success: '' });
        return;
      }
      try {
        const response = await fetch(`${API_URL}/auth/reset-password/validate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
        });
        if (!response.ok) throw new Error();
        if (active) setState({ checking: false, valid: true, error: '', success: '' });
      } catch {
        if (active) setState({ checking: false, valid: false, error: 'This password reset link is invalid or has expired.', success: '' });
      }
    }
    validate();
    return () => { active = false; };
  }, [token]);

  const submit = async event => {
    event.preventDefault();
    if (newPassword.length < 8) return setState(current => ({ ...current, error: 'Password must be at least 8 characters.' }));
    if (newPassword !== confirmPassword) return setState(current => ({ ...current, error: 'Passwords do not match.' }));
    setSubmitting(true);
    setState(current => ({ ...current, error: '' }));
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to reset password.');
      setState({ checking: false, valid: false, error: '', success: data.message });
      setNewPassword(''); setConfirmPassword('');
      window.setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (error) {
      setState(current => ({ ...current, error: error.message || 'Unable to reset password.' }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e9edf4] px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-8">
        <h1 className="text-2xl font-semibold text-center mb-6 text-[#1a3353]">Create New Password</h1>
        {state.checking && <p className="text-center text-gray-500">Validating secure link…</p>}
        {state.error && <p className="mb-4 text-sm text-red-600">{state.error}</p>}
        {state.success ? (
          <div className="text-center space-y-4"><p className="text-green-700">{state.success}</p><Link className="text-[#1a3353] underline" to="/login">Return to login</Link></div>
        ) : state.valid && (
          <form onSubmit={submit} className="space-y-4">
            <div><label className="block text-sm text-[#1a3353] mb-1">New Password</label><input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} className="w-full border rounded px-3 py-2" required /></div>
            <div><label className="block text-sm text-[#1a3353] mb-1">Confirm New Password</label><input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="w-full border rounded px-3 py-2" required /></div>
            <button type="submit" disabled={submitting} className="w-full bg-[#1a3353] text-white py-3 rounded font-semibold">{submitting ? 'Updating…' : 'Update Password'}</button>
          </form>
        )}
        {!state.checking && !state.valid && !state.success && <p className="text-center"><Link className="text-[#1a3353] underline" to="/login">Return to login</Link></p>}
      </div>
    </div>
  );
}
