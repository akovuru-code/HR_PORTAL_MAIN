import { useState, useEffect } from "react";
import EmpTypography from "../../components/emp/EmpTypography";
import { useOnboardingPermissions } from "../../hooks/useOnboardingPermissions";
import { FaTrash } from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { useAdminView } from "../../contexts/AdminViewContext";
import { saveOnboardingFull, submitOnboarding, getDraft, getOnboarding } from "../../api/onboarding";
import FileUploadField from "../../components/emp/FileUploadField";
import { EDUCATION_LEVELS, normalizeEducation, educationFromServer, mergeEducationDraft } from "../../utils/educationLevels";
EmpTypography._log && EmpTypography._log();

const emptyCert = () => ({
  id: Date.now(),
  name: "",
  org: "",
  startDate: "",
  endDate: "",
  description: "",
  certFile: null,
});

const emptyEvaluation = () => ({
  id: Date.now(),
  description: "",
  evalFile: null,
});

export default function Education() {
  const { user } = useAuth();
  const { targetEmployeeId } = useAdminView() || {};
  const employeeId = targetEmployeeId || user?.employeeId || user?.id;

  // Permissions
  const pageKey = "canEdit_education";
  const {
    canEdit,
    onboardingSubmitted,
    handleSubmit: hookHandleSubmit,
    requestPermission,
    permissionGranted,
  } = useOnboardingPermissions(pageKey, "education");

  // UI state
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [modifyReason, setModifyReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  // Data state
  const [educationList, setEducationList] = useState(() => normalizeEducation());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const [certList, setCertList] = useState([emptyCert()]);
  const [deletedCertificationIds, setDeletedCertificationIds] = useState([]);
  const [evaluationList, setEvaluationList] = useState([emptyEvaluation()]);

  const formDisabled = loading || !!loadError || (onboardingSubmitted && !canEdit);

  // Load data from server (submitted) then overlay draft
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      if (!employeeId) return;
      setLoading(true);
      setLoadError("");
      setEducationList(normalizeEducation());
      setCertList([emptyCert()]);
      setDeletedCertificationIds([]);
      setEvaluationList([emptyEvaluation()]);
      try {
        const onboardingRes = await getOnboarding(employeeId);
        const draft = await getDraft(employeeId, 'education');
        if (cancelled) return;
        const serverEdus = onboardingRes?.data?.educations || [];
        const mappedEducation = serverEdus.map(educationFromServer);
        setEducationList(normalizeEducation(mappedEducation));
        if (serverEdus && serverEdus.length > 0) {
          // Collect certifications from all education records (with files)
          const allCerts = serverEdus.flatMap(e => (e.certifications || []).map(c => ({
            id: c.certification_id,
            name: c.name || "",
            org: c.org || "",
            startDate: c.start_date || "",
            endDate: c.end_date || "",
            description: c.description || "",
            certFile: c.file_url ? {
              url: c.file_url,
              filename: c.file_name,
              originalName: c.file_name,
            } : null,
          })));
          if (allCerts.length > 0) setCertList(allCerts);
        }

        // Load evaluations from server
        const serverEvals = onboardingRes?.data?.evaluations;
        if (serverEvals && serverEvals.length > 0) {
          setEvaluationList(serverEvals.map(ev => ({
            id: ev.evaluation_id,
            description: ev.description || "",
            evalFile: ev.file_url ? {
              url: ev.file_url,
              filename: ev.file_name,
              originalName: ev.file_name,
            } : null,
          })));
        }

        // Overlay with education-specific draft
        if (draft?.data?.payload) {
          const p = draft.data.payload;
          if (Array.isArray(p.educationList)) setEducationList(mergeEducationDraft(mappedEducation, p.educationList));
          if (Array.isArray(p.certList)) {
            const removed = p.deletedCertificationIds || [];
            setDeletedCertificationIds(removed);
            setCertList(saved => [...p.certList, ...saved.filter(cert =>
              !p.certList.some(draftCert => String(draftCert.id) === String(cert.id)) &&
              !removed.some(id => String(id) === String(cert.id)) &&
              (cert.name || cert.org || cert.certFile || cert.description)
            )]);
          }
          if (p.evaluationList) setEvaluationList(p.evaluationList);
        }
      } catch {
        if (!cancelled) setLoadError("Unable to load education details. Please reload before making changes.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [employeeId, reloadVersion]);

  // Education handlers
  const handleEduChange = (idx, field, value) =>
    setEducationList(list => list.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));

  const handleEduAddress = (idx, field, value) =>
    setEducationList(list => list.map((e, i) =>
      i === idx ? { ...e, address: { ...e.address, [field]: value } } : e
    ));

  const handleEduFile = (idx, file) =>
    setEducationList(list => list.map((e, i) => (i === idx ? { ...e, docFile: file } : e)));

  // Certification handlers
  const handleCertChange = (idx, field, value) =>
    setCertList(list => list.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));

  const handleCertFile = (idx, file) =>
    setCertList(list => list.map((c, i) => (i === idx ? { ...c, certFile: file } : c)));

  const addCert = () => setCertList(list => [...list, emptyCert()]);
  const deleteCert = (idx) => {
    setDeletedCertificationIds(ids => [...ids, certList[idx].id]);
    setCertList(list => list.filter((_, i) => i !== idx));
  };

  // Evaluation handlers
  const handleEvalChange = (idx, field, value) =>
    setEvaluationList(list => list.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));

  const handleEvalFile = (idx, file) =>
    setEvaluationList(list => list.map((e, i) => (i === idx ? { ...e, evalFile: file } : e)));

  const addEvaluation = () => setEvaluationList(list => [...list, emptyEvaluation()]);
  const deleteEvaluation = (idx) => setEvaluationList(list => list.filter((_, i) => i !== idx));

  // Payload
  const buildBody = () => ({
    tab: "education",
    payload: { educationList, certList, deletedCertificationIds, evaluationList },
    spouse: null,
    kids: [],
    documents: [],
  });

  // Save draft
  const handleSave = async () => {
    setSaving(true);
    try {
      if (!employeeId) throw new Error("Missing employeeId");
      await saveOnboardingFull(employeeId, buildBody(), true);
      alert("Draft saved");
    } catch (err) {
      alert("Save failed: " + (err?.response?.data?.error || err.message || "unknown"));
    } finally {
      setSaving(false);
    }
  };

  // Submit
  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setSaving(true);
    try {
      if (!employeeId) throw new Error("Missing employeeId");
      // Save as draft so submit can pick up education data
      await saveOnboardingFull(employeeId, buildBody(), true);
      // Mark as submitted (backend persists draft data to real tables)
      await submitOnboarding(employeeId, 'education');
      setReloadVersion(version => version + 1);
      hookHandleSubmit();
      alert("Submitted successfully");
    } catch (err) {
      console.error("Submit failed", err?.response?.data || err.message || err);
      const errs = err?.response?.data?.errors;
      alert("Submit failed:\n" + (Array.isArray(errs) ? errs.map(e => e.msg).join('\n') : (err?.response?.data?.error || err.message || "unknown")));
    } finally {
      setSaving(false);
    }
  };

  // Modify
  const handleModify = () => {
    setShowReasonModal(true);
    setModifyReason("");
    setReasonError("");
  };

  const handleRequestPermission = async () => {
    if (!modifyReason.trim()) {
      setReasonError("Please enter a reason for modification.");
      return;
    }
    setReasonError("");
    try {
      await requestPermission(modifyReason);
      alert("Request submitted");
      setShowReasonModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to submit request: " + (err?.response?.data?.error || err.message || "unknown"));
    }
  };

  const handleCloseReasonModal = () => {
    setShowReasonModal(false);
    setModifyReason("");
    setReasonError("");
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6 font-employee">
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded px-4 py-2 text-blue-900 text-sm">
        Please update your educational qualifications in the sections below, from Master's to High School.
      </div>

      {/* Education Section */}
      <div className="mb-6 border-b pb-6">
        <EmpTypography.label>Education Details <span className="text-red-500">*</span> :</EmpTypography.label>
        {loadError && <p role="alert" className="text-red-600 text-sm mb-4">{loadError}</p>}
        {loading && <p role="status" className="text-sm mb-4">Loading education details...</p>}
        {EDUCATION_LEVELS.filter(({ key }) => key !== 'degree').map(({ key, label }) => (
          <section key={key} aria-labelledby={`education-${key}`} className="mb-4 p-4 rounded-xl border shadow-sm min-w-0">
            <h3 id={`education-${key}`} className="font-semibold text-gray-900 mb-3">{label}</h3>
            {educationList.map((edu, idx) => ({ edu, idx })).filter(({ edu }) =>
              edu.legacy ? key === 'degree' : edu.educationLevel === key
            ).map(({ edu, idx }) => (
              <div key={`${edu.id}-${idx}`} className={edu.legacy ? "border-t pt-4 mt-4" : ""}>
                {edu.legacy && <p className="text-sm font-medium text-gray-700 mb-3">Existing qualification: {edu.degree || "Unspecified"}</p>}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                  <div>
                    <EmpTypography.label>Degree</EmpTypography.label>
                    <input type="text" placeholder="Degree" value={edu.degree}
                      onChange={e => handleEduChange(idx, "degree", e.target.value)}
                      disabled={formDisabled} className={`border rounded px-2 py-1 text-sm w-full ${formDisabled ? 'bg-gray-100' : ''}`} />
                  </div>
                  <div>
                    <EmpTypography.label>University</EmpTypography.label>
                    <input type="text" placeholder="University" value={edu.university}
                      onChange={e => handleEduChange(idx, "university", e.target.value)}
                      disabled={formDisabled} className={`border rounded px-2 py-1 text-sm w-full ${formDisabled ? 'bg-gray-100' : ''}`} />
                  </div>
                  <div>
                    <EmpTypography.label>Major</EmpTypography.label>
                    <input type="text" placeholder="Major" value={edu.major}
                      onChange={e => handleEduChange(idx, "major", e.target.value)}
                      disabled={formDisabled} className={`border rounded px-2 py-1 text-sm w-full ${formDisabled ? 'bg-gray-100' : ''}`} />
                  </div>
                </div>

                {/* Address */}
                <div className="mb-2">
                  <EmpTypography.label>Address</EmpTypography.label>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    {[
                      { key: "street", label: "Street" },
                      { key: "city", label: "City" },
                      { key: "state", label: "State" },
                      { key: "zipCode", label: "Zip Code" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <EmpTypography.small>{label}</EmpTypography.small>
                        <input className={`w-full border rounded px-2 py-1 text-sm ${formDisabled ? 'bg-gray-100' : ''}`}
                          value={edu.address?.[key] || ""}
                          onChange={e => handleEduAddress(idx, key, e.target.value)}
                          disabled={formDisabled} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                  <div>
                    <EmpTypography.small>Start Date</EmpTypography.small>
                    <input type="date"

                      value={edu.startDate}
                      onChange={(e) => {
                        const value = e.target.value;
                        const year = value.split("-")[0];

                        if (year.length <= 4) {
                          handleEduChange(idx, "startDate", value);
                        } else {
                          e.target.value = value.slice(0, 4);
                        }
                      }}
                      max="9999-12-31"
                      disabled={formDisabled}
                      className={`border rounded px-2 py-1 text-sm w-full min-w-0 ${formDisabled ? 'bg-gray-100' : ''}`}
                    />
                  </div>
                  <div>
                    <EmpTypography.small>End Date</EmpTypography.small>
                    <input type="date"

                      value={edu.endDate}
                      onChange={(e) => {
                        const value = e.target.value;
                        const year = value.split("-")[0];

                        if (year.length <= 4) {
                          handleEduChange(idx, "endDate", value);
                        } else {
                          e.target.value = value.slice(0, 4);
                        }
                      }}
                      max="9999-12-31"
                      disabled={formDisabled}
                      className={`border rounded px-2 py-1 text-sm w-full min-w-0 ${formDisabled ? 'bg-gray-100' : ''}`}
                    />
                  </div>
                </div>

                {/* Document Upload */}
                <div className="w-full max-w-xs mb-2">
                  <FileUploadField
                    label="Upload Certificate:"
                    value={edu.docFile}
                    onChange={file => handleEduFile(idx, file)}
                    disabled={formDisabled}
                    employeeId={employeeId}
                    category="education"
                  />
                </div>

                {edu.additionalUploads?.length > 0 && (
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Other saved documents</p>
                    {edu.additionalUploads.map(upload => (
                      <a key={upload.id || upload.file_url} href={upload.file_url} target="_blank" rel="noopener noreferrer"
                        className="block text-blue-600 underline break-all">{upload.file_name || "Download document"}</a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>

      {/* Certifications Section */}
      <div className="mb-6 border-b pb-6">
        <EmpTypography.label>Certifications :</EmpTypography.label>
        {certList.map((cert, idx) => (
          <div key={cert.id || idx} className="mb-4 p-4 rounded-xl border shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              <div>
                <EmpTypography.label>Certificate Name</EmpTypography.label>
                <input type="text" placeholder="Certificate Name" value={cert.name}
                  onChange={e => handleCertChange(idx, "name", e.target.value)}
                  disabled={formDisabled} className={`border rounded px-2 py-1 text-sm w-full ${formDisabled ? 'bg-gray-100' : ''}`} />
              </div>
              <div>
                <EmpTypography.label>Organization</EmpTypography.label>
                <input type="text" placeholder="Organization" value={cert.org}
                  onChange={e => handleCertChange(idx, "org", e.target.value)}
                  disabled={formDisabled} className={`border rounded px-2 py-1 text-sm w-full ${formDisabled ? 'bg-gray-100' : ''}`} />
              </div>
            </div>
            <div className="flex gap-4 mb-2">
              <div>
                <EmpTypography.small>Start Date</EmpTypography.small>
                <input type="date"

                  value={cert.startDate}
                  onChange={e => {
                    const value = e.target.value;
                    const year = value.split("-")[0];

                    if (year.length <= 4) {
                      handleCertChange(idx, "startDate", value);
                    } else {
                      e.target.value = value.slice(0, 4);
                    }
                  }}
                  max="9999-12-31"
                  disabled={formDisabled}
                  className={`border rounded px-2 py-1 text-sm ${formDisabled ? "bg-gray-100" : ""
                    }`}
                />
              </div>
              <div>
                <EmpTypography.small>End Date</EmpTypography.small>
                <input type="date"

                  value={cert.endDate}
                  onChange={e => {
                    const value = e.target.value;
                    const year = value.split("-")[0];

                    if (year.length <= 4) {
                      handleCertChange(idx, "endDate", value);
                    } else {
                      e.target.value = value.slice(0, 4);
                    }
                  }}
                  max="9999-12-31"
                  disabled={formDisabled}
                  className={`border rounded px-2 py-1 text-sm ${formDisabled ? "bg-gray-100" : ""
                    }`}
                />
              </div>
            </div>
            <div className="mb-2">
              <EmpTypography.small>Description</EmpTypography.small>
              <textarea className={`border rounded w-full p-2 text-sm min-h-[40px] ${formDisabled ? 'bg-gray-100' : ''}`}
                value={cert.description || ""}
                onChange={e => handleCertChange(idx, "description", e.target.value)}
                disabled={formDisabled} placeholder="Brief description..." />
            </div>

            {/* Certificate Upload */}
            <div className="w-full max-w-xs mb-2">
              <FileUploadField
                label="Upload Certificate:"
                value={cert.certFile}
                onChange={file => handleCertFile(idx, file)}
                disabled={formDisabled}
                employeeId={employeeId}
                category="certification"
              />
            </div>

            <div className="flex gap-2">
              {!formDisabled && (
                <EmpTypography.button variant="primary" onClick={addCert}>+ Add</EmpTypography.button>
              )}
              {certList.length > 1 && !formDisabled && (
                <button type="button" className="text-red-600 px-2 py-1 rounded hover:bg-red-100"
                  onClick={() => deleteCert(idx)}>
                  <FaTrash />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Evaluation Section */}
      <div className="mb-6">
        <EmpTypography.label>Evaluation :</EmpTypography.label>
        {evaluationList.map((evalItem, idx) => (
          <div key={evalItem.id || idx} className="mb-4 p-4 rounded-xl border shadow-sm">
            <div className="mb-2">
              <EmpTypography.small>Description</EmpTypography.small>
              <textarea className={`border rounded w-full p-2 text-sm min-h-[40px] ${formDisabled ? 'bg-gray-100' : ''}`}
                value={evalItem.description}
                onChange={e => handleEvalChange(idx, "description", e.target.value)}
                disabled={formDisabled}
                placeholder="Enter a short description about the evaluated certificate" />
            </div>

            <div className="w-full max-w-xs mb-2">
              <FileUploadField
                label="Upload Evaluation Document:"
                value={evalItem.evalFile}
                onChange={file => handleEvalFile(idx, file)}
                disabled={formDisabled}
                employeeId={employeeId}
                category="evaluation"
              />
            </div>

            <div className="flex gap-2">
              {!formDisabled && (
                <EmpTypography.button variant="primary" onClick={addEvaluation}>+ Add</EmpTypography.button>
              )}
              {evaluationList.length > 1 && !formDisabled && (
                <button type="button" className="text-red-600 px-2 py-1 rounded hover:bg-red-100"
                  onClick={() => deleteEvaluation(idx)}>
                  <FaTrash />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end mt-4 gap-2">
        {(!onboardingSubmitted || canEdit) && (
          <EmpTypography.button variant="primary" onClick={handleSave} disabled={saving || formDisabled}>
            {saving ? "Saving..." : "Save"}
          </EmpTypography.button>
        )}
        {(!onboardingSubmitted || canEdit) && (
          <EmpTypography.button variant="primary" onClick={() => setShowConfirmModal(true)} disabled={saving || formDisabled}>
            Submit
          </EmpTypography.button>
        )}
        {onboardingSubmitted && !canEdit && !permissionGranted && (
          <EmpTypography.button variant="primary" onClick={handleModify}>
            RequestModify
          </EmpTypography.button>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs">
              <EmpTypography.h3 className="mb-2">Confirm Submission</EmpTypography.h3>
              <div className="mb-4 text-sm">Before submitting, please review. Any changes after submission will require admin permission.</div>
              <div className="flex gap-2 justify-end">
                <EmpTypography.button onClick={handleConfirmSubmit}>Confirm</EmpTypography.button>
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
              <textarea className="border rounded w-full p-2 mb-2" rows={3}
                value={modifyReason} onChange={e => setModifyReason(e.target.value)}
                placeholder="Describe your reason..." />
              {reasonError && <EmpTypography.small className="text-red-600 mb-2">{reasonError}</EmpTypography.small>}
              <div className="flex gap-2 justify-end">
                <EmpTypography.button onClick={handleRequestPermission}>Request</EmpTypography.button>
                <EmpTypography.button onClick={handleCloseReasonModal}>Cancel</EmpTypography.button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
