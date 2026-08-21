import React, { useState, useEffect, useRef } from "react";
import AdminTypography from "../../components/admin/AdminTypography";
import axios from "axios";

const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use(config => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

function formatSize(bytes) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function EditModal({ open, document, onClose, onSave }) {
    const [name, setName] = useState("");
    const [expiry, setExpiry] = useState("");
    const [newFile, setNewFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);

    useEffect(() => {
        if (document) {
            setName(document.name || "");
            setExpiry(document.expiry || "");
            setNewFile(null);
        }
    }, [document]);

    if (!open || !document) return null;

    const handleSave = async () => {
        // Validate expiry year
        if (expiry) {
            const year = expiry.split("-")[0];

            if (year.length !== 4) {
                alert("Please enter a valid date with a 4-digit year.");
                return;
            }
        }
        setUploading(true);
        try {
            const updates = { name, expiry };
            if (newFile) {
                const stored = localStorage.getItem("user");
                const user = stored ? JSON.parse(stored) : null;
                const employeeId = user?.employeeId || user?.id;
                const formData = new FormData();
                formData.append("file", newFile);
                formData.append("category", "admin_doc");
                const uploadRes = await api.post(`/local-upload/${employeeId}`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                const fileInfo = uploadRes.data.file;
                updates.url = fileInfo.url;
                updates.filename = fileInfo.filename;
                updates.originalName = fileInfo.originalName;
                updates.fileData = { ...fileInfo, size: newFile.size };
            }
            await onSave(document.document_id, updates);
            onClose();
        } catch {
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <AdminTypography.h3 className="mb-4">Edit Document</AdminTypography.h3>
                <div className="space-y-4">
                    <div>
                        <AdminTypography.label>Document Name</AdminTypography.label>
                        <input type="text" className="w-full border rounded px-3 py-2 mt-1" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div>
                        <AdminTypography.label>Expiry Date</AdminTypography.label>
                        <input
                            type="date"
                            className="w-full border rounded px-3 py-2 mt-1"
                            value={expiry}
                            onChange={(e) => {
                                const value = e.target.value;

                                if (value) {
                                    const year = value.split("-")[0];

                                    // Allow only 4-digit year
                                    if (year.length > 4) {
                                        return;
                                    }
                                }

                                setExpiry(value);
                            }}
                        />                    </div>
                    <div>
                        <AdminTypography.label>Replace File (optional)</AdminTypography.label>
                        <input type="file" ref={fileRef} className="w-full border rounded px-3 py-2 mt-1" onChange={e => setNewFile(e.target.files?.[0] || null)} />
                        {newFile && <p className="text-xs text-gray-500 mt-1">{newFile.name} ({formatSize(newFile.size)})</p>}
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <AdminTypography.button variant="secondary" onClick={onClose}>Cancel</AdminTypography.button>
                    <AdminTypography.button onClick={handleSave} disabled={uploading}>
                        {uploading ? "Saving..." : "Save"}
                    </AdminTypography.button>
                </div>
            </div>
        </div>
    );
}

function DeleteConfirmation({ open, document, onClose, onConfirm }) {
    if (!open || !document) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                <AdminTypography.h3 className="mb-3">Confirm Deletion</AdminTypography.h3>
                <p className="text-gray-600 mb-6 text-sm">
                    Delete <span className="font-semibold">"{document.name}"</span>? This cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                    <AdminTypography.button variant="secondary" onClick={onClose}>Cancel</AdminTypography.button>
                    <AdminTypography.button variant="danger" onClick={() => onConfirm(document.document_id)}>Delete</AdminTypography.button>
                </div>
            </div>
        </div>
    );
}

export default function AdminDocuments() {
    const [documents, setDocuments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [docName, setDocName] = useState("");
    const [expiry, setExpiry] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [docToEdit, setDocToEdit] = useState(null);
    const inputRef = useRef(null);

    const handleDateChange = (setter) => (e) => {
        const value = e.target.value;

        if (value) {
            const year = value.split("-")[0];

            // Allow only 4-digit year
            if (year.length > 4) {
                return;
            }
        }

        setter(value);
    };

    const getAdminEmployeeId = () => {
        const stored = localStorage.getItem("user");
        const user = stored ? JSON.parse(stored) : null;
        return user?.employeeId || user?.id;
    };

    const fetchDocs = async () => {
        try {
            const res = await api.get("/admin/documents");
            setDocuments(res.data.documents || []);
        } catch { }
    };

    useEffect(() => { fetchDocs(); }, []);

    const handleDrag = (e) => {
        e.preventDefault(); e.stopPropagation();
        setDragActive(e.type === "dragenter" || e.type === "dragover");
    };

    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
            setDocName(e.dataTransfer.files[0].name);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files?.[0]) {
            setSelectedFile(e.target.files[0]);
            setDocName(e.target.files[0].name);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        setUploading(true);
        setUploadError("");
        try {
            const employeeId = getAdminEmployeeId();
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("category", "admin_doc");
            const uploadRes = await api.post(`/local-upload/${employeeId}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const fileInfo = uploadRes.data.file;
            await api.post("/documents/register", {
                name: docName || selectedFile.name,
                url: fileInfo.url,
                filename: fileInfo.filename,
                originalName: fileInfo.originalName,
                document_type: "admin_doc",
                expiry: expiry || null,
                fileData: { ...fileInfo, size: selectedFile.size },
            });
            setSelectedFile(null);
            setDocName("");
            setExpiry("");
            if (inputRef.current) inputRef.current.value = "";
            fetchDocs();
        } catch (err) {
            setUploadError(err?.response?.data?.error || "Upload failed.");
        } finally {
            setUploading(false);
        }
    };

    const handleEdit = async (id, updates) => {
        try {
            await api.patch(`/admin/documents/${id}`, updates);
            fetchDocs();
        } catch { }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/documents/${id}`);
            setDeleteModalOpen(false);
            setDocToDelete(null);
            fetchDocs();
        } catch { }
    };

    const filteredDocuments = documents.filter(doc => {
        if (searchQuery && !(doc.name || "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
        const uploadDate = doc.createdAt?.split("T")[0] || "";
        if (dateFrom && uploadDate < dateFrom) return false;
        if (dateTo && uploadDate > dateTo) return false;
        return true;
    });

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-6">
                <AdminTypography.h2 className="text-gray-900">Documents</AdminTypography.h2>
                <div className="text-sm text-gray-500 mt-1">Manage and view portal documents.</div>
            </div>

            {/* Upload Section */}
            <div className="bg-white border rounded-xl shadow-sm p-6 mb-6">
                <AdminTypography.h3 className="mb-4 text-blue-700 border-b border-blue-50 pb-2">Upload New Document</AdminTypography.h3>
                <div
                    className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"}`}
                    onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                    onClick={() => inputRef.current.click()}
                >
                    <div className="text-4xl text-gray-400 mb-3">📁</div>
                    <div className="text-gray-600 font-medium mb-1">Drag and drop a file here</div>
                    <div className="text-gray-400 text-sm">or click to browse</div>
                    <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" />
                </div>

                {selectedFile && (
                    <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between bg-blue-50 p-3 rounded border border-blue-200">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">📄</span>
                                <span className="text-gray-800 font-medium">{selectedFile.name}</span>
                                <span className="text-xs text-gray-500">({formatSize(selectedFile.size)})</span>
                            </div>
                            <button className="text-gray-500 hover:text-red-500 text-sm underline" onClick={() => { setSelectedFile(null); setDocName(""); if (inputRef.current) inputRef.current.value = ""; }}>
                                Remove
                            </button>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <AdminTypography.label>Document Name</AdminTypography.label>
                                <input type="text" className="w-full border rounded px-3 py-2 mt-1" value={docName} onChange={e => setDocName(e.target.value)} placeholder="Enter document name" />
                            </div>
                            <div className="w-48">
                                <AdminTypography.label>Expiry Date (optional)</AdminTypography.label>
                                <input
                                    type="date"
                                    className="w-full border rounded px-3 py-2 mt-1"
                                    value={expiry}
                                    max="9999-12-31"
                                    onChange={handleDateChange(setExpiry)}
                                />
                            </div>
                        </div>
                        {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}
                        <div className="flex justify-end">
                            <AdminTypography.button onClick={handleUpload} disabled={uploading}>
                                {uploading ? "Uploading..." : "Upload"}
                            </AdminTypography.button>
                        </div>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
                <AdminTypography.h3 className="text-gray-700 text-sm font-semibold mb-3 tracking-wide uppercase">Filter Documents</AdminTypography.h3>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1">
                        <AdminTypography.label className="text-xs mb-1 block">Search by Name</AdminTypography.label>
                        <input type="text" placeholder="e.g. Policy..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                        <AdminTypography.label className="text-xs mb-1 block">From</AdminTypography.label>
                        <input type="date" value={dateFrom} max={dateTo || undefined}
                            onChange={handleDateChange(setDateFrom)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                        <AdminTypography.label className="text-xs mb-1 block">To</AdminTypography.label>
                        <input type="date" value={dateTo} min={dateFrom || undefined}
                            onChange={handleDateChange(setDateTo)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <button onClick={() => { setSearchQuery(""); setDateFrom(""); setDateTo(""); }} className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded text-sm">
                        Clear
                    </button>
                </div>
            </div>

            {/* Documents Table */}
            {filteredDocuments.length === 0 ? (
                <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
                    <div className="text-4xl mb-3">🗂️</div>
                    <div className="text-gray-500">No documents found.</div>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl shadow-sm">
                    <table className="min-w-full text-left text-sm text-gray-800">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                <th className="px-5 py-3 w-12">S.No.</th>
                                <th className="px-5 py-3">Document Name</th>
                                <th className="px-5 py-3">Size</th>
                                <th className="px-5 py-3">Expiry</th>
                                <th className="px-5 py-3">Uploaded By</th>
                                <th className="px-5 py-3">Upload Date</th>
                                <th className="px-5 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDocuments.map((doc, idx) => (
                                <tr key={doc.document_id} className="border-b border-gray-100 last:border-0 hover:bg-blue-50 transition-colors">
                                    <td className="px-5 py-3 text-gray-500">{idx + 1}</td>
                                    <td className="px-5 py-3 font-medium">{doc.name || doc.originalName || "—"}</td>
                                    <td className="px-5 py-3 text-gray-500">{formatSize(doc.fileData?.size)}</td>
                                    <td className="px-5 py-3 text-gray-500">{doc.expiry || "—"}</td>
                                    <td className="px-5 py-3">{doc.modifiedBy || "—"}</td>
                                    <td className="px-5 py-3">{doc.createdAt?.split("T")[0] || "—"}</td>
                                    <td className="px-5 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {doc.url && (
                                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-100 transition-colors">
                                                    View
                                                </a>
                                            )}
                                            <button onClick={() => { setDocToEdit(doc); setEditModalOpen(true); }} className="text-green-600 hover:text-green-800 font-medium px-2 py-1 rounded hover:bg-green-50 transition-colors">
                                                Edit
                                            </button>
                                            <button onClick={() => { setDocToDelete(doc); setDeleteModalOpen(true); }} className="text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors">
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <EditModal
                open={editModalOpen}
                document={docToEdit}
                onClose={() => { setEditModalOpen(false); setDocToEdit(null); }}
                onSave={handleEdit}
            />
            <DeleteConfirmation
                open={deleteModalOpen}
                document={docToDelete}
                onClose={() => { setDeleteModalOpen(false); setDocToDelete(null); }}
                onConfirm={handleDelete}
            />
        </div>
    );
}