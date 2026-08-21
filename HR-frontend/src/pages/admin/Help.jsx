import React, { useState } from "react";
import AdminTypography from "../../components/admin/AdminTypography";

function Toast({ message, type = "success", onClose }) {
    if (!message) return null;
    return (
        <div className={`fixed top-6 right-6 z-50 px-4 py-2 rounded shadow-lg text-white ${type === "success" ? "bg-green-600" : "bg-red-600"}`}>
            {message}
            <button className="ml-2 text-lg" onClick={onClose}>×</button>
        </div>
    );
}

export default function Help() {
    const [feedback, setFeedback] = useState("");
    const [toast, setToast] = useState("");
    const [toastType, setToastType] = useState("success");

    function handleSubmit(e) {
        e.preventDefault();
        if (!feedback.trim()) {
            setToast("Please enter your feedback.");
            setToastType("error");
            return;
        }
        setToast("Thank you for your feedback!");
        setToastType("success");
        setFeedback("");
    }

    return (
        <div className="w-full min-h-screen bg-gray-50 py-10 px-0 md:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow p-8 w-full">
                    {/* Page Header */}
                    <AdminTypography.h1 className="mb-2 text-3xl">Help & Support</AdminTypography.h1>
                    <div className="mb-8 text-gray-500 text-lg">We're here to assist you with anything.</div>
                    {/* Contact Info */}
                    <div className="mb-8">
                        <AdminTypography.h2 className="mb-4 text-xl font-semibold">Contact Information</AdminTypography.h2>
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="flex-1 flex flex-col gap-3">
                                <div className="flex items-center gap-2 text-gray-800"><span className="text-xl">👤</span><span className="font-semibold">Name:</span>HR Team</div>
                                {/* <div className="flex items-center gap-2 text-gray-800"><span className="text-xl">💼</span><span className="font-semibold">Role:</span> Admin Support Lead</div> */}
                                <div className="flex items-center gap-2 text-gray-800"><span className="text-xl">📧</span><span className="font-semibold">Email:</span> <a href="mailto:contact@siritek.com" className="text-blue-600 underline">contact@siritek.com</a></div>
                            </div>
                            <div className="flex-1 flex flex-col gap-3">
                                <div className="flex items-center gap-2 text-gray-800"><span className="text-xl">📞</span><span className="font-semibold">Phone (Hyderabad):</span>+91 9959933315</div>
                                <div className="flex items-center gap-2 text-gray-800"><span className="text-xl">📞</span><span className="font-semibold">Phone (US):</span>+1(847)-956-3381</div>
                            </div>
                        </div>
                    </div>
                    {/* Feedback Form */}
                    <div>
                        <AdminTypography.h2 className="mb-4 text-xl font-semibold">Feedback & Suggestions</AdminTypography.h2>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <textarea
                                className="w-full border rounded px-3 py-2 min-h-[100px]"
                                placeholder="Your suggestions or improvements..."
                                value={feedback}
                                onChange={e => setFeedback(e.target.value)}
                                required
                            />
                            <div className="flex justify-end">
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded">Submit Feedback</button>
                            </div>
                        </form>
                    </div>
                </div>
                <Toast message={toast} type={toastType} onClose={() => setToast("")} />
            </div>
        </div>
    );
}
