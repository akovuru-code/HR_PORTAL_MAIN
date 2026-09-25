import { useState, useEffect, useRef } from "react";
import EmpTypography from "../../components/emp/EmpTypography";
import { useOnboardingPermissions } from "../../hooks/useOnboardingPermissions";
import { useDocumentsStore } from "../../store/documentsStore";
import { useAuth } from "../../hooks/useAuth";
import { useAdminView } from "../../contexts/AdminViewContext";
import { saveOnboardingFull, submitOnboarding, getDraft, getOnboarding, getDocuments, registerDocument, openProtectedFile } from "../../api/onboarding";
import { confirmOrRequestDelete } from "../../utils/adminDeleteRequest";
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
  const addRow = (id, name, documentType, fileInfo, expiry) => {
    if (fileInfo && fileInfo.url) {
      rows.push({
        id,
        name,
        documentType,
        file: fileInfo,
        source: "personal-info",
        readOnly: true,
        modifiedBy: employee.firstName || "Employee",
        expiry: expiry || "",
      });
    }
  };
  addRow("pi-passport", "Passport - current", "passport", employee.passportFile, employee.passportExpiry);
  addRow("pi-passport-additional", "Passport - additional/previous pages", "passport_additional", employee.passportFile2, employee.passportExpiry);
  addRow("pi-visa", "Visa", "visa", employee.visaFile, employee.visaExpiry);
  addRow("pi-dl", "Driving License", "dl", employee.dlFile, employee.dlExpiry);
  addRow("pi-marriage-cert", "Marriage Certificate", "marriage_cert", employee.marriageCertFile, null);

  // Spouse docs
  const spouse = employee.Spouse;
  if (spouse) {
    addRow("pi-spouse-passport", "Spouse Passport - current", "spouse_passport", spouse.passportFile, spouse.passport_expiry);
    addRow("pi-spouse-passport-additional", "Spouse Passport - additional/previous pages", "spouse_passport_additional", spouse.passportFile2, spouse.passport_expiry);
    addRow("pi-spouse-visa", "Spouse Visa", "spouse_visa", spouse.visaFile, spouse.visa_expiry);
    addRow("pi-spouse-dl", "Spouse Driving License", "spouse_dl", spouse.dlFile, spouse.dl_expiry);
  }

  // Kid docs
  const kids = employee.Kids || [];
  kids.forEach((kid, i) => {
    addRow(`pi-kid-${kid.kid_id || i}`, `Kid ${i + 1} Document`, `kid_${i}_document`, kid.docFile, kid.passport_expiry);
  });

  return rows;
}

const isRestrictedDocument = (doc) => String(doc.source || '').startsWith('restricted_');

const toDocumentRow = (document) => ({
  id: `doc-${document.document_id}`,
  documentId: document.document_id,
  name: document.name || document.filename || document.originalName || "",
  expiry: document.expiry || "",
  modifiedBy: document.modifiedBy || "",
  file: document.fileData || (document.url ? { url: document.url, originalName: document.originalName, filename: document.filename } : null),
  source: document.document_type || "user-added",
  documentType: document.document_type || null,
  categoryType: document.fileData?.categoryType || null,
  readOnly: false,
});

function mergePersonalInfoDocs(documentRows, personalInfoRows) {
  const registeredTypes = new Set(
    documentRows.map((doc) => doc.documentType || doc.source).filter(Boolean)
  );
  return [
    ...documentRows,
    ...personalInfoRows.filter((doc) => !registeredTypes.has(doc.documentType)),
  ];
}

// Maps dropdown category values to document_type prefixes/values stored in `source`
const CATEGORY_MAP = {
  visa: ["visa", "spouse_visa"],
  personal: [
    "passport",
    "passport_additional",
    "spouse_passport",
    "spouse_passport_additional",
    "dl",
    "spouse_dl",
    "marriage_cert",
    "pan",
    "aadhaar",
    "spouse_pan",
    "spouse_aadhaar",
    "personal-info",  // legacy source tag from buildPersonalInfoDocs
    "kid_",           // prefix — matched with startsWith
  ],
  work: [
    "present_employer_",  // prefix
    "previous_employer_", // prefix
    "work_",              // prefix
    "onboard_doc_",       // prefix
  ],
};

function inferredCategory(doc) {
  if (doc.categoryType) return doc.categoryType;
  const source = (doc.source || '').toLowerCase();
  if (source.startsWith('present_employer_') || source.startsWith('previous_employer_') || source.startsWith('work_') || source.startsWith('onboard_doc_')) return 'work';
  if (source.includes('visa') || source.endsWith('_i9') || source.endsWith('_w4') || source.startsWith('onboard_kid_')) return 'visa';
  return 'personal';
}

// Returns true when the document's selected or inferred category matches.
function matchesCategory(doc, category) {
  return !category || inferredCategory(doc) === category;
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
  const isAdmin = ['admin', 'root_admin', 'hr'].includes(String(user?.accountType || user?.role || '').toLowerCase());
  const isAdminEmployeeDetails = isAdmin && Boolean(targetEmployeeId);
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [uploadingDocId, setUploadingDocId] = useState(null);
  const [uploadingCategoryFile, setUploadingCategoryFile] = useState(false);

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
        const [docsRes, onboardingRes] = await Promise.all([
          getDocuments(employeeId),
          getOnboarding(employeeId),
        ]);
        const allDocs = (docsRes?.data?.documents || []).map(toDocumentRow);
        const registeredNormalDocs = allDocs.filter(doc => !isRestrictedDocument(doc));
        const personalInfoDocs = buildPersonalInfoDocs(onboardingRes?.data?.employee);
        const normalDocs = mergePersonalInfoDocs(registeredNormalDocs, personalInfoDocs);
        const employeeRestrictedDocs = allDocs.filter(isRestrictedDocument);

        // Overlay with draft if exists — draft reflects unsaved deletions in this tab
        const draft = await getDraft(employeeId, 'documents');
        const draftPayload = draft?.data?.payload;
        if (draftPayload?.docs) {
          // Draft records which docs the user has kept/deleted in this tab
          const dbDocMap = new Map(normalDocs.map(d => [d.id, d]));
          const draftIds = new Set(draftPayload.docs.map(d => d.id));
          // For each draft doc, pull modifiedBy (and file) from DB record if available
          const mergedDraft = draftPayload.docs.map(d => {
            const dbDoc = dbDocMap.get(d.id);
            return dbDoc ? { ...d, modifiedBy: dbDoc.modifiedBy || d.modifiedBy, file: dbDoc.file || d.file } : d;
          });
          // Include docs from Document table not yet in draft (uploaded from other tabs)
          const newFromOtherTabs = normalDocs.filter(d => !draftIds.has(d.id));
          setDocs([...mergedDraft, ...newFromOtherTabs]);
        } else {
          setDocs(normalDocs);
        }

        // Restricted documents are employee-scoped records, shown separately.
        if (isAdmin) {
          setRestrictedDocs(employeeRestrictedDocs);
        }
      } catch (err) {
        console.error("Error loading documents:", err);
      }
    }
    loadDocs();
  }, [user, targetEmployeeId, isAdmin, setDocs, setRestrictedDocs]);

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

  const restrictedDocumentType = (doc) => (
    isRestrictedDocument(doc)
      ? doc.source
      : `restricted_${String(doc.id).replace(/[^a-zA-Z0-9_-]/g, '')}`
  );

  const saveRestrictedDocument = async (doc, fileInfo = doc.file) => {
    const employeeId = targetEmployeeId || user?.employeeId || user?.id;
    if (!employeeId || !fileInfo?.url) return;

    const registered = await registerDocument({
      employeeId,
      name: doc.name || fileInfo.originalName || fileInfo.filename || 'Restricted Document',
      url: fileInfo.url,
      filename: fileInfo.filename,
      originalName: fileInfo.originalName,
      document_type: restrictedDocumentType(doc),
      fileData: fileInfo,
      expiry: doc.expiry || null,
    });
    const saved = registered?.data?.document;
    if (saved) updateRestrictedDoc(doc.id, toDocumentRow(saved));
  };

  const handleRestrictedFileUpload = async (doc, file) => {
    const employeeId = targetEmployeeId || user?.employeeId || user?.id;
    if (!employeeId) return;
    setUploadingDocId(doc.id);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "restricted");
      const res = await api.post(`/local-upload/${employeeId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const fileInfo = res.data.file;
      const savedFile = { url: fileInfo.url, originalName: fileInfo.originalName, filename: fileInfo.filename, category: fileInfo.category };
      await saveRestrictedDocument(doc, savedFile);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed: " + (err?.response?.data?.error || err.message));
    } finally {
      setUploadingDocId(null);
    }
  };

  const handleRestrictedExpirySave = async (doc, expiry) => {
    const nextDoc = { ...doc, expiry };
    updateRestrictedDoc(doc.id, { expiry });
    if (!doc.file?.url) return;
    try {
      await saveRestrictedDocument(nextDoc);
    } catch (err) {
      console.error('Unable to save restricted document expiry:', err);
      alert('Unable to save expiry date: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleRestrictedDelete = async (doc) => {
    if (!doc.documentId) {
      removeRestrictedDoc(doc.id);
      return;
    }

    const isRootAdmin = String(user?.accountType || user?.role || '').toLowerCase() === 'root_admin';
    try {
      const approved = await confirmOrRequestDelete({
        isRootAdmin,
        resourceType: 'document',
        resourceId: doc.documentId,
        resourceLabel: doc.name || 'restricted document',
      });
      if (!approved) return;
      await api.delete(`/documents/${doc.documentId}`);
      removeRestrictedDoc(doc.id);
    } catch (err) {
      alert('Unable to delete restricted document: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleFilter = () => {
    setFilterResult("Filtered documents based on category and file.");
  };

  const handleCategoryUpload = async (file) => {
    const employeeId = targetEmployeeId || user?.employeeId || user?.id;
    if (!file || !employeeId) return;
    if (!filterCategory) {
      alert('Choose Personal, Work, or Visa before uploading a document.');
      return;
    }
    setUploadingCategoryFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', `documents_${filterCategory}`);
      const uploadRes = await api.post(`/local-upload/${employeeId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileInfo = uploadRes.data.file;
      const registered = await registerDocument({
        employeeId,
        name: fileInfo.originalName || fileInfo.filename || 'Document',
        url: fileInfo.url,
        filename: fileInfo.filename,
        originalName: fileInfo.originalName,
        document_type: `employee_${filterCategory}_${Date.now()}`,
        fileData: { ...fileInfo, categoryType: filterCategory },
      });
      const document = registered?.data?.document;
      if (document) {
        addDoc({
          id: `doc-${document.document_id}`,
          name: document.name,
          expiry: document.expiry || '',
          modifiedBy: document.modifiedBy || '',
          file: document.fileData,
          source: document.document_type,
          categoryType: filterCategory,
          readOnly: false,
        });
      }
      setFilterResult(`Uploaded under ${filterCategory.charAt(0).toUpperCase() + filterCategory.slice(1)}.`);
    } catch (err) {
      alert('Upload failed: ' + (err?.response?.data?.error || err.message));
    } finally {
      setUploadingCategoryFile(false);
    }
  };

  const handleDownload = async (doc) => {
    if (doc.file?.url) {
      try { await openProtectedFile(doc.file.url); } catch (err) { alert(err?.response?.data?.error || 'Unable to open document.'); }
    } else {
      alert("No file uploaded for this document.");
    }
  };

  const handleView = async (doc) => {
    if (doc.file?.url) {
      try { await openProtectedFile(doc.file.url); } catch (err) { alert(err?.response?.data?.error || 'Unable to open document.'); }
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
            employeeId,
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
          {isAdmin && !isAdminEmployeeDetails && <>
            <input
              type="file"
              className="text-xs"
              disabled={uploadingCategoryFile || (onboardingSubmitted && !canEdit)}
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) handleCategoryUpload(file);
                event.target.value = '';
              }}
            />
            <button
              className="px-4 py-1 bg-blue-100 text-blue-900 rounded-lg text-sm font-semibold transition duration-150 hover:bg-blue-200 active:scale-95 active:bg-blue-300 focus:outline-none border border-blue-200"
              style={{ minWidth: 80 }}
              onClick={handleFilter}
            >
              Result
            </button>
          </>}
        </div>
        {isAdmin && !isAdminEmployeeDetails && uploadingCategoryFile && <div className="mt-2 text-xs text-gray-700">Uploading document...</div>}
        {isAdmin && !isAdminEmployeeDetails && filterResult && <div className="mt-2 text-xs text-gray-700">{filterResult}</div>}
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
                        onBlur={(e) => handleRestrictedExpirySave(doc, clampDateYear(e.target.value))}
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
                        <span>{uploadingDocId === doc.id ? 'Uploading...' : 'Upload'}</span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          disabled={uploadingDocId === doc.id}
                          onChange={e => {
                            const file = e.target.files[0];
                            if (file) handleRestrictedFileUpload(doc, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </td>
                    <td className="border px-2 py-1 text-center">
                      <button
                        title="Delete"
                        className="text-lg px-2 py-1 text-red-600 hover:text-red-800 focus:outline-none"
                        onClick={() => handleRestrictedDelete(doc)}
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

      <div className="mt-2 text-xs text-gray-400 text-right">Normal Documents are read-only — update them from their respective tabs.</div>

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
