import React, { useState, useEffect } from "react";
import EmpTypography from "../../components/emp/EmpTypography";
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
        <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded shadow-lg text-sm font-medium ${type === "error" ? "bg-red-100 text-red-700" : "bg-blue-50 text-blue-800"}`}>
            {message}
        </div>
    );
}

function EmailModal({ open, onClose, currentEmail, onSaved }) {
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
            const res = await changeEmail(newEmail, password);
            onSaved(res.data.email);
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
                <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-700">×</button>
                <EmpTypography.label className="mb-4 block">Change Email</EmpTypography.label>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <EmpTypography.label>Current Email</EmpTypography.label>
                        <input type="email" value={currentEmail} readOnly className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-500" />
                    </div>
                    <div>
                        <EmpTypography.label>New Email</EmpTypography.label>
                        <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full border rounded px-3 py-2" required />
                    </div>
                    <div>
                        <EmpTypography.label>Current Password</EmpTypography.label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" required />
                    </div>
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    <div className="flex justify-end gap-2">
                        <EmpTypography.button type="button" variant="secondary" onClick={onClose}>Cancel</EmpTypography.button>
                        <EmpTypography.button type="submit" variant="primary" disabled={saving}>{saving ? "Saving..." : "Update Email"}</EmpTypography.button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function PasswordModal({ open, onClose, onSaved }) {
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!current || !next || !confirm) { setError("All fields are required."); return; }
        if (next !== confirm) { setError("Passwords do not match."); return; }
        if (next.length < 8) { setError("Password must be at least 8 characters."); return; }
        setError("");
        setSaving(true);
        try {
            await changePassword(current, next);
            onSaved();
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
                <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-700">×</button>
                <EmpTypography.label className="mb-4 block">Change Password</EmpTypography.label>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <EmpTypography.label>Current Password</EmpTypography.label>
                        <input type="password" value={current} onChange={e => setCurrent(e.target.value)} className="w-full border rounded px-3 py-2" required />
                    </div>
                    <div>
                        <EmpTypography.label>New Password</EmpTypography.label>
                        <input type="password" value={next} onChange={e => setNext(e.target.value)} className="w-full border rounded px-3 py-2" required />
                    </div>
                    <div>
                        <EmpTypography.label>Confirm New Password</EmpTypography.label>
                        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full border rounded px-3 py-2" required />
                    </div>
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    <div className="flex justify-end gap-2">
                        <EmpTypography.button type="button" variant="secondary" onClick={onClose}>Cancel</EmpTypography.button>
                        <EmpTypography.button type="submit" variant="primary" disabled={saving}>{saving ? "Saving..." : "Update Password"}</EmpTypography.button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function EmployeeSettings() {
    const { user, login } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ message: "", type: "success" });
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    //Country codes for phone number
    const countryCodes = [
        { value: "IN", code: "+91", country: "IND" },
        { value: "US", code: "+1", country: "USA" },
        { value: "CA", code: "+1", country: "CA" },
        { value: "GB", code: "+44", country: "UK" },
        { value: "AU", code: "+61", country: "AUS" },
    ];

    const splitPhone = (value, savedCountry) => {
        const normalized = String(value || "").replace(/\s+/g, "");
        const selectedCountry = countryCodes.find((country) => country.value === savedCountry);
        const country = selectedCountry && normalized.startsWith(selectedCountry.code)
            ? selectedCountry
            : countryCodes
                .slice()
                .sort((a, b) => b.code.length - a.code.length)
                .find((item) => normalized.startsWith(item.code));

        return country
            ? { country: country.value, number: normalized.slice(country.code.length) }
            : { country: "IN", number: normalized };
    };


    // Form state
    const [email, setEmail] = useState(user?.email || "");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phoneCountry, setPhoneCountry] = useState("IN");
    const [phone, setPhone] = useState("");
    const [about, setAbout] = useState("");
    const [status, setStatus] = useState("In Project");
    const [photoUrl, setPhotoUrl] = useState("");
    const [photoFile, setPhotoFile] = useState(null);

    // Status-specific fields stored as an object
    const [statusDetails, setStatusDetails] = useState({
        role: "", jobDesc: "", prevRole: "", prevDesc: "", trainingModules: "", certifications: ""
    });

    const [notif, setNotif] = useState({ hr: true, timesheet: true, onboarding: false });

    // Load from backend on mount
    useEffect(() => {
        getMyProfile()
            .then(res => {
                const d = res.data;
                setEmail(d.email || "");
                setFirstName(d.firstName || "");
                setLastName(d.lastName || "");
                if (d.phone) {
                    const { country, number } = splitPhone(d.phone, d.phoneCountry);
                    setPhoneCountry(country);
                    setPhone(number);
                }
                setAbout(d.aboutMe || "");
                setStatus(d.profileStatus || "In Project");
                setPhotoUrl(d.profileImage || "");
                if (d.statusDetails) setStatusDetails(prev => ({ ...prev, ...d.statusDetails }));
                if (d.notifPrefs) setNotif(prev => ({ ...prev, ...d.notifPrefs }));
            })
            .catch(() => {
                setEmail(user?.email || "");
                setFirstName(user?.firstName || "");
                setLastName(user?.lastName || "");
            })
            .finally(() => setLoading(false));
    }, []);

    function handlePhotoChange(e) {
        const file = e.target.files[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onload = ev => setPhotoUrl(ev.target.result);
            reader.readAsDataURL(file);
        }
    }

    async function handleSaveAll(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await updateMyProfile({
                firstName,
                lastName,
                phone: `${countryCodes.find((country) => country.value === phoneCountry).code}${phone}`,
                phoneCountry,
                aboutMe: about,
                profileStatus: status,
                statusDetails,
                profileImage: photoUrl,
                notifPrefs: notif,
            });
            const updated = res.data.user;
            login({ ...user, ...updated, email: updated.email || user?.email }, localStorage.getItem("token"));
            setToast({ message: "Settings saved successfully!", type: "success" });
        } catch (err) {
            const msg = err?.response?.data?.error || err?.message || "Save failed.";
            console.error("Settings save error:", err?.response?.data || err);
            setToast({ message: msg, type: "error" });
        } finally { setSaving(false); }
    }

    function handleEmailSaved(newEmail) {
        setEmail(newEmail);
        login({ ...user, email: newEmail }, localStorage.getItem("token"));
        setToast({ message: "Email updated successfully!", type: "success" });
    }

    function handlePasswordSaved() {
        setToast({ message: "Password updated successfully!", type: "success" });
    }

    // Status-specific fields
    let statusFields = null;
    if (status === "In Project") {
        statusFields = (
            <div className="flex flex-col md:flex-row gap-4 flex-1">
                <div className="flex-1">
                    <EmpTypography.label>Role</EmpTypography.label>
                    <input type="text" className="w-full border rounded px-3 py-2" value={statusDetails.role}
                        onChange={e => setStatusDetails(p => ({ ...p, role: e.target.value }))} />
                </div>
                <div className="flex-1">
                    <EmpTypography.label>Job Description</EmpTypography.label>
                    <input type="text" className="w-full border rounded px-3 py-2" value={statusDetails.jobDesc}
                        onChange={e => setStatusDetails(p => ({ ...p, jobDesc: e.target.value }))} />
                </div>
            </div>
        );
    } else if (status === "On Bench") {
        statusFields = (
            <div className="flex flex-col md:flex-row gap-4 flex-1">
                <div className="flex-1">
                    <EmpTypography.label>Previous Role</EmpTypography.label>
                    <input type="text" className="w-full border rounded px-3 py-2" value={statusDetails.prevRole}
                        onChange={e => setStatusDetails(p => ({ ...p, prevRole: e.target.value }))} />
                </div>
                <div className="flex-1">
                    <EmpTypography.label>Description</EmpTypography.label>
                    <input type="text" className="w-full border rounded px-3 py-2" value={statusDetails.prevDesc}
                        onChange={e => setStatusDetails(p => ({ ...p, prevDesc: e.target.value }))} />
                </div>
            </div>
        );
    } else if (status === "In Training") {
        statusFields = (
            <div className="flex flex-col gap-4 flex-1">
                <div>
                    <EmpTypography.label>Ongoing Training Modules</EmpTypography.label>
                    <textarea className="w-full border rounded px-3 py-2" rows={2} maxLength={200}
                        value={statusDetails.trainingModules}
                        onChange={e => setStatusDetails(p => ({ ...p, trainingModules: e.target.value }))} />
                </div>
                <div>
                    <EmpTypography.label>Certifications Completed</EmpTypography.label>
                    <textarea className="w-full border rounded px-3 py-2" rows={2} maxLength={200}
                        value={statusDetails.certifications}
                        onChange={e => setStatusDetails(p => ({ ...p, certifications: e.target.value }))} />
                </div>
            </div>
        );
    }

    if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

    return (
        <div className="px-4 md:px-8 py-6 flex flex-col items-start">
            <EmpTypography.h1 className="mb-6 px-4 md:px-0 text-3xl">Settings</EmpTypography.h1>
            <form onSubmit={handleSaveAll} className="w-full container mx-auto px-2 md:px-8">
                <div className="bg-white rounded-2xl shadow p-8 flex flex-col gap-8 border w-full">

                    {/* Photo + Name/Phone/About */}
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                        <div className="flex flex-col items-center gap-2 min-w-[120px] md:pr-4">
                            <div className="w-28 h-28 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center border">
                                {photoUrl ? (
                                    <img src={photoUrl} alt="Profile" className="object-cover w-full h-full" />
                                ) : (
                                    <span className="text-4xl text-gray-400">👤</span>
                                )}
                            </div>
                            <label className="mt-2 cursor-pointer text-blue-400 hover:underline text-sm">
                                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                                Upload Photo
                            </label>
                        </div>
                        <div className="flex-1 w-full flex flex-col gap-4">
                            <div>
                                <EmpTypography.label className="font-semibold">Current Email</EmpTypography.label>
                                <div className="text-gray-900 font-mono text-base">{email}</div>
                            </div>
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1">
                                    <EmpTypography.label>First Name</EmpTypography.label>
                                    <input type="text" className="w-full border rounded px-3 py-2" value={firstName} onChange={e => setFirstName(e.target.value)} />
                                </div>
                                <div className="flex-1">
                                    <EmpTypography.label>Last Name</EmpTypography.label>
                                    <input type="text" className="w-full border rounded px-3 py-2" value={lastName} onChange={e => setLastName(e.target.value)} />
                                </div>
                            </div>
                            <div className="w-full md:w-1/2">
                                <EmpTypography.label>Phone Number</EmpTypography.label>

                                <div className="flex gap-2">
                                    <select
                                        value={phoneCountry}
                                        onChange={(e) => setPhoneCountry(e.target.value)}
                                        className="border rounded px-3 py-2 bg-white"
                                    >
                                        {countryCodes.map((item) => (
                                            <option key={item.value} value={item.value}>
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
                                <EmpTypography.label>About Me <span className="text-xs text-gray-400">(max 500 chars)</span></EmpTypography.label>
                                <textarea className="w-full border rounded px-3 py-2" rows={3} maxLength={500} value={about} onChange={e => setAbout(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="md:w-64 shrink-0">
                            <EmpTypography.label>Current Status</EmpTypography.label>
                            <select className="w-full border rounded px-3 py-2" value={status} onChange={e => setStatus(e.target.value)}>
                                <option>In Project</option>
                                <option>On Bench</option>
                                <option>In Training</option>
                            </select>
                        </div>
                        {statusFields}
                    </div>

                    {/* Email / Password */}
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1 flex flex-col gap-2">
                            <EmpTypography.label>Email</EmpTypography.label>
                            <div className="flex items-center gap-4">
                                <span className="text-gray-700">{email}</span>
                                <EmpTypography.button type="button" variant="primary" onClick={() => setShowEmailModal(true)}>Change Email</EmpTypography.button>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col gap-2">
                            <EmpTypography.label>Password</EmpTypography.label>
                            <EmpTypography.button type="button" variant="primary" onClick={() => setShowPasswordModal(true)}>Change Password</EmpTypography.button>
                        </div>
                    </div>

                    {/* Notification Preferences */}
                    <div className="flex flex-col gap-4">
                        <EmpTypography.h2 className="text-xl">Notification Preferences</EmpTypography.h2>
                        <div className="flex flex-col md:flex-row gap-8">
                            {[
                                { key: "hr", label: "Receive HR updates" },
                                { key: "timesheet", label: "Timesheet reminders" },
                                { key: "onboarding", label: "New alerts" },
                            ].map(({ key, label }) => (
                                <label key={key} className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" name={key} checked={notif[key]}
                                        onChange={e => setNotif(n => ({ ...n, [key]: e.target.checked }))}
                                        className="accent-blue-400 w-5 h-5" />
                                    <span className="text-gray-800">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Save */}
                    <div className="flex justify-end mt-4">
                        <EmpTypography.button type="submit" variant="primary" disabled={saving}>
                            {saving ? "Saving..." : "Save All"}
                        </EmpTypography.button>
                    </div>
                </div>
            </form>

            <EmailModal open={showEmailModal} onClose={() => setShowEmailModal(false)} currentEmail={email} onSaved={handleEmailSaved} />
            <PasswordModal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} onSaved={handlePasswordSaved} />
            <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
        </div>
    );
}
