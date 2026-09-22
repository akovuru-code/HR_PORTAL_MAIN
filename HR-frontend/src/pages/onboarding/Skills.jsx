
import { useState, useEffect } from "react";
import EmpTypography from "../../components/emp/EmpTypography";
import { useOnboardingPermissions } from "../../hooks/useOnboardingPermissions";
import { FaTrash } from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { useAdminView } from "../../contexts/AdminViewContext";
import { saveOnboardingFull, submitOnboarding, getDraft, getOnboarding } from "../../api/onboarding";
import FileUploadField from "../../components/emp/FileUploadField";
EmpTypography._log && EmpTypography._log();

export default function Skills() {
  const { user } = useAuth();
  const { targetEmployeeId } = useAdminView() || {};
  const employeeId = targetEmployeeId || user?.employeeId || user?.id;

  // Permissions hook
  const pageKey = 'canEdit_skills';
  const {
    canEdit,
    onboardingSubmitted,
    handleSubmit: hookHandleSubmit,
    requestPermission,
    permissionRequested,
    permissionGranted,
  } = useOnboardingPermissions(pageKey, 'skills');

  // UI state
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [modifyReason, setModifyReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  // Role Sections State — resumeFile/cvFile are single file objects (like Personal Info)
  const [roleSections, setRoleSections] = useState([
    { role: "", description: "", resumeFile: null, cvFile: null, skills: "" }
  ]);

  // Filter state
  const [filterCategory, setFilterCategory] = useState("");

  const formDisabled = onboardingSubmitted && !canEdit;

  // Load data: first from submitted (getOnboarding), then overlay draft if exists
  useEffect(() => {
    async function loadData() {
      if (!employeeId) return;
      try {
        // Load submitted role sections from server
        const onboardingRes = await getOnboarding(employeeId);
        const serverSections = onboardingRes?.data?.roleSections;
        if (serverSections && serverSections.length > 0) {
          setRoleSections(serverSections.map(s => {
            const resumeArr = s.resumeUploads || [];
            const cvArr = s.cvUploads || [];
            return {
              role: s.role || "",
              description: s.description || "",
              skills: s.skills || "",
              resumeFile: resumeArr.length > 0 ? {
                url: resumeArr[0].file_url,
                filename: resumeArr[0].file_name,
                originalName: resumeArr[0].file_name,
              } : null,
              cvFile: cvArr.length > 0 ? {
                url: cvArr[0].file_url,
                filename: cvArr[0].file_name,
                originalName: cvArr[0].file_name,
              } : null,
            };
          }));
        }

        // Overlay with skills-specific draft if it exists
        const draft = await getDraft(employeeId, 'skills');
        if (draft?.data?.payload?.roleSections) {
          setRoleSections(draft.data.payload.roleSections);
        }
      } catch (err) {
        // ignore load errors
      } finally {
        // loaded
      }
    }
    loadData();
  }, [employeeId]);

  // Section management
  const handleAddSection = () => {
    if (formDisabled) return;
    setRoleSections([...roleSections, { role: "", description: "", resumeFile: null, cvFile: null, skills: "" }]);
  };

  const handleRemoveSection = (idx) => {
    if (formDisabled) return;
    setRoleSections(roleSections.filter((_, i) => i !== idx));
  };

  const handleSectionChange = (idx, field, value) => {
    if (formDisabled) return;
    setRoleSections(roleSections.map((section, i) =>
      i === idx ? { ...section, [field]: value } : section
    ));
  };

  const handleResumeFile = (idx, file) => {
    setRoleSections(roleSections.map((section, i) =>
      i === idx ? { ...section, resumeFile: file } : section
    ));
  };

  const handleCVFile = (idx, file) => {
    setRoleSections(roleSections.map((section, i) =>
      i === idx ? { ...section, cvFile: file } : section
    ));
  };

  // Filter
  const uniqueRoles = Array.from(new Set(roleSections.map(s => s.role).filter(Boolean)));
  const filteredSections = filterCategory
    ? roleSections.filter(section => section.role === filterCategory)
    : roleSections;

  // Build payload for save/submit
  const buildBody = () => ({
    tab: 'skills',
    payload: { roleSections },
    spouse: null,
    kids: [],
    documents: [],
  });

  // Validate
  const validate = () => {
    const emptySections = roleSections.filter(s => s.role.trim() === "");
    if (emptySections.length > 0) {
      const msg = emptySections.length === 1
        ? "Please add role section with a role name."
        : "Please add all role sections with a role name.";
      setValidationError(msg);
      return false;
    }
    setValidationError("");
    return true;
  };

  // Save draft
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (!employeeId) throw new Error('Missing employeeId');
      await saveOnboardingFull(employeeId, buildBody(), true);
      alert('Draft saved');
    } catch (err) {
      alert('Save failed: ' + (err?.response?.data?.error || err.message || 'unknown'));
    } finally {
      setSaving(false);
    }
  };

  // Submit (save draft then mark submitted — submitOnboarding persists from draft)
  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    if (!validate()) return;
    setSaving(true);
    try {
      if (!employeeId) throw new Error('Missing employeeId');
      // Save as draft so submit can pick up roleSections
      await saveOnboardingFull(employeeId, buildBody(), true);
      // Mark as submitted (backend persists draft data to real tables)
      await submitOnboarding(employeeId, 'skills');
      // Update local UI state
      hookHandleSubmit();
      alert('Submitted successfully');
    } catch (err) {
      console.error('Submit failed', err?.response?.data || err.message || err);
      const errs = err?.response?.data?.errors;
      alert('Submit failed:\n' + (Array.isArray(errs) ? errs.map(e => e.msg).join('\n') : (err?.response?.data?.error || err.message || 'unknown')));
    } finally {
      setSaving(false);
    }
  };

  // Modify request
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
      alert('Request submitted');
      setShowReasonModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to submit request: ' + (err?.response?.data?.error || err.message || 'unknown'));
    }
  };

  const handleCloseReasonModal = () => {
    setShowReasonModal(false);
    setModifyReason("");
    setReasonError("");
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6 font-employee">
      {/* Filter Resume / CV */}
      <div className="mb-6 border-b pb-6">
        <EmpTypography.h3 className="mb-2">Filter Resume / CV :</EmpTypography.h3>
        <div className="flex flex-wrap gap-2 items-center mb-2">
          <select className="border rounded px-2 py-1 text-sm" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="">All Roles</option>
            {uniqueRoles.map((role, idx) => (
              <option key={idx} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dynamic Role Sections */}
      <div className="mb-6">
        {filteredSections.map((section, idx) => {
          const actualIdx = roleSections.indexOf(section);
          return (
            <div key={actualIdx} className="mb-6 p-4 rounded-xl border shadow-sm bg-white-50">
              <div className="flex flex-col md:flex-row gap-4 mb-2">
                <div className="flex-1">
                  <EmpTypography.label>Role Name<span className="text-red-500">
                    *
                  </span>:</EmpTypography.label>
                  <EmpTypography.input
                    type="text"
                    value={section.role}
                    onChange={e => handleSectionChange(actualIdx, 'role', e.target.value)}
                    disabled={formDisabled}
                    className="mb-2"
                  />
                </div>
                <div className="flex-1">
                  <EmpTypography.label>Description:</EmpTypography.label>
                  <textarea
                    className={`border rounded w-full p-2 text-sm min-h-[40px] ${formDisabled ? 'bg-gray-100' : ''}`}
                    value={section.description}
                    onChange={e => handleSectionChange(actualIdx, 'description', e.target.value)}
                    disabled={formDisabled}
                    placeholder="Describe this role..."
                  />
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-4 mb-2">
                <div className="flex-1">
                  <FileUploadField
                    label="Resume Upload:"
                    value={section.resumeFile}
                    onChange={file => handleResumeFile(actualIdx, file)}
                    disabled={formDisabled}
                    employeeId={employeeId}
                    category="resume"
                  />
                </div>

              </div>
              <div className="mb-2">
                <EmpTypography.label>Skills:</EmpTypography.label>
                <textarea
                  className={`border rounded w-full p-2 text-sm min-h-[40px] ${formDisabled ? 'bg-gray-100' : ''}`}
                  value={section.skills}
                  onChange={e => handleSectionChange(actualIdx, 'skills', e.target.value)}
                  disabled={formDisabled}
                  placeholder="Enter skills for this role..."
                />
              </div>
              {roleSections.length > 1 && !formDisabled && (
                <div className="flex justify-end">
                  <button className="text-red-600 px-2 py-1 rounded hover:bg-red-100" onClick={() => handleRemoveSection(actualIdx)}>
                    <FaTrash />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {!formDisabled && (
          <div className="flex justify-end">
            <EmpTypography.button variant="primary" onClick={handleAddSection}>
              Add Section
            </EmpTypography.button>
          </div>
        )}
      </div>

      {/* Validation Error */}
      {validationError && (
        <EmpTypography.small className="text-red-600 mb-2">{validationError}</EmpTypography.small>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end mt-4 gap-2">
        {(!onboardingSubmitted || canEdit) && (
          <EmpTypography.button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </EmpTypography.button>
        )}
        {(!onboardingSubmitted || canEdit) && (
          <EmpTypography.button variant="primary" onClick={() => setShowConfirmModal(true)} disabled={saving}>
            Submit
          </EmpTypography.button>
        )}
        {onboardingSubmitted && !canEdit && !permissionGranted && (
          <EmpTypography.button variant="primary" onClick={handleModify}>
            Request Modify
          </EmpTypography.button>
        )}

        {/* Confirmation Modal for Submit */}
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
      </div>
    </div>
  );
}
