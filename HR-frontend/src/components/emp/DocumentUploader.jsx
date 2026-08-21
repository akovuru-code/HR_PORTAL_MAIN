import { useState } from "react";
import { FaUpload } from "react-icons/fa";
import EmpTypography from "../../components/emp/EmpTypography";

const DOC_TYPES = [
    { value: "MSA", label: "MSA" },
    { value: "COI", label: "COI" },
    { value: "PO", label: "PO" },
    { value: "PVLetter", label: "Prime Vendor Letter" },
    { value: "ClientLetter", label: "Client Letter" },
    { value: "Other", label: "Other" },
];

export default function DocumentUploader({ docs, onDocsChange, docTypes = DOC_TYPES, label = "Upload Document(s)" }) {
    // docs: [{ type: "MSA", files: [File, ...] }]
    const [entries, setEntries] = useState(docs && docs.length ? docs : [{ type: docTypes[0].value, files: [] }]);

    // Add new entry
    const handleAddEntry = () => {
        setEntries([...entries, { type: docTypes[0].value, files: [] }]);
    };

    // Change type for entry
    const handleTypeChange = (idx, type) => {
        const updated = entries.map((entry, i) => i === idx ? { ...entry, type } : entry);
        setEntries(updated);
        onDocsChange(updated);
    };

    // Change files for entry
    const handleFilesChange = (idx, files) => {
        const updated = entries.map((entry, i) => i === idx ? { ...entry, files } : entry);
        setEntries(updated);
        onDocsChange(updated);
    };

    // Remove entry
    const handleRemoveEntry = (idx) => {
        const updated = entries.filter((_, i) => i !== idx);
        setEntries(updated);
        onDocsChange(updated);
    };

    return (
        <div className="flex flex-col gap-4 w-full">
            <EmpTypography.h2>{label}</EmpTypography.h2>
            {entries.map((entry, idx) => (
                <div key={idx} className="flex flex-col md:flex-row gap-2 items-center border rounded px-3 py-2 bg-white">
                    <select
                        className="border rounded px-2 py-1 text-sm min-w-[120px]"
                        value={entry.type}
                        onChange={e => handleTypeChange(idx, e.target.value)}
                    >
                        {docTypes.map(dt => (
                            <option key={dt.value} value={dt.value}>{dt.label}</option>
                        ))}
                    </select>
                    <div className="relative w-full">
                        <input
                            type="file"
                            multiple
                            onChange={e => handleFilesChange(idx, Array.from(e.target.files))}
                            className="absolute inset-0 opacity-0 z-10 cursor-pointer w-full h-full"
                        />
                        <div className="flex items-center justify-between border rounded px-3 py-2 bg-white">
                            <span className="truncate text-gray-600 text-sm">
                                {!entry.files || entry.files.length === 0 ? "Choose File(s)" : `${entry.files.length} file(s) selected`}
                            </span>
                            <FaUpload className="text-gray-500" />
                        </div>
                        {entry.files && entry.files.length > 0 && (
                            <ul className="mt-2 text-xs text-gray-700 list-disc pl-4">
                                {entry.files.map((file, fidx) => (
                                    <li key={fidx}>{file.name}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <EmpTypography.button variant="secondary" onClick={() => handleRemoveEntry(idx)}>- Remove</EmpTypography.button>
                </div>
            ))}
            <EmpTypography.button variant="primary" onClick={handleAddEntry}>+ Add More</EmpTypography.button>
        </div>
    );
}
