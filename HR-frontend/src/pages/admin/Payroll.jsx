import React, { useState, useRef, useEffect } from "react";
import AdminTypography from "../../components/admin/AdminTypography";
import { useAuth } from "../../hooks/useAuth";
import { MdDelete } from "react-icons/md";
import { confirmOrRequestDelete, requestOrUseAdminAction } from '../../utils/adminDeleteRequest';

// Get logged-in user from localStorage
const getLoggedInUser = () => {
  const stored = localStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : null;
  return { fullName: user?.name || "Unknown User" };
};

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const jsonAuthHeaders = () => ({
  "Content-Type": "application/json",
  ...authHeaders(),
});

function PayrollModal({ open, onClose, onSave, initialData, isEdit, employeeData }) {
  const getDefaultForm = () => ({
    payrollNumber: "",
    employee_id: "",
    payChequeDate: "",
    w2FileName: "",
    w2FileUrl: "",
    payChequeFileName: "",
    payChequeFileUrl: "",
    _w2File: null,
    _payChequeFile: null,
  });
  const [form, setForm] = useState(getDefaultForm());
  const modalRef = useRef();

  useEffect(() => {
    if (initialData) {
      setForm({
        ...getDefaultForm(),
        payrollNumber: initialData.payrollNumber || initialData.nameOrNumber || "",
        employee_id: initialData.employee_id || "",
        payChequeDate: initialData.payChequeDate || "",
        w2FileName: initialData.w2FileName || initialData.w2OriginalName || "",
        w2FileUrl: initialData.w2FileUrl || initialData.w2Url || "",
        payChequeFileName: initialData.payChequeFileName || initialData.payChequeOriginalName || "",
        payChequeFileUrl: initialData.payChequeFileUrl || initialData.payChequeUrl || "",
      });
      return;
    }

    setForm(getDefaultForm());
  }, [initialData, open]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  function handleClickOutside(e) {
    if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
  }

  useEffect(() => {
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleChange(e) {
    const { name, value, files, type } = e.target;

    // Validate date fields
    if (type === "date" && value) {
      const year = value.split("-")[0]

      // Do not allow more than 4 digits in the year
      if (year.length > 4) {
        return
      }
    }

    if (name === "w2File") {
      const file = files && files[0];
      if (file) {
        setForm((f) => ({
          ...f,
          _w2File: file,
          w2FileName: file.name,
          w2FileUrl: "",
        }));
      }
    } else if (name === "payChequeFile") {
      const file = files && files[0];
      if (file) {
        setForm((f) => ({
          ...f,
          _payChequeFile: file,
          payChequeFileName: file.name,
          payChequeFileUrl: "",
        }));
      }
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  //function to handle removing the W2 file
  const handleRemoveW2File = () => {
    setForm((f) => ({
      ...f,
      _w2File: null,
      w2FileName: "",
      w2FileUrl: "",
    }));

    const input = document.getElementById("w2File");
    if (input) input.value = "";
  };

  // Function to handle removing the Pay Cheque file
  const handleRemovePayChequeFile = () => {
    setForm((f) => ({
      ...f,
      _payChequeFile: null,
      payChequeFileName: "",
      payChequeFileUrl: "",
    }));

    const input = document.getElementById("payChequeFile");
    if (input) input.value = "";
  };


  function handleSubmit(e) {
    e.preventDefault();

    const user = getLoggedInUser();
    const userMeta = isEdit
      ? { updatedBy: user.fullName }
      : { createdBy: user.fullName };

    onSave({ ...form, ...userMeta });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-white rounded-lg shadow-lg p-8 w-full max-w-3xl md:max-w-4xl relative overflow-y-auto max-h-[90vh]">
        <AdminTypography.button
          className="absolute top-2 right-2 text-2xl text-gray-400 hover:text-gray-700"
          aria-label="Close modal"
          onClick={onClose}
        >
          ×
        </AdminTypography.button>

        <AdminTypography.h2 className="mb-6 text-gray-900">
          {initialData ? "Edit Payroll Record" : "Add Payroll Record"}
        </AdminTypography.h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <AdminTypography.label htmlFor="payrollNumber">Payroll Name/Number</AdminTypography.label>
              <input
                id="payrollNumber"
                name="payrollNumber"
                type="text"
                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                value={form.payrollNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <AdminTypography.label htmlFor="employee_id">Employee Name</AdminTypography.label>
              <select
                id="employee_id"
                name="employee_id"
                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                value={form.employee_id || ""}
                onChange={handleChange}
                required
              >
                <option value="">Select Employee</option>
                {employeeData.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name || emp.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <AdminTypography.label htmlFor="payChequeDate">Pay Cheque Date</AdminTypography.label>
              <input
                id="payChequeDate"
                name="payChequeDate"
                type="date"
                min="1900-01-01"
                max="9999-12-31"
                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                value={form.payChequeDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="md:col-span-2 border-t pt-4">
              <AdminTypography.label htmlFor="w2File" className="font-semibold text-gray-800">W2 Document</AdminTypography.label>
              <div className="mt-1">
                <input
                  id="w2File"
                  name="w2File"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleChange}
                />

                <div className="flex items-center justify-between border border-gray-300 rounded px-3 py-2">
                  <span className="text-gray-700 truncate flex-1">
                    {form.w2FileName || "No file selected"}
                  </span>

                  <div className="flex items-center gap-2">

                    {form.w2FileName && (
                      <button
                        type="button"
                        onClick={handleRemoveW2File}
                        className="text-red-600 hover:text-red-700"
                        title="Delete File"
                      >
                        <MdDelete size={22} />
                      </button>
                    )}

                    <label
                      htmlFor="w2File"
                      className="cursor-pointer bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Choose File
                    </label>

                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 border-t pt-4">
              <AdminTypography.label htmlFor="payChequeFile" className="font-semibold text-gray-800">Pay Cheque Document</AdminTypography.label>
              <div className="mt-1">
                <input
                  id="payChequeFile"
                  name="payChequeFile"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleChange}
                />

                <div className="flex items-center justify-between border border-gray-300 rounded px-3 py-2">
                  <span className="text-gray-700 truncate flex-1">
                    {form.payChequeFileName || "No file selected"}
                  </span>

                  <div className="flex items-center gap-2">

                    {form.payChequeFileName && (
                      <button
                        type="button"
                        onClick={handleRemovePayChequeFile}
                        className="text-red-600 hover:text-red-700"
                        title="Delete File"
                      >
                        <><MdDelete size={22} /></>
                      </button>
                    )}

                    <label
                      htmlFor="payChequeFile"
                      className="cursor-pointer bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Choose File
                    </label>

                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 border-t pt-4">
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
              aria-label={initialData ? "Save changes" : "Add payroll"}
            >
              Save
            </AdminTypography.button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminPayroll() {
  const { isRootAdmin, can } = useAuth();
  const canViewPayroll = isRootAdmin || can('payroll:view');
  const canCreatePayroll = isRootAdmin || can('payroll:create');
  const canUpdatePayroll = isRootAdmin || can('payroll:update');
  const canDeletePayroll = isRootAdmin || can('payroll:delete');
  const canOpenPayrollModal = canCreatePayroll || canUpdatePayroll;
  const [payrolls, setPayrolls] = useState([]);
  const [payrollNumber, setPayrollNumber] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [payChequeDateFrom, setPayChequeDateFrom] = useState("");
  const [payChequeDateTo, setPayChequeDateTo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editPayroll, setEditPayroll] = useState(null);
  const [employeeData, setEmployeeData] = useState([]);
  const [filePreview, setFilePreview] = useState({ isOpen: false, blobUrl: "", title: "", previewType: "" });

  function handleFilterDateChange(setDate, otherDate, setOtherDate, isFrom) {
    return (e) => {
      const value = e.target.value;

      if (value) {
        const year = value.split("-")[0];

        // Allow only 4-digit year
        if (year.length > 4) {
          return;
        }
      }

      // From date cannot be after To date
      if (isFrom && otherDate && value > otherDate) {
        setOtherDate("");
      }

      // To date cannot be before From date
      if (!isFrom && otherDate && value < otherDate) {
        return;
      }

      setDate(value);
    };
  }
  const loadEmployees = async () => {
    const token = localStorage.getItem("token");
    if (!token || !canViewPayroll) {
      setEmployeeData([]);
      return;
    }

    try {
      const res = await fetch("/api/admin/employees", {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed loading employees");
      setEmployeeData((data.employees || []).filter((emp) => !emp.terminateDate));
    } catch (err) {
      console.error("Failed loading employees", err);
      setEmployeeData([]);
    }
  };

  const loadPayrolls = async () => {
    const token = localStorage.getItem("token");
    if (!token || !canViewPayroll) {
      setPayrolls([]);
      return;
    }

    try {
      const res = await fetch("/api/payroll", {
        headers: jsonAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed loading payrolls");
      setPayrolls(data.payrolls || []);
    } catch (err) {
      console.error("Failed loading payrolls", err);
      setPayrolls([]);
    }
  };

  useEffect(() => {
    if (!canViewPayroll) {
      setEmployeeData([]);
      setPayrolls([]);
      return;
    }

    loadEmployees();
    loadPayrolls();
  }, [canViewPayroll]);

  const filteredPayrolls = payrolls.filter((payroll) => {
    const matchesPayrollNumber =
      !payrollNumber ||
      (payroll.payrollNumber || "").toLowerCase().includes(payrollNumber.toLowerCase());

    const matchesEmployeeName =
      !employeeName ||
      (payroll.employeeName || "").toLowerCase().includes(employeeName.toLowerCase());

    const matchesDateFrom =
      !payChequeDateFrom ||
      (payroll.payChequeDate && payroll.payChequeDate >= payChequeDateFrom);

    const matchesDateTo =
      !payChequeDateTo ||
      (payroll.payChequeDate && payroll.payChequeDate <= payChequeDateTo);

    return matchesPayrollNumber && matchesEmployeeName && matchesDateFrom && matchesDateTo;
  });

  function handleAdd() {
    setEditPayroll(null);
    setModalOpen(true);
  }

  async function handleEdit(payroll) {
    if (!await requestOrUseAdminAction({ actionType: 'edit', resourceType: 'payroll', resourceId: payroll.id, resourceLabel: `payroll for ${payroll.employeeName || payroll.id}`, isRootAdmin })) return;
    if (window.confirm("Warning: Changing the payroll entry information will overwrite historical settings. Continue editing?")) {
      setEditPayroll(payroll);
      setModalOpen(true);
    }
  }

  async function handleDelete(id) {
    const payroll = payrolls.find(item => item.id === id);
    if (!await confirmOrRequestDelete({ isRootAdmin, resourceType: 'payroll', resourceId: id, resourceLabel: `payroll for ${payroll?.employeeName || id}` })) return;

    try {
      const res = await fetch(`/api/payroll/${id}`, {
        method: "DELETE",
        headers: jsonAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to delete payroll");
      setPayrolls((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert(err.message || "Failed to delete payroll");
    }
  }

  const fetchPayrollFile = async (payrollId, field, disposition) => {
    const response = await fetch(
      `/api/payroll/file/${payrollId}?field=${field}&disposition=${disposition}`,
      { headers: authHeaders() },
    );
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Unable to load payroll document.");
    }
    return response;
  };

  const previewPayrollFile = async (payroll, field, title) => {
    const available = field === "w2" ? payroll.w2FileUrl : payroll.payChequeFileUrl;
    if (!available) {
      alert(`${title} is not available.`);
      return;
    }
    try {
      const response = await fetchPayrollFile(payroll.id, field, "inline");
      const contentType = response.headers.get("content-type") || "";
      const blob = await response.blob();
      if (!contentType.startsWith("image/") && !contentType.includes("pdf")) {
        setFilePreview({ isOpen: true, blobUrl: "", title, previewType: "unsupported" });
        return;
      }
      setFilePreview({ isOpen: true, blobUrl: URL.createObjectURL(blob), title, previewType: "supported" });
    } catch (error) {
      alert(error.message || "Unable to open payroll document.");
    }
  };

  const downloadPayrollFile = async (payroll, field, filename) => {
    const available = field === "w2" ? payroll.w2FileUrl : payroll.payChequeFileUrl;
    if (!available) {
      alert("Payroll document is not available for download.");
      return;
    }
    try {
      const response = await fetchPayrollFile(payroll.id, field, "attachment");
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename || "document.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (error) {
      alert(error.message || "Unable to download payroll document.");
    }
  };

  const closeFilePreview = () => {
    if (filePreview.blobUrl) URL.revokeObjectURL(filePreview.blobUrl);
    setFilePreview({ isOpen: false, blobUrl: "", title: "", previewType: "" });
  };

  async function handleSave(payroll) {
    const user = getLoggedInUser();
    const selectedEmployee = employeeData.find(
      (emp) => String(emp.id) === String(payroll.employee_id),
    );

    if (!payroll.employee_id) {
      alert("Please select an employee before saving the payroll record.");
      return;
    }

    try {
      const { _w2File, _payChequeFile, ...rest } = payroll;
      let payload = {
        ...rest,
        employee_id: payroll.employee_id,
        employeeName: selectedEmployee?.name || "",
        payrollNumber: rest.payrollNumber || "",
        nameOrNumber: rest.payrollNumber || "",
        payChequeDate: rest.payChequeDate || "",
        w2OriginalName: rest.w2FileName || "",
        w2Url: rest.w2FileUrl || "",
        payChequeOriginalName: rest.payChequeFileName || "",
        payChequeUrl: rest.payChequeFileUrl || "",
        createdBy: rest.createdBy || user.fullName,
        updatedBy: rest.updatedBy || "",
      };

      if (_w2File) {
        const formData = new FormData();
        formData.append("file", _w2File);
        formData.append("category", "w2");

        const uploadRes = await fetch(`/api/local-upload/${payroll.employee_id}`, {
          method: "POST",
          headers: authHeaders(),
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "W2 upload failed");

        payload = {
          ...payload,
          w2OriginalName: uploadData.file?.originalName || payload.w2OriginalName,
          w2Url: uploadData.file?.url || payload.w2Url,
        };
      }

      if (_payChequeFile) {
        const formData = new FormData();
        formData.append("file", _payChequeFile);
        formData.append("category", "paycheque");

        const uploadRes = await fetch(`/api/local-upload/${payroll.employee_id}`, {
          method: "POST",
          headers: authHeaders(),
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Pay cheque upload failed");

        payload = {
          ...payload,
          payChequeOriginalName: uploadData.file?.originalName || payload.payChequeOriginalName,
          payChequeUrl: uploadData.file?.url || payload.payChequeUrl,
        };
      }

      const res = await fetch(editPayroll ? `/api/payroll/${editPayroll.id}` : "/api/payroll", {
        method: editPayroll ? "PATCH" : "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to save payroll");

      const savedPayroll = data.payroll || data;
      if (editPayroll) {
        setPayrolls((prev) => prev.map((item) => (item.id === editPayroll.id ? savedPayroll : item)));
      } else {
        setPayrolls((prev) => [savedPayroll, ...prev]);
      }

      await loadPayrolls();
      setModalOpen(false);
      setEditPayroll(null);
    } catch (err) {
      alert(err.message || "Failed to save payroll");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-wrap gap-4 items-center mb-6 justify-between">
        <AdminTypography.label className="text-gray-900 text-xl font-bold">Payroll Management</AdminTypography.label>

        <div className="flex gap-2 flex-wrap items-center">
          <input
            type="text"
            placeholder="Payroll Name/Number..."
            className="px-4 py-2 border border-gray-300 rounded-full min-w-[180px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={payrollNumber}
            onChange={e => setPayrollNumber(e.target.value)}
            aria-label="Search payroll number"
          />

          <input
            type="text"
            placeholder="Employee Name..."
            className="px-4 py-2 border border-gray-300 rounded-full min-w-[180px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={employeeName}
            onChange={e => setEmployeeName(e.target.value)}
            aria-label="Search employee name"
          />

          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">From:</span>
            <input
              type="date"
              className="px-4 py-2 border border-gray-300 rounded-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={payChequeDateFrom}
              max={payChequeDateTo || "9999-12-31"}
              onChange={handleFilterDateChange(setPayChequeDateFrom)}
              aria-label="Pay cheque date from"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">To:</span>
            <input
              type="date"
              className="px-4 py-2 border border-gray-300 rounded-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={payChequeDateTo}
              min={payChequeDateFrom || undefined}
              max="9999-12-31"
              onChange={handleFilterDateChange(setPayChequeDateTo)}
              aria-label="Pay cheque date to"
            />
          </div>

          {canCreatePayroll && <AdminTypography.button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={handleAdd}
            aria-label="Add payroll"
          >
            + Payroll
          </AdminTypography.button>}
        </div>
      </div>

      <div className="overflow-x-auto bg-white border rounded-xl shadow-sm">
        <table className="min-w-full text-gray-900">
          <thead>
            <tr className="bg-gray-50 text-gray-700 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-sm font-semibold">#</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Payroll Name/Number</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Employee Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Pay Cheque Date</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">W2 </th>
              <th className="px-4 py-3 text-center text-sm font-semibold">W2 Download</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Pay Cheque </th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Pay Cheque Download</th>
              {canUpdatePayroll && <th className="px-4 py-3 text-center text-sm font-semibold">Edit</th>}
              {canDeletePayroll && <th className="px-4 py-3 text-center text-sm font-semibold">Delete</th>}
            </tr>
          </thead>

          <tbody>
            {filteredPayrolls.length === 0 ? (
              <tr>
                <td colSpan={8 + Number(canUpdatePayroll) + Number(canDeletePayroll)} className="text-center py-8 text-gray-400">
                  No payroll records found.
                </td>
              </tr>
            ) : (
              filteredPayrolls.map((payroll, index) => (
                <tr key={payroll.id} className="border-t border-gray-100 hover:bg-gray-50 text-sm">
                  <td className="px-4 py-3 text-gray-500 font-medium">{index + 1}</td>
                  <td className="px-4 py-3 font-semibold">{payroll.payrollNumber}</td>
                  <td className="px-4 py-3">{payroll.employeeName || "-"}</td>

                  <td className="px-4 py-3 whitespace-nowrap">{payroll.payChequeDate}</td>

                  <td className="px-4 py-3 text-center">
                    <AdminTypography.button
                      className="px-3 py-1 bg-gray-100 text-blue-700 rounded hover:bg-blue-100 border border-blue-200 text-xs"
                      onClick={() => previewPayrollFile(payroll, "w2", `W2 — ${payroll.payrollNumber || payroll.nameOrNumber || "Payroll"}`)}
                      aria-label={`View W2 for ${payroll.employeeName}`}
                    >
                      View
                    </AdminTypography.button>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <AdminTypography.button
                      className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 text-xs font-medium"
                      onClick={() => downloadPayrollFile(payroll, "w2", payroll.w2FileName || `W2_${payroll.employeeName || "document"}.pdf`)}
                      aria-label={`Download W2 for ${payroll.employeeName}`}
                    >
                      Download
                    </AdminTypography.button>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <AdminTypography.button
                      className="px-3 py-1 bg-gray-100 text-blue-700 rounded hover:bg-blue-100 border border-blue-200 text-xs"
                      onClick={() => previewPayrollFile(payroll, "paycheque", `Pay Cheque — ${payroll.payrollNumber || payroll.nameOrNumber || "Payroll"}`)}
                      aria-label={`View Paycheque for ${payroll.employeeName}`}
                    >
                      View
                    </AdminTypography.button>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <AdminTypography.button
                      className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 text-xs font-medium"
                      onClick={() => downloadPayrollFile(payroll, "paycheque", payroll.payChequeFileName || `PayCheque_${payroll.employeeName || "document"}.pdf`)}
                      aria-label={`Download Pay Cheque for ${payroll.employeeName}`}
                    >
                      Download
                    </AdminTypography.button>
                  </td>

                  {canUpdatePayroll && <td className="px-4 py-3 text-center">
                    <AdminTypography.button
                      className="px-3 py-1 bg-yellow-100 text-blue-800 rounded hover:bg-yellow-200 text-xs"
                      onClick={() => handleEdit(payroll)}
                      aria-label={`Edit details or Pay Cheque for ${payroll.employeeName}`}
                    >
                      Edit
                    </AdminTypography.button>
                  </td>}

                  {canDeletePayroll && <td className="px-4 py-3 text-center">
                    <AdminTypography.button
                      className="px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 text-xs"
                      onClick={() => handleDelete(payroll.id)}
                      aria-label={`Delete record for ${payroll.employeeName}`}
                    >
                      Delete
                    </AdminTypography.button>
                  </td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canOpenPayrollModal && <PayrollModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditPayroll(null); }}
        onSave={handleSave}
        initialData={editPayroll}
        isEdit={!!editPayroll}
        employeeData={employeeData}
      />}
      {filePreview.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <span className="truncate pr-4 font-semibold text-gray-800">{filePreview.title}</span>
              <button type="button" onClick={closeFilePreview} className="text-2xl leading-none text-gray-400 hover:text-gray-700" aria-label="Close preview">×</button>
            </div>
            {filePreview.previewType === "unsupported" ? (
              <div className="flex flex-1 items-center justify-center p-6 text-center text-gray-700">Preview is not supported for this file type. Please use Download.</div>
            ) : (
              <iframe src={filePreview.blobUrl} title={filePreview.title} className="min-h-0 flex-1 w-full border-0" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
