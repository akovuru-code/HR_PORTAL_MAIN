import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaChevronDown,
  FaChevronUp,
  FaColumns,
  FaDownload,
  FaFilter,
  FaPlus,
  FaSearch,
  FaSlidersH,
} from "react-icons/fa";
import AdminTypography from "../../components/admin/AdminTypography";
import { useAuth } from "../../hooks/useAuth";

const PAYMENT_METHODS = ["ACH", "Check", "Credit Card", "Wire"];
const CURRENCIES = [
  { value: "USD", label: "USD (US Dollar)" },
  { value: "INR", label: "INR (Indian Rupee)" },
  { value: "CAD", label: "CAD (Canadian Dollar)" },
];

const COLUMNS = [
  { key: "date", label: "DATE" },
  { key: "vendor", label: "VENDOR" },
  { key: "invoice", label: "INVOICES" },
  { key: "referenceNumber", label: "REF #" },
  { key: "paymentMethod", label: "PAYMENT METHOD" },
  { key: "amount", label: "AMOUNT" },
];

const emptyPayment = {
  date: "",
  vendor: "",
  currency: "",
  invoice: "",
  referenceNumber: "",
  paymentMethod: "",
  amount: "",
  notes: "",
};

const authHeaders = (includeJson = false) => {
  const token = localStorage.getItem("token");
  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const formatAmount = (amount) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
}).format(Number(amount || 0));

const formatInvoiceAmount = (amount, currency) => new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
  style: "currency",
  currency,
  minimumFractionDigits: 2,
}).format(Number(amount || 0));

const currencySymbol = (currency) => new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
  style: "currency",
  currency,
  currencyDisplay: "narrowSymbol",
}).formatToParts(0).find((part) => part.type === "currency")?.value || currency;

function ReceivePaymentModal({ open, onClose, onSaved, vendors }) {
  const [form, setForm] = useState(emptyPayment);
  const [invoicePayments, setInvoicePayments] = useState({});
  const [openInvoices, setOpenInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setForm(emptyPayment);
    setInvoicePayments({});
    setOpenInvoices([]);
    setInvoicesError("");
    setErrors({});
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !form.vendor || !form.currency) {
      setOpenInvoices([]);
      setInvoicesError("");
      setInvoicesLoading(false);
      return undefined;
    }

    let cancelled = false;
    const loadOpenInvoices = async () => {
      setInvoicesLoading(true);
      setInvoicesError("");
      try {
        const query = new URLSearchParams({ vendor: form.vendor, currency: form.currency });
        const response = await fetch(`/api/payments/open-invoices?${query}`, { headers: authHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load open invoices.");
        if (!cancelled) setOpenInvoices(Array.isArray(data.invoices) ? data.invoices : []);
      } catch (error) {
        if (!cancelled) {
          setOpenInvoices([]);
          setInvoicesError(error.message || "Failed to load open invoices.");
        }
      } finally {
        if (!cancelled) setInvoicesLoading(false);
      }
    };

    loadOpenInvoices();
    return () => { cancelled = true; };
  }, [form.currency, form.vendor, open]);

  if (!open) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      if (name === "vendor" || name === "currency") {
        setInvoicePayments({});
        return { ...current, [name]: value, invoice: "", amount: "" };
      }
      return { ...current, [name]: value };
    });
    setErrors((current) => ({ ...current, [name]: "", form: "" }));
  };

  const handleInvoicePayment = (invoice, value) => {
    const nextValue = value.replace(/[^\d.]/g, "");
    const next = { ...invoicePayments, [invoice.id]: nextValue };
    const selected = openInvoices.filter((item) => Number(next[item.id] || 0) > 0);
    const total = selected.reduce((sum, item) => sum + Number(next[item.id] || 0), 0);
    setInvoicePayments(next);
    setForm((currentForm) => ({
      ...currentForm,
      invoice: selected.map((item) => item.invoiceNumber).join(", "),
      amount: total > 0 ? total.toFixed(2) : "",
    }));
    setErrors((currentErrors) => ({ ...currentErrors, invoice: "", amount: "", form: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.date) nextErrors.date = "Date is required.";
    if (!form.vendor.trim()) nextErrors.vendor = "Vendor is required.";
    if (!form.invoice.trim()) nextErrors.invoice = "Invoice is required.";
    if (!form.referenceNumber.trim()) nextErrors.referenceNumber = "Reference Number is required.";
    if (!form.paymentMethod) nextErrors.paymentMethod = "Payment Method is required.";
    if (!form.amount || Number(form.amount) <= 0) nextErrors.amount = "Enter an amount greater than zero.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrors({ ...(data.errors || {}), form: data.error || "Failed to save payment." });
        return;
      }
      onSaved(data.payment);
      onClose();
    } catch {
      setErrors({ form: "Unable to connect to the Payments service." });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (name) => `w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-blue-100 ${errors[name] ? "border-red-400" : "border-gray-300 focus:border-blue-400"}`;
  const selectClass = (name) => `w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-blue-100 ${errors[name] ? "border-red-400" : "border-gray-300 focus:border-blue-400"}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(event) => {
        if (dialogRef.current && !dialogRef.current.contains(event.target)) onClose();
      }}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="receive-payment-title" className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 id="receive-payment-title" className="font-admin text-2xl font-semibold text-gray-900">Receive Payment</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-xl leading-none text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200" aria-label="Close Receive Payment">×</button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="payment-vendor" className="mb-1 block text-sm font-medium text-gray-700">Vendor <span className="text-red-500">*</span></label>
              <select id="payment-vendor" name="vendor" value={form.vendor} onChange={handleChange} className={selectClass("vendor")}>
                <option value="">Select Vendor</option>
                {vendors.map((vendor) => <option key={vendor.id ?? vendor.name} value={vendor.name}>{vendor.name}</option>)}
              </select>
              {errors.vendor && <p className="mt-1 text-xs text-red-600">{errors.vendor}</p>}
            </div>
            <div>
              <label htmlFor="payment-currency" className="mb-1 block text-sm font-medium text-gray-700">Currency</label>
              <select id="payment-currency" name="currency" value={form.currency} onChange={handleChange} className={selectClass("currency")}>
                <option value="">Select Currency</option>
                {CURRENCIES.map((currency) => <option key={currency.value} value={currency.value}>{currency.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="payment-amount" className="mb-1 block text-sm font-medium text-gray-700">Amount Received <span className="text-red-500">*</span></label>
              <input id="payment-amount" name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={handleChange} className={inputClass("amount")} />
              {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
            </div>
            <div>
              <label htmlFor="payment-date" className="mb-1 block text-sm font-medium text-gray-700">Received On <span className="text-red-500">*</span></label>
              <input id="payment-date" name="date" type="date" max="9999-12-31" value={form.date} onChange={handleChange} className={inputClass("date")} />
              {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date}</p>}
            </div>
            <div>
              <label htmlFor="payment-paymentMethod" className="mb-1 block text-sm font-medium text-gray-700">Payment Method <span className="text-red-500">*</span></label>
              <select id="payment-paymentMethod" name="paymentMethod" value={form.paymentMethod} onChange={handleChange} className={selectClass("paymentMethod")}>
                <option value="">Select Payment Method</option>
                {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
              </select>
              {errors.paymentMethod && <p className="mt-1 text-xs text-red-600">{errors.paymentMethod}</p>}
            </div>
            <div>
              <label htmlFor="payment-referenceNumber" className="mb-1 block text-sm font-medium text-gray-700">Reference Number <span className="text-red-500">*</span></label>
              <input id="payment-referenceNumber" name="referenceNumber" type="text" value={form.referenceNumber} onChange={handleChange} className={inputClass("referenceNumber")} />
              {errors.referenceNumber && <p className="mt-1 text-xs text-red-600">{errors.referenceNumber}</p>}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="payment-notes" className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
              <textarea id="payment-notes" name="notes" rows="3" value={form.notes} onChange={handleChange} className={`${inputClass("notes")} resize-y`} />
            </div>
          </div>
          <section className="mt-8" aria-labelledby="open-invoices-title">
            <h3 id="open-invoices-title" className="mb-4 text-sm font-bold uppercase tracking-[0.08em] text-gray-500">Open Invoices</h3>
            {!form.vendor || !form.currency ? (
              <p className="text-sm text-gray-600">Select a vendor and a currency to view open invoices.</p>
            ) : invoicesLoading ? (
              <p className="rounded-lg border border-gray-200 px-4 py-5 text-sm text-gray-500">Loading open invoices...</p>
            ) : invoicesError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-700">{invoicesError}</p>
            ) : openInvoices.length === 0 ? (
              <p className="rounded-lg border border-gray-200 px-4 py-5 text-sm text-gray-500">No open invoices match the selected vendor and currency.</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-[1fr_1fr_1.2fr_1.2fr_1.8fr] items-center gap-4 rounded-lg bg-gray-100 px-5 py-5 text-center text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
                    <span>Invoice #</span>
                    <span>Due Date</span>
                    <span>Original Amount</span>
                    <span>Open Balance</span>
                    <span className="text-right">Payment</span>
                  </div>
                  <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
                    {openInvoices.map((invoice) => {
                      const originalAmount = invoice.originalAmount ?? invoice.amount;
                      const openBalance = invoice.openBalance ?? invoice.balance ?? originalAmount;
                      return (
                        <div key={invoice.id} className="grid grid-cols-[1fr_1fr_1.2fr_1.2fr_1.8fr] items-center gap-4 border-b border-gray-100 px-5 py-3 text-center text-sm text-gray-800 last:border-b-0">
                          <span>#{invoice.invoiceNumber}</span>
                          <span>{invoice.dueDate || invoice.generatedDate || "—"}</span>
                          <span>{originalAmount == null ? "—" : formatInvoiceAmount(originalAmount, form.currency)}</span>
                          <span>{openBalance == null ? "—" : formatInvoiceAmount(openBalance, form.currency)}</span>
                          <label className="flex overflow-hidden rounded-lg border border-gray-300 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                            <span className="flex w-12 items-center justify-center border-r border-blue-100 bg-blue-50 font-semibold text-blue-600">{currencySymbol(form.currency)}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              max={openBalance == null ? undefined : Number(openBalance)}
                              value={invoicePayments[invoice.id] || ""}
                              onChange={(event) => handleInvoicePayment(invoice, event.target.value)}
                              className="min-w-0 flex-1 px-3 py-2 text-right outline-none"
                              aria-label={`Payment for invoice ${invoice.invoiceNumber}`}
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-[1fr_auto] items-center gap-8 px-5 py-3 text-base font-bold text-gray-900">
                    <span className="text-right">TOTAL</span>
                    <span className="min-w-32 text-right">{formatInvoiceAmount(Object.values(invoicePayments).reduce((sum, value) => sum + Number(value || 0), 0), form.currency)}</span>
                  </div>
                </div>
              </div>
            )}
            {errors.invoice && <p className="mt-2 text-xs text-red-600">{errors.invoice}</p>}
          </section>
          {errors.form && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
          <div className="mt-7 flex justify-end gap-3">
            <AdminTypography.button type="button" variant="secondary" onClick={onClose}>Cancel</AdminTypography.button>
            <AdminTypography.button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</AdminTypography.button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dateFocused, setDateFocused] = useState(false);
  const [sortDirection, setSortDirection] = useState("desc");
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => Object.fromEntries(COLUMNS.map((column) => [column.key, true])));

  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const loadPayments = async () => {
      try {
        const response = await fetch("/api/payments", { headers: authHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load payments.");
        if (!cancelled) setPayments(Array.isArray(data.payments) ? data.payments : []);
      } catch (error) {
        if (!cancelled) setLoadError(error.message || "Failed to load payments.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const loadVendors = async () => {
      try {
        const response = await fetch("/api/admin/client-vendors?type=vendor", { headers: authHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load vendors.");
        if (!cancelled) setVendors(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (!cancelled) setVendors([]);
      }
    };
    loadPayments();
    loadVendors();
    return () => { cancelled = true; };
  }, [isAdmin]);

  const vendorOptions = useMemo(() => {
    const sourceVendors = vendors.map((vendor) => vendor.name).filter(Boolean);
    const paymentVendors = payments.map((payment) => payment.vendor).filter(Boolean);
    return [...new Set([...sourceVendors, ...paymentVendors])].sort((a, b) => a.localeCompare(b));
  }, [payments, vendors]);
  const methods = useMemo(() => [...new Set([...PAYMENT_METHODS, ...payments.map((payment) => payment.paymentMethod).filter(Boolean)])], [payments]);

  const filteredPayments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return payments
      .filter((payment) => {
        const searchable = [payment.date, payment.vendor, payment.invoice, payment.referenceNumber, payment.paymentMethod, payment.amount].join(" ").toLowerCase();
        return (!term || searchable.includes(term))
          && (!vendorFilter || payment.vendor === vendorFilter)
          && (!paymentMethod || payment.paymentMethod === paymentMethod)
          && (!issueDate || payment.date === issueDate);
      })
      .sort((a, b) => {
        const comparison = String(a.date || "").localeCompare(String(b.date || ""));
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [payments, search, vendorFilter, paymentMethod, issueDate, sortDirection]);

  const activeColumns = COLUMNS.filter((column) => visibleColumns[column.key]);

  const resetFilters = () => {
    setSearch("");
    setVendorFilter("");
    setPaymentMethod("");
    setIssueDate("");
  };

  const downloadCsv = () => {
    const safeCell = (value) => {
      let text = String(value ?? "");
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const rows = [
      activeColumns.map((column) => safeCell(column.label)).join(","),
      ...filteredPayments.map((payment) => activeColumns.map((column) => safeCell(column.key === "amount" ? Number(payment.amount || 0).toFixed(2) : payment[column.key])).join(",")),
    ];
    const blob = new Blob([rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return <main className="flex min-h-[60vh] items-center justify-center"><AdminTypography.p className="text-xl font-semibold text-red-600">Unauthorized: Admin access only</AdminTypography.p></main>;
  }

  const actionClass = "flex h-11 w-11 items-center justify-center rounded-full bg-[#f1f3f3] text-blue-600 shadow-sm transition hover:bg-[#e5eeee] hover:text-blue-700 active:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200";
  const controlClass = "h-12 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return (
    <main className="min-h-full bg-white font-admin text-gray-800">
      <section className="px-1 pb-8 pt-1 sm:px-2 lg:px-3">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-bold uppercase tracking-wide text-gray-500">Billing</p>
            <h1 className="text-2xl font-normal leading-tight text-gray-700">Payments</h1>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-start">
            <button type="button" className={actionClass} onClick={downloadCsv} title="Download payments" aria-label="Download payments"><FaDownload className="text-base" /></button>
            <div className="relative">
              <button type="button" className={actionClass} onClick={() => setColumnsOpen((open) => !open)} title="Choose table columns" aria-label="Choose table columns" aria-expanded={columnsOpen}><FaColumns className="text-base" /></button>
              {columnsOpen && (
                <div className="absolute right-0 z-30 mt-2 w-56 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Visible columns</p>
                  {COLUMNS.map((column) => (
                    <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={visibleColumns[column.key]}
                        onChange={() => setVisibleColumns((current) => {
                          const visibleCount = Object.values(current).filter(Boolean).length;
                          if (current[column.key] && visibleCount === 1) return current;
                          return { ...current, [column.key]: !current[column.key] };
                        })}
                        className="accent-teal-500"
                      />
                      {column.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className={actionClass} onClick={() => setFiltersVisible((visible) => !visible)} title="Show or hide filters" aria-label="Show or hide filters" aria-expanded={filtersVisible}><FaSlidersH className="text-base" /></button>
            <button type="button" className={actionClass} onClick={() => setModalOpen(true)} title="Add payment" aria-label="Add payment"><FaPlus className="text-base" /></button>
          </div>
        </div>

        {filtersVisible && (
          <div className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4 xl:max-w-[1160px]">
            <div className="relative">
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" className={`${controlClass} pr-11`} aria-label="Search payments" />
              <FaSearch className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
            </div>
            <div className="relative">
              <select value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)} className={`${controlClass} appearance-none pr-11`} aria-label="Filter by Vendor">
                <option value="">Vendor</option>
                {vendorOptions.map((vendor) => <option key={vendor} value={vendor}>{vendor}</option>)}
              </select>
              <FaFilter className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
            </div>
            <div className="relative">
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className={`${controlClass} appearance-none pr-11`} aria-label="Filter by Payment Method">
                <option value="">Payment Method</option>
                {methods.map((method) => <option key={method} value={method}>{method}</option>)}
              </select>
              <FaFilter className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
            </div>
            <div className="relative">
              {!issueDate && !dateFocused && <span className="pointer-events-none absolute left-4 top-1/2 z-20 -translate-y-1/2 text-sm text-gray-400">Issue Date</span>}
              <input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} onFocus={() => setDateFocused(true)} onBlur={() => setDateFocused(false)} max="9999-12-31" className={`${controlClass} relative z-10 pr-11 ${!issueDate && !dateFocused ? "text-transparent" : ""}`} aria-label="Filter by Issue Date" title="Issue Date" />
            </div>
            {(search || vendorFilter || paymentMethod || issueDate) && (
              <button type="button" onClick={resetFilters} className="justify-self-start text-sm font-medium text-teal-600 hover:text-teal-800 sm:col-span-2 xl:col-span-4">Clear filters</button>
            )}
          </div>
        )}
      </section>

      <section className="overflow-hidden border-t border-gray-100 bg-white">
        {loadError && <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">{loadError}</div>}
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full border-collapse">
            <thead>
              <tr className="bg-[#eff0f1] text-left">
                {activeColumns.map((column) => (
                  <th key={column.key} className={`px-5 py-4 text-xs font-bold uppercase tracking-[0.08em] text-gray-500 ${column.key === "amount" ? "text-right" : "text-left"}`}>
                    {column.key === "date" ? (
                      <button type="button" onClick={() => setSortDirection((direction) => direction === "asc" ? "desc" : "asc")} className="inline-flex items-center gap-2 hover:text-gray-700" aria-label={`Sort date ${sortDirection === "asc" ? "descending" : "ascending"}`}>
                        {column.label}
                        {sortDirection === "asc" ? <FaChevronUp /> : <FaChevronDown />}
                      </button>
                    ) : column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={Math.max(activeColumns.length, 1)} className="px-5 py-14 text-center text-sm text-gray-400">Loading payments...</td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan={Math.max(activeColumns.length, 1)} className="px-5 py-14 text-center text-sm text-gray-400">No payment records match the selected filters.</td></tr>
              ) : filteredPayments.map((payment) => (
                <tr key={payment.id} className="border-b border-gray-100 text-sm text-gray-700 transition hover:bg-gray-50/70">
                  {activeColumns.map((column) => (
                    <td key={column.key} className={`px-5 py-4 ${column.key === "amount" ? "text-right font-semibold text-gray-800" : "text-left"}`}>
                      {column.key === "amount" ? formatAmount(payment.amount) : (payment[column.key] || "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ReceivePaymentModal
        open={modalOpen}
        vendors={vendors}
        onClose={() => setModalOpen(false)}
        onSaved={(payment) => {
          setPayments((current) => [payment, ...current]);
          setLoadError("");
        }}
      />
    </main>
  );
}
