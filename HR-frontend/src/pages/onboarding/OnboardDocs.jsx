
import { useState, useEffect } from "react";
import EmpTypography from "../../components/emp/EmpTypography";
import { useMemo } from "react";
import axios from "axios";

import { useOnboardingPermissions } from '../../hooks/useOnboardingPermissions';
import { useAuth } from "../../hooks/useAuth";
import { useAdminView } from "../../contexts/AdminViewContext";
import { saveOnboardingFull, submitOnboarding, getDraft, getOnboarding, registerDocument } from "../../api/onboarding";
import FileUploadField from "../../components/emp/FileUploadField";

const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


function VisaDocumentsCard({ visaType, employeeId, i9File, setI9File, w4File, setW4File, disabled, personLabel = 'Employee', categoryPrefix = 'employee' }) {
  if (visaType !== 'H1B' && visaType !== 'F1') return null;

  const visaLabel = visaType === 'H1B' ? 'H-1B' : 'F-1';
  return <section className="rounded-2xl border-2 border-blue-200 bg-blue-50 shadow-sm p-6 mb-6">
    <EmpTypography.h2 className="mb-2">{personLabel === 'Employee' ? 'Required' : `${personLabel} Required`} Documents for {visaLabel}</EmpTypography.h2>
    <EmpTypography.small className="block mb-5">Complete and upload both required documents.</EmpTypography.small>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-xl border bg-white p-4 space-y-3">
        <EmpTypography.h3>I-9</EmpTypography.h3>
        <a className="text-blue-700 underline font-medium" href="https://www.uscis.gov/sites/default/files/document/forms/i-9.pdf" target="_blank" rel="noreferrer">Open official I-9 document</a>
        <EmpTypography.small>Need to fill the I-9 document.</EmpTypography.small>
        <FileUploadField label="Completed I-9 Upload:" employeeId={employeeId} category={`${categoryPrefix}_i9`} documentName={`${personLabel} I-9`} value={i9File} onChange={setI9File} disabled={disabled} />
      </div>
      <div className="rounded-xl border bg-white p-4 space-y-3">
        <EmpTypography.h3>W-4</EmpTypography.h3>
        <a className="text-blue-700 underline font-medium" href="https://www.irs.gov/pub/irs-pdf/fw4.pdf" target="_blank" rel="noreferrer">Open official W-4 document</a>
        <EmpTypography.small>Need to fill the W-4 document.</EmpTypography.small>
        <FileUploadField label="Completed W-4 Upload:" employeeId={employeeId} category={`${categoryPrefix}_w4`} documentName={`${personLabel} W-4`} value={w4File} onChange={setW4File} disabled={disabled} />
      </div>
    </div>
  </section>;
}

export default function ProfileOnboardDocs({
  embedded = false,
  visaType,
  i9File,
  setI9File,
  w4File,
  setW4File,
  hasSpouse = false,
  spouseI9File,
  setSpouseI9File,
  spouseW4File,
  setSpouseW4File,
  spouseVisaType,
  kids = [],
  setKidDocument,
}) {
  EmpTypography._log && EmpTypography._log();
  const pageKey = 'canEdit_onboarddocs';
  const {
    canEdit,
    onboardingSubmitted,
    handleSubmit,
    requestPermission,
    showPermissionModal,
    openPermissionModal,
    closePermissionModal,
    permissionRequested,
    permissionGranted,
  } = useOnboardingPermissions(pageKey, 'onboardDocs');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [modifyReason, setModifyReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const { user } = useAuth();
  const { targetEmployeeId } = useAdminView() || {};
  const [saving, setSaving] = useState(false);
  const [uploadingFileId, setUploadingFileId] = useState(null);

  const employeeId = targetEmployeeId || user?.employeeId || user?.id;
  const isReadOnly = onboardingSubmitted && !canEdit;
  const userName = user?.name || user?.email || "Unknown";

  const [files, setFiles] = useState([]);
  const [bank, setBank] = useState({ name: "", acc: "", routing: "", type: "" });

  const [insuranceRows, setInsuranceRows] = useState([
    { name: "Employee", coverage: { medical: false, vision: false, dental: false } }
  ]);

  const [nameOptions, setNameOptions] = useState(["Employee"]);
  const [selectedPerson, setSelectedPerson] = useState('employee');

  const people = useMemo(() => [
    { id: 'employee', label: 'Employee', visaType, i9File, setI9File, w4File, setW4File, categoryPrefix: 'employee' },
    ...(hasSpouse ? [{
      id: 'spouse', label: 'Spouse', visaType: spouseVisaType || visaType,
      i9File: spouseI9File, setI9File: setSpouseI9File,
      w4File: spouseW4File, setW4File: setSpouseW4File, categoryPrefix: 'spouse_onboard',
    }] : []),
    ...kids.map((kid, index) => ({
      id: `kid-${index}`,
      label: `Kid ${index + 1}`,
      visaType: kid.visaType || kid.visa_type,
      i9File: kid.i9File,
      setI9File: file => setKidDocument?.(index, 'i9File', file),
      w4File: kid.w4File,
      setW4File: file => setKidDocument?.(index, 'w4File', file),
      categoryPrefix: `onboard_kid_${index}`,
    })),
  ], [visaType, i9File, setI9File, w4File, setW4File, hasSpouse, spouseVisaType, spouseI9File, setSpouseI9File, spouseW4File, setSpouseW4File, kids, setKidDocument]);

  const selectedPersonData = people.find(person => person.id === selectedPerson) || people[0];

  // Load server data then overlay draft

  useEffect(() => {
    async function loadData() {
      if (!employeeId) return;
      let empRecord = null;

      // Load submitted data from server
      try {
        const res = await getOnboarding(employeeId);
        const emp = res?.data?.employee;
        empRecord = emp || null;
        if (emp) {
          if (emp.bankDetails) setBank(emp.bankDetails);
          if (emp.insuranceData) setInsuranceRows(emp.insuranceData);
          if (emp.onboardDocsFiles && emp.onboardDocsFiles.length > 0) setFiles(emp.onboardDocsFiles);
        }
      } catch (err) { /* server data not available yet */ }
      // Overlay with draft
      try {
        const draft = await getDraft(employeeId, 'onboardDocs');
        if (draft?.data?.payload) {
          const payload = draft.data.payload;
          if (payload.bank) setBank(payload.bank);
          if (payload.insuranceRows) setInsuranceRows(payload.insuranceRows);
          if (payload.files && payload.files.length > 0) setFiles(payload.files);
        }
      } catch (err) { /* draft not available */ }

      // Build insurance name dropdown options from the Personal Details tab
      // (employee, spouse [if married], and children entered there)
      try {
        const personalDraft = await getDraft(employeeId, 'personal');
        const personalPayload = personalDraft?.data?.payload || {};
        const names = [];

        const empFirst = personalPayload.firstName || empRecord?.firstName || "";
        const empLast = personalPayload.lastName || empRecord?.lastName || "";
        const empFullName = `${empFirst} ${empLast}`.trim();
        names.push(empFullName || "Employee");

        const maritalStatus = personalPayload.maritalStatus || empRecord?.maritalStatus || "";
        const spouseRaw = personalDraft?.data?.spouse || empRecord?.Spouse;
        if (maritalStatus === 'Married' && spouseRaw) {
          const spouseFirst = spouseRaw.firstName || spouseRaw.first_name || "";
          const spouseLast = spouseRaw.lastName || spouseRaw.last_name || "";
          const spouseFullName = `${spouseFirst} ${spouseLast}`.trim();
          if (spouseFullName) names.push(spouseFullName);
        }

        const kidsRaw = personalDraft?.data?.kids || empRecord?.Kids || [];
        if (Array.isArray(kidsRaw)) {
          kidsRaw.forEach((kid) => {
            const kidFirst = kid.firstName || kid.first_name || "";
            const kidLast = kid.lastName || kid.last_name || "";
            const kidFullName = `${kidFirst} ${kidLast}`.trim();
            if (kidFullName) names.push(kidFullName);
          });
        }

        setNameOptions(names.length > 0 ? names : ["Employee"]);
      } catch (err) { /* personal data not available yet */ }
    }
    loadData();
  }, [employeeId]);


  // Upload file to server and update file row
  const handleFileUpload = async (fileId, browserFile) => {
    if (!employeeId || !browserFile) return;
    setUploadingFileId(fileId);
    try {
      const formData = new FormData();
      formData.append("file", browserFile);
      formData.append("category", "onboard_doc");
      const res = await api.post(`/local-upload/${employeeId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const fileInfo = res.data.file;
      setFiles(prev => prev.map(f =>
        f.id === fileId ? {
          ...f,
          name: fileInfo.originalName || fileInfo.filename || f.name,
          file: { url: fileInfo.url, originalName: fileInfo.originalName, filename: fileInfo.filename, category: fileInfo.category },
          modifiedBy: userName,
        } : f
      ));
    } catch (err) {
      alert("Upload failed: " + (err?.response?.data?.error || err.message));
    } finally {
      setUploadingFileId(null);
    }
  };

  const handleDownload = (f) => {
    if (f.file?.url) {
      window.open(f.file.url, "_blank");
    } else {
      alert("No file uploaded for this document.");
    }
  };

  const handleView = (f) => {
    if (f.file?.url) {
      window.open(f.file.url, "_blank");
    } else {
      alert("No file uploaded for this document.");
    }
  };

  const buildPayload = () => ({
    tab: 'onboardDocs',
    payload: {
      bank,
      insuranceRows,
      files,
      spouseDocs: hasSpouse ? { i9File: spouseI9File || null, w4File: spouseW4File || null } : null,
      kidDocs: kids.map(kid => ({ i9File: kid.i9File || null, w4File: kid.w4File || null })),
    },
    spouse: null, kids: [], documents: [],
  });

  const syncOnboardDocs = async (fileList) => {
    for (const f of fileList) {
      if (f.file?.url) {
        registerDocument({
          employeeId,
          name: f.name || f.file.originalName || 'Onboard Document',
          url: f.file.url,
          filename: f.file.filename,
          originalName: f.file.originalName,
          document_type: `onboard_doc_${f.id}`,
          fileData: f.file,
        }).catch(() => { });
      }
    }
  };

  function handleSave() {
    setValidationError("");
    (async () => {
      setSaving(true);
      try {
        if (!employeeId) throw new Error('Missing employeeId in session');
        await saveOnboardingFull(employeeId, buildPayload(), true);
        await syncOnboardDocs(files);
        alert('Draft saved');
      } catch (err) {
        alert('Save failed: ' + (err?.response?.data?.error || err.message || 'unknown'));
      } finally { setSaving(false); }
    })();
  }

  // Override openPermissionModal to show reason modal
  const handleModify = () => {
    setShowReasonModal(true);
    setModifyReason("");
    setReasonError("");
  };

  const handleRequestPermission = () => {
    if (!modifyReason.trim()) {
      setReasonError("Please enter a reason for modification.");
      return;
    }
    setReasonError("");
    (async () => {
      try {
        await requestPermission(modifyReason);
        alert('Request submitted');
        setShowReasonModal(false);
      } catch (err) {
        console.error(err);
        alert('Failed to submit request: ' + (err?.response?.data?.error || err.message || 'unknown'));
      }
    })();
  };

  const handleCloseReasonModal = () => {
    setShowReasonModal(false);
    setModifyReason("");
    setReasonError("");
  };

  return (
    <div className="space-y-8 font-employee">
      {/* Documents Table */}
      {!embedded && <div className="rounded-2xl border bg-white shadow-sm p-5 mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#b7d3e8] text-gray-900">
              <th className="border px-2 py-1"><EmpTypography.label>#</EmpTypography.label></th>
              <th className="border px-2 py-1"><EmpTypography.label>File Name</EmpTypography.label></th>
              <th className="border px-2 py-1"><EmpTypography.label>Template</EmpTypography.label></th>
              <th className="border px-2 py-1"><EmpTypography.label>Modified By</EmpTypography.label></th>
              <th className="border px-2 py-1"><EmpTypography.label>Document</EmpTypography.label></th>
              <th className="border px-2 py-1"><EmpTypography.label>Upload</EmpTypography.label></th>
              <th className="border px-2 py-1"><EmpTypography.label>Delete</EmpTypography.label></th>
            </tr>
          </thead>
          <tbody>
            {files?.map((f, i) => (
              <tr key={f.id} className="odd:bg-white even:bg-gray-50">
                <td className="border px-2 py-1 text-center"><EmpTypography.small>{i + 1}</EmpTypography.small></td>
                <td className="border px-2 py-1">
                  <EmpTypography.small>{f.name}</EmpTypography.small>
                </td>
                <td className="border px-2 py-1">
                  {isReadOnly ? (
                    <EmpTypography.small className="text-blue-600">{f.template}</EmpTypography.small>
                  ) : (
                    <input
                      type="text"
                      className="border rounded px-2 py-1 text-xs w-full"
                      value={f.template || ""}
                      onChange={e => {
                        setFiles(prev => prev.map((item, idx) =>
                          idx === i ? { ...item, template: e.target.value, modifiedBy: userName } : item
                        ));
                      }}
                    />
                  )}
                </td>
                <td className="border px-2 py-1"><EmpTypography.small>{f.modifiedBy || ""}</EmpTypography.small></td>
                <td className="border px-2 py-1">
                  {f.file?.url ? (
                    <span className="inline-flex gap-2 items-center">
                      <button title="Download" onClick={() => handleDownload(f)} className="hover:text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" /></svg>
                      </button>
                      <button title="View" onClick={() => handleView(f)} className="hover:text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
                      </button>
                      <span className="text-xs text-gray-500 truncate max-w-[120px]">{f.file.originalName || f.file.filename || ""}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">No file</span>
                  )}
                </td>
                <td className="border px-2 py-1 text-center">
                  {isReadOnly ? (
                    <span className="text-xs text-gray-400">-</span>
                  ) : (
                    <label className="cursor-pointer inline-flex items-center gap-1 hover:text-blue-800 font-medium text-sm">
                      {uploadingFileId === f.id ? "Uploading..." : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4M4 18h16" /></svg>
                          Upload
                        </>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) handleFileUpload(f.id, file);
                          e.target.value = "";
                        }}
                        disabled={uploadingFileId === f.id || isReadOnly}
                      />
                    </label>
                  )}
                </td>
                <td className="border px-2 py-1 text-center">
                  {isReadOnly ? (
                    <span className="text-xs text-gray-400">-</span>
                  ) : (
                    <button
                      type="button"
                      className="text-red-600 px-2 py-1 rounded hover:bg-red-100"
                      onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V4a1 1 0 011-1h6a1 1 0 011 1v3" /></svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isReadOnly && (
          <div className="flex gap-2 mt-2 justify-end">
            <button
              className="px-3 py-1 bg-blue-100 text-blue-900 rounded-lg text-xs font-semibold border border-blue-200 hover:bg-blue-200"
              onClick={() => {
                setFiles(prev => [
                  ...prev,
                  {
                    id: Date.now(),
                    name: "New Document",
                    template: "",
                    modifiedBy: userName,
                    file: null,
                  }
                ]);
              }}
            >Add Row</button>
          </div>
        )}
      </div>}

      <section className="rounded-2xl border bg-white shadow-sm p-5 mb-6">
        <EmpTypography.h2 className="mb-3">Person-specific Onboard Docs</EmpTypography.h2>
        <div className="max-w-md mb-5">
          <EmpTypography.label>Select person</EmpTypography.label>
          <select
            className="border rounded px-2 py-1 w-full"
            value={selectedPersonData?.id || 'employee'}
            onChange={event => setSelectedPerson(event.target.value)}
          >
            {people.map(person => <option key={person.id} value={person.id}>{person.label}</option>)}
          </select>
        </div>
        <VisaDocumentsCard
          visaType={selectedPersonData?.visaType}
          employeeId={employeeId}
          i9File={selectedPersonData?.i9File}
          setI9File={selectedPersonData?.setI9File}
          w4File={selectedPersonData?.w4File}
          setW4File={selectedPersonData?.setW4File}
          disabled={isReadOnly}
          personLabel={selectedPersonData?.label || 'Employee'}
          categoryPrefix={selectedPersonData?.categoryPrefix || 'employee'}
        />
        {selectedPersonData && selectedPersonData.visaType !== 'H1B' && selectedPersonData.visaType !== 'F1' && (
          <EmpTypography.small>This person does not have H-1B or F-1 Onboard Docs requirements.</EmpTypography.small>
        )}
      </section>

      {/* Bank Details */}
      <div className="rounded-2xl border bg-white shadow-sm p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <EmpTypography.h2>Bank Details<span className="text-red-500">
            *
          </span>:</EmpTypography.h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <EmpTypography.label>Bank Name<span className="text-red-500">
              *
            </span></EmpTypography.label>
            <input className="border rounded px-2 py-1 w-full" value={bank.name} onChange={e => setBank(b => ({ ...b, name: e.target.value }))} disabled={isReadOnly} />
          </div>
          <div>
            <FileUploadField label="Void Check Document Upload:" employeeId={employeeId} category="void_check" documentName="Void Check" value={bank.voidCheck || null} onChange={file => setBank(b => ({ ...b, voidCheck: file }))} disabled={isReadOnly} />
          </div>
          <div>
            <EmpTypography.label>A/C No<span className="text-red-500">
              *
            </span></EmpTypography.label>
            <input className="border rounded px-2 py-1 w-full" value={bank.acc} onChange={e => setBank(b => ({ ...b, acc: e.target.value }))} disabled={isReadOnly} />
          </div>
          <div>
            <EmpTypography.label>Routing No<span className="text-red-500">
              *
            </span></EmpTypography.label>
            <input className="border rounded px-2 py-1 w-full" value={bank.routing} onChange={e => setBank(b => ({ ...b, routing: e.target.value }))} disabled={isReadOnly} />
          </div>
          <div>
            <EmpTypography.label>Account type<span className="text-red-500">
              *
            </span></EmpTypography.label>
            <select className="border rounded px-2 py-1 w-full" value={bank.type} onChange={e => setBank(b => ({ ...b, type: e.target.value }))} disabled={isReadOnly}>
              <option value="">Select</option>
              <option>Savings</option>
              <option>Checking</option>
            </select>
          </div>
        </div>
      </div>

      {/* Insurance Table Section */}
      <div className="rounded-2xl border bg-white shadow-sm p-5 mb-6">
        <EmpTypography.h2 className="mb-3">Insurance<span className="text-red-500">
          *
        </span> :</EmpTypography.h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#b7d3e8] text-gray-900">
              <th className="border px-2 py-1 text-left">Name</th>
              <th className="border px-2 py-1 text-center">Medical</th>
              <th className="border px-2 py-1 text-center">Vision</th>
              <th className="border px-2 py-1 text-center">Dental</th>
              <th className="border px-2 py-1 text-center">Delete</th>
            </tr>
          </thead>
          <tbody>
            {insuranceRows.map((row, idx) => (
              <tr key={idx} className="odd:bg-white even:bg-gray-50">
                <td className="border px-2 py-1 font-medium">
                  <select
                    className="border rounded px-2 py-1 w-full"
                    value={row.name}
                    onChange={e => {
                      const newRows = [...insuranceRows];
                      newRows[idx] = { ...newRows[idx], name: e.target.value };
                      setInsuranceRows(newRows);
                    }}
                    disabled={isReadOnly}
                  >
                    {nameOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </td>
                {['medical', 'vision', 'dental'].map(type => (
                  <td key={type} className="border px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={row.coverage?.[type] || false}
                      onChange={() => {
                        const newRows = [...insuranceRows];
                        newRows[idx] = {
                          ...newRows[idx],
                          coverage: { ...newRows[idx].coverage, [type]: !newRows[idx].coverage[type] }
                        };
                        setInsuranceRows(newRows);
                      }}
                      className="form-checkbox h-5 w-5 text-blue-600"
                      disabled={isReadOnly}
                    />
                  </td>
                ))}
                <td className="border px-2 py-1 text-center">
                  {!isReadOnly && insuranceRows.length > 1 ? (
                    <button
                      type="button"
                      className="text-red-600 px-2 py-1 rounded hover:bg-red-100"
                      onClick={() => setInsuranceRows(rows => rows.filter((_, i) => i !== idx))}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V4a1 1 0 011-1h6a1 1 0 011 1v3" /></svg>
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isReadOnly && (
          <div className="flex gap-2 mt-2 justify-end">
            <button
              type="button"
              className="px-3 py-1 bg-blue-100 text-blue-900 rounded-lg text-xs font-semibold border border-blue-200 hover:bg-blue-200"
              onClick={() => setInsuranceRows(rows => [...rows, { name: nameOptions[0], coverage: { medical: false, vision: false, dental: false } }])}
            >Add Row</button>
          </div>
        )}
      </div>

      {validationError && (
        <EmpTypography.small className="text-red-600 mb-2">{validationError}</EmpTypography.small>
      )}
      <div className="flex justify-end mt-4 gap-2">
        {(!onboardingSubmitted || canEdit) && (
          <EmpTypography.button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</EmpTypography.button>
        )}
        {(!onboardingSubmitted || canEdit) && (
          <EmpTypography.button variant="primary" onClick={() => {
            if (!bank.name || !bank.acc) {
              setValidationError("Bank Name and Account Number are required before submitting.");
              return;
            }
            setValidationError("");
            setShowConfirmModal(true);
          }}>Submit</EmpTypography.button>
        )}
        {(onboardingSubmitted && !canEdit && !permissionGranted) && (
          <EmpTypography.button variant="primary" onClick={handleModify}>Request Modify</EmpTypography.button>
        )}
      </div>

      {/* Confirmation Modal for Submit */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs">
            <EmpTypography.h3 className="mb-2">Confirm Submission</EmpTypography.h3>
            <div className="mb-4 text-sm">Before submitting, please review. Any changes after submission will require admin permission.</div>
            <div className="flex gap-2 justify-end">
              <EmpTypography.button onClick={async () => {
                setShowConfirmModal(false);
                setSaving(true);
                try {
                  if (!employeeId) throw new Error('Missing employeeId');
                  await saveOnboardingFull(employeeId, buildPayload(), true);
                  await syncOnboardDocs(files);
                  await submitOnboarding(employeeId, 'onboardDocs');
                  handleSubmit();
                  alert('Submitted successfully');
                } catch (err) {
                  console.error('Submit failed', err?.response?.data || err.message || err);
                  const errs = err?.response?.data?.errors;
                  alert('Submit failed:\n' + (Array.isArray(errs) ? errs.map(e => e.msg).join('\n') : (err?.response?.data?.error || err.message || 'unknown')));
                } finally { setSaving(false); }
              }}>Confirm</EmpTypography.button>
              <EmpTypography.button onClick={() => setShowConfirmModal(false)}>Cancel</EmpTypography.button>
            </div>
          </div>
        </div>
      )}

      {/* Reason Modal for Modify */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs">
            <EmpTypography.h3 className="mb-2">Request Admin Permission</EmpTypography.h3>
            <div className="mb-2 text-sm">What do you want to modify?</div>
            <textarea
              className="border rounded w-full p-2 mb-2"
              rows={3}
              value={modifyReason}
              onChange={e => setModifyReason(e.target.value)}
              placeholder="Describe your reason..."
            />
            {reasonError && <EmpTypography.small className="text-red-600 mb-2">{reasonError}</EmpTypography.small>}
            <div className="flex gap-2 justify-end">
              <EmpTypography.button onClick={handleRequestPermission}>Request</EmpTypography.button>
              <EmpTypography.button onClick={handleCloseReasonModal}>Cancel</EmpTypography.button>
            </div>
          </div>
        </div>
      )}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs">
            <EmpTypography.h3 className="mb-2">Request Admin Permission</EmpTypography.h3>
            {!permissionRequested && !permissionGranted && (
              <div className="mb-4 text-sm">Do you want to request permission from admin to modify this page?</div>
            )}
            {permissionRequested && !permissionGranted && (
              <div className="mb-4 text-sm text-blue-600">Requesting permission from admin...</div>
            )}
            {permissionGranted && (
              <div className="mb-4 text-sm text-green-600">Permission granted! You can now edit and save this page.</div>
            )}
            <div className="flex gap-2 justify-end">
              {!permissionRequested && !permissionGranted && (
                <EmpTypography.button onClick={requestPermission}>Request</EmpTypography.button>
              )}
              <EmpTypography.button onClick={closePermissionModal}>Close</EmpTypography.button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
}
