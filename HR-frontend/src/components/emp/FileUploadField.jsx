import { useState, useRef } from "react";
import { FaUpload, FaDownload, FaTimes } from "react-icons/fa";
import axios from "axios";

const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

/**
 * Reusable file upload field.
 * Props:
 *   - employeeId: number (required)
 *   - category: string (e.g. "passport", "visa", "dl", "marriage_cert") — used as document_type
 *   - label: string (optional display label)
 *   - documentName: string (optional human-readable name, e.g. "Passport") — when provided, registers to Document table
 *   - value: { url, originalName } | null  (current file info)
 *   - onChange: (fileInfo | null) => void  (called after upload or removal)
 *   - disabled: boolean
 */
export default function FileUploadField({ employeeId, category, label, documentName, value, onChange, disabled }) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const inputRef = useRef(null);

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError("");
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("category", category);
            const res = await api.post(`/local-upload/${employeeId}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const fileInfo = { ...res.data.file };
            onChange(fileInfo);
        } catch (err) {
            setError(err?.response?.data?.error || "Upload failed");
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const handleRemove = () => {
        onChange(null);
    };

    const handleView = async () => {
        try {
            const response = await api.get(value.url, { responseType: "blob" });
            const objectUrl = URL.createObjectURL(response.data);
            window.open(objectUrl, "_blank", "noopener,noreferrer");
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
        } catch (err) {
            setError(err?.response?.data?.error || "Unable to open file");
        }
    };

    return (
        <div className="space-y-1">
            {label && <label className="block text-sm font-medium">{label}</label>}
            {value?.url ? (
                <div className="flex items-center gap-2 border rounded px-3 py-2 bg-gray-50">
                    <span className="text-sm text-gray-700 truncate flex-1">{value.originalName || value.filename || "Uploaded file"}</span>
                    <button
                        type="button"
                        onClick={handleView}
                        className="text-blue-600 hover:text-blue-800"
                        title="Download"
                    >
                        <FaDownload />
                    </button>
                    {!disabled && (
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="text-red-500 hover:text-red-700"
                            title="Remove"
                        >
                            <FaTimes />
                        </button>
                    )}
                </div>
            ) : (
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        onChange={handleFileSelect}
                        disabled={disabled || uploading}
                        className="absolute inset-0 opacity-0 z-10 cursor-pointer w-full h-full"
                    />
                    <div className={`flex items-center justify-between border rounded px-3 py-2 ${disabled ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}`}>
                        <span className="text-sm text-gray-500">
                            {uploading ? "Uploading..." : "Choose File"}
                        </span>
                        <FaUpload className="text-gray-400" />
                    </div>
                </div>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}
