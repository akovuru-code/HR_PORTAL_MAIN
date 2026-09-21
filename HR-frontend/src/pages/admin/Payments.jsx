import { useEffect, useMemo, useRef, useState } from "react";
import { FaChevronDown, FaChevronUp, FaColumns, FaDownload, FaPlus, FaSearch, FaSlidersH } from "react-icons/fa";
import AdminTypography from "../../components/admin/AdminTypography";
import { useAuth } from "../../hooks/useAuth";
import { downloadCsvUtf8 } from "../../utils/csv";

const PAYMENT_METHODS = ["ACH", "Check", "Credit Card", "Wire"];
const CURRENCIES = ["USD", "INR", "CAD"];
const authHeaders = (json = false) => ({ ...(json ? { "Content-Type": "application/json" } : {}), ...(localStorage.getItem("token") ? { Authorization: `Bearer ${localStorage.getItem("token")}` } : {}) });
const money = (amount, currency = "USD") => new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(Number(amount || 0));
const emptyPayment = { date: "", vendorId: "", currency: "", referenceNumber: "", paymentMethod: "" };
const PAYMENT_COLUMNS = [
  { key: "date", label: "DATE" }, { key: "vendor", label: "VENDOR" }, { key: "invoiceNumbers", label: "INVOICES" },
  { key: "referenceNumber", label: "REF #" }, { key: "paymentMethod", label: "PAYMENT METHOD" }, { key: "amount", label: "AMOUNT" },
];

function ReceivePaymentModal({ open, onClose, onSaved, vendors }) {
  const [form, setForm] = useState(emptyPayment);
  const [allocations, setAllocations] = useState({});
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => { if (open) { setForm(emptyPayment); setAllocations({}); setInvoices([]); setError(""); setErrors({}); } }, [open]);
  useEffect(() => {
    if (!open || !form.vendorId || !form.currency) { setInvoices([]); setAllocations({}); return undefined; }
    let cancelled = false;
    setInvoices([]); setAllocations({}); setLoading(true); setError("");
    fetch(`/api/payments/open-invoices?${new URLSearchParams({ vendorId: form.vendorId, currency: form.currency })}`, { headers: authHeaders() })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Failed to load open invoices."); return data.invoices || []; })
      .then(data => { if (!cancelled) setInvoices(data); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [form.vendorId, form.currency, open]);

  if (!open) return null;
  const total = Object.values(allocations).reduce((sum, amount) => sum + Number(amount || 0), 0);
  const setField = event => { const { name, value } = event.target; setForm(current => ({ ...current, [name]: value })); setErrors(current => ({ ...current, [name]: "", form: "" })); };
  const setAllocation = (invoice, value) => {
    const amount = value === "" ? "" : value.replace(/[^\d.]/g, "");
    setAllocations(current => ({ ...current, [invoice.id]: amount }));
    setErrors(current => ({ ...current, allocations: "", form: "" }));
  };
  const submit = async event => {
    event.preventDefault();
    const next = {};
    if (!form.date) next.date = "Received On is required.";
    if (!form.vendorId) next.vendorId = "Vendor is required.";
    if (!form.currency) next.currency = "Currency is required to load invoices.";
    if (!form.referenceNumber.trim()) next.referenceNumber = "Reference Number is required.";
    if (!form.paymentMethod) next.paymentMethod = "Payment Method is required.";
    const rows = invoices.map(invoice => ({ invoiceId: invoice.id, amount: Number(allocations[invoice.id] || 0) })).filter(row => row.amount > 0);
    if (!rows.length) next.allocations = "Enter a payment amount for at least one invoice.";
    for (const row of rows) { const invoice = invoices.find(item => item.id === row.invoiceId); if (row.amount > Number(invoice.openBalance)) next.allocations = `Payment for ${invoice.invoiceNumber} cannot exceed its open balance.`; }
    if (Object.keys(next).length) return setErrors(next);
    setSaving(true);
    try {
      const response = await fetch("/api/payments", { method: "POST", headers: authHeaders(true), body: JSON.stringify({ ...form, allocations: rows }) });
      const data = await response.json();
      if (!response.ok) return setErrors({ ...(data.errors || {}), form: data.error || "Failed to save payment." });
      onSaved(data.payment); onClose();
    } catch { setErrors({ form: "Unable to connect to the Payments service." }); }
    finally { setSaving(false); }
  };
  const inputClass = name => `w-full rounded-lg border px-3 py-2.5 text-sm ${errors[name] ? "border-red-400" : "border-gray-300"}`;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onMouseDown={event => { if (dialogRef.current && !dialogRef.current.contains(event.target)) onClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl sm:p-8">
      <div className="mb-6 flex justify-between"><h2 className="font-admin text-2xl font-semibold">Receive Payment</h2><button type="button" onClick={onClose}>×</button></div>
      <form onSubmit={submit} noValidate><div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label>Vendor <span className="text-red-500">*</span><select name="vendorId" value={form.vendorId} onChange={setField} className={inputClass("vendorId")}><option value="">Select Vendor</option>{vendors.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select>{errors.vendorId && <p className="text-xs text-red-600">{errors.vendorId}</p>}</label>
        <label>Currency<select name="currency" value={form.currency} onChange={setField} className={inputClass("currency")}><option value="">Select Currency</option>{CURRENCIES.map(currency => <option key={currency}>{currency}</option>)}</select>{errors.currency && <p className="text-xs text-red-600">{errors.currency}</p>}</label>
        <label>Amount Received<input readOnly value={total ? total.toFixed(2) : ""} placeholder="Calculated from allocations" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm" /></label>
        <label>Received On <span className="text-red-500">*</span><input name="date" type="date" value={form.date} onChange={setField} className={inputClass("date")} />{errors.date && <p className="text-xs text-red-600">{errors.date}</p>}</label>
        <label>Payment Method <span className="text-red-500">*</span><select name="paymentMethod" value={form.paymentMethod} onChange={setField} className={inputClass("paymentMethod")}><option value="">Select Payment Method</option>{PAYMENT_METHODS.map(method => <option key={method}>{method}</option>)}</select>{errors.paymentMethod && <p className="text-xs text-red-600">{errors.paymentMethod}</p>}</label>
        <label>Reference Number <span className="text-red-500">*</span><input name="referenceNumber" value={form.referenceNumber} onChange={setField} className={inputClass("referenceNumber")} />{errors.referenceNumber && <p className="text-xs text-red-600">{errors.referenceNumber}</p>}</label>
      </div>
      <section className="mt-8"><h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">Open Invoices</h3>
        {!form.vendorId || !form.currency ? <p className="text-sm text-gray-600">Select a vendor and currency to view open invoices.</p> : loading ? <p className="rounded border px-4 py-5 text-sm text-gray-500">Loading open invoices...</p> : error ? <p className="rounded border border-red-200 bg-red-50 px-4 py-5 text-red-700">{error}</p> : !invoices.length ? <p className="rounded border px-4 py-5 text-sm text-gray-500">No open invoices match the selected vendor and currency.</p> : <div className="overflow-x-auto rounded-lg border border-gray-200"><table className="min-w-[720px] w-full text-sm"><thead><tr className="bg-gray-100 text-left text-xs font-bold uppercase tracking-wide text-gray-500"><th className="w-[18%] px-5 py-4">Invoice #</th><th className="w-[17%] px-5 py-4">Due Date</th><th className="w-[20%] px-5 py-4 text-right">Original Amount</th><th className="w-[20%] px-5 py-4 text-right">Open Balance</th><th className="w-[25%] px-5 py-4 text-right">Payment</th></tr></thead><tbody>{invoices.map(invoice => <tr key={invoice.id} className="border-t border-gray-100"><td className="px-5 py-3 font-medium">#{invoice.invoiceNumber}</td><td className="px-5 py-3">{invoice.dueDate || "—"}</td><td className="px-5 py-3 text-right">{money(invoice.originalAmount, invoice.currency)}</td><td className="px-5 py-3 text-right">{money(invoice.openBalance, invoice.currency)}</td><td className="px-5 py-3 text-right"><input type="number" min="0" max={invoice.openBalance} step="0.01" value={allocations[invoice.id] || ""} onChange={event => setAllocation(invoice, event.target.value)} className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-right focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" /></td></tr>)}</tbody><tfoot><tr className="border-t-2 bg-gray-50"><td colSpan="4" className="px-5 py-4 text-right font-bold">TOTAL</td><td className="px-5 py-4 text-right font-bold">{money(total, form.currency || "USD")}</td></tr></tfoot></table></div>}
        {errors.allocations && <p className="mt-2 text-xs text-red-600">{errors.allocations}</p>}
      </section>{errors.form && <p className="mt-4 text-red-700">{errors.form}</p>}
      <div className="mt-7 flex justify-end gap-3"><AdminTypography.button type="button" variant="secondary" onClick={onClose}>Cancel</AdminTypography.button><AdminTypography.button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</AdminTypography.button></div>
      </form></div></div>;
}

export default function AdminPayments() {
  const { user } = useAuth(); const [payments, setPayments] = useState([]); const [vendors, setVendors] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [search, setSearch] = useState(""); const [vendorFilter, setVendorFilter] = useState(""); const [paymentMethod, setPaymentMethod] = useState(""); const [receivedDate, setReceivedDate] = useState(""); const [ascending, setAscending] = useState(false); const [modalOpen, setModalOpen] = useState(false); const [filtersVisible, setFiltersVisible] = useState(true); const [columnsOpen, setColumnsOpen] = useState(false); const [visibleColumns, setVisibleColumns] = useState(() => Object.fromEntries(PAYMENT_COLUMNS.map(column => [column.key, true])));
  const canManageInvoices = user?.accountType === "root_admin" || (user?.permissions || []).includes("invoice:manage");
  const load = async () => { setLoading(true); try { const [paymentResponse, vendorResponse] = await Promise.all([fetch("/api/payments", { headers: authHeaders() }), fetch("/api/admin/client-vendors?type=vendor", { headers: authHeaders() })]); const paymentData = await paymentResponse.json(); if (!paymentResponse.ok) throw new Error(paymentData.error || "Failed to load payments."); setPayments(paymentData.payments || []); if (vendorResponse.ok) setVendors((await vendorResponse.json()).items || []); } catch (err) { setError(err.message); } finally { setLoading(false); } };
  useEffect(() => { if (canManageInvoices) load(); else setLoading(false); }, [canManageInvoices]);
  const filtered = useMemo(() => payments.filter(payment => { const text = [payment.date, payment.vendor, payment.invoiceNumbers, payment.referenceNumber, payment.paymentMethod, payment.amount].join(" ").toLowerCase(); return (!search || text.includes(search.toLowerCase())) && (!vendorFilter || payment.vendor === vendorFilter) && (!paymentMethod || payment.paymentMethod === paymentMethod) && (!receivedDate || payment.date === receivedDate); }).sort((a,b) => ascending ? String(a.date).localeCompare(String(b.date)) : String(b.date).localeCompare(String(a.date))), [payments, search, vendorFilter, paymentMethod, receivedDate, ascending]);
  if (!canManageInvoices) return <main className="flex min-h-[60vh] items-center justify-center"><AdminTypography.p className="text-xl font-semibold text-red-600">Unauthorized: Invoice management access required</AdminTypography.p></main>;
  const vendorsForFilter = [...new Set([...vendors.map(item => item.name), ...payments.map(item => item.vendor)].filter(Boolean))];
  const activeColumns = PAYMENT_COLUMNS.filter(column => visibleColumns[column.key]);
  const exportCsv = () => { const rows = [["Date", "Vendor", "Invoices", "REF #", "Payment Method", "Amount"], ...filtered.map(payment => [payment.date, payment.vendor, payment.invoiceNumbers || payment.invoice || "", payment.referenceNumber, payment.paymentMethod, money(payment.amount, payment.currency)])]; downloadCsvUtf8(`payments-${new Date().toISOString().slice(0, 10)}.csv`, rows); };
  const actionClass = "flex h-11 w-11 items-center justify-center rounded-full bg-[#f1f3f3] text-blue-600 shadow-sm transition hover:bg-[#e5eeee] hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200";
  const controlClass = "h-12 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
  return <main className="min-h-full bg-white font-admin text-gray-800"><section className="px-3 pt-1 pb-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="mb-1 text-sm font-bold uppercase tracking-wide text-gray-500">Billing</p><h1 className="text-2xl font-normal">Payments</h1></div><div className="flex items-center gap-3 self-end sm:self-start"><button className={actionClass} onClick={exportCsv} title="Download filtered payments" aria-label="Download filtered payments"><FaDownload /></button><div className="relative"><button className={actionClass} onClick={() => setColumnsOpen(value => !value)} title="Choose columns" aria-label="Choose columns"><FaColumns /></button>{columnsOpen && <div className="absolute right-0 z-30 mt-2 w-52 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">{PAYMENT_COLUMNS.map(column => <label key={column.key} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50"><input type="checkbox" checked={visibleColumns[column.key]} onChange={() => setVisibleColumns(current => Object.values(current).filter(Boolean).length === 1 && current[column.key] ? current : { ...current, [column.key]: !current[column.key] })} />{column.label}</label>)}</div>}</div><button className={actionClass} onClick={() => setFiltersVisible(value => !value)} title="Show or hide filters" aria-label="Show or hide filters"><FaSlidersH /></button><button className={actionClass} onClick={() => setModalOpen(true)} title="Receive payment" aria-label="Receive payment"><FaPlus /></button></div></div>{filtersVisible && <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="relative"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" className={`${controlClass} pr-10`} /><FaSearch className="pointer-events-none absolute right-4 top-4 text-gray-300" /></div><select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)} className={controlClass}><option value="">Vendor</option>{vendorsForFilter.map(name => <option key={name}>{name}</option>)}</select><select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={controlClass}><option value="">Payment Method</option>{PAYMENT_METHODS.map(method => <option key={method}>{method}</option>)}</select><input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} aria-label="Received Date" title="Received Date" className={controlClass} /></div>}</section><section className="overflow-x-auto border-t">{error && <p className="p-3 text-red-700">{error}</p>}<table className="min-w-[900px] w-full"><thead><tr className="bg-[#eff0f1] text-left text-xs font-bold uppercase tracking-wide text-gray-500">{activeColumns.map(column => <th key={column.key} className={`px-5 py-4 ${column.key === "amount" ? "text-right" : ""}`}>{column.key === "date" ? <button onClick={() => setAscending(value => !value)} className="inline-flex items-center gap-2">{column.label}{ascending ? <FaChevronUp /> : <FaChevronDown />}</button> : column.label}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={activeColumns.length} className="p-12 text-center">Loading payments...</td></tr> : !filtered.length ? <tr><td colSpan={activeColumns.length} className="p-12 text-center">No payment records match the selected filters.</td></tr> : filtered.map(payment => <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50"><>{activeColumns.map(column => <td key={column.key} className={`px-5 py-4 ${column.key === "amount" ? "text-right font-semibold" : ""}`}>{column.key === "amount" ? money(payment.amount, payment.currency) : (payment[column.key] || (column.key === "invoiceNumbers" ? payment.invoice : "—"))}</td>)}</></tr>)}</tbody></table></section><ReceivePaymentModal open={modalOpen} vendors={vendors} onClose={() => setModalOpen(false)} onSaved={() => { setError(""); load(); }} /></main>;
}
