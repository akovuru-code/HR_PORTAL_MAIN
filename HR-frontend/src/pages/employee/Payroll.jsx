import { useState, useEffect, useMemo } from "react";
import EmpTypography from "../../components/emp/EmpTypography";
import { getPayrolls } from "../../api/onboarding";

export default function EmployeePayroll() {
    const [payrolls, setPayrolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [uploadDate, setUploadDate] = useState("");
    const [searchText, setSearchText] = useState("");
    const [modalData, setModalData] = useState({ isOpen: false, blobUrl: "", title: "", previewType: "" });

    const fetchBlob = async (id, field) => {
        const url = `/api/payroll/file/${id}?field=${field}&disposition=inline`;
        const token = localStorage.getItem("token");
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error("Failed to load file");
        return res;
    };

    const viewUrl = async (id, field, title) => {
        try {
            const res = await fetchBlob(id, field);
            const contentType = res.headers.get("content-type") || "";
            const blob = await res.blob();

            if (!contentType.startsWith("image/") && !contentType.includes("pdf")) {
                setModalData({ isOpen: true, blobUrl: "", title, previewType: "unsupported" });
                return;
            }

            const blobUrl = URL.createObjectURL(blob);
            setModalData({ isOpen: true, blobUrl, title, previewType: "supported" });
        } catch { alert("Could not load file."); }
    };

    const downloadFile = async (id, field, filename) => {
        const url = `/api/payroll/file/${id}?field=${field}&disposition=attachment`;
        const token = localStorage.getItem("token");
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) { alert("Download failed."); return; }
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename || "document.pdf";
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const closeModal = () => {
        if (modalData.blobUrl) URL.revokeObjectURL(modalData.blobUrl);
        setModalData({ isOpen: false, blobUrl: "", title: "", previewType: "" });
    };

    useEffect(() => {
        getPayrolls()
            .then(res => setPayrolls(res.data.payrolls || []))
            .catch(err => setError(err?.response?.data?.error || "Failed to load payroll records."))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        return payrolls.filter(p => {
            const payrollName =
                p.payrollNumber ||
                p.nameOrNumber ||
                "";

            const matchesText = payrollName
                .toLowerCase()
                .includes(searchText.toLowerCase());
            const matchesDate = !uploadDate || p.payChequeDate === uploadDate;
            return matchesText && matchesDate;
        });
    }, [payrolls, uploadDate, searchText]);

    return (
        <div className="space-y-8 font-employee">
            <EmpTypography.label className="mb-6">Employee Payroll</EmpTypography.label>

            {/* Search */}
            <section className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex flex-col">
                    <EmpTypography.label htmlFor="upload-date" className="mb-1">Pay Cheque Date</EmpTypography.label>
                    <input
                        id="upload-date"
                        type="date"
                        className="border rounded px-2 py-1"
                        value={uploadDate}
                        onChange={e => setUploadDate(e.target.value)}
                    />
                </div>
                <div className="flex flex-col flex-1">
                    <EmpTypography.label htmlFor="search-text" className="mb-1">Payroll Name/Number</EmpTypography.label>
                    <input
                        id="search-text"
                        type="text"
                        className="border rounded px-2 py-1 w-[300px]"
                        placeholder="Search by name or number"
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                    />
                </div>
            </section>

            {/* Table */}
            <section className="bg-white rounded-lg shadow p-4 overflow-x-auto">
                {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading payroll records...</div>
                ) : error ? (
                    <div className="text-center py-8 text-red-500">{error}</div>
                ) : (
                    <table className="min-w-full table-auto">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="px-2 py-2 text-center text-sm font-semibold">#</th>
                                <th className="px-2 py-2 text-center text-sm font-semibold">Payroll Name/Number</th>
                                <th className="px-2 py-2 text-center text-sm font-semibold">Pay Cheque Date</th>
                                <th className="px-2 py-2 text-center text-sm font-semibold">W2</th>
                                <th className="px-2 py-2 text-center text-sm font-semibold">Download W2</th>
                                <th className="px-2 py-2 text-center text-sm font-semibold">Pay Cheque</th>
                                <th className="px-2 py-2 text-center text-sm font-semibold">Download Pay Cheque</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-4 text-gray-500">
                                        No payroll records found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((p, idx) => (
                                    <tr key={p.id} className="border-b last:border-none">
                                        <td className="px-2 py-2 text-center">{idx + 1}</td>
                                        <td className="px-2 py-2 text-center">{p.payrollNumber || p.nameOrNumber}</td>
                                        <td className="px-2 py-2 text-center">{p.payChequeDate || '—'}</td>
                                        <td className="px-2 py-2 text-center">
                                            {(p.w2Url || p.w2FileUrl) ? (
                                                <EmpTypography.button variant="primary" onClick={() => viewUrl(p.id, 'w2', `W2 — ${p.payrollNumber || p.nameOrNumber}`)}>View W2</EmpTypography.button>
                                            ) : <span className="text-gray-400 text-sm">—</span>}
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            {(p.w2Url || p.w2FileUrl) ? (
                                                <EmpTypography.button variant="primary" onClick={() => downloadFile(p.id, 'w2', p.w2OriginalName || 'W2.pdf')}>Download W2</EmpTypography.button>
                                            ) : <span className="text-gray-400 text-sm">—</span>}
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            {(p.payChequeUrl || p.payChequeFileUrl) ? (
                                                <EmpTypography.button variant="primary" onClick={() => viewUrl(p.id, 'paycheque', `Pay Cheque — ${p.payrollNumber || p.nameOrNumber}`)}>View Paycheque</EmpTypography.button>
                                            ) : <span className="text-gray-400 text-sm">—</span>}
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            {(p.payChequeUrl || p.payChequeFileUrl) ? (
                                                <EmpTypography.button variant="primary" onClick={() => downloadFile(p.id, 'paycheque', p.payChequeOriginalName || 'PayCheque.pdf')}>Download</EmpTypography.button>
                                            ) : <span className="text-gray-400 text-sm">—</span>}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </section>

            {/* View Modal */}
            {modalData.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-[90vw] max-w-4xl h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center px-5 py-3 border-b">
                            <span className="font-semibold text-gray-800">{modalData.title}</span>
                            <button onClick={closeModal}
                                className="text-2xl text-gray-400 hover:text-gray-700 leading-none">×</button>
                        </div>
                        {modalData.previewType === "unsupported" ? (
                            <div className="flex-1 flex items-center justify-center p-6 text-center text-gray-700">
                                Preview not supported. Please download this file.
                            </div>
                        ) : (
                            <iframe src={modalData.blobUrl} className="flex-1 w-full rounded-b-xl" title={modalData.title} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
