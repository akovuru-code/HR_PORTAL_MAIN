import { useEffect, useMemo, useState } from 'react';
import AdminTypography from '../../components/admin/AdminTypography';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function EmployeeTrainingStatus() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/admin/employee-training-status', {
          headers: authHeaders(),
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Unable to load employee training status.');
        setEmployees(data.employees || []);
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          setEmployees([]);
          setError(requestError.message || 'Unable to load employee training status.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, []);

  const visibleEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter(employee => (
      String(employee.employeeName || '').toLowerCase().includes(query)
      || String(employee.email || '').toLowerCase().includes(query)
    ));
  }, [employees, search]);

  return (
    <main className="min-h-screen flex-1 bg-white p-8">
      <AdminTypography.h1 className="mb-2">Employee Training Status</AdminTypography.h1>
      <AdminTypography.p className="mb-6 text-gray-600">Track employees currently in training, their ongoing training modules, and completed certifications.</AdminTypography.p>

      <section className="mb-6 grid max-w-xs grid-cols-1">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <div className="text-sm font-medium text-blue-800">Employees In Training</div>
          <div className="mt-1 text-3xl font-bold text-blue-900">{employees.length}</div>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
        <label className="flex max-w-lg flex-col gap-1.5 text-sm font-medium text-gray-700">
          Search Employee
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search by employee name or email..."
            className="h-10 w-full rounded border border-gray-400 px-3"
          />
        </label>
      </section>

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
      <div className="overflow-x-auto rounded-lg border border-gray-300">
        <table className="min-w-full bg-white text-left">
          <thead>
            <tr className="bg-blue-50 text-gray-800">
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Current Status</th>
              <th className="px-4 py-3">Ongoing Training Modules</th>
              <th className="px-4 py-3">Certifications Completed</th>
            </tr>
          </thead>
          <tbody>
            {visibleEmployees.map(employee => (
              <tr key={employee.employeeId} className="border-t border-gray-200 align-top">
                <td className="px-4 py-3 font-semibold text-gray-900">{employee.employeeName || '—'}</td>
                <td className="px-4 py-3 text-gray-700">{employee.email || '—'}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">{employee.currentStatus || 'In Training'}</span></td>
                <td className="max-w-sm whitespace-pre-wrap break-words px-4 py-3 text-gray-700">{employee.trainingModules || '—'}</td>
                <td className="max-w-sm whitespace-pre-wrap break-words px-4 py-3 text-gray-700">{employee.certifications || '—'}</td>
              </tr>
            ))}
            {!loading && !visibleEmployees.length && <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No employees are currently in training.</td></tr>}
            {loading && <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">Loading employee training status...</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
