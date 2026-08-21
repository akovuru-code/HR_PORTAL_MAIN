import React, { useState, useRef, useEffect } from "react"
import AdminTypography from "../../components/admin/AdminTypography"
import { useAdminView } from "../../contexts/AdminViewContext"
import { MdDelete } from "react-icons/md";

// Get logged-in user from localStorage
const getLoggedInUser = () => {
  const stored = localStorage.getItem("user")
  const user = stored ? JSON.parse(stored) : null
  return { fullName: user?.name || "Unknown User" }
}

const authHeaders = () => {
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const jsonAuthHeaders = () => ({
  "Content-Type": "application/json",
  ...authHeaders(),
})

function InvoiceModal({ open, onClose, onSave, initialData, isEdit, defaultEmployeeName }) {
  const [form, setForm] = useState(
    initialData || {
      invoiceNumber: "",
      employeeName: defaultEmployeeName || "",
      status: "Generated",
      generatedDate: "",
      invoiceFileName: "",
      invoiceFileUrl: "",
    }, [initialData, open]
  )
  const modalRef = useRef()

  useEffect(() => {
    setForm(
      initialData && initialData.employeeName
        ? {
          ...initialData,
          employeeName: initialData.employeeName || defaultEmployeeName || "",
        }
        : {
          invoiceNumber: "",
          employeeName: defaultEmployeeName || "",
          status: "Generated",
          generatedDate: "",
          invoiceFileName: "",
          invoiceFileUrl: "",
        },
    )
  }, [initialData, open, defaultEmployeeName])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose()
    }
    if (open) document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open, onClose])

  function handleClickOutside(e) {
    if (modalRef.current && !modalRef.current.contains(e.target)) onClose()
  }

  useEffect(() => {
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  function handleChange(e) {
    const { name, value, files, type } = e.target
    if (type === "date" && value) {
      const year = value.split("-")[0];

      if (year.length > 4) {
        return;
      }
    }
    if (name === "invoiceFile") {
      const file = files && files[0]
      if (file) {
        setForm((f) => ({
          ...f,
          _file: file,
          invoiceFileName: file.name,
        }))
      }
    } else {
      setForm((f) => ({ ...f, [name]: value }))
    }
  }

  // Function to remove the selected invoice file

  function handleRemoveInvoiceFile() {
    setForm((f) => ({
      ...f,
      _file: null,
      invoiceFileName: "",
      invoiceFileUrl: "",
    }));

    const input = document.getElementById("invoiceFile");
    if (input) input.value = "";
  }

  function handleSubmit(e) {
    e.preventDefault()

    const user = getLoggedInUser()
    const userMeta = isEdit
      ? { updatedBy: user.fullName }
      : { createdBy: user.fullName }

    onSave({ ...form, ...userMeta })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-lg p-8 w-full max-w-3xl md:max-w-4xl relative overflow-y-auto max-h-[90vh]"
      >
        <AdminTypography.button
          className="absolute top-2 right-2 text-2xl text-gray-400 hover:text-gray-700"
          aria-label="Close modal"
          onClick={onClose}
        >
          ×
        </AdminTypography.button>

        <AdminTypography.h2 className="mb-6 text-gray-900">
          {initialData ? "Edit Invoice" : "Add Invoice"}
        </AdminTypography.h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <AdminTypography.label htmlFor="invoiceNumber">
                Invoice Number
              </AdminTypography.label>
              <input
                id="invoiceNumber"
                name="invoiceNumber"
                type="text"
                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                value={form.invoiceNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <AdminTypography.label htmlFor="employeeName">
                Employee Name
              </AdminTypography.label>
              <input
                id="employeeName"
                name="employeeName"
                type="text"
                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                value={form.employeeName}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <AdminTypography.label htmlFor="status">
                Status
              </AdminTypography.label>
              <select
                id="status"
                name="status"
                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                value={form.status}
                onChange={handleChange}
              >
                <option value="Generated">Generated</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <AdminTypography.label htmlFor="generatedDate">
                Invoice Generated Date
              </AdminTypography.label>
              <input
                id="generatedDate"
                name="generatedDate"
                type="date"
                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                value={form.generatedDate}
                onChange={handleChange}
                max="9999-12-31"
                required
              />
            </div>

            <div className="md:col-span-2">
              <AdminTypography.label htmlFor="invoiceFile">
                Upload Invoice
              </AdminTypography.label>
              <div className="mt-1">
                <input
                  id="invoiceFile"
                  name="invoiceFile"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleChange}
                />

                <div className="flex items-center justify-between border border-gray-300 rounded px-3 py-2">
                  <span className="text-gray-700 truncate flex-1">
                    {form.invoiceFileName || "No file selected"}
                  </span>

                  <div className="flex items-center gap-2 ml-3">
                    {form.invoiceFileName && (
                      <button
                        type="button"
                        onClick={handleRemoveInvoiceFile}
                        className="text-red-600 hover:text-red-700"
                        title="Delete File"
                      >
                        <MdDelete size={22} />
                      </button>
                    )}

                    <label
                      htmlFor="invoiceFile"
                      className="cursor-pointer bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Choose File
                    </label>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <AdminTypography.button
              type="button"
              className="px-4 py-2 bg-gray-200 rounded"
              onClick={onClose}
            >
              Cancel
            </AdminTypography.button>

            <AdminTypography.button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded"
              aria-label={initialData ? "Save changes" : "Add invoice"}
            >
              Save
            </AdminTypography.button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminInvoices() {
  const { targetEmployeeId } = useAdminView() || {}
  const [invoices, setInvoices] = useState([])
  const [employeeName, setEmployeeName] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceDateFrom, setInvoiceDateFrom] = useState("")
  const [invoiceDateTo, setInvoiceDateTo] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editInvoice, setEditInvoice] = useState(null)
  const [viewDetails, setViewDetails] = useState(null)

  const fileInputRef = useRef()

  function handleFilterDateChange(setDate) {
    return (e) => {
      const value = e.target.value;

      if (value) {
        const year = value.split("-")[0];

        // Allow only 4-digit years
        if (year.length > 4) {
          return;
        }
      }

      setDate(value);
    };
  }

  useEffect(() => {
    if (!targetEmployeeId) return

    fetch(`/api/admin/employees/${targetEmployeeId}`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setEmployeeName(data.name && data.name !== "—" ? data.name : ""))
      .catch(() => { })

    fetch(`/api/admin/employees/${targetEmployeeId}/invoices`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setInvoices(data.invoices || []))
      .catch(() => { })
  }, [targetEmployeeId])

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesInvoiceNumber =
      !invoiceNumber ||
      invoice.invoiceNumber.toLowerCase().includes(invoiceNumber.toLowerCase())

    const matchesDateFrom =
      !invoiceDateFrom ||
      (invoice.generatedDate && invoice.generatedDate >= invoiceDateFrom)

    const matchesDateTo =
      !invoiceDateTo ||
      (invoice.generatedDate && invoice.generatedDate <= invoiceDateTo)

    return matchesInvoiceNumber && matchesDateFrom && matchesDateTo
  })

  function handleAdd() {
    setEditInvoice(null)
    setModalOpen(true)
  }

  function handleEdit(invoice) {
    if (
      window.confirm(
        "Warning: Changing the invoice cannot be retrieved. Continue editing?",
      )
    ) {
      setEditInvoice(invoice)
      setModalOpen(true)
    }
  }

  function handleUploadClick() {
    fileInputRef.current?.click()
  }

  async function handleUploadInvoice(e) {
    const file = e.target.files && e.target.files[0]
    e.target.value = ""

    if (!file || !targetEmployeeId) return

    const user = getLoggedInUser()

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", "invoice")

      const uploadRes = await fetch(`/api/local-upload/${targetEmployeeId}`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed")

      const res = await fetch(`/api/admin/employees/${targetEmployeeId}/invoices`, {
        method: "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          invoiceNumber: file.name.split(".")[0],
          employeeName,
          status: "Generated",
          generatedDate: new Date().toISOString().slice(0, 10),
          invoiceFileName: uploadData.file.originalName,
          invoiceFileUrl: uploadData.file.url,
          createdBy: user.fullName,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save invoice")

      setInvoices((prev) => [...prev, data.invoice])
    } catch (err) {
      alert(err.message || "Failed to upload invoice")
    }
  }

  function handleView(invoice) {
    if (invoice.invoiceFileUrl) {
      window.open(invoice.invoiceFileUrl, "_blank")
    } else {
      setViewDetails(invoice)
    }
  }

  function handleDownload(invoice) {
    if (!invoice.invoiceFileUrl) {
      alert("Invoice file is not available for download.")
      return
    }

    const link = document.createElement("a")
    link.href = invoice.invoiceFileUrl
    link.download = invoice.invoiceFileName || invoice.invoiceNumber
    link.click()
  }

  async function handleSave(invoice) {
    if (!targetEmployeeId) return

    try {
      const { _file, ...rest } = invoice
      let payload = rest

      if (_file) {
        const formData = new FormData()
        formData.append("file", _file)
        formData.append("category", "invoice")

        const uploadRes = await fetch(`/api/local-upload/${targetEmployeeId}`, {
          method: "POST",
          headers: authHeaders(),
          body: formData,
        })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed")

        payload = {
          ...payload,
          invoiceFileName: uploadData.file.originalName,
          invoiceFileUrl: uploadData.file.url,
        }
      }

      if (editInvoice) {
        const res = await fetch(
          `/api/admin/employees/${targetEmployeeId}/invoices/${editInvoice.id}`,
          {
            method: "PATCH",
            headers: jsonAuthHeaders(),
            body: JSON.stringify(payload),
          },
        )
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to update invoice")

        setInvoices((prev) =>
          prev.map((item) => (item.id === editInvoice.id ? data.invoice : item)),
        )
      } else {
        const res = await fetch(`/api/admin/employees/${targetEmployeeId}/invoices`, {
          method: "POST",
          headers: jsonAuthHeaders(),
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to create invoice")

        setInvoices((prev) => [...prev, data.invoice])
      }

      setModalOpen(false)
      setEditInvoice(null)
    } catch (err) {
      alert(err.message || "Failed to save invoice")
    }
  }

  // Delete invoice with confirmation

  async function handleDelete(invoice) {
    if (
      !window.confirm(
        `Are you sure you want to delete invoice "${invoice.invoiceNumber}"?`
      )
    ) {
      return
    }

    try {
      const res = await fetch(
        `/api/admin/employees/${targetEmployeeId}/invoices/${invoice.id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete invoice")
      }

      setInvoices((prev) =>
        prev.filter((item) => item.id !== invoice.id)
      )
    } catch (err) {
      alert(err.message || "Failed to delete invoice")
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-wrap gap-4 items-center mb-6 justify-between">
        <AdminTypography.label className="text-gray-900">
          Invoices
        </AdminTypography.label>

        <div className="flex gap-2 flex-wrap items-center">
          <input
            type="text"
            placeholder="Invoice number..."
            className="px-4 py-2 border border-gray-300 rounded-full min-w-[200px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            aria-label="Search invoice number"
          />

          <input
            type="date"
            className="px-4 py-2 border border-gray-300 rounded-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={invoiceDateFrom}
            max={invoiceDateTo || "9999-12-31"}
            onChange={handleFilterDateChange(setInvoiceDateFrom)}
            aria-label="Invoice date from"
          />

          <input
            type="date"
            className="px-4 py-2 border border-gray-300 rounded-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={invoiceDateTo}
            min={invoiceDateFrom || undefined}
            max="9999-12-31"
            onChange={handleFilterDateChange(setInvoiceDateTo)}
            aria-label="Invoice date to"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleUploadInvoice}
          />

          <AdminTypography.button
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 border border-gray-300"
            onClick={handleUploadClick}
            aria-label="Upload invoice"
          >
            Upload Invoice
          </AdminTypography.button>

          <AdminTypography.button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={handleAdd}
            aria-label="Add invoice"
          >
            + Invoice
          </AdminTypography.button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white border rounded-xl shadow-sm">
        <table className="min-w-full text-gray-900">
          <thead>
            <tr className="bg-gray-50 text-gray-700">
              <th className="px-4 py-2 text-left">Invoice Number</th>
              <th className="px-4 py-2 text-left">Employee Name</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Invoice Generated Date</th>
              <th className="px-4 py-2 text-center">View</th>
              <th className="px-4 py-2 text-center">Download</th>
              <th className="px-4 py-2 text-center">Edit</th>
              <th className="px-4 py-2 text-center">Delete</th>
            </tr>
          </thead>

          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  No invoices found.
                </td>
              </tr>
            ) : (
              filteredInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-2">{invoice.invoiceNumber}</td>
                  <td className="px-4 py-2">{invoice.employeeName || employeeName || "-"}</td>
                  <td className="px-4 py-2">{invoice.status}</td>
                  <td className="px-4 py-2">{invoice.generatedDate}</td>

                  <td className="px-4 py-2 text-center">
                    <AdminTypography.button
                      className="px-3 py-1 bg-gray-100 text-blue-700 rounded hover:bg-blue-100 border border-blue-200"
                      onClick={() => handleView(invoice)}
                      aria-label={`View ${invoice.invoiceNumber}`}
                    >
                      View
                    </AdminTypography.button>
                  </td>

                  <td className="px-4 py-2 text-center">
                    <AdminTypography.button
                      className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                      onClick={() => handleDownload(invoice)}
                      aria-label={`Download ${invoice.invoiceNumber}`}
                    >
                      Download
                    </AdminTypography.button>
                  </td>

                  <td className="px-4 py-2 text-center">
                    <AdminTypography.button
                      className="px-3 py-1 bg-yellow-100 text-blue-800 rounded hover:bg-yellow-200"
                      onClick={() => handleEdit(invoice)}
                      aria-label={`Edit ${invoice.invoiceNumber}`}
                    >
                      Edit
                    </AdminTypography.button>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <AdminTypography.button
                      className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      onClick={() => handleDelete(invoice)}
                      aria-label={`Delete ${invoice.invoiceNumber}`}
                    >
                      Delete
                    </AdminTypography.button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <InvoiceModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditInvoice(null)
        }}
        onSave={handleSave}
        initialData={editInvoice}
        isEdit={!!editInvoice}
        defaultEmployeeName={employeeName}
      />

      {viewDetails && (
        <ViewDetailsModal
          invoice={viewDetails}
          onClose={() => setViewDetails(null)}
        />
      )}
    </div>
  )

  function ViewDetailsModal({ invoice, onClose }) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-3xl md:max-w-4xl relative overflow-y-auto max-h-screen">
          <AdminTypography.button
            className="absolute top-2 right-2 text-3xl text-gray-500 hover:text-gray-800 focus:outline-none"
            aria-label="Close details modal"
            tabIndex={0}
            onClick={onClose}
          >
            ×
          </AdminTypography.button>

          <AdminTypography.h2 className="mb-6 text-gray-900">
            Invoice Details
          </AdminTypography.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <AdminTypography.label>Invoice Number</AdminTypography.label>
              <AdminTypography.p className="text-gray-900">
                {invoice.invoiceNumber}
              </AdminTypography.p>
            </div>

            <div>
              <AdminTypography.label>Employee Name</AdminTypography.label>
              <AdminTypography.p className="text-gray-900">
                {invoice.employeeName || employeeName || "-"}
              </AdminTypography.p>
            </div>

            <div>
              <AdminTypography.label>Status</AdminTypography.label>
              <AdminTypography.p className="text-gray-900">
                {invoice.status}
              </AdminTypography.p>
            </div>

            <div>
              <AdminTypography.label>
                Invoice Generated Date
              </AdminTypography.label>
              <AdminTypography.p className="text-gray-900">
                {invoice.generatedDate}
              </AdminTypography.p>
            </div>

            <div>
              <AdminTypography.label>Invoice File</AdminTypography.label>
              <AdminTypography.p className="text-gray-900">
                {invoice.invoiceFileName || "-"}
              </AdminTypography.p>
            </div>

            <div>
              <AdminTypography.label>Created By</AdminTypography.label>
              <AdminTypography.p className="text-gray-900">
                {invoice.createdBy || "-"}
              </AdminTypography.p>
            </div>

            {invoice.updatedBy && (
              <div>
                <AdminTypography.label>Updated By</AdminTypography.label>
                <AdminTypography.p className="text-gray-900">
                  {invoice.updatedBy}
                </AdminTypography.p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
}