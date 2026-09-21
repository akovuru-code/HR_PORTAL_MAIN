import React, { useState, useEffect } from "react";
import AdminTypography from "../../components/admin/AdminTypography";
import { useAuth } from "../../hooks/useAuth";
import { getMyProfile, updateMyProfile, changeEmail, changePassword } from "../../api/onboarding";

function Toast({ message, type, onClose }) {
    useEffect(() => {
        if (!message) return;
        const t = setTimeout(onClose, 3000);
        return () => clearTimeout(t);
    }, [message, onClose]);
    if (!message) return null;
    return (
        <div className={`fixed top-6 right-6 z-50 px-4 py-2 rounded shadow-lg text-white ${type === "success" ? "bg-green-600" : "bg-red-600"}`}>
            {message}
            <button className="ml-2 text-lg" onClick={onClose}>×</button>
        </div>
    );
}

function EmailModal({ open, onClose, currentEmail, onSave }) {
    const [newEmail, setNewEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!newEmail || !password) { setError("All fields are required."); return; }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) { setError("Invalid email address."); return; }
        setError("");
        setSaving(true);
        try {
            await onSave(newEmail, password);
            setNewEmail(""); setPassword("");
            onClose();
        } catch (err) {
            setError(err?.response?.data?.error || "Failed to change email.");
        } finally { setSaving(false); }
    }

    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-lg p-8 w-[95vw] max-w-md relative">
                <button className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-700" onClick={onClose}>×</button>
                <AdminTypography.h2 className="mb-4">Change Email</AdminTypography.h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <AdminTypography.label>Current Email</AdminTypography.label>
                        <input type="email" value={currentEmail} readOnly className="w-full border rounded px-3 py-2 bg-gray-100" />
                    </div>
                    <div>
                        <AdminTypography.label>New Email</AdminTypography.label>
                        <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full border rounded px-3 py-2" required />
                    </div>
                    <div>
                        <AdminTypography.label>Password</AdminTypography.label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" required />
                    </div>
                    {error && <div className="text-red-500 text-sm">{error}</div>}
                    <div className="flex justify-end gap-2">
                        <AdminTypography.button type="button" variant="secondary" onClick={onClose}>Cancel</AdminTypography.button>
                        <AdminTypography.button type="submit" disabled={saving}>{saving ? "Saving..." : "Update Email"}</AdminTypography.button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function PasswordModal({ open, onClose, onSave }) {
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!current || !next || !confirm) { setError("All fields are required."); return; }
        if (next !== confirm) { setError("Passwords do not match."); return; }
        if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*]{8,}$/.test(next)) {
            setError("Password must be at least 8 characters and contain a number."); return;
        }
        setError("");
        setSaving(true);
        try {
            await onSave(current, next);
            setCurrent(""); setNext(""); setConfirm("");
            onClose();
        } catch (err) {
            setError(err?.response?.data?.error || "Failed to change password.");
        } finally { setSaving(false); }
    }

    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-lg p-8 w-[95vw] max-w-md relative">
                <button className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-700" onClick={onClose}>×</button>
                <AdminTypography.h2 className="mb-4">Change Password</AdminTypography.h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <AdminTypography.label>Current Password</AdminTypography.label>
                        <input type="password" value={current} onChange={e => setCurrent(e.target.value)} className="w-full border rounded px-3 py-2" required />
                    </div>
                    <div>
                        <AdminTypography.label>New Password</AdminTypography.label>
                        <input type="password" value={next} onChange={e => setNext(e.target.value)} className="w-full border rounded px-3 py-2" required />
                    </div>
                    <div>
                        <AdminTypography.label>Confirm New Password</AdminTypography.label>
                        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full border rounded px-3 py-2" required />
                    </div>
                    {error && <div className="text-red-500 text-sm">{error}</div>}
                    <div className="flex justify-end gap-2">
                        <AdminTypography.button type="button" variant="secondary" onClick={onClose}>Cancel</AdminTypography.button>
                        <AdminTypography.button type="submit" disabled={saving}>{saving ? "Saving..." : "Update Password"}</AdminTypography.button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function Settings() {
    const { user, login } = useAuth();
    const [email, setEmail] = useState("");
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [toast, setToast] = useState({ message: "", type: "success" });
    const [saving, setSaving] = useState(false);
    const [notifLoading, setNotifLoading] = useState(false);

    //Country codes for phone number
    const countryCodes = [
        { code: "+1", country: "US" },
        { code: "+1", country: "Canada" },
        { code: "+91", country: "India" },
    ];

    // Profile fields
    const [photoUrl, setPhotoUrl] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [countryCode, setCountryCode] = useState("+91");
    const [phone, setPhone] = useState("");
    const [about, setAbout] = useState("");
    const [status, setStatus] = useState("In Project");
    const [role, setRole] = useState("");
    const [jobDesc, setJobDesc] = useState("");
    const [prevRole, setPrevRole] = useState("");
    const [trainingModules, setTrainingModules] = useState("");
    const [certifications, setCertifications] = useState("");
    const [notif, setNotif] = useState({ hr: true, timesheet: true, onboarding: false });


    // Load profile on mount
    useEffect(() => {
        getMyProfile().then(res => {
            const d = res?.data || res;
            setEmail(d.email || "");
            setPhotoUrl(d.profileImage || "");
            setFirstName(d.firstName || "");
            setLastName(d.lastName || "");
            if (d.phone) {
                const match = d.phone.match(/^(\+\d{1,4})(\d{10})$/);
                if (match) {
                    setCountryCode(match[1]);
                    setPhone(match[2].replace(/\s+/g, ''));
                } else {
                    setPhone(d.phone);
                }
            }
            setAbout(d.aboutMe || "");
            setStatus(d.profileStatus || "In Project");
            const sd = d.statusDetails || {};
            setRole(sd.role || "");
            setJobDesc(sd.jobDesc || "");
            setPrevRole(sd.prevRole || "");
            setTrainingModules(sd.trainingModules || "");
            setCertifications(sd.certifications || "");
            if (d.notifPrefs) setNotif({ hr: !!d.notifPrefs.hr, timesheet: !!d.notifPrefs.timesheet, onboarding: !!d.notifPrefs.onboarding });
        }).catch(() => {
            setEmail(user?.email || "");
        });
    }, []);

    const buildStatusDetails = () => {
        if (status === "In Project") return { role, jobDesc };
        if (status === "On Bench") return { prevRole };
        if (status === "In Training") return { trainingModules, certifications };
        return {};
    };

    function handlePhotoChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => setPhotoUrl(ev.target.result);
        reader.readAsDataURL(file);
    }

    async function handleSaveAll(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await updateMyProfile({
                firstName, lastName, phone: `${countryCode}${phone}`, aboutMe: about,
                profileStatus: status, statusDetails: buildStatusDetails(),
                ...(photoUrl ? { profileImage: photoUrl } : {}),
            });
            if (res?.data?.user) login(res.data.user, localStorage.getItem("token"));
            setToast({ message: "Profile updated successfully!", type: "success" });
        } catch (err) {
            setToast({ message: err?.response?.data?.error || "Save failed.", type: "error" });
        } finally { setSaving(false); }
    }

    async function handleEmailSave(newEmail, password) {
        const res = await changeEmail(newEmail, password);
        setEmail(res.data.email || newEmail);
        setToast({ message: "Email updated successfully!", type: "success" });
    }

    async function handlePasswordSave(current, next) {
        await changePassword(current, next);
        setToast({ message: "Password updated successfully!", type: "success" });
    }

    async function handleNotifSave(e) {
        e.preventDefault();
        setNotifLoading(true);
        try {
            await updateMyProfile({ notifPrefs: notif });
            setToast({ message: "Preferences saved!", type: "success" });
        } catch {
            setToast({ message: "Failed to save preferences.", type: "error" });
        } finally { setNotifLoading(false); }
    }

    let statusDetails = null;
    if (status === "In Project") {
        statusDetails = (
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <AdminTypography.label>Role</AdminTypography.label>
                    <input type="text" className="w-full border rounded px-3 py-2" value={role} onChange={e => setRole(e.target.value)} />
                </div>
                <div className="flex-1">
                    <AdminTypography.label>Job Description</AdminTypography.label>
                    <input type="text" className="w-full border rounded px-3 py-2" value={jobDesc} onChange={e => setJobDesc(e.target.value)} />
                </div>
            </div>
        );
    } else if (status === "On Bench") {
        statusDetails = (
            <div className="flex-1">
                <AdminTypography.label>Previous Role</AdminTypography.label>
                <input type="text" className="w-full border rounded px-3 py-2" value={prevRole} onChange={e => setPrevRole(e.target.value)} />
            </div>
        );
    } else if (status === "In Training") {
        statusDetails = (
            <div className="flex flex-col gap-4">
                <div>
                    <AdminTypography.label>Ongoing Training Modules</AdminTypography.label>
                    <textarea className="w-full border rounded px-3 py-2" rows={2} value={trainingModules} onChange={e => setTrainingModules(e.target.value)} />
                </div>
                <div>
                    <AdminTypography.label>Certifications Completed</AdminTypography.label>
                    <textarea className="w-full border rounded px-3 py-2" rows={2} value={certifications} onChange={e => setCertifications(e.target.value)} />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full px-0 md:px-8 py-6 flex flex-col items-start">
            <AdminTypography.h1 className="mb-10 px-4 md:px-0 text-3xl">Settings</AdminTypography.h1>
            <form onSubmit={handleSaveAll} className="w-full container mx-auto px-2 md:px-8">
                <div className="bg-white rounded-2xl shadow p-8 flex flex-col gap-8 border w-full">
                    {/* Profile fields */}
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        {/* Profile Photo */}
                        <div className="flex flex-col items-center gap-2 min-w-[120px] md:pr-4">
                            <div className="w-28 h-28 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center border">
                                {photoUrl ? (
                                    <img src={photoUrl} alt="Profile" className="object-cover w-full h-full" />
                                ) : (
                                    <span className="text-4xl text-gray-400">👤</span>
                                )}
                            </div>
                            <label className="mt-2 cursor-pointer text-blue-600 hover:underline text-sm">
                                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                                Upload Photo
                            </label>
                        </div>
                        <div className="flex-1 w-full flex flex-col gap-4">
                            <div>
                                <AdminTypography.label className="font-semibold">Current Email</AdminTypography.label>
                                <div className="text-gray-900 font-mono text-base mb-2">{email}</div>
                            </div>
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1">
                                    <AdminTypography.label>First Name</AdminTypography.label>
                                    <input type="text" className="w-full border rounded px-3 py-2" value={firstName} onChange={e => setFirstName(e.target.value)} />
                                </div>
                                <div className="flex-1">
                                    <AdminTypography.label>Last Name</AdminTypography.label>
                                    <input type="text" className="w-full border rounded px-3 py-2" value={lastName} onChange={e => setLastName(e.target.value)} />
                                </div>
                            </div>
                            <div className="w-full md:w-1/2">
                                <AdminTypography.label>Phone Number</AdminTypography.label>

                                <div className="flex gap-2">
                                    <select
                                        value={countryCode}
                                        onChange={(e) => setCountryCode(e.target.value)}
                                        className="border rounded px-3 py-2 bg-white"
                                    >
                                        {countryCodes.map((item) => (
                                            <option key={item.code} value={item.code}>
                                                {item.country} ({item.code})
                                            </option>
                                        ))}
                                    </select>

                                    <input
                                        type="tel"
                                        className="flex-1 border rounded px-3 py-2"
                                        value={phone}
                                        maxLength={10}
                                        placeholder="9876543210"
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, "");
                                            setPhone(value);
                                        }}
                                    />
                                </div>

                            </div>
                            <div>
                                <AdminTypography.label>About Me <span className="text-xs text-gray-400">(max 500 chars)</span></AdminTypography.label>
                                <textarea className="w-full border rounded px-3 py-2" rows={3} maxLength={500} value={about} onChange={e => setAbout(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    {/* Status */}
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1">
                            <AdminTypography.label>Current Status</AdminTypography.label>
                            <select className="w-full border rounded px-3 py-2" value={status} onChange={e => setStatus(e.target.value)}>
                                <option>In Project</option>
                                <option>On Bench</option>
                                <option>In Training</option>
                            </select>
                        </div>
                        <div className="flex-1">{statusDetails}</div>
                    </div>
                    {/* Email / Password */}
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1 flex flex-col gap-2">
                            <AdminTypography.label>Email</AdminTypography.label>
                            <div className="flex items-center gap-4">
                                <span className="text-gray-700">{email}</span>
                                <AdminTypography.button type="button" onClick={() => setShowEmailModal(true)}>Change Email</AdminTypography.button>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col gap-2">
                            <AdminTypography.label>Password</AdminTypography.label>
                            <AdminTypography.button type="button" className="w-fit" onClick={() => setShowPasswordModal(true)}>Change Password</AdminTypography.button>
                        </div>
                    </div>
                    {/* Notification Preferences */}
                    <div className="flex flex-col gap-4">
                        <AdminTypography.h2 className="mb-2 text-xl">Notification Preferences</AdminTypography.h2>
                        <div className="flex flex-col md:flex-row gap-8">
                            <label className="flex items-center gap-3">
                                <input type="checkbox" name="hr" checked={notif.hr} onChange={e => setNotif(n => ({ ...n, hr: e.target.checked }))} className="accent-blue-600 w-5 h-5" />
                                <span className="text-gray-800">Receive HR updates</span>
                            </label>
                            <label className="flex items-center gap-3">
                                <input type="checkbox" name="timesheet" checked={notif.timesheet} onChange={e => setNotif(n => ({ ...n, timesheet: e.target.checked }))} className="accent-blue-600 w-5 h-5" />
                                <span className="text-gray-800">Timesheet reminders</span>
                            </label>
                            <label className="flex items-center gap-3">
                                <input type="checkbox" name="onboarding" checked={notif.onboarding} onChange={e => setNotif(n => ({ ...n, onboarding: e.target.checked }))} className="accent-blue-600 w-5 h-5" />
                                <span className="text-gray-800">New employee onboarding alerts</span>
                            </label>
                        </div>
                        <div className="flex justify-end">
                            <AdminTypography.button type="button" disabled={notifLoading} onClick={handleNotifSave}>
                                {notifLoading ? "Saving..." : "Save Preferences"}
                            </AdminTypography.button>
                        </div>
                    </div>
                    {/* Save All */}
                    <div className="flex justify-end mt-4">
                        <AdminTypography.button type="submit" disabled={saving} className="px-8 py-3">
                            {saving ? "Saving..." : "Save All"}
                        </AdminTypography.button>
                    </div>
                </div>
            </form>
            <EmailModal open={showEmailModal} onClose={() => setShowEmailModal(false)} currentEmail={email} onSave={handleEmailSave} />
            <PasswordModal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} onSave={handlePasswordSave} />
            <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
        </div>
    );
}
