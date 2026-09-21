import { useEffect, useState } from 'react';
import AdminTypography from '../../components/admin/AdminTypography';

const EMPTY_FILTERS = {
  search: '',
  projectStatus: '',
  vendor: '',
  client: '',
  visaStatus: '',
};

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function ValuesCell({ values }) {
  if (!values?.length) return <span className="text-gray-500">—</span>;
  return <div className="space-y-1">{values.map(value => <div key={value}>{value}</div>)}</div>;
}

function RateCell({ vendorAssociations }) {
  if (!vendorAssociations?.length) return <span className="text-gray-500">—</span>;
  return <div className="space-y-1">{vendorAssociations.map((association, index) => {
    const amount = association.rate === null || association.rate === undefined
      ? '—'
      : Number(association.rate).toFixed(2);
    return <div key={`${association.vendorId || association.vendorName}-${index}`}>{amount === '—'
      ? `${association.vendorName} —`
      : `${association.vendorName} — ${association.currency ? `${association.currency} ` : ''}${amount}/hr`}</div>;
  })}</div>;
}

export default function EmployeeAssociations() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [employees, setEmployees] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ vendors: [], clients: [], visaStatuses: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
        const response = await fetch(`/api/admin/employee-associations${params.size ? `?${params}` : ''}`, {
          headers: authHeaders(), signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Unable to load employee associations.');
        setEmployees(data.employees || []);
        setFilterOptions(data.filterOptions || { vendors: [], clients: [], visaStatuses: [] });
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          setEmployees([]);
          setError(requestError.message || 'Unable to load employee associations.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [filters]);

  const updateFilter = event => {
    const { name, value } = event.target;
    setFilters(current => ({ ...current, [name]: value }));
  };

  return (
    <main className="flex-1 p-8 bg-white min-h-screen">
      <AdminTypography.h1 className="mb-8">Employee & Project Details</AdminTypography.h1>

      <section className="mb-6 rounded-xl border border-gray-300 bg-white p-5 shadow-sm" aria-label="Employee association filters">
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-gray-700">Employee<input name="search" value={filters.search} onChange={updateFilter} placeholder="Search employee..." className="h-10 w-full rounded border border-gray-400 px-3" aria-label="Search employee" /></label>
          <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-gray-700">Project Status<select name="projectStatus" value={filters.projectStatus} onChange={updateFilter} className="h-10 w-full rounded border border-gray-400 px-3" aria-label="Filter by project status"><option value="">All</option><option value="In Project">In Project</option><option value="Not in Project">Not in Project</option></select></label>
          <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-gray-700">Vendor<select name="vendor" value={filters.vendor} onChange={updateFilter} className="h-10 w-full rounded border border-gray-400 px-3" aria-label="Filter by vendor"><option value="">All</option>{filterOptions.vendors.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-gray-700">Client<select name="client" value={filters.client} onChange={updateFilter} className="h-10 w-full rounded border border-gray-400 px-3" aria-label="Filter by client"><option value="">All</option>{filterOptions.clients.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-gray-700">Visa Status<select name="visaStatus" value={filters.visaStatus} onChange={updateFilter} className="h-10 w-full rounded border border-gray-400 px-3" aria-label="Filter by visa status"><option value="">All</option>{filterOptions.visaStatuses.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <div className="flex items-end"><AdminTypography.button className="h-10 w-full md:w-auto md:min-w-36" variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>Clear Filters</AdminTypography.button></div>
        </div>
      </section>

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
      <div className="overflow-x-auto rounded-lg border border-gray-300">
        <table className="min-w-full bg-white">
          <thead><tr className="bg-blue-50 text-left"><th className="px-4 py-3">Employee Name</th><th className="px-4 py-3">Visa Status</th><th className="px-4 py-3">Project Status</th><th className="px-4 py-3">Vendor Name</th><th className="px-4 py-3">Client Name</th><th className="px-4 py-3">Prime Vendor</th><th className="px-4 py-3">Rate Per Hour</th></tr></thead>
          <tbody>
            {employees.map(employee => <tr key={employee.employeeId} className="border-t border-gray-200 align-top"><td className="px-4 py-3 font-semibold">{employee.employeeName}</td><td className="px-4 py-3">{employee.visaStatus || <span className="text-gray-500">—</span>}</td><td className="px-4 py-3">{employee.projectStatus}</td><td className="px-4 py-3"><ValuesCell values={employee.vendorNames} /></td><td className="px-4 py-3"><ValuesCell values={employee.clientNames} /></td><td className="px-4 py-3"><ValuesCell values={employee.primeVendorNames} /></td><td className="px-4 py-3"><RateCell vendorAssociations={employee.vendorAssociations} /></td></tr>)}
            {!loading && !employees.length && <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">No employees match the selected filters.</td></tr>}
            {loading && <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">Loading employees...</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
