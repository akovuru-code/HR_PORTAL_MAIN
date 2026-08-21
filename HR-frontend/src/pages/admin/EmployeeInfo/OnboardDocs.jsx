import React, { useState } from "react";
import { FaFileAlt, FaDownload, FaTrash } from "react-icons/fa";

const docs = [
  { sn: 1, name: "I-94", template: "I-94 link", modified: "Tharun" },
  { sn: 2, name: "W4", template: "W4 link", modified: "Tharun" },
  { sn: 3, name: "Offer Letter", template: "Template", modified: "Tharun" },
  { sn: 4, name: "Void Cheque", template: "Bank", modified: "Tharun" },
  { sn: 5, name: "sample 1", template: "sample 1", modified: "Tharun" },
  { sn: 6, name: "Sample 2", template: "sample 2", modified: "Tharun" },
  { sn: 7, name: "sample 3", template: "sample 3", modified: "Tharun" },
];

export default function OnboardDocs() {
  const [showBank, setShowBank] = useState(true);
  const [showInsurance, setShowInsurance] = useState(true);

  return (
    <div className="space-y-8">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 rounded shadow text-sm">
          <thead>
            <tr className="bg-[#b2d3e6] text-gray-900">
              <th className="px-3 py-2 border">s.no</th>
              <th className="px-3 py-2 border">File Name</th>
              <th className="px-3 py-2 border">Template</th>
              <th className="px-3 py-2 border">Modified By</th>
              <th className="px-3 py-2 border">Document</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc, idx) => (
              <tr key={doc.sn} className="text-center border-b hover:bg-blue-50">
                <td className="px-3 py-2 border">{doc.sn}</td>
                <td className="px-3 py-2 border">{doc.name}</td>
                <td className="px-3 py-2 border text-blue-700 underline cursor-pointer">{doc.template}</td>
                <td className="px-3 py-2 border">{doc.modified}</td>
                <td className="px-3 py-2 border flex gap-2 justify-center items-center">
                  <FaFileAlt className="text-lg cursor-pointer" />
                  <FaDownload className="text-lg cursor-pointer" />
                  <FaTrash className="text-lg cursor-pointer text-red-500" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Bank Details */}
      <div className="border-t pt-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-lg">Bank Details :</span>
          <input type="checkbox" className="toggle toggle-success" checked={showBank} onChange={() => setShowBank(v => !v)} />
        </div>
        {showBank && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Bank Name<span className="text-red-500">*</span></label>
              <input className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ACC No<span className="text-red-500">*</span></label>
              <input className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Routing No<span className="text-red-500">*</span></label>
              <input className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Account type</label>
              <select className="w-full border rounded px-3 py-2">
                <option>Checking</option>
                <option>Savings</option>
              </select>
            </div>
          </div>
        )}
      </div>
      {/* Insurance */}
      <div className="border-t pt-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-lg">Insurance :</span>
          <input type="checkbox" className="toggle toggle-success" checked={showInsurance} onChange={() => setShowInsurance(v => !v)} />
        </div>
        {showInsurance && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Whom would you like to add<span className="text-red-500">*</span></label>
              <select className="w-full border rounded px-3 py-2">
                <option>Self</option>
                <option>Spouse</option>
                <option>Children</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type of Insurance<span className="text-red-500">*</span></label>
              <select className="w-full border rounded px-3 py-2">
                <option>Health</option>
                <option>Dental</option>
                <option>Vision</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type of Insurance for Spouse<span className="text-red-500">*</span></label>
              <select className="w-full border rounded px-3 py-2">
                <option>Health</option>
                <option>Dental</option>
                <option>Vision</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type of Insurance for Children<span className="text-red-500">*</span></label>
              <select className="w-full border rounded px-3 py-2">
                <option>Health</option>
                <option>Dental</option>
                <option>Vision</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Total numbers of members who took insurance<span className="text-red-500">*</span></label>
              <select className="w-full border rounded px-3 py-2">
                <option>1</option>
                <option>2</option>
                <option>3</option>
                <option>4</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
