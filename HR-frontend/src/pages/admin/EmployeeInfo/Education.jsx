import React from "react";
import { FaPaperclip } from "react-icons/fa";

export default function Education() {
  return (
    <div className="space-y-8">
      {/* Education Details */}
      <div className="border rounded-lg p-4 bg-white shadow">
        <span className="font-bold text-lg mb-2 block">Education Details :</span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <div>Degree <span className="ml-2">: Medicine</span></div>
            <div>University <span className="ml-2">: University of Missouri Saint Louis</span></div>
            <div>Major <span className="ml-2">: Information Technology</span></div>
            <div>Year of Completion <span className="ml-2">: 05/24 (MM/YY)</span></div>
            <div>Address <span className="ml-2">: Saint louis, MO</span></div>
            <div className="flex items-center gap-2">Document Upload: <input type="file" className="inline-block" /> <FaPaperclip className="inline-block text-gray-500" /></div>
            <button className="mt-2 px-4 py-1 rounded-full bg-gray-100 border border-gray-400 text-sm flex items-center gap-2"><span className="text-lg">+</span> Add</button>
          </div>
        </div>
      </div>
      {/* Certifications */}
      <div className="border rounded-lg p-4 bg-white shadow">
        <span className="font-bold text-lg mb-2 block">Certifications:</span>
        <div className="flex flex-col gap-2">
          <div>Certificate Name :</div>
          <div>Organization :</div>
          <div className="flex items-center gap-2">Attachment : <input type="file" className="inline-block" /> <FaPaperclip className="inline-block text-gray-500" /> <span className="text-xs text-gray-700">Certificate-2024.pdf</span></div>
          <button className="mt-2 px-4 py-1 rounded-full bg-gray-100 border border-gray-400 text-sm flex items-center gap-2"><span className="text-lg">+</span> Add</button>
        </div>
      </div>
      {/* Evaluation */}
      <div className="border rounded-lg p-4 bg-white shadow">
        <span className="font-bold text-lg mb-2 block">Evaluation:</span>
        <input type="file" className="inline-block" />
      </div>
    </div>
  );
}
