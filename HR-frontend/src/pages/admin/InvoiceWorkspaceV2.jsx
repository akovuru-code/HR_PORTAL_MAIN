import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminTypography from '../../components/admin/AdminTypography';

const terms = { 'Net 15': 15, 'Net 30': 30, 'Net 45': 45, 'Net 60': 60 };
const blankItem = { name: '', description: '', hours: '', rate: '' };
const initialForm = () => ({ companyId: '', templateName: 'standard', employeeId: '', employeeName: '', vendorId: '', vendorName: '', billToType: '', billToId: '', billToCompany: '', billingContactName: '', billingEmail: '', billingAddress: '', invoiceNumber: '', invoiceDate: '', paymentTerms: 'Net 30', customPaymentDays: '', dueDate: '', poNumber: '', currency: 'USD', status: 'Draft', items: [blankItem] });
const headers = () => ({ 'Content-Type': 'application/json', ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) });
const dateAfter = (date, days) => { if (!date || !days) return ''; const result = new Date(`${date}T00:00:00`); result.setDate(result.getDate() + Number(days)); return result.toISOString().slice(0, 10); };
const formatDate = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-US') : '';

function Field({ label, children }) { return <label className="block text-sm font-medium text-gray-700">{label}{children}</label>; }

export default function InvoiceWorkspaceV2({ employeeId: scopedEmployeeId }) {
  const [lookups, setLookups] = useState({ companies: [], employees: [], parties: [] });
  const [invoices, setInvoices] = useState([]);
  const [employeeVendors, setEmployeeVendors] = useState([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [currencyManuallySelected, setCurrencyManuallySelected] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ number: '', employee: '', billTo: '', status: '', currency: '', from: '', to: '' });
  const vendorRequest = useRef(0);
  const isScoped = Number.isInteger(scopedEmployeeId) && scopedEmployeeId > 0;

  const autoDescription = (employeeName, invoiceDate, dueDate) => employeeName && invoiceDate && dueDate ? `${employeeName} ${formatDate(invoiceDate)} - ${formatDate(dueDate)} Invoice` : '';
  const resetVendor = current => ({ ...current, vendorId: '', vendorName: '', items: current.items.map((item, index) => index === 0 ? { ...item, rate: '' } : item) });

  const loadVendors = useCallback(async (employeeId, autoSelectSingle = false) => {
    const requestId = ++vendorRequest.current;
    setEmployeeVendors([]);
    if (!employeeId) return;
    setVendorLoading(true);
    try {
      const response = await fetch(`/api/invoices/records/vendors?employeeId=${employeeId}`, { headers: headers() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load vendors.');
      if (requestId !== vendorRequest.current) return;
      const vendors = data.vendors || [];
      setEmployeeVendors(vendors);
      if (autoSelectSingle && vendors.length === 1) setForm(current => String(current.employeeId) === String(employeeId) ? ({ ...current, vendorId: String(vendors[0].id), vendorName: vendors[0].name, items: current.items.map((item, index) => index === 0 ? { ...item, rate: String(vendors[0].rate ?? '') } : item) }) : current);
    } catch (err) {
      if (requestId === vendorRequest.current) setError(err.message);
    } finally {
      if (requestId === vendorRequest.current) setVendorLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    const invoiceUrl = isScoped ? `/api/invoices/records?employeeId=${scopedEmployeeId}` : '/api/invoices/records';
    const [lookupResponse, invoiceResponse] = await Promise.all([fetch('/api/invoices/records/lookups', { headers: headers() }), fetch(invoiceUrl, { headers: headers() })]);
    if (lookupResponse.ok) setLookups(await lookupResponse.json());
    if (invoiceResponse.ok) setInvoices((await invoiceResponse.json()).invoices || []);
  }, [isScoped, scopedEmployeeId]);
  useEffect(() => { load().catch(() => setError('Unable to load invoices.')); }, [load]);
  useEffect(() => {
    if (!isScoped || !lookups.employees.length) return;
    const employee = lookups.employees.find(item => Number(item.id) === scopedEmployeeId);
    if (!employee) return;
    setForm(current => current.employeeId === String(scopedEmployeeId) ? current : ({ ...resetVendor(current), employeeId: String(scopedEmployeeId), employeeName: employee.name, items: [{ ...current.items[0], name: employee.name, rate: '', description: autoDescription(employee.name, current.invoiceDate, current.dueDate) || current.items[0].description }] }));
    loadVendors(scopedEmployeeId, true);
  }, [isScoped, scopedEmployeeId, lookups.employees, loadVendors]);

  const billToParties = lookups.parties.filter(party => party.type === ({ Client: 'client', Vendor: 'vendor', 'Prime Vendor': 'primeVendor' }[form.billToType]));
  const filtered = useMemo(() => invoices.filter(invoice => (!filters.number || invoice.invoiceNumber?.toLowerCase().includes(filters.number.toLowerCase())) && (isScoped || !filters.employee || invoice.employeeName?.toLowerCase().includes(filters.employee.toLowerCase())) && (!filters.billTo || invoice.billToCompany?.toLowerCase().includes(filters.billTo.toLowerCase())) && (!filters.status || invoice.status === filters.status) && (!filters.currency || invoice.currency === filters.currency) && (!filters.from || invoice.invoiceDate >= filters.from) && (!filters.to || invoice.invoiceDate <= filters.to)), [invoices, filters, isScoped]);
  const setValue = (name, value) => {
    if (name === 'currency') setCurrencyManuallySelected(true);
    setForm(current => {
      const next = { ...current, [name]: value };
      if (name === 'companyId') next.templateName = lookups.companies.find(company => String(company.id) === String(value))?.templateName || '';
      if (name === 'invoiceDate' || name === 'paymentTerms' || name === 'customPaymentDays') {
        const days = name === 'paymentTerms' ? terms[value] : (current.paymentTerms === 'Custom' ? (name === 'customPaymentDays' ? value : current.customPaymentDays) : terms[current.paymentTerms]);
        next.dueDate = dateAfter(name === 'invoiceDate' ? value : current.invoiceDate, days);
      }
      if (['dueDate', 'invoiceDate', 'paymentTerms', 'customPaymentDays'].includes(name)) {
        const previous = autoDescription(current.employeeName, current.invoiceDate, current.dueDate);
        const description = autoDescription(current.employeeName, name === 'invoiceDate' ? value : current.invoiceDate, next.dueDate);
        if (!current.items[0].description || current.items[0].description === previous) next.items = [{ ...current.items[0], description }];
      }
      return next;
    });
  };
  const setItem = (name, value) => setForm(current => ({ ...current, items: current.items.map((item, index) => index === 0 ? { ...item, [name]: value } : item) }));
  const selectEmployee = async id => {
    if (isScoped) return;
    const employee = lookups.employees.find(item => String(item.id) === id);
    setForm(current => {
      const next = resetVendor(current);
      const description = !current.items[0].description || current.items[0].description === autoDescription(current.employeeName, current.invoiceDate, current.dueDate) ? autoDescription(employee?.name, current.invoiceDate, current.dueDate) : current.items[0].description;
      return { ...next, employeeId: id, employeeName: employee?.name || '', items: [{ ...next.items[0], name: employee?.name || '', description }] };
    });
    await loadVendors(id, true);
  };
  const selectVendor = id => {
    const vendor = employeeVendors.find(item => String(item.id) === id);
    setForm(current => ({ ...current, vendorId: id, vendorName: vendor?.name || '', items: current.items.map((item, index) => index === 0 ? { ...item, rate: vendor ? String(vendor.rate ?? '') : '' } : item) }));
  };
  const selectBillTo = id => {
    const party = lookups.parties.find(item => String(item.id) === id);
    if (!party) return;
    setForm(current => ({ ...current, billToId: id, billToCompany: party.name, billingContactName: party.billingContactName || '', billingEmail: party.billingEmail || '', billingAddress: party.billingAddress || '', paymentTerms: party.paymentTerms || current.paymentTerms, customPaymentDays: party.customNetDays || '', currency: currencyManuallySelected ? current.currency : (party.currency || current.currency), dueDate: dateAfter(current.invoiceDate, party.paymentTerms === 'Custom' ? party.customNetDays : terms[party.paymentTerms]) }));
  };
  const startNew = () => {
    const employee = isScoped ? lookups.employees.find(item => Number(item.id) === scopedEmployeeId) : null;
    setForm({ ...initialForm(), employeeId: employee ? String(employee.id) : '', employeeName: employee?.name || '', items: [{ ...blankItem, name: employee?.name || '' }] });
    setCurrencyManuallySelected(false);
    setEditingId(null); setOpen(true); setError('');
    if (isScoped) loadVendors(scopedEmployeeId, true);
  };
  const edit = invoice => { setEditingId(invoice.id); setForm({ ...initialForm(), ...invoice, companyId: invoice.company_id || '', employeeId: String(invoice.employee_id || ''), vendorId: String(invoice.vendor_id || ''), customPaymentDays: invoice.customPaymentDays || '', items: invoice.items?.length ? invoice.items : [blankItem] }); setCurrencyManuallySelected(true); setOpen(true); loadVendors(invoice.employee_id); };
  const openPdf = async url => { const response = await fetch(url, { headers: headers() }); if (!response.ok) return setError('Could not open PDF.'); const objectUrl = URL.createObjectURL(await response.blob()); window.open(objectUrl, '_blank', 'noopener,noreferrer'); window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000); };
  const downloadPdf = async invoice => { const response = await fetch(invoice.pdfUrl, { headers: headers() }); if (!response.ok) return setError('Could not download PDF.'); const objectUrl = URL.createObjectURL(await response.blob()); const anchor = document.createElement('a'); anchor.href = objectUrl; anchor.download = invoice.originalName || `${invoice.employeeName || 'Employee'} Invoice.pdf`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0); };
  const save = async generate => {
    try {
      setError('');
      if (generate && (!form.vendorId || form.items[0].rate === '')) throw new Error('Select a vendor with a configured employee rate before generating the invoice PDF.');
      const payload = { ...form, companyName: lookups.companies.find(company => String(company.id) === String(form.companyId))?.name || '', createdBy: JSON.parse(localStorage.getItem('user') || '{}').name || '' };
      const response = await fetch(editingId ? `/api/invoices/records/${editingId}` : '/api/invoices/records', { method: editingId ? 'PATCH' : 'POST', headers: headers(), body: JSON.stringify(payload) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not save invoice');
      if (generate) { const pdf = await fetch(`/api/invoices/records/${data.invoice.id}/generate-pdf`, { method: 'POST', headers: headers() }); const pdfData = await pdf.json(); if (!pdf.ok) throw new Error(pdfData.error || 'Could not generate PDF'); await openPdf(pdfData.invoice.pdfUrl); }
      setOpen(false); await load();
    } catch (err) { setError(err.message); }
  };
  const regenerate = async invoice => { const response = await fetch(`/api/invoices/records/${invoice.id}/regenerate-pdf`, { method: 'POST', headers: headers() }); const data = await response.json(); if (!response.ok) return setError(data.error || 'Could not regenerate PDF'); await load(); openPdf(data.invoice.pdfUrl); };
  const total = Number(form.items[0].hours || 0) * Number(form.items[0].rate || 0);
  const vendorPlaceholder = vendorLoading ? 'Loading Vendors...' : !form.employeeId ? 'Select Employee First' : !employeeVendors.length ? 'No Vendors Assigned' : 'Select Vendor';

  return <div className="max-w-7xl mx-auto px-4 py-8">
    <div className="flex justify-between items-center mb-5"><AdminTypography.label className="text-gray-900">Invoices</AdminTypography.label><AdminTypography.button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={startNew}>+ Create Invoice</AdminTypography.button></div>
    {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}
    <div className="bg-white border rounded-xl shadow-sm p-4 mb-5 grid md:grid-cols-4 gap-3"><input className="border rounded px-3 py-2" placeholder="Invoice Number" value={filters.number} onChange={event => setFilters({ ...filters, number: event.target.value })} />{!isScoped && <input className="border rounded px-3 py-2" placeholder="Employee" value={filters.employee} onChange={event => setFilters({ ...filters, employee: event.target.value })} />}<input className="border rounded px-3 py-2" placeholder="Bill To Company" value={filters.billTo} onChange={event => setFilters({ ...filters, billTo: event.target.value })} /><select className="border rounded px-3 py-2" value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value })}><option value="">Status</option>{['Draft', 'Generated', 'Sent', 'Paid', 'Overdue', 'Cancelled'].map(status => <option key={status}>{status}</option>)}</select><select className="border rounded px-3 py-2" value={filters.currency} onChange={event => setFilters({ ...filters, currency: event.target.value })}><option value="">Currency</option><option>USD</option><option>INR</option><option>CAD</option></select><input className="border rounded px-3 py-2" type="date" aria-label="From Date" value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })} /><input className="border rounded px-3 py-2" type="date" aria-label="To Date" value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value })} /><button className="border rounded px-3 py-2" onClick={() => setFilters({ number: '', employee: '', billTo: '', status: '', currency: '', from: '', to: '' })}>Clear Filters</button></div>
    <div className="overflow-x-auto bg-white border rounded-xl shadow-sm"><table className="min-w-full text-sm"><thead className="bg-gray-50"><tr>{['Invoice Number', ...(!isScoped ? ['Employee'] : []), 'Bill To', 'Invoice Date', 'Hours', 'Rate', 'Amount', 'Paid', 'Balance Due', 'Due Date', 'Status', 'Actions'].map(title => <th key={title} className="p-3 text-left">{title}</th>)}</tr></thead><tbody>{filtered.map(invoice => <tr className="border-t" key={invoice.id}><td className="p-3">{invoice.invoiceNumber}</td>{!isScoped && <td className="p-3">{invoice.employeeName}</td>}<td className="p-3">{invoice.billToCompany}</td><td className="p-3">{invoice.invoiceDate}</td><td className="p-3">{invoice.items?.[0]?.hours}</td><td className="p-3">{invoice.items?.[0]?.rate}</td><td className="p-3">{invoice.total}</td><td className="p-3">{invoice.paymentsApplied || 0}</td><td className="p-3">{invoice.balanceDue}</td><td className="p-3">{invoice.dueDate}</td><td className="p-3">{invoice.status}</td><td className="p-3 whitespace-nowrap space-x-2"><button className="text-blue-700" onClick={() => edit(invoice)}>Edit</button>{invoice.pdfUrl && <><button className="text-blue-700" onClick={() => openPdf(invoice.pdfUrl)}>Preview</button><button className="text-blue-700" onClick={() => downloadPdf(invoice)}>Download</button></>}<button className="text-blue-700" onClick={() => regenerate(invoice)}>Regenerate</button>{invoice.payments?.length ? <span className="ml-2 text-xs text-gray-500" title={invoice.payments.map(payment => `${payment.date}: ${payment.amount}`).join('\n')}>{invoice.payments.length} payment{invoice.payments.length === 1 ? '' : 's'}</span> : null}</td></tr>)}{!filtered.length && <tr><td colSpan={isScoped ? '11' : '12'} className="p-8 text-center text-gray-500">No invoices found.</td></tr>}</tbody></table></div>
    {open && <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto p-4"><div className="bg-white max-w-5xl mx-auto rounded-xl shadow-xl p-7"><div className="flex justify-between border-b pb-4 mb-5"><h2 className="text-xl font-semibold">{editingId ? 'Edit Invoice' : 'Create Invoice'}</h2><button onClick={() => setOpen(false)}>×</button></div><div className="space-y-6">
      <section className="border rounded-lg p-4"><h3 className="font-semibold mb-3">Company / Template</h3><div className="grid md:grid-cols-3 gap-4"><Field label="Company"><select className="mt-1 w-full border rounded px-3 py-2" value={form.companyId} onChange={event => setValue('companyId', event.target.value)}><option value="">Select Company</option>{lookups.companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></Field><Field label="Template"><input className="mt-1 w-full border rounded px-3 py-2 bg-gray-50" value={lookups.companies.find(company => String(company.id) === String(form.companyId))?.templateName || 'Select Company First'} readOnly /></Field><Field label="Currency"><select className="mt-1 w-full border rounded px-3 py-2" value={form.currency} onChange={event => setValue('currency', event.target.value)}><option value="USD">USD — US Dollar</option><option value="INR">INR — Indian Rupee</option><option value="CAD">CAD — Canadian Dollar</option></select></Field></div></section>
      <section className="border rounded-lg p-4"><h3 className="font-semibold mb-3">Employee / Vendor</h3><div className="grid md:grid-cols-2 gap-4"><Field label="Employee / Consultant"><select className="mt-1 w-full border rounded px-3 py-2 disabled:bg-gray-100" value={form.employeeId} disabled={isScoped} onChange={event => selectEmployee(event.target.value)}><option value="">Select Employee</option>{lookups.employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></Field><Field label="Vendor"><select className="mt-1 w-full border rounded px-3 py-2 disabled:bg-gray-100" value={form.vendorId} disabled={!form.employeeId || vendorLoading || !employeeVendors.length} onChange={event => selectVendor(event.target.value)}><option value="">{vendorPlaceholder}</option>{employeeVendors.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select>{form.employeeId && !vendorLoading && !employeeVendors.length && <p className="mt-1 text-xs text-amber-700">No vendors are assigned to this employee.</p>}</Field></div></section>
      <section className="border rounded-lg p-4"><h3 className="font-semibold mb-3">Bill To</h3><div className="grid md:grid-cols-2 gap-4"><Field label="Bill To Type"><select className="mt-1 w-full border rounded px-3 py-2" value={form.billToType} onChange={event => setValue('billToType', event.target.value)}><option value="">Select Type</option><option>Client</option><option>Vendor</option><option>Prime Vendor</option></select></Field><Field label="Bill To Company"><select className="mt-1 w-full border rounded px-3 py-2" value={form.billToId} onChange={event => selectBillTo(event.target.value)}><option value="">Select Company</option>{billToParties.map(party => <option key={party.id} value={party.id}>{party.name}</option>)}</select></Field><Field label="Billing Contact"><input className="mt-1 w-full border rounded px-3 py-2" value={form.billingContactName} onChange={event => setValue('billingContactName', event.target.value)} /></Field><Field label="Billing Email"><input className="mt-1 w-full border rounded px-3 py-2" value={form.billingEmail} onChange={event => setValue('billingEmail', event.target.value)} /></Field><Field label="Billing Address"><textarea className="mt-1 w-full border rounded px-3 py-2" value={form.billingAddress} onChange={event => setValue('billingAddress', event.target.value)} /></Field></div></section>
      <section className="border rounded-lg p-4"><h3 className="font-semibold mb-3">Invoice Details</h3><div className="grid md:grid-cols-3 gap-4"><Field label="Invoice Number"><input className="mt-1 w-full border rounded px-3 py-2" value={form.invoiceNumber} onChange={event => setValue('invoiceNumber', event.target.value)} /></Field><Field label="Invoice Date"><input className="mt-1 w-full border rounded px-3 py-2" type="date" value={form.invoiceDate} onChange={event => setValue('invoiceDate', event.target.value)} /></Field><Field label="Due Date"><input className="mt-1 w-full border rounded px-3 py-2" type="date" value={form.dueDate} onChange={event => setValue('dueDate', event.target.value)} /></Field><Field label="Payment Terms"><select className="mt-1 w-full border rounded px-3 py-2" value={form.paymentTerms} onChange={event => setValue('paymentTerms', event.target.value)}>{[...Object.keys(terms), 'Custom'].map(term => <option key={term}>{term}</option>)}</select></Field>{form.paymentTerms === 'Custom' && <Field label="Custom Net Days"><input className="mt-1 w-full border rounded px-3 py-2" type="number" min="1" step="1" value={form.customPaymentDays} onChange={event => setValue('customPaymentDays', event.target.value)} /></Field>}<Field label="PO Number"><input className="mt-1 w-full border rounded px-3 py-2" value={form.poNumber} onChange={event => setValue('poNumber', event.target.value)} /></Field></div></section>
      <section className="border rounded-lg p-4"><h3 className="font-semibold mb-3">Invoice Item</h3><div className="grid md:grid-cols-4 gap-4"><Field label="Name"><input className="mt-1 w-full border rounded px-3 py-2 bg-gray-50" value={form.items[0].name} readOnly /></Field><Field label="Description"><input className="mt-1 w-full border rounded px-3 py-2" value={form.items[0].description} onChange={event => setItem('description', event.target.value)} /></Field><Field label="Hours"><input className="mt-1 w-full border rounded px-3 py-2" type="number" min="0" value={form.items[0].hours} onChange={event => setItem('hours', event.target.value)} /></Field><Field label="Rate"><input className="mt-1 w-full border rounded px-3 py-2" type="number" min="0" step="0.01" value={form.items[0].rate} onChange={event => setItem('rate', event.target.value)} /></Field></div></section>
      <section className="bg-gray-50 rounded-lg p-4 text-right"><p>Subtotal: {form.currency} {total.toFixed(2)}</p><p className="font-semibold text-lg">Total / Balance Due: {form.currency} {total.toFixed(2)}</p></section><div className="flex justify-end gap-3"><button className="px-4 py-2 rounded bg-gray-200" onClick={() => setOpen(false)}>Cancel</button><button className="px-4 py-2 rounded border" onClick={() => window.print()}>Preview Invoice</button><button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={() => save(false)}>Save as Draft</button><button className="px-4 py-2 rounded bg-slate-800 text-white" onClick={() => save(true)}>Generate Invoice PDF</button></div>
    </div></div></div>}
  </div>;
}
