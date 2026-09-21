// ProfileInfo.jsx
import React, { useState } from "react";
import EmpTypography from "../../../components/emp/EmpTypography";
EmpTypography._log && EmpTypography._log();

export default function ProfileInfo() {
  const [maritalStatus, setMaritalStatus] = useState("Single");

  return (
    <div className="space-y-8 font-employee">
      {/* Main Personal Info */}
      <form className="bg-white border rounded-lg p-4 space-y-4 shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <EmpTypography.label className="block mb-1">First Name<span className="text-red-500">*</span></EmpTypography.label>
            <input className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Middle Name</label>
            <input className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name<span className="text-red-500">*</span></label>
            <input className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mobile No<span className="text-red-500">*</span></label>
            <div className="flex gap-2"><select className="border rounded px-2"><option>+1</option></select><input className="flex-1 border rounded px-3 py-2" /></div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email ID<span className="text-red-500">*</span></label>
            <input className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date of Birth<span className="text-red-500">*</span></label>
            <input type="date" className="w-full border rounded px-3 py-2" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium mb-1">Present Address</label>
            <input className="w-full border rounded px-3 py-2" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium mb-1">Marital status</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={maritalStatus}
              onChange={e => setMaritalStatus(e.target.value)}
            >
              <option>Single</option>
              <option>Married</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 mt-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Nationality</label>
            <input className="w-full border rounded px-3 py-2" />
            <label className="block text-sm font-medium">Passport number</label>
            <input className="w-full border rounded px-3 py-2" />
            <label className="block text-sm font-medium">Passport Expire Date</label>
            <input type="date" className="w-full border rounded px-3 py-2" />
            <label className="block text-sm font-medium">Document Upload:</label>
            <input type="file" className="w-full" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">SSN</label>
            <input className="w-full border rounded px-3 py-2" />
            <label className="block text-sm font-medium">Visa Status</label>
            <input className="w-full border rounded px-3 py-2" />
            <label className="block text-sm font-medium">Visa Expire date</label>
            <input type="date" className="w-full border rounded px-3 py-2" />
            <label className="block text-sm font-medium">Visa Document Upload:</label>
            <input type="file" className="w-full" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Driving License</label>
            <input className="w-full border rounded px-3 py-2" />
            <label className="block text-sm font-medium">DL Issue State</label>
            <input className="w-full border rounded px-3 py-2" />
            <label className="block text-sm font-medium">DL Expire date</label>
            <input type="date" className="w-full border rounded px-3 py-2" />
            <label className="block text-sm font-medium">DL Document Upload:</label>
            <input type="file" className="w-full" />
          </div>
        </div>
      </form>
      {/* Spouse Info */}
      {maritalStatus === "Married" && (
        <div className="bg-white border rounded-lg p-4 shadow mt-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-lg">Spouse Information</span>
            <input type="checkbox" className="toggle toggle-success" defaultChecked />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name<span className="text-red-500">*</span></label>
              <input className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Middle Name</label>
              <input className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name<span className="text-red-500">*</span></label>
              <input className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mobile No<span className="text-red-500">*</span></label>
              <div className="flex gap-2"><select className="border rounded px-2"><option>+1</option></select><input className="flex-1 border rounded px-3 py-2" /></div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email ID<span className="text-red-500">*</span></label>
              <input className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date of Birth<span className="text-red-500">*</span></label>
              <input type="date" className="w-full border rounded px-3 py-2" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1">Present Address</label>
              <input className="w-full border rounded px-3 py-2" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 mt-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Nationality</label>
              <input className="w-full border rounded px-3 py-2" />
              <label className="block text-sm font-medium">Passport number</label>
              <input className="w-full border rounded px-3 py-2" />
              <label className="block text-sm font-medium">Passport Expire Date</label>
              <input type="date" className="w-full border rounded px-3 py-2" />
              <label className="block text-sm font-medium">Document Upload:</label>
              <input type="file" className="w-full" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">SSN</label>
              <input className="w-full border rounded px-3 py-2" />
              <label className="block text-sm font-medium">Visa Status</label>
              <input className="w-full border rounded px-3 py-2" />
              <label className="block text-sm font-medium">Visa Expire date</label>
              <input type="date" className="w-full border rounded px-3 py-2" />
              <label className="block text-sm font-medium">Visa Document Upload:</label>
              <input type="file" className="w-full" />
              <label className="block text-sm font-medium">Marriage Certificate:</label>
              <input type="file" className="w-full" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Driving License</label>
              <input className="w-full border rounded px-3 py-2" />
              <label className="block text-sm font-medium">DL Issue State</label>
              <input className="w-full border rounded px-3 py-2" />
              <label className="block text-sm font-medium">DL Expire date</label>
              <input type="date" className="w-full border rounded px-3 py-2" />
              <label className="block text-sm font-medium">DL Document Upload:</label>
              <input type="file" className="w-full" />
              <label className="block text-sm font-medium">Occupation:</label>
              <input className="w-full border rounded px-3 py-2" />
            </div>
          </div>
        </div>
      )}
      {/* Kids Info */}
      {maritalStatus === "Married" && (
        <div className="bg-white border rounded-lg p-4 shadow mt-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-lg">Kids information</span>
            <input type="checkbox" className="toggle toggle-success" defaultChecked />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name<span className="text-red-500">*</span></label>
              <input className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Middle Name</label>
              <input className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name<span className="text-red-500">*</span></label>
              <input className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date of Birth<span className="text-red-500">*</span></label>
              <input type="date" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nationality</label>
              <input className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Passport number</label>
              <input className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Passport Expire Date</label>
              <input type="date" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">SSN</label>
              <input className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Visa Status</label>
              <input className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Visa Expire date</label>
              <input type="date" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Visa Document Upload:</label>
              <input type="file" className="w-full" />
            </div>
          </div>
          <button className="mt-2 px-4 py-1 rounded-full bg-gray-100 border border-gray-400 text-sm flex items-center gap-2"><span className="text-lg">+</span> Add</button>
        </div>
      )}
      {/* Emergency Contact Info */}
      <div className="bg-white border rounded-lg p-4 shadow mt-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-lg">Emergency Contact info :</span>
          <input type="checkbox" className="toggle toggle-success" defaultChecked />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">First Name<span className="text-red-500">*</span></label>
            <input className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Middle Name</label>
            <input className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name<span className="text-red-500">*</span></label>
            <input className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mobile No<span className="text-red-500">*</span></label>
            <div className="flex gap-2"><select className="border rounded px-2"><option>+1</option></select><input className="flex-1 border rounded px-3 py-2" /></div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email ID<span className="text-red-500">*</span></label>
            <input className="w-full border rounded px-3 py-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
