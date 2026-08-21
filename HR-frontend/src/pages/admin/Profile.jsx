import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import AdminTypography from "../../components/admin/AdminTypography";
import { getMyProfile, updateMyProfile } from "../../api/onboarding";

export default function AdminProfile() {
  const { user, login } = useAuth();
  const fileInputRef = useRef();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [saved, setSaved] = useState({
    firstName: "", lastName: "", jobRole: "", jobDescription: "",
    status: "", notes: "", profileImage: "",
  });
  const [draft, setDraft] = useState(saved);

  const getInitials = (first, last) => {
    if (first && last) return (first[0] + last[0]).toUpperCase();
    return (first || "").slice(0, 2).toUpperCase();
  };

  useEffect(() => {
    getMyProfile()
      .then(res => {
        const d = res.data;
        const loaded = {
          firstName: d.firstName || "",
          lastName: d.lastName || "",
          jobRole: d.jobRole || "",
          jobDescription: d.jobDescription || "",
          status: d.profileStatus || "",
          notes: d.taskNotes || "",
          profileImage: d.profileImage || "",
        };
        setSaved(loaded);
        setDraft(loaded);
      })
      .catch(() => {
        const fallback = {
          firstName: user?.firstName || user?.name?.split(" ")[0] || "",
          lastName: user?.lastName || user?.name?.split(" ")[1] || "",
          jobRole: user?.jobRole || "",
          jobDescription: user?.jobDescription || "",
          status: user?.profileStatus || "",
          notes: user?.taskNotes || "",
          profileImage: user?.profileImage || "",
        };
        setSaved(fallback);
        setDraft(fallback);
      });
  }, []);

  const handleChange = (field, value) => setDraft(prev => ({ ...prev, [field]: value }));
  const handleEdit = () => { setError(""); setEditing(true); };
  const handleCancel = () => { setDraft(saved); setEditing(false); setError(""); };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await updateMyProfile({
        firstName: draft.firstName,
        lastName: draft.lastName,
        jobRole: draft.jobRole,
        jobDescription: draft.jobDescription,
        profileStatus: draft.status,
        taskNotes: draft.notes,
        profileImage: draft.profileImage,
      });
      const updated = res.data.user;
      const newSaved = {
        firstName: updated.firstName || "",
        lastName: updated.lastName || "",
        jobRole: updated.jobRole || "",
        jobDescription: updated.jobDescription || "",
        status: updated.profileStatus || "",
        notes: updated.taskNotes || "",
        profileImage: updated.profileImage || "",
      };
      setSaved(newSaved);
      setDraft(newSaved);
      login({ ...user, ...updated }, localStorage.getItem("token"));
      setEditing(false);
    } catch (err) {
      setError(err?.response?.data?.error || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && ["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      const reader = new FileReader();
      reader.onload = ev => setDraft(prev => ({ ...prev, profileImage: ev.target.result }));
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full max-w-16xl mx-auto py-12 px-8 md:px-10">
      <AdminTypography.h1 className="mb-8">Profile</AdminTypography.h1>
      <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row gap-8 w-full">
          {/* Profile Picture */}
          <div className="flex flex-col items-center md:items-start">
            <div className="relative group mb-4">
              {draft.profileImage ? (
                <img src={draft.profileImage} alt="Profile" className="w-32 h-32 rounded-full border-2 border-blue-200 object-cover" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-4xl border-2 border-blue-200">
                  {getInitials(draft.firstName, draft.lastName)}
                </div>
              )}
              {editing && (
                <>
                  <button
                    type="button"
                    className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-md border border-gray-200 hover:bg-blue-100 transition opacity-90"
                    onClick={() => fileInputRef.current.click()}
                    title="Change profile picture"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13h6m2 2a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2h10z" />
                    </svg>
                  </button>
                  <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={handleImageChange} />
                </>
              )}
            </div>
          </div>

          {/* Name & Job Info */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex gap-4">
              <div className="flex-1">
                <AdminTypography.label className="mb-1 block">First Name</AdminTypography.label>
                <input type="text" value={draft.firstName} onChange={e => handleChange("firstName", e.target.value)} className="border rounded px-3 py-2 w-full text-gray-800 mb-2" disabled={!editing} />
              </div>
              <div className="flex-1">
                <AdminTypography.label className="mb-1 block">Last Name</AdminTypography.label>
                <input type="text" value={draft.lastName} onChange={e => handleChange("lastName", e.target.value)} className="border rounded px-3 py-2 w-full text-gray-800 mb-2" disabled={!editing} />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <AdminTypography.label className="mb-1 block">Role</AdminTypography.label>
                <input type="text" value={draft.jobRole} onChange={e => handleChange("jobRole", e.target.value)} className="border rounded px-3 py-2 w-full text-gray-800 mb-2" disabled={!editing} />
              </div>
              <div className="flex-1">
                <AdminTypography.label className="mb-1 block">Job Description</AdminTypography.label>
                <input type="text" value={draft.jobDescription} onChange={e => handleChange("jobDescription", e.target.value)} className="border rounded px-3 py-2 w-full text-gray-800 mb-2" disabled={!editing} />
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col md:flex-row gap-8 w-full">
          <div className="flex-1">
            <AdminTypography.label className="mb-1 block">Status</AdminTypography.label>
            <input type="text" value={draft.status} onChange={e => handleChange("status", e.target.value)} className="border rounded px-3 py-2 w-full text-gray-800 mb-2" disabled={!editing} />
          </div>
        </div>

        {/* Task Notes */}
        <div className="flex flex-col w-full">
          <AdminTypography.label className="mb-1 block">My Task Notes</AdminTypography.label>
          <textarea className="w-full min-h-[120px] border rounded-lg p-3 text-gray-800 bg-white resize-y" value={draft.notes} onChange={e => handleChange("notes", e.target.value)} disabled={!editing} />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {/* Buttons */}
        <div className="flex gap-2 mt-4 justify-end">
          {!editing ? (
            <AdminTypography.button variant="primary" onClick={handleEdit}>Edit</AdminTypography.button>
          ) : (
            <>
              <AdminTypography.button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </AdminTypography.button>
              <AdminTypography.button variant="secondary" onClick={handleCancel} disabled={saving}>
                Cancel
              </AdminTypography.button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
