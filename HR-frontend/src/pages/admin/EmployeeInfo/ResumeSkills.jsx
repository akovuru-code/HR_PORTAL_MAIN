import React from "react";

export default function ResumeSkills() {
  return (
    <div className="space-y-8">
      {/* Filter Resume / CV */}
      <div className="border rounded-lg p-4 bg-white shadow max-w-3xl mx-auto">
        <div className="font-bold text-lg mb-2">Filter Resume / CV :</div>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div>
            <label className="block text-xs mb-1">Choose Category Type</label>
            <select className="border rounded px-3 py-1 w-48">
              <option>All</option>
              <option>Guidewire</option>
              <option>Java</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1">Choose File</label>
            <input type="file" className="border rounded px-3 py-1 w-48" />
          </div>
          <button className="px-6 py-1 rounded-full bg-gradient-to-b from-blue-200 to-blue-400 text-gray-900 font-semibold shadow">Result</button>
        </div>
      </div>
      {/* Resume / CV */}
      <div className="border-t pt-6">
        <div className="flex items-center gap-4 mb-2">
          <span className="font-bold text-lg">Resume / CV :</span>
          <span>Tharun_Resume_2024.docx</span>
          <input type="file" className="rounded-full border px-2 py-1" />
        </div>
        <div className="bg-gray-50 border rounded p-6 text-center text-lg font-medium">Guideware Developer Resume with 7+ years of experience</div>
      </div>
      {/* Cover Letter */}
      <div className="border-t pt-6">
        <div className="flex items-center gap-4 mb-2">
          <span className="font-bold text-lg">Cover Letter:</span>
          <span>Tharun_Cover_Letter_2024.docx</span>
          <input type="file" className="rounded-full border px-2 py-1" />
        </div>
        <textarea className="w-full border rounded p-4 min-h-[80px]" placeholder="Cover letter content..." />
      </div>
      {/* Skills */}
      <div className="border-t pt-6">
        <div className="font-bold text-lg mb-2">Skills:</div>
        <textarea className="w-full border rounded p-4 min-h-[80px]" placeholder="e.g. React, Node.js, Guidewire, Java..." />
      </div>
    </div>
  );
}
