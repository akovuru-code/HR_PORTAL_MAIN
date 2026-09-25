import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { FaUpload, FaDownload, FaTimes } from "react-icons/fa";
import axios from "axios";
import { getProtectedFile } from "../../api/onboarding";

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
export default function FileUploadField({ employeeId, category, label, documentName, value, onChange, disabled, stageWorkInfo = false }) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const [preview, setPreview] = useState(null);
    const inputRef = useRef(null);

    useEffect(() => () => {
        if (preview?.url) URL.revokeObjectURL(preview.url);
    }, [preview]);

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError("");
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("category", category);
            if (documentName) formData.append("documentName", documentName);
            const suffix = stageWorkInfo ? "?stage=work-info" : "";
            const res = await api.post(`/local-upload/${employeeId}${suffix}`, formData, {
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
        setError("");
        setPreview({
            name: value.originalName || value.filename || "File preview",
            loading: true,
            error: "",
        });
        try {
            const response = await getProtectedFile(value.url);
            setPreview({
                url: URL.createObjectURL(response.data),
                name: value.originalName || value.filename || "File preview",
                type: response.data.type,
                loading: false,
                error: "",
            });
        } catch (err) {
            const message = err?.response?.data?.error || "Unable to open file";
            setError(message);
            setPreview(current => current ? { ...current, loading: false, error: message } : null);
        }
    };

    const closePreview = () => setPreview(null);

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
            {preview && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={`Preview ${preview.name}`}>
                    <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <span className="truncate pr-4 font-medium text-gray-800">{preview.name}</span>
                            <button type="button" onClick={closePreview} className="rounded px-3 py-1 text-sm text-gray-700 hover:bg-gray-100" aria-label="Close preview">Close</button>
                        </div>
                        <div className="min-h-0 flex-1 bg-gray-100">
                            {preview.loading ? (
                                <div className="flex h-full items-center justify-center text-gray-600">Loading preview…</div>
                            ) : preview.error ? (
                                <div className="flex h-full items-center justify-center px-6 text-center text-red-600">{preview.error}</div>
                            ) : preview.type?.startsWith("image/") ? (
                                <img src={preview.url} alt={preview.name} className="h-full w-full object-contain" />
                            ) : (
                                <iframe src={preview.url} title={preview.name} className="h-full w-full border-0" />
                            )}
                        </div>
                    </div>
                </div>
            , document.body)}
        </div>
    );
}
