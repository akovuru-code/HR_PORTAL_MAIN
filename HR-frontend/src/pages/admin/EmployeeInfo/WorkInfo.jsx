import React from "react";

export default function WorkInfo() {
  return (
    <div className="space-y-8">
      <div>
        <span className="font-bold text-xl mb-2 block">Organization :</span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Present Employer */}
          <div>
            <div className="mb-2 font-semibold">Present Employer name:</div>
            <div className="flex gap-2 mb-2">
              <span>Start Date: __________</span>
              <span>End Date: ________</span>
            </div>
            <div className="mb-2">Designation: __________</div>
            <div className="mb-2">ALL Experience Letters upload : <input type="checkbox" defaultChecked /></div>
            <div className="mb-2">Payslips : <input type="checkbox" defaultChecked /></div>
            <div className="mb-2">H1b approval copies : <input type="checkbox" defaultChecked /></div>
            <div className="mb-2">if OPT/ CPT : <input type="checkbox" defaultChecked /></div>
            <div className="mb-2">ALL i-20's : <input type="checkbox" /></div>
            <div className="mb-2">EAD Copies : <input type="checkbox" defaultChecked /></div>
            <button className="mt-2 px-4 py-1 rounded-full bg-gray-100 border border-gray-400 text-sm flex items-center gap-2"><span className="text-lg">+</span> Add</button>
            <div className="mt-2">
              Document Upload: <input type="file" className="inline-block" />
              <div className="text-xs text-gray-500">(Payslips, H1b approvals, Other Documents)</div>
            </div>
          </div>
          {/* Previous Employer */}
          <div>
            <div className="mb-2 font-semibold">Previous Employer name:</div>
            <div className="flex gap-2 mb-2">
              <span>Start Date: __________</span>
              <span>End Date: ________</span>
            </div>
            <div className="mb-2">Designation: __________</div>
            <div className="mb-2">ALL Experience Letters upload : <input type="checkbox" defaultChecked /></div>
            <div className="mb-2">Payslips : <input type="checkbox" /></div>
            <div className="mb-2">H1b approval copies : <input type="checkbox" defaultChecked /></div>
            <div className="mb-2">if OPT/ CPT : <input type="checkbox" defaultChecked /></div>
            <div className="mb-2">ALL i-20's : <input type="checkbox" defaultChecked /></div>
            <div className="mb-2">EAD Copies : <input type="checkbox" defaultChecked /></div>
            <button className="mt-2 px-4 py-1 rounded-full bg-gray-100 border border-gray-400 text-sm flex items-center gap-2"><span className="text-lg">+</span> Add</button>
            <div className="mt-2">
              Document Upload: <input type="file" className="inline-block" />
              <div className="text-xs text-gray-500">(Payslips, H1b approvals, Other Documents)</div>
            </div>
          </div>
        </div>
      </div>
      {/* In project/Not */}
      <div className="mt-6">
        <label className="font-semibold mr-2">In project/Not :</label>
        <select className="border rounded px-3 py-1">
          <option>In Project</option>
          <option>Not in Project</option>
        </select>
      </div>
      {/* Client/Vendor/Prime Vendor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        <div>
          <div className="font-bold">Client :</div>
          <div className="text-sm">Client Name :<br />Start Date : ________<br />End Date : ________</div>
          <a href="#" className="text-blue-700 underline text-xs">View Details &gt;&gt;</a>
        </div>
        <div>
          <div className="font-bold">Vendor :</div>
          <div className="text-sm">Vendor Name :<br />Start Date : ________<br />End Date : ________</div>
          <a href="#" className="text-blue-700 underline text-xs">View Details &gt;&gt;</a>
        </div>
        <div>
          <div className="font-bold">Prime vendor: <span className="font-normal">(if Any)</span></div>
          <div className="text-sm">Prime vendor name :<br />Start Date : ________<br />End Date : ________</div>
          <a href="#" className="text-blue-700 underline text-xs">View Details &gt;&gt;</a>
        </div>
      </div>
    </div>
  );
}
