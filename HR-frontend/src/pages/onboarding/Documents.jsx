import { useState, useEffect, useRef } from "react";
import EmpTypography from "../../components/emp/EmpTypography";
import { useOnboardingPermissions } from "../../hooks/useOnboardingPermissions";
import { useDocumentsStore } from "../../store/documentsStore";
import { useAuth } from "../../hooks/useAuth";
import { useAdminView } from "../../contexts/AdminViewContext";
import { saveOnboardingFull, submitOnboarding, getDraft, getOnboarding, getDocuments, registerDocument } from "../../api/onboarding";
import axios from "axios";

const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Format YYYY-MM-DD or ISO date to readable string e.g. "Nov 24, 2024"
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isValidDateYear(value) {
  if (!value) return true;
  const year = String(value).split('-')[0];
  return year.length <= 4;
}

function clampDateYear(value) {
  if (!value) return "";
  const [yearPart, monthPart, dayPart] = String(value).split('-');
  if (!yearPart) return value;
  const safeYear = yearPart.slice(0, 4);
  if (monthPart && dayPart) return `${safeYear}-${monthPart}-${dayPart}`;
  if (monthPart) return `${safeYear}-${monthPart}`;
  return safeYear;
}

// Build doc rows from Personal Info uploaded files (Employee, Spouse, Kids)
function buildPersonalInfoDocs(employee) {
  if (!employee) return [];
  const rows = [];
  const addRow = (id, name, fileInfo, expiry) => {
    if (fileInfo && fileInfo.url) {
      rows.push({
        id,
        name,
        file: fileInfo,
        source: "personal-info",
        readOnly: true,
        modifiedBy: employee.firstName || "Employee",
        expiry: expiry || "",
      });
    }
  };
  addRow("pi-passport", "Passport", employee.passportFile, employee.passportExpiry);
  addRow("pi-visa", "Visa", employee.visaFile, employee.visaExpiry);
  addRow("pi-dl", "Driving License", employee.dlFile, employee.dlExpiry);
  addRow("pi-marriage-cert", "Marriage Certificate", employee.marriageCertFile, null);

  // Spouse docs
  const spouse = employee.Spouse;
  if (spouse) {
    addRow("pi-spouse-passport", "Spouse Passport", spouse.passportFile, spouse.passport_expiry);
    addRow("pi-spouse-visa", "Spouse Visa", spouse.visaFile, spouse.visa_expiry);
    addRow("pi-spouse-dl", "Spouse Driving License", spouse.dlFile, spouse.dl_expiry);
  }

  // Kid docs
  const kids = employee.Kids || [];
  kids.forEach((kid, i) => {
    addRow(`pi-kid-${kid.kid_id || i}`, `Kid ${i + 1} Document`, kid.docFile, kid.passport_expiry);
  });

  return rows;
}

const initialRestrictedDocs = [];

// Maps dropdown category values to document_type prefixes/values stored in `source`
const CATEGORY_MAP = {
  visa: ["visa", "spouse_visa"],
  personal: [
    "passport",
    "spouse_passport",
    "dl",
    "spouse_dl",
    "marriage_cert",
    "personal-info",  // legacy source tag from buildPersonalInfoDocs
    "kid_",           // prefix — matched with startsWith
  ],
  work: [
    "present_employer_",  // prefix
    "previous_employer_", // prefix
    "onboard_doc_",       // prefix
  ],
};

// Returns true when the doc's source matches the selected category
function matchesCategory(doc, category) {
  if (!category) return true; // show all when no filter selected
  const terms = CATEGORY_MAP[category] || [];
  const src = (doc.source || "").toLowerCase();
  return terms.some((t) =>
    t.endsWith("_") ? src.startsWith(t) : src === t
  );
}

export default function ProfileDocuments() {
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [modifyReason, setModifyReason] = useState("");
  const [reasonError, setReasonError] = useState("");

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

  const pageKey = 'canEdit_documents';
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
  } = useOnboardingPermissions(pageKey, 'documents');
  const { user } = useAuth();
  const { targetEmployeeId } = useAdminView() || {};
  const isAdmin = user?.role === "admin";
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [uploadingDocId, setUploadingDocId] = useState(null);

  const {
    docs,
    restrictedDocs,
    setDocs,
    setRestrictedDocs,
    updateDoc,
    updateRestrictedDoc,
    addDoc,
    addRestrictedDoc,
    removeDoc,
    removeRestrictedDoc
  } = useDocumentsStore();

  // Load docs from onboarding data + draft
  useEffect(() => {
    async function loadDocs() {
      try {
        const employeeId = targetEmployeeId || user?.employeeId || user?.id;
        if (!employeeId) return;

        // Load all documents from the Document table for the selected employee
        const docsRes = await getDocuments(employeeId);
        const allDocs = (docsRes?.data?.documents || []).map(d => ({
          id: `doc-${d.document_id}`,
          name: d.name || d.filename || d.originalName || "",
          expiry: d.expiry || "",
          modifiedBy: d.modifiedBy || "",
          file: d.fileData || (d.url ? { url: d.url, originalName: d.originalName, filename: d.filename } : null),
          source: d.document_type || "user-added",
          readOnly: false,
        }));

        // Overlay with draft if exists — draft reflects unsaved deletions in this tab
        const draft = await getDraft(employeeId, 'documents');
        const draftPayload = draft?.data?.payload;
        if (draftPayload?.docs) {
          // Draft records which docs the user has kept/deleted in this tab
          const dbDocMap = new Map(allDocs.map(d => [d.id, d]));
          const draftIds = new Set(draftPayload.docs.map(d => d.id));
          // For each draft doc, pull modifiedBy (and file) from DB record if available
          const mergedDraft = draftPayload.docs.map(d => {
            const dbDoc = dbDocMap.get(d.id);
            return dbDoc ? { ...d, modifiedBy: dbDoc.modifiedBy || d.modifiedBy, file: dbDoc.file || d.file } : d;
          });
          // Include docs from Document table not yet in draft (uploaded from other tabs)
          const newFromOtherTabs = allDocs.filter(d => !draftIds.has(d.id));
          setDocs([...mergedDraft, ...newFromOtherTabs]);
        } else {
          setDocs(allDocs);
        }

        // Restricted docs for admin — use initialRestrictedDocs as default
        if (isAdmin) {
          setRestrictedDocs(initialRestrictedDocs);
        }
      } catch (err) {
        console.error("Error loading documents:", err);
      }
    }
    loadDocs();
  }, [user]);

  // Initialize restricted docs for admin if empty
  useEffect(() => {
    if (isAdmin && restrictedDocs.length === 0) {
      setRestrictedDocs(initialRestrictedDocs);
    }
  }, [isAdmin]);

  const [filterCategory, setFilterCategory] = useState("");
  const [filterFile, setFilterFile] = useState(null);
  const [filterResult, setFilterResult] = useState("");

  // Upload file to backend and update doc row
  const handleFileUpload = async (docId, file) => {
    const employeeId = targetEmployeeId || user?.employeeId || user?.id;
    if (!employeeId) return;
    setUploadingDocId(docId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "document");
      const res = await api.post(`/local-upload/${employeeId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const fileInfo = res.data.file;
      updateDoc(docId, {
        file: { url: fileInfo.url, originalName: fileInfo.originalName, filename: fileInfo.filename, category: fileInfo.category },
        modifiedBy: user?.name || user?.email || "Unknown",
      });
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed: " + (err?.response?.data?.error || err.message));
    } finally {
      setUploadingDocId(null);
    }
  };

  const handleRestrictedFileUpload = async (docId, file) => {
    const employeeId = targetEmployeeId || user?.employeeId || user?.id;
    if (!employeeId) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "restricted");
      const res = await api.post(`/local-upload/${employeeId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const fileInfo = res.data.file;
      updateRestrictedDoc(docId, {
        file: { url: fileInfo.url, originalName: fileInfo.originalName, filename: fileInfo.filename, category: fileInfo.category },
        modifiedBy: user?.name || user?.email || "Unknown",
      });
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed: " + (err?.response?.data?.error || err.message));
    }
  };

  const handleFilter = () => {
    setFilterResult("Filtered documents based on category and file.");
  };

  const handleDownload = (doc) => {
    if (doc.file?.url) {
      window.open(doc.file.url, "_blank");
    } else {
      alert("No file uploaded for this document.");
    }
  };

  const handleView = (doc) => {
    if (doc.file?.url) {
      window.open(doc.file.url, "_blank");
    } else {
      alert("No file uploaded for this document.");
    }
  };

  const handleSave = async () => {
    // Filter out PI rows — only save user-added docs
    const userDocs = docs.filter(d => d.source !== 'personal-info');
    if (!userDocs || userDocs.length === 0) {
      // Allow save even with no user docs (PI docs are enough)
    }
    setValidationError("");
    setSaveError("");
    setSaving(true);
    try {
      const employeeId = targetEmployeeId || user?.employeeId || user?.id;
      if (!employeeId) throw new Error('Missing employeeId in session');
      const payload = { docs: userDocs };
      const body = { tab: 'documents', payload, spouse: null, kids: [], documents: [] };
      await saveOnboardingFull(employeeId, body, true);

      // Register docs with files to Document table on save
      for (const d of userDocs) {
        if (d.file?.url) {
          registerDocument({
            name: d.name || d.file.originalName || 'Document',
            url: d.file.url,
            filename: d.file.filename,
            originalName: d.file.originalName,
            document_type: `user_doc_${d.id}`,
            fileData: d.file,
          }).catch(() => { });
        }
      }

      setSaving(false);
      alert('Draft saved');
    } catch (err) {
      setSaving(false);
      setSaveError(err?.response?.data?.error || err.message || 'Save failed');
    }
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6 font-employee">
      {/* Filter Section */}
      <div className="mb-6 border-b pb-6">
        <EmpTypography.h2>Documents :</EmpTypography.h2>
        <div className="flex flex-wrap gap-2 items-center mb-2">
          <select className="border rounded px-2 py-1 text-sm" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="">Choose Category Type</option>
            <option value="personal">Personal</option>
            <option value="work">Work</option>
            <option value="visa">Visa</option>
          </select>
          <input type="file" className="text-xs" onChange={e => setFilterFile(e.target.files[0])} />
          <button
            className="px-4 py-1 bg-blue-100 text-blue-900 rounded-lg text-sm font-semibold transition duration-150 hover:bg-blue-200 active:scale-95 active:bg-blue-300 focus:outline-none border border-blue-200"
            style={{ minWidth: 80 }}
            onClick={handleFilter}
          >
            Result
          </button>
        </div>
        {filterResult && <div className="mt-2 text-xs text-gray-700">{filterResult}</div>}
      </div>

      {/* Documents Table — read-only, all changes via originating tabs */}
      <div className="mb-6 border-b pb-6 overflow-x-auto">
        <table className="min-w-full border">
          <thead className="bg-blue-100">
            <tr>
              <th className="border px-2 py-1"><EmpTypography.label>#</EmpTypography.label></th>
              <th className="border px-2 py-1"><EmpTypography.label>File Name</EmpTypography.label></th>
              <th className="border px-2 py-1"><EmpTypography.label>Expiry Date</EmpTypography.label></th>
              <th className="border px-2 py-1"><EmpTypography.label>Modified By</EmpTypography.label></th>
              <th className="border px-2 py-1"><EmpTypography.label>Document</EmpTypography.label></th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const filteredDocs = docs.filter((doc) => matchesCategory(doc, filterCategory));
              if (filteredDocs.length === 0) {
                return (
                  <tr>
                    <td colSpan={5} className="border px-2 py-4 text-center text-gray-400 text-sm">
                      {filterCategory
                        ? `No ${filterCategory.charAt(0).toUpperCase() + filterCategory.slice(1)} documents found.`
                        : "No documents uploaded yet."}
                    </td>
                  </tr>
                );
              }
              return filteredDocs.map((doc, idx) => (
                <tr key={doc.id} className="odd:bg-white even:bg-gray-50">
                  <td className="border px-2 py-1 text-center"><EmpTypography.small>{idx + 1}</EmpTypography.small></td>
                  <td className="border px-2 py-1"><EmpTypography.small>{doc.name || doc.file?.originalName || doc.file?.filename || "—"}</EmpTypography.small></td>
                  <td className="border px-2 py-1"><EmpTypography.small>{formatDate(doc.expiry) || "—"}</EmpTypography.small></td>
                  <td className="border px-2 py-1"><EmpTypography.small>{doc.modifiedBy || "—"}</EmpTypography.small></td>
                  <td className="border px-2 py-1">
                    {doc.file?.url ? (
                      <span className="inline-flex gap-2 items-center">
                        <button title="Download" onClick={() => handleDownload(doc)} className="hover:text-blue-600">📥</button>
                        <button title="View" onClick={() => handleView(doc)} className="hover:text-blue-600">📄</button>
                        <span className="text-xs text-gray-500 truncate max-w-[120px]">{doc.file.originalName || doc.file.filename || ""}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No file</span>
                    )}
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>

      {/* Restricted Documents Table — only for admin */}
      {isAdmin && (
        <div className="mb-6">
          <EmpTypography.h2>Restricted Documents :</EmpTypography.h2>
          <table className="min-w-full border text-xs">
            <thead className="bg-blue-100">
              <tr>
                <th className="border px-2 py-1">s.no</th>
                <th className="border px-2 py-1">File Name</th>
                <th className="border px-2 py-1">Expiry Date</th>
                <th className="border px-2 py-1">Modified By</th>
                <th className="border px-2 py-1">Document</th>
                <th className="border px-2 py-1">Upload</th>
                <th className="border px-2 py-1">Delete</th>
              </tr>
            </thead>
            <tbody>
              {restrictedDocs.map((doc, idx) => {
                if (doc.notViewable) {
                  return (
                    <tr key={doc.id} className="odd:bg-white even:bg-gray-50">
                      <td className="border px-2 py-1 text-center" colSpan={7}>
                        <span className="text-gray-500 italic">Employee cannot see this document</span>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={doc.id} className="odd:bg-white even:bg-gray-50">
                    <td className="border px-2 py-1 text-center"><EmpTypography.small>{idx + 1}</EmpTypography.small></td>
                    <td className="border px-2 py-1"><EmpTypography.small>{doc.name}</EmpTypography.small></td>
                    <td className="border px-2 py-1">
                      <input
                        type="date"
                        className="border rounded px-2 py-1 text-xs"
                        value={doc.expiry || ""}
                        onChange={(e) => {
                          const nextValue = clampDateYear(e.target.value);
                          if (!isValidDateYear(nextValue)) return;
                          updateRestrictedDoc(doc.id, { expiry: nextValue });
                        }}
                      />
                    </td>
                    <td className="border px-2 py-1"><EmpTypography.small>{doc.modifiedBy}</EmpTypography.small></td>
                    <td className="border px-2 py-1">
                      {doc.file?.url ? (
                        <span className="inline-flex gap-2 items-center">
                          <button title="Download" onClick={() => handleDownload(doc)} className="hover:text-blue-600">📥</button>
                          <button title="View" onClick={() => handleView(doc)} className="hover:text-blue-600">📄</button>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No file</span>
                      )}
                    </td>
                    <td className="border px-2 py-1 text-center">
                      <label className="cursor-pointer inline-flex items-center gap-1 text-bg-gray-50 hover:text-grey-800 font-medium">
                        <span className="inline-block align-middle"><span role="img" aria-label="upload">📤</span></span>
                        <span>Upload</span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={e => {
                            const file = e.target.files[0];
                            if (file) handleRestrictedFileUpload(doc.id, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </td>
                    <td className="border px-2 py-1 text-center">
                      <button
                        title="Delete"
                        className="text-lg px-2 py-1 text-red-600 hover:text-red-800 focus:outline-none"
                        onClick={() => removeRestrictedDoc(doc.id)}
                      >🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex gap-2 mt-2 justify-end">
            <button
              className="px-3 py-1 bg-blue-100 text-blue-900 rounded-lg text-xs font-semibold border border-blue-200 hover:bg-blue-200"
              onClick={() => addRestrictedDoc({
                id: Date.now(),
                name: "New Restricted Document",
                expiry: "",
                modifiedBy: user?.name || user?.email || "Unknown",
                notViewable: false
              })}
            >Add Row</button>
          </div>
        </div>
      )}

      <div className="mt-2 text-xs text-gray-400 text-right">Read-only — upload or remove files from their respective tabs.</div>

      {/* Confirmation Modal for Submit */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs">
            <EmpTypography.h3 className="mb-2">Confirm Submission</EmpTypography.h3>
            <div className="mb-4 text-sm">Before submitting, please review. Any changes after submission will require admin permission.</div>
            <div className="flex gap-2 justify-end">
              <EmpTypography.button onClick={async () => {
                setShowConfirmModal(false);
                try {
                  const employeeId = targetEmployeeId || user?.employeeId || user?.id;
                  if (!employeeId) throw new Error('Missing employeeId in session');
                  const userDocs = docs.filter(d => d.source !== 'personal-info');
                  const payload = { docs: userDocs };
                  const body = { tab: 'documents', payload, spouse: null, kids: [], documents: [] };
                  await saveOnboardingFull(employeeId, body, true);

                  // Sync deletions to Document table: delete any DB records not in current list
                  const docsRes = await getDocuments();
                  const dbDocs = docsRes?.data?.documents || [];
                  const currentIds = new Set(userDocs.map(d => d.id));
                  for (const dbDoc of dbDocs) {
                    if (!currentIds.has(`doc-${dbDoc.document_id}`)) {
                      try { await api.delete(`/documents/${dbDoc.document_id}`); } catch (e) { /* ignore */ }
                    }
                  }

                  await submitOnboarding(employeeId, 'documents');
                  handleSubmit();
                  alert('Submitted');
                } catch (err) {
                  const errs = err?.response?.data?.errors;
                  alert('Submit failed:\n' + (Array.isArray(errs) ? errs.map(e => e.msg).join('\n') : (err?.response?.data?.error || err.message || 'unknown')));
                }
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
            <EmpTypography.h3 className="mb-2">Request Modify</EmpTypography.h3>
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
    </div>
  );
}
