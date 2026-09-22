import { useEffect, useMemo, useRef, useState } from "react";
import { FaCheckDouble, FaHome } from "react-icons/fa";
import { FaUpload } from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { useAdminView } from "../../contexts/AdminViewContext";
import { useNavigate } from "react-router-dom";
import EmpTypography from "../../components/emp/EmpTypography";
import FileUploadField from "../../components/emp/FileUploadField";
import OnboardDocs from "./OnboardDocs";
import { useOnboardingPermissions } from "../../hooks/useOnboardingPermissions";
import axios from 'axios';
import { saveOnboardingFull, getOnboarding, submitOnboarding, getDraft, registerDocument } from "../../api/onboarding";
import {
  COUNTRY_CODES,
  canEnterSsn,
  formatSsn,
  getCountryCode,
  personalValidationError,
  splitMobilePhone,
  splitPhone,
} from "../../utils/personalInfo";
//import Kid from "../../../../HR-Backend/src/models/kid";
EmpTypography._log && EmpTypography._log();

const NATIONALITY_OPTIONS = [
  { value: "US", label: "US" },
  { value: "INDIA", label: "INDIA" },
  { value: "CANADA", label: "CANADA" },
];

const DL_REGIONS = {
  US: 'Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|District of Columbia'.split('|'),
  INDIA: 'Andhra Pradesh|Arunachal Pradesh|Assam|Bihar|Chhattisgarh|Goa|Gujarat|Haryana|Himachal Pradesh|Jharkhand|Karnataka|Kerala|Madhya Pradesh|Maharashtra|Manipur|Meghalaya|Mizoram|Nagaland|Odisha|Punjab|Rajasthan|Sikkim|Tamil Nadu|Telangana|Tripura|Uttar Pradesh|Uttarakhand|West Bengal|Andaman and Nicobar Islands|Chandigarh|Dadra and Nagar Haveli and Daman and Diu|Delhi|Jammu and Kashmir|Ladakh|Lakshadweep|Puducherry'.split('|'),
  CANADA: 'Alberta|British Columbia|Manitoba|New Brunswick|Newfoundland and Labrador|Northwest Territories|Nova Scotia|Nunavut|Ontario|Prince Edward Island|Quebec|Saskatchewan|Yukon'.split('|'),
};

function DlStateSelect({ nationality, value, onChange }) {
  const regions = DL_REGIONS[nationality] || [];
  return <select className="w-full border rounded px-3 py-2" value={value} onChange={onChange} disabled={!regions.length}>
    <option value="">{regions.length ? 'Select issue state/province' : 'Select nationality first'}</option>
    {regions.map(region => <option key={region} value={region}>{region}</option>)}
    {value && !regions.includes(value) && <option value={value}>{value} (saved)</option>}
  </select>;
}

const isPassportInput = value => /^[A-Za-z0-9]*$/.test(value);

// This is a reusable component for a custom file upload input field.
function CustomFileUpload() {
  const [fileNames, setFileNames] = useState([]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 3);
    setFileNames(files.map(f => f.name));
  };

  return (
    <div className="relative">
      <input
        id="customFileUpload"
        type="file"
        multiple
        onChange={handleFileChange}
        className="absolute inset-0 opacity-0 z-10 cursor-pointer"
      />
      <div className="flex items-center justify-between border rounded px-3 py-2 bg-white">
        <span className="truncate text-gray-600 text-sm">
          {fileNames.length === 0 ? "Choose File(s)" : `${fileNames.length} file(s) selected`}
        </span>
        <FaUpload className="text-gray-500" />
      </div>
      {fileNames.length > 0 && (
        <ul className="mt-2 text-xs text-gray-700 list-disc pl-4">
          {fileNames.map((name, idx) => (
            <li key={idx}>{name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ProfileInfo() {
  // State for modify reason popup
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [modifyReason, setModifyReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  // Override openPermissionModal to show reason modal
  const handleModify = () => {
    setShowReasonModal(true);
    setModifyReason("");
    setReasonError("");
  };

  // Handle request with reason
  const handleRequestPermission = () => {
    if (!modifyReason.trim()) {
      setReasonError("Please enter a reason for modification.");
      return;
    }
    setReasonError("");
    (async () => {
      try {
        await requestPermission(modifyReason);
        alert('Request submitted');
        setShowReasonModal(false);
      } catch (err) {
        console.error(err);
        alert('Failed to submit request: ' + (err?.response?.data?.error || err.message || 'unknown'));
      }
    })();
  };

  const handleCloseReasonModal = () => {
    setShowReasonModal(false);
    setModifyReason("");
    setReasonError("");
  };
  const pageKey = 'canEdit_emppersonaldetails';
  const {
    canEdit,
    onboardingSubmitted,
    handleSubmit,
    requestPermission,
    showPermissionModal,
    openPermissionModal,
    closePermissionModal,
    permissionRequested,
    permissionGranted,
  } = useOnboardingPermissions(pageKey, 'personal');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [validationError, setValidationError] = useState("");
  const onboardDocsRef = useRef(null);

  // Sync personal info file fields to Document table (register present, delete absent)
  const syncFileDocs = async () => {
    const api2 = (await import('axios')).default.create({ baseURL: '/api', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    const fileFields = [
      { file: passportFile, name: 'Passport - current', type: 'passport', expiry: passportExpiry },
      { file: passportFile2, name: 'Passport - additional/previous pages', type: 'passport_additional', expiry: passportExpiry },
      { file: nationality === 'INDIA' ? panFile : null, name: 'PAN Document', type: 'pan', expiry: null },
      { file: nationality === 'INDIA' ? aadhaarFile : null, name: 'Aadhaar Document', type: 'aadhaar', expiry: null },
      { file: nationality !== 'INDIA' ? visaFile : null, name: 'Visa', type: 'visa', expiry: visaExpiry },
      { file: dlFile, name: 'Driving License', type: 'dl', expiry: dlExpiry },
      { file: i9File, name: 'Employee I-9', type: 'employee_i9', expiry: null },
      { file: w4File, name: 'Employee W-4', type: 'employee_w4', expiry: null },
      { file: marriageCertFile, name: 'Marriage Certificate', type: 'marriage_cert', expiry: null },
      { file: spousePassportFile, name: 'Spouse Passport - current', type: 'spouse_passport', expiry: spousePassportExpiry },
      { file: spousePassportFile2, name: 'Spouse Passport - additional/previous pages', type: 'spouse_passport_additional', expiry: spousePassportExpiry },
      { file: spouseNationality === 'INDIA' ? spousePanFile : null, name: 'Spouse PAN Document', type: 'spouse_pan', expiry: null },
      { file: spouseNationality === 'INDIA' ? spouseAadhaarFile : null, name: 'Spouse Aadhaar Document', type: 'spouse_aadhaar', expiry: null },
      { file: spouseNationality !== 'INDIA' ? spouseVisaFile : null, name: 'Spouse Visa', type: 'spouse_visa', expiry: spouseVisaExpiry },
      { file: spouseDlFile, name: 'Spouse Driving License', type: 'spouse_dl', expiry: spouseDlExpiry },
      { file: spouseI9File, name: 'Spouse I-9', type: 'spouse_i9', expiry: null },
      { file: spouseW4File, name: 'Spouse W-4', type: 'spouse_w4', expiry: null },
      ...kidsList.flatMap((kid, index) => [
        { file: kid.passportFile, name: `Kid ${index + 1} Passport - current`, type: `kid_${index}_passport`, expiry: kid.passportExpiry || null },
        { file: kid.passportFile2, name: `Kid ${index + 1} Passport - additional/previous pages`, type: `kid_${index}_passport_additional`, expiry: kid.passportExpiry || null },
        { file: kid.nationality === 'INDIA' ? kid.panFile : null, name: `Kid ${index + 1} PAN Document`, type: `kid_${index}_pan`, expiry: null },
        { file: kid.nationality === 'INDIA' ? kid.aadhaarFile : null, name: `Kid ${index + 1} Aadhaar Document`, type: `kid_${index}_aadhaar`, expiry: null },
        { file: kid.nationality !== 'INDIA' ? kid.visaFile : null, name: `Kid ${index + 1} Visa`, type: `kid_${index}`, expiry: kid.visaExpiry || null },
        { file: kid.i9File, name: `Kid ${index + 1} I-9`, type: `kid_${index}_i9`, expiry: null },
        { file: kid.w4File, name: `Kid ${index + 1} W-4`, type: `kid_${index}_w4`, expiry: null },
      ]),
    ];
    for (const { file, name, type, expiry } of fileFields) {
      if (file?.url) {
        registerDocument({ employeeId: targetEmployeeId || user?.employeeId || user?.id, name, url: file.url, filename: file.filename, originalName: file.originalName, document_type: type, fileData: file, expiry: expiry || null }).catch(() => { });
      } else {
        api2.delete(`/documents/type/${encodeURIComponent(type)}`).catch(() => { });
      }
    }
  };

  // Save draft -> collect payload, spouse, kids, documents and POST to backend
  const handleSave = async () => {
    // Basic client-side validation
    if (!firstName || !firstName.trim()) {
      setValidationError("First Name is required.");
      return;
    }
    setValidationError("");
    setSaveError("");
    setSaving(true);
    try {
      // Build payload object matching backend Employee columns
      const payload = {
        firstName: firstName.trim(),
        middleName: middleName.trim() || null,
        lastName: lastName.trim(),
        email: email.trim() || null,
        phone: `${getCountryCode(phoneCountry)}${phone}`.trim() || null,
        phoneCountry,
        dob: dob || null,
        presentAddress: presentAddress,
        previousAddresses,
        presentEmployer: presentEmployer.trim() || null,
        whatsappPhone: isWhatsappSame
          ? `${getCountryCode(phoneCountry)}${phone}`.trim() || null
          : `${whatsappCode}${whatsappPhone}`.trim() || null,
        isWhatsappSame,
        maritalStatus,
        nationality: nationality.trim() || null,
        passportNumber: passportNumber.trim() || null,
        passportExpiry: passportExpiry || null,
        ssn: ssn.trim() || null,
        sin: sin.trim() || null,
        ni: ni.trim() || null,
        tfn: tfn.trim() || null,
        pan: pan.trim() || null,
        aadhaar: aadhaar.trim() || null,
        visaType: visaType || null,
        visaExpiry: visaExpiry || null,
        drivingLicense: drivingLicenseOption === 'N/A' ? 'N/A' : (drivingLicense.trim() || null),
        dlState: drivingLicenseOption === 'N/A' ? null : (dlState.trim() || null),
        dlExpiry: drivingLicenseOption === 'N/A' ? null : (dlExpiry || null),
        emergencyFirstName: emergencyFirstName.trim() || null,
        emergencyMiddleName: emergencyMiddleName.trim() || null,
        emergencyLastName: emergencyLastName.trim() || null,
        emergencyPhone: `${emergencyPhoneCode} ${emergencyPhone}`.trim() || null,
        emergencyEmail: emergencyEmail.trim() || null,
        emergencyRelationship: emergencyRelationship.trim() || null,
        showKidsInfo,
        // File uploads
        passportFile,
        passportFile2,
        i9File,
        w4File,
        visaFile: nationality === 'INDIA' ? panFile : visaFile,
        visaFile2: nationality === 'INDIA' ? aadhaarFile : null,
        dlFile: drivingLicenseOption === 'N/A' ? null : dlFile,
        marriageCertFile,
      };

      // Build spouse object only if married
      const spousePayload = maritalStatus === 'Married' ? {
        ...spouse, phone: `${spousePhoneCode} ${spousePhone}`.trim(), isSpouseAddressSame,
        address: spouseAddress, nationality: spouseNationality,
        passportNumber: spousePassportNumber, passportExpiry: spousePassportExpiry,
        occupation: spouseOccupation, ssn: spouseSsn, sin: spouseSin, ni: spouseNi, tfn: spouseTfn, pan: spousePan, aadhaar: spouseAadhaar,
        visaType: spouseVisaType,
        visaExpiry: spouseVisaExpiry,
        drivingLicense: spouseDrivingLicenseOption === 'NA' ? 'N/A' : spouseDrivingLicense,
        dlState: spouseDrivingLicenseOption === 'NA' ? null : spouseDlState,
        dlExpiry: spouseDrivingLicenseOption === 'NA' ? null : spouseDlExpiry,
        passportFile: spousePassportFile,
        passportFile2: spousePassportFile2,
        i9File: spouseI9File,
        w4File: spouseW4File,
        visaFile: spouseNationality === 'INDIA' ? spousePanFile : spouseVisaFile,
        visaFile2: spouseNationality === 'INDIA' ? spouseAadhaarFile : null,
        dlFile: spouseDrivingLicenseOption === 'NA' ? null : spouseDlFile,
      } : null;

      // kidsList is already in the expected shape; filter out completely empty entries
      const kidsPayload = Array.isArray(kidsList)
        ? kidsList
          .filter(k => (k.firstName || k.lastName || k.dob))
          .map(kid => ({
            ...kid,
            docFile: kid.nationality === 'INDIA' ? kid.panFile : kid.visaFile,
            docFile2: kid.nationality === 'INDIA' ? kid.aadhaarFile : null,
          }))
        : [];

      // documents: we expect objects like { url, filename, type }
      const docsPayload = Array.isArray(documents) ? documents : [];

      const invalidPersonalField =
        personalValidationError({ ssn, passportNumber }, 'Employee') ||
        (spousePayload ? personalValidationError({ ssn: spouseSsn, passportNumber: spousePassportNumber }, 'Spouse') : '') ||
        kidsPayload.map((kid, index) => personalValidationError({ ssn: kid.ssn, passportNumber: kid.passportNumber }, `Kid ${index + 1}`)).find(Boolean);
      if (invalidPersonalField) {
        setValidationError(invalidPersonalField);
        setSaving(false);
        return;
      }

      // employeeId: prefer user.employeeId else user's id
      const employeeId = targetEmployeeId || user?.employeeId || user?.id;
      if (!employeeId) throw new Error('Missing employeeId in session');

      // Call existing saveOnboarding helper -> POST /api/onboarding/:employeeId/save-draft
      const body = { tab: 'personal', payload, spouse: spousePayload, kids: kidsPayload, documents: docsPayload };
      // Pass isDraft = true so frontend helper hits the draft endpoint
      await saveOnboardingFull(employeeId, body, true);

      // Onboard Docs is part of Personal Info now. Keep its existing draft
      // storage, but save it through this one parent workflow.
      await onboardDocsRef.current?.saveDraft();

      await syncFileDocs();

      setSaving(false);
      // mark onboarding saved locally if desired
      localStorage.setItem('onboardingDraftSavedAt', new Date().toISOString());
      alert('Draft saved');
    } catch (err) {
      setSaving(false);
      setSaveError(err?.response?.data?.error || err.message || 'Save failed');
    }
  };

  const [visaType, setVisaType] = useState("");
  const [spouseVisaType, setSpouseVisaType] = useState("");

  // Kids Info dynamic list
  const [kidsList, setKidsList] = useState([
    {
      firstName: "",
      middleName: "",
      lastName: "",
      dob: "",
      nationality: "",
      passportNumber: "",
      passportExpiry: "",
      passportFile: null,
      passportFile2: null,
      ssn: "",
      i9File: null,
      w4File: null,
      pan: "",
      aadhaar: "",
      panFile: null,
      aadhaarFile: null,
      visaFile: null,
      visaType: "",
      customVisaType: "",
      visaExpiry: "",
      addressSame: false,
      address: {
        street: "",
        city: "",
        state: "",
        zip: "",
        country: ""
      }
    }
  ]);

  // Helper to update a kid entry
  const updateKid = (idx, field, value) => {
    setKidsList(prev => prev.map((kid, i) => i === idx ? { ...kid, [field]: value } : kid));
  };
  // Helper to update kid address
  const updateKidAddress = (idx, field, value) => {
    setKidsList(prev => prev.map((kid, i) => i === idx ? { ...kid, address: { ...kid.address, [field]: value } } : kid));
  };
  // Helper to update addressSame
  const updateKidAddressSame = (idx, checked) => {
    setKidsList(prev => prev.map((kid, i) => i === idx ? { ...kid, addressSame: checked } : kid));
  };
  // Helper to update visaType
  const updateKidVisaType = (idx, value) => {
    setKidsList(prev => prev.map((kid, i) => i === idx ? { ...kid, visaType: value, customVisaType: value === "Other" ? kid.customVisaType : "" } : kid));
  };
  // Helper to update customVisaType
  const updateKidCustomVisaType = (idx, value) => {
    setKidsList(prev => prev.map((kid, i) => i === idx ? { ...kid, customVisaType: value } : kid));
  };

  // Add kid
  const addKid = () => {
    setKidsList(prev => [
      ...prev,
      {
        firstName: "",
        middleName: "",
        lastName: "",
        dob: "",
        nationality: "",
        passportNumber: "",
        passportExpiry: "",
        passportFile: null,
        passportFile2: null,
        ssn: "",
        i9File: null,
        w4File: null,
        pan: "",
        aadhaar: "",
        panFile: null,
        aadhaarFile: null,
        visaFile: null,
        visaType: "",
        customVisaType: "",
        visaExpiry: "",
        addressSame: false,
        address: {
          street: "",
          city: "",
          state: "",
          zip: "",
          country: ""
        }
      }
    ]);
  };
  // Remove kid
  const removeKid = (idx) => {
    setKidsList(prev => prev.filter((_, i) => i !== idx));
  };
  const [maritalStatus, setMaritalStatus] = useState("Single");
  const [showKidsInfo, setShowKidsInfo] = useState(false);
  const [previousAddresses, setPreviousAddresses] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [isSpouseAddressSame, setIsSpouseAddressSame] = useState(false);
  const [isKidsAddressSame, setIsKidsAddressSame] = useState(false);
  const [hasPresentAddressChanged, setHasPresentAddressChanged] = useState(false);
  const [presentAddress, setPresentAddress] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
    country: ""
  });
  // Controlled basic personal fields used for payload
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [presentEmployer, setPresentEmployer] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("US");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappCode, setWhatsappCode] = useState("+1");
  const [isWhatsappSame, setIsWhatsappSame] = useState(false);
  const [spousePhone, setSpousePhone] = useState(""); // spouse
  const [spousePhoneCode, setSpousePhoneCode] = useState("+1");
  const [emergencyPhone, setEmergencyPhone] = useState(""); // emergency
  const [emergencyPhoneCode, setEmergencyPhoneCode] = useState("+1");
  const [dob, setDob] = useState("");
  // Employee detail fields
  const [nationality, setNationality] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [ssn, setSsn] = useState("");
  const [sin, setSin] = useState("");
  const [ni, setNi] = useState("");
  const [tfn, setTfn] = useState("");
  const [pan, setPan] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [visaExpiry, setVisaExpiry] = useState("");
  const [drivingLicenseOption, setDrivingLicenseOption] = useState("");
  const [drivingLicense, setDrivingLicense] = useState("");
  const [dlState, setDlState] = useState("");
  const [dlExpiry, setDlExpiry] = useState("");
  // Emergency contact 
  const [emergencyFirstName, setEmergencyFirstName] = useState("");
  const [emergencyMiddleName, setEmergencyMiddleName] = useState("");
  const [emergencyLastName, setEmergencyLastName] = useState("");
  const [emergencyEmail, setEmergencyEmail] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");

  // Spouse state (shallow fields used by backend)
  const [spouse, setSpouse] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    dob: "",
  });
  // Spouse detail fields
  const [spouseAddress, setSpouseAddress] = useState({ street: "", city: "", state: "", zip: "", country: "" });
  const [spouseNationality, setSpouseNationality] = useState("");
  const [spousePassportNumber, setSpousePassportNumber] = useState("");
  const [spousePassportExpiry, setSpousePassportExpiry] = useState("");
  const [spouseOccupation, setSpouseOccupation] = useState("");
  const [spouseSsn, setSpouseSsn] = useState("");
  const [spouseSin, setSpouseSin] = useState("");
  const [spouseNi, setSpouseNi] = useState("");
  const [spousePan, setSpousePan] = useState("");
  const [spouseAadhaar, setSpouseAadhaar] = useState("");
  const [spouseTfn, setSpouseTfn] = useState("");
  const [spouseVisaExpiry, setSpouseVisaExpiry] = useState("");
  const [spouseDrivingLicenseOption, setSpouseDrivingLicenseOption] = useState("");
  const [spouseDrivingLicense, setSpouseDrivingLicense] = useState("");
  const [spouseDlState, setSpouseDlState] = useState("");
  const [spouseDlExpiry, setSpouseDlExpiry] = useState("");

  // Documents metadata collected when files are uploaded/registered
  const [documents, setDocuments] = useState([]);

  // File upload states for each document category
  const [passportFile, setPassportFile] = useState(null);
  const [passportFile2, setPassportFile2] = useState(null);
  const [i9File, setI9File] = useState(null);
  const [w4File, setW4File] = useState(null);
  const [visaFile, setVisaFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [dlFile, setDlFile] = useState(null);
  const [marriageCertFile, setMarriageCertFile] = useState(null);
  const [spousePassportFile, setSpousePassportFile] = useState(null);
  const [spousePassportFile2, setSpousePassportFile2] = useState(null);
  const [spouseI9File, setSpouseI9File] = useState(null);
  const [spouseW4File, setSpouseW4File] = useState(null);
  const [spouseVisaFile, setSpouseVisaFile] = useState(null);
  const [spousePanFile, setSpousePanFile] = useState(null);
  const [spouseAadhaarFile, setSpouseAadhaarFile] = useState(null);
  const [spouseDlFile, setSpouseDlFile] = useState(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { targetEmployeeId } = useAdminView() || {};
  const role = user?.role || session?.role || "employee";

  // On mount: load existing onboarding data and prefill form
  useEffect(() => {
    async function load() {
      try {
        const employeeId = targetEmployeeId || user?.employeeId || user?.id;
        if (!employeeId) return;
        const resp = await getOnboarding(employeeId);
        const emp = resp?.data?.employee;

        // The onboarding response already includes the personal draft when it
        // exists.  Treat the dedicated draft request as an optional refresh,
        // not as a prerequisite for hydrating canonical Employee data.  This
        // keeps existing submitted employees (whose old drafts were deleted)
        // visible even if the draft endpoint is unavailable.
        let draft = resp?.data?.draft || null;
        try {
          draft = (await getDraft(employeeId, 'personal')) || draft;
        } catch (draftError) {
          console.warn('Failed to load personal onboarding draft; using persisted employee data', draftError?.message || draftError);
        }
        const isSubmitted = emp?.onboardingStatus === 'submitted' || emp?.onboardingStatus === 'approved';
        // Drafts own onboarding fields, but Employee.phone is the shared source of truth.
        const source = draft?.data ? draft.data : {};
        // Helper to convert timestamps to YYYY-MM-DD for date inputs
        const toDate = (v) => v ? v.substring(0, 10) : "";
        const payload = {
          ...(emp || {}),
          ...(source.payload || {}),
          phone: emp?.phone ?? source.payload?.phone,
          phoneCountry: emp?.phoneCountry ?? source.payload?.phoneCountry,
        };

        setFirstName(payload.firstName || "");
        setMiddleName(payload.middleName || "");
        setLastName(payload.lastName || "");
        setEmail(payload.email || "");

        if (payload.phone) {
          const { country, number } = splitMobilePhone(payload.phone, payload.phoneCountry);
          setPhoneCountry(country);
          setPhone(number);
        }
        setDob(toDate(payload.dob));
        setPresentAddress(payload.presentAddress || (emp?.presentAddress || { street: "", city: "", state: "", zip: "", country: "" }));
        setPreviousAddresses(payload.previousAddresses || []);
        setPresentEmployer(payload.presentEmployer || "");

        if (payload.whatsappPhone) {
          const { countryCode, number } = splitPhone(payload.whatsappPhone);
          setWhatsappCode(countryCode);
          setWhatsappPhone(number);
        } else {
          setWhatsappPhone("");
        }
        setIsWhatsappSame(payload.isWhatsappSame || false);
        setMaritalStatus(payload.maritalStatus || emp?.maritalStatus || 'Single');
        setNationality(payload.nationality || "");
        setPassportNumber(payload.passportNumber || payload.passportNumber || "");
        setPassportExpiry(toDate(payload.passportExpiry || payload.passportExpire));
        setSsn(formatSsn(payload.ssn || ""));
        setSin(payload.sin || "");
        setNi(payload.ni || "");
        setTfn(payload.tfn || "");
        setPan(payload.pan || "");
        setAadhaar(payload.aadhaar || "");
        setVisaType(payload.visaType || emp?.visaType || "");
        setVisaExpiry(toDate(payload.visaExpiry || payload.visaExpire));
        const savedDrivingLicense = payload.drivingLicense || "";
        setDrivingLicense(savedDrivingLicense === "N/A" ? "" : savedDrivingLicense);
        setDrivingLicenseOption(savedDrivingLicense === "N/A" ? "N/A" : (savedDrivingLicense ? "Available" : ""));
        setDlState(payload.dlState || "");
        setDlExpiry(toDate(payload.dlExpiry || payload.dlExpire));
        setEmergencyFirstName(payload.emergencyFirstName || "");
        setEmergencyMiddleName(payload.emergencyMiddleName || "");
        setEmergencyLastName(payload.emergencyLastName || "");
        if (payload.emergencyPhone) {
          const match = payload.emergencyPhone.match(/^(\+\d+)\s*(.*)$/);

          if (match) {
            setEmergencyPhoneCode(match[1]);
            setEmergencyPhone(match[2]);
          } else {
            setEmergencyPhone(payload.emergencyPhone);
          }
        } else {
          setEmergencyPhone("");
        }

        if (payload.emergencyPhone) {
          const match = payload.emergencyPhone.match(/^(\+\d+)\s*(.*)$/);

          if (match) {
            setEmergencyPhoneCode(match[1]);
            setEmergencyPhone(match[2]);
          } else {
            setEmergencyPhone(payload.emergencyPhone);
          }
        } else {
          setEmergencyPhone("");
        }

        setEmergencyEmail(payload.emergencyEmail || "");
        setEmergencyRelationship(payload.emergencyRelationship || "");
        // File uploads
        if (payload.passportFile) setPassportFile(payload.passportFile);
        if (payload.passportFile2) setPassportFile2(payload.passportFile2);
        if (payload.i9File) setI9File(payload.i9File);
        if (payload.w4File) setW4File(payload.w4File);
        if (payload.nationality === "INDIA") {
          setPanFile(payload.visaFile || null);
          setAadhaarFile(payload.visaFile2 || null);
          setVisaFile(null);
        } else {
          setVisaFile(payload.visaFile || null);
          setPanFile(null);
          setAadhaarFile(null);
        }
        setDlFile(payload.drivingLicense === "N/A" ? null : (payload.dlFile || null));
        if (payload.marriageCertFile) setMarriageCertFile(payload.marriageCertFile);
        // Spouse/kids/documents
        const spouseRaw = source.spouse || emp?.Spouse;
        if (spouseRaw) {
          // Handle both camelCase (draft) and snake_case (DB) field names
          setSpouse({
            firstName: spouseRaw.firstName || spouseRaw.first_name || "",
            middleName: spouseRaw.middleName || spouseRaw.middle_name || "",
            lastName: spouseRaw.lastName || spouseRaw.last_name || "",
            email: spouseRaw.email || "",
            phone: spouseRaw.phone || "",
            dob: toDate(spouseRaw.dob),
          });
          if (spouseRaw.phone) {
            const match = spouseRaw.phone.match(/^(\+\d+)\s*(.*)$/);

            if (match) {
              setSpousePhoneCode(match[1]);
              setSpousePhone(match[2]);
            } else {
              setSpousePhone(spouseRaw.phone);
            }
          } else {
            setSpousePhone("");
          }
          setIsSpouseAddressSame(spouseRaw.isSpouseAddressSame || spouseRaw.is_spouse_address_same || false);
          setSpouseAddress(spouseRaw.address || { street: "", city: "", state: "", zip: "", country: "" });
          setSpouseNationality(spouseRaw.nationality || "");
          setSpousePassportNumber(spouseRaw.passportNumber || spouseRaw.passport_number || "");
          setSpousePassportExpiry(toDate(spouseRaw.passportExpiry || spouseRaw.passport_expiry));
          setSpouseOccupation(spouseRaw.occupation || "");
          setSpouseSsn(formatSsn(spouseRaw.ssn || ""));
          setSpouseSin(spouseRaw.sin || "");
          setSpouseNi(spouseRaw.ni || "");
          setSpouseTfn(spouseRaw.tfn || "");
          setSpousePan(spouseRaw.pan || "");
          setSpouseAadhaar(spouseRaw.aadhaar || "");
          setSpouseVisaType(spouseRaw.visaType || spouseRaw.spouse_visa_type || "");
          setSpouseVisaExpiry(toDate(spouseRaw.visaExpiry || spouseRaw.visa_expiry));
          const savedSpouseDrivingLicense = spouseRaw.drivingLicense || spouseRaw.driving_license || "";
          setSpouseDrivingLicense(savedSpouseDrivingLicense === "N/A" ? "" : savedSpouseDrivingLicense);
          setSpouseDrivingLicenseOption(savedSpouseDrivingLicense === "N/A" ? "NA" : (savedSpouseDrivingLicense ? "AVAILABLE" : ""));
          setSpouseDlState(spouseRaw.dlState || spouseRaw.dl_state || "");
          setSpouseDlExpiry(toDate(spouseRaw.dlExpiry || spouseRaw.dl_expiry));
          if (spouseRaw.passportFile) setSpousePassportFile(spouseRaw.passportFile);
          if (spouseRaw.passportFile2) setSpousePassportFile2(spouseRaw.passportFile2);
          if (spouseRaw.i9File) setSpouseI9File(spouseRaw.i9File);
          if (spouseRaw.w4File) setSpouseW4File(spouseRaw.w4File);
          if (spouseRaw.nationality === "INDIA") {
            setSpousePanFile(spouseRaw.visaFile || null);
            setSpouseAadhaarFile(spouseRaw.visaFile2 || null);
            setSpouseVisaFile(null);
          } else {
            setSpouseVisaFile(spouseRaw.visaFile || null);
            setSpousePanFile(null);
            setSpouseAadhaarFile(null);
          }
          setSpouseDlFile(savedSpouseDrivingLicense === "N/A" ? null : (spouseRaw.dlFile || null));
        }
        const kidsRaw = source.kids || emp?.Kids;
        if (Array.isArray(kidsRaw)) {
          setShowKidsInfo(true);
          setKidsList(kidsRaw.map(k => ({
            firstName: k.firstName || k.first_name || "",
            middleName: k.middleName || k.middle_name || "",
            lastName: k.lastName || k.last_name || "",
            dob: toDate(k.dob),
            nationality: k.nationality || "",
            passportNumber: k.passportNumber || k.passport_number || "",
            passportExpiry: toDate(k.passportExpiry || k.passport_expiry),
            passportFile: k.passportFile || null,
            passportFile2: k.passportFile2 || null,
            i9File: k.i9File || null,
            w4File: k.w4File || null,
            ssn: formatSsn(k.ssn || ""),
            sin: k.sin || "",
            ni: k.ni || "",
            tfn: k.tfn || "",
            pan: k.pan || "",
            aadhaar: k.aadhaar || "",
            visaType: k.visaType || k.visa_type || "",
            customVisaType: k.customVisaType || k.custom_visa_type || "",
            visaExpiry: toDate(k.visaExpiry || k.visa_expiry),
            addressSame: k.addressSame || k.address_same || false,
            address: k.address || { street: "", city: "", state: "", zip: "", country: "" },
            panFile: k.nationality === "INDIA" ? (k.panFile || k.docFile || null) : null,
            aadhaarFile: k.nationality === "INDIA" ? (k.aadhaarFile || k.docFile2 || null) : null,
            visaFile: k.nationality !== "INDIA" ? (k.visaFile || k.docFile || null) : null,
            docFile: k.docFile || null,
            docFile2: k.docFile2 || null,
          })));
        }
        const docsSrc = source.documents || emp?.Documents;
        if (Array.isArray(docsSrc)) setDocuments(docsSrc.map(d => ({ url: d.url || d.fileUrl || d.fileKey || '', filename: d.filename || d.name || '', type: d.type || '' })));
      } catch (err) {
        // ignore silently
        console.warn('Failed to load onboarding', err?.message || err);
      }
    }
    load();
  }, [user]);



  return (
    <div className="space-y-8 font-employee">
      <fieldset disabled={onboardingSubmitted && !canEdit}>
        {/* Main Personal Info */}
        <form className="bg-white border rounded-lg p-4 space-y-4 shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <EmpTypography.label>First Name<span className="text-red-500">*</span></EmpTypography.label>
              <input aria-label="first-name" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <EmpTypography.label>Middle Name</EmpTypography.label>
              <input aria-label="middle-name" value={middleName} onChange={e => setMiddleName(e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <EmpTypography.label>Last Name<span className="text-red-500">*</span></EmpTypography.label>
              <input aria-label="last-name" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <EmpTypography.label>Present Employer</EmpTypography.label>
              <input
                aria-label="present-employer"
                value={presentEmployer}
                readOnly
                className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-600 font-semibold"
              />
              {/*<select aria-label="present-employer" value={presentEmployer} onChange={e => setPresentEmployer(e.target.value)} className="w-full border rounded px-3 py-2">
              <option value="">Select Company</option>
              <option>Siritek Inc</option>
              <option>Gannusoftware</option>
              <option>Savvyinfosystems</option>
              <option>Globalinfotech Inc</option>
            </select>*/}
            </div>
            <div>
              <EmpTypography.label>
                Mobile No <span className="text-red-500">*</span>
              </EmpTypography.label>
              <div className="flex">
                <select
                  value={phoneCountry}
                  onChange={(e) => setPhoneCountry(e.target.value)}
                  className="border rounded-0.5 px-0.1 py-0.1 bg-white"
                >
                  {COUNTRY_CODES.map((country) => (
                    <option key={country.value} value={country.value}>
                      {country.label} ({country.code})
                    </option>
                  ))}
                </select>
                <input
                  aria-label="phone"
                  value={phone}
                  maxLength={10}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setPhone(value);
                  }}
                  className="w-full border border-l-0 rounded-r px-3 py-2"
                  placeholder="Enter Mobile Number"
                />
              </div>

              <label className="inline-flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isWhatsappSame}
                  onChange={e => {
                    const checked = e.target.checked;
                    setIsWhatsappSame(checked);
                    if (checked) {
                      setWhatsappPhone(phone); // sync WhatsApp number to phone
                      setWhatsappCode(getCountryCode(phoneCountry));
                    } else {
                      setWhatsappPhone(''); // clear when unchecked
                    }
                  }}
                />
                <span>WhatsApp number is same as mobile</span>
                <span className="text-red-500">*</span>
              </label>
            </div>

            {!isWhatsappSame && (
              <div >
                <EmpTypography.label> WhatsApp No <span className="text-red-500">*</span> </EmpTypography.label>
                <div className="flex">
                  <select
                    value={whatsappCode}
                    onChange={(e) => setWhatsappCode(e.target.value)}
                    className="border rounded-l px-0.1 py-0.1 bg-white"
                  >
                    {COUNTRY_CODES.map((country) => (
                      <option key={country.value} value={country.code}>
                        {country.label} ({country.code})
                      </option>
                    ))}
                  </select>

                  <input
                    aria-label="whatsapp-no"
                    value={whatsappPhone}
                    maxLength={10}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setWhatsappPhone(value);
                    }}
                    className="w-full border border-l-0 rounded-r px-3 py-2"
                    placeholder="Enter WhatsApp Number"
                  />
                </div>

              </div>
            )}
            <div>
              <EmpTypography.label>Email ID<span className="text-red-500">*</span></EmpTypography.label>
              <input aria-label="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <EmpTypography.label>Date of Birth<span className="text-red-500">*</span></EmpTypography.label>
              <input type="date"
                value={dob}
                min="1900-01-01"
                max="9999-12-31"
                onChange={(e) => setDob(e.target.value)}
                className="w-full border rounded px-3 py-2"
                disabled={onboardingSubmitted && !canEdit}
              />
            </div>
            <div className="md:col-span-3">
              <EmpTypography.label>Present Address</EmpTypography.label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <EmpTypography.label>Street</EmpTypography.label>
                  <input className="w-full border rounded px-3 py-2" value={presentAddress.street} onChange={e => { setPresentAddress(pa => ({ ...pa, street: e.target.value })); setHasPresentAddressChanged(true); }} />
                </div>
                <div>
                  <EmpTypography.label>City</EmpTypography.label>
                  <input className="w-full border rounded px-3 py-2" value={presentAddress.city} onChange={e => { setPresentAddress(pa => ({ ...pa, city: e.target.value })); setHasPresentAddressChanged(true); }} />
                </div>
                <div>
                  <EmpTypography.label>State</EmpTypography.label>
                  <input className="w-full border rounded px-3 py-2" value={presentAddress.state} onChange={e => { setPresentAddress(pa => ({ ...pa, state: e.target.value })); setHasPresentAddressChanged(true); }} />
                </div>
                <div>
                  <EmpTypography.label>Zip Code</EmpTypography.label>
                  <input className="w-full border rounded px-3 py-2" value={presentAddress.zip} onChange={e => { setPresentAddress(pa => ({ ...pa, zip: e.target.value })); setHasPresentAddressChanged(true); }} />
                </div>
                <div>
                  <EmpTypography.label>Country</EmpTypography.label>
                  <input className="w-full border rounded px-3 py-2" value={presentAddress.country} onChange={e => { setPresentAddress(pa => ({ ...pa, country: e.target.value })); setHasPresentAddressChanged(true); }} />
                </div>
              </div>
              {hasPresentAddressChanged && (
                <div className="text-yellow-600 text-sm mt-2">Note: Please update all dependent fields such as Driving License, Spouse/Kid Address, etc. if applicable.</div>
              )}
            </div>

            {/* Previous Addresses */}
            <div className="md:col-span-3">
              <div className="flex items-center justify-between mb-2">
                <div className="mb-2">
                  {previousAddresses.length > 0 && (
                    <EmpTypography.label>Previous Address</EmpTypography.label>
                  )}
                </div>
                <button
                  type="button"
                  className="px-4 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-200 text-sm flex items-center gap-2 font-medium hover:bg-blue-200"
                  onClick={() => setPreviousAddresses(prev => [...prev, { street: "", city: "", state: "", zip: "", country: "" }])}
                >
                  <span className="text-lg">+</span> Add Previous Address
                </button>
              </div>
              {previousAddresses.map((addr, idx) => (
                <div key={idx} className="border rounded-lg p-4 mb-4 bg-white-50 relative">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <EmpTypography.label>Street</EmpTypography.label>
                      <input className="w-full border rounded px-3 py-2" value={addr.street} onChange={e => setPreviousAddresses(prev => prev.map((a, i) => i === idx ? { ...a, street: e.target.value } : a))} />
                    </div>
                    <div>
                      <EmpTypography.label>City</EmpTypography.label>
                      <input className="w-full border rounded px-3 py-2" value={addr.city} onChange={e => setPreviousAddresses(prev => prev.map((a, i) => i === idx ? { ...a, city: e.target.value } : a))} />
                    </div>
                    <div>
                      <EmpTypography.label>State</EmpTypography.label>
                      <input className="w-full border rounded px-3 py-2" value={addr.state} onChange={e => setPreviousAddresses(prev => prev.map((a, i) => i === idx ? { ...a, state: e.target.value } : a))} />
                    </div>
                    <div>
                      <EmpTypography.label>Zip Code</EmpTypography.label>
                      <input className="w-full border rounded px-3 py-2" value={addr.zip} onChange={e => setPreviousAddresses(prev => prev.map((a, i) => i === idx ? { ...a, zip: e.target.value } : a))} />
                    </div>
                    <div>
                      <EmpTypography.label>Country</EmpTypography.label>
                      <input className="w-full border rounded px-3 py-2" value={addr.country} onChange={e => setPreviousAddresses(prev => prev.map((a, i) => i === idx ? { ...a, country: e.target.value } : a))} />
                    </div>
                    {/* ✅ Delete Button at Bottom */}
                    <div className="flex justify-end mt-4">
                      <button
                        type="button"
                        className="text-red-600 px-2 py-1 rounded hover:bg-red-100"
                        onClick={() =>
                          setPreviousAddresses(prev =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                      >🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Marital Status and related uploads */}
            <div className="md:col-span-3 flex items-end gap-4">
              <div className="flex-1">
                <EmpTypography.label>Marital status</EmpTypography.label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                >
                  <option>Single</option>
                  <option>Married</option>
                </select>
              </div>

              {maritalStatus === "Married" && (
                <div className="flex-1">
                  <FileUploadField label="Marriage Certificate:" employeeId={targetEmployeeId || user?.employeeId || user?.id} category="marriage_cert" documentName="Marriage Certificate" value={marriageCertFile} onChange={setMarriageCertFile} disabled={onboardingSubmitted && !canEdit} />
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 mt-4">
            <div className="space-y-2">
              <EmpTypography.label>Nationality <span className="text-red-500">*</span> </EmpTypography.label>
              <select
                className="w-full border rounded px-3 py-2"
                value={nationality}
                onChange={(e) => {
                  const value = e.target.value;

                  setNationality(value);
                  setVisaType("");
                  setVisaExpiry("");
                  setVisaFile(null);
                  setPanFile(null);
                  setAadhaarFile(null);

                  if (value !== "INDIA") {
                    setPan("");
                    setAadhaar("");
                  }
                }}
              >

                <option value="">Select Nationality</option>
                {NATIONALITY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <EmpTypography.label>Passport number<span className="text-red-500">*</span></EmpTypography.label>
              <input className="w-full border rounded px-3 py-2" value={passportNumber} onChange={e => {
                if (isPassportInput(e.target.value)) setPassportNumber(e.target.value);
              }} />

              <EmpTypography.label>Passport Expiry Date<span className="text-red-500">*</span></EmpTypography.label>
              <input type="date"
                value={passportExpiry}
                min="1900-01-01"
                max="9999-12-31"
                onChange={(e) => setPassportExpiry(e.target.value)}
                className="w-full border rounded px-3 py-2"
                disabled={onboardingSubmitted && !canEdit}
              />
              <p className="text-xs text-gray-600">Upload all passport documents/pages, including old or previous passports.</p>
              <FileUploadField label="Passport Document Upload 1:" employeeId={targetEmployeeId || user?.employeeId || user?.id} category="passport" documentName="Passport" value={passportFile} onChange={setPassportFile} disabled={onboardingSubmitted && !canEdit} />
              <FileUploadField label="Passport Document Upload 2:" employeeId={targetEmployeeId || user?.employeeId || user?.id} category="passport_additional" documentName="Passport Additional Pages" value={passportFile2} onChange={setPassportFile2} disabled={onboardingSubmitted && !canEdit} />
            </div>

            <div className="space-y-2">
              {nationality === "US" && (
                <>
                  <EmpTypography.label>SSN<span className="text-red-500">*</span></EmpTypography.label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={ssn}
                    maxLength={11}
                    inputMode="numeric"
                    onChange={(e) => {
                      if (canEnterSsn(e.target.value)) setSsn(formatSsn(e.target.value));
                    }}
                  />
                </>
              )}

              {nationality === "CANADA" && (
                <>
                  <EmpTypography.label>SIN<span className="text-red-500">*</span></EmpTypography.label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={sin}
                    onChange={(e) => setSin(e.target.value)}
                  />
                </>
              )}

              {nationality === "UK" && (
                <>
                  <EmpTypography.label>NI<span className="text-red-500">*</span></EmpTypography.label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={ni}
                    onChange={(e) => setNi(e.target.value)}
                  />
                </>
              )}

              {nationality === "AUSTRALIA" && (
                <>
                  <EmpTypography.label>TFN<span className="text-red-500">*</span></EmpTypography.label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={tfn}
                    onChange={(e) => setTfn(e.target.value)}
                  />
                </>
              )}

              {nationality === "INDIA" && (
                <>
                  <EmpTypography.label>PAN Number<span className="text-red-500">*</span></EmpTypography.label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={pan}
                    onChange={(e) => setPan(e.target.value)}
                  />

                  <EmpTypography.label>Aadhaar Card Number<span className="text-red-500">*</span></EmpTypography.label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={aadhaar}
                    onChange={(e) => setAadhaar(e.target.value)}
                  />
                </>
              )}

              <EmpTypography.label>Visa Type<span className="text-red-500">*</span></EmpTypography.label>
              <select
                className="w-full border rounded px-3 py-2"
                value={visaType}
                onChange={(e) => setVisaType(e.target.value)}
              >
                <option value="">Select Visa Type</option>

                {nationality === "US" && (
                  <>
                    <option>H1B</option>
                    <option>F1</option>
                    <option>EAD</option>
                    <option>H4</option>
                    <option>Green Card</option>
                    <option>US Citizen</option>
                    <option>Other</option>
                  </>
                )}

                {nationality === "CANADA" && (
                  <>
                    <option>Work Permit</option>
                    <option>PR</option>
                    <option>Citizen</option>
                  </>
                )}

                {nationality === "UK" && (
                  <>
                    <option>Work Permit</option>
                    <option>Blue Card</option>
                  </>
                )}

                {nationality === "INDIA" && (
                  <>
                    <option>Citizen</option>
                  </>
                )}

                {nationality === "AUSTRALIA" && (
                  <>
                    <option>Work Permit</option>
                    <option>PR</option>
                    <option>Citizen</option>
                  </>
                )}
              </select>

              {visaType === "Other" && (
                <input className="w-full border rounded px-3 py-2 mt-2" placeholder="Enter Visa Type" />
              )}



              {!(nationality === "INDIA" && visaType === "Citizen") && (
                <>
                  <EmpTypography.label>
                    Visa Expiry date<span className="text-red-500">*</span>
                  </EmpTypography.label>

                  <input type="date"
                    value={visaExpiry}
                    min="1900-01-01"
                    max="9999-12-31"
                    onChange={(e) => setVisaExpiry(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    disabled={onboardingSubmitted && !canEdit}
                  />

                </>
              )}

              {nationality === "INDIA" ? (
                <>
                  <FileUploadField label="PAN Document Upload:" employeeId={targetEmployeeId || user?.employeeId || user?.id} category="pan" documentName="PAN Document" value={panFile} onChange={setPanFile} disabled={onboardingSubmitted && !canEdit} />
                  <FileUploadField label="Aadhaar Document Upload:" employeeId={targetEmployeeId || user?.employeeId || user?.id} category="aadhaar" documentName="Aadhaar Document" value={aadhaarFile} onChange={setAadhaarFile} disabled={onboardingSubmitted && !canEdit} />
                </>
              ) : (
                <FileUploadField label="Visa Document Upload:" employeeId={targetEmployeeId || user?.employeeId || user?.id} category="visa" documentName="Visa" value={visaFile} onChange={setVisaFile} disabled={onboardingSubmitted && !canEdit} />
              )}
            </div>

            <div className="space-y-2">
              <EmpTypography.label>
                Driving License<span className="text-red-500">*</span>
              </EmpTypography.label>

              <select
                required
                className="w-full border rounded px-3 py-2"
                value={drivingLicenseOption}
                onChange={(e) => {
                  const value = e.target.value;

                  setDrivingLicenseOption(value);

                  if (value === "N/A") {
                    setDrivingLicense("");
                    setDlState("");
                    setDlExpiry("");
                    setDlFile(null);
                  }
                }}
              >
                <option value="">Select</option>
                <option value="Available">Enter Driving License Number</option>
                <option value="N/A">N/A</option>
              </select>

              {drivingLicenseOption === "Available" && (
                <input
                  type="text"
                  required
                  placeholder="Enter Driving License Number"
                  className="w-full border rounded px-3 py-2 mt-2"
                  value={drivingLicense}
                  onChange={(e) => setDrivingLicense(e.target.value)}
                />
              )}

              {drivingLicenseOption !== "N/A" && (
                <>
                  <EmpTypography.label>DL Issue State</EmpTypography.label>
                  <DlStateSelect nationality={nationality} value={dlState} onChange={e => setDlState(e.target.value)} />
                  <EmpTypography.label>DL Expiry date<span className="text-red-500">*</span></EmpTypography.label>
                  <input type="date"
                    value={dlExpiry}
                    min="1900-01-01"
                    max="9999-12-31"
                    onChange={(e) => setDlExpiry(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    disabled={onboardingSubmitted && !canEdit}
                  />
                  <FileUploadField label="DL Document Upload:" employeeId={targetEmployeeId || user?.employeeId || user?.id} category="dl" documentName="Driving License" value={dlFile} onChange={setDlFile} disabled={onboardingSubmitted && !canEdit} />
                </>
              )}
            </div>

          </div>
        </form>

        {/* Spouse Info */}
        {maritalStatus === "Married" && (
          <div className="bg-white border rounded-lg p-4 shadow mt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-lg">Spouse Information<span className="text-red-500">
                *
              </span></span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name<span className="text-red-500">*</span></label>
                <input value={spouse.firstName} onChange={e => setSpouse(s => ({ ...s, firstName: e.target.value }))} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Middle Name</label>
                <input value={spouse.middleName} onChange={e => setSpouse(s => ({ ...s, middleName: e.target.value }))} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name<span className="text-red-500">*</span></label>
                <input value={spouse.lastName} onChange={e => setSpouse(s => ({ ...s, lastName: e.target.value }))} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <EmpTypography.label>
                  Mobile No <span className="text-red-500">*</span>
                </EmpTypography.label>
                <div className="flex">
                  <select
                    value={spousePhoneCode}
                    onChange={(e) => setSpousePhoneCode(e.target.value)}
                    className="border rounded-l px-2 py-2 bg-white"
                  >
                    {COUNTRY_CODES.map((country) => (
                      <option key={country.value} value={country.code}>
                        {country.label} ({country.code})
                      </option>
                    ))}
                  </select>

                  <input
                    aria-label="phone"
                    value={spousePhone}
                    maxLength={10}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setSpousePhone(value);
                    }}
                    className="w-full border border-l-0 rounded-r px-3 py-2"
                    placeholder="Enter Mobile Number"
                  />
                </div>

              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email ID<span className="text-red-500">*</span></label>
                <input value={spouse.email} onChange={e => setSpouse(s => ({ ...s, email: e.target.value }))} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Date of Birth<span className="text-red-500">*</span>
                </label>

                <input type="date"
                  value={spouse.dob}
                  min="1900-01-01"
                  max="9999-12-31"
                  onChange={(e) => setSpouse((s) => ({ ...s, dob: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  disabled={onboardingSubmitted && !canEdit}
                />
              </div>
              {/* Checkbox above address fields */}
              <div className="mb-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" className="toggle toggle-success" checked={isSpouseAddressSame} onChange={e => setIsSpouseAddressSame(e.target.checked)} />
                  Same as employee's present address
                </label>
              </div>
              {!isSpouseAddressSame && (
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium mb-1">Present Address<span className="text-red-500">
                    *</span></label>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium">Street</label>
                      <input className="w-full border rounded px-3 py-2" value={spouseAddress.street} onChange={e => setSpouseAddress(a => ({ ...a, street: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">City</label>
                      <input className="w-full border rounded px-3 py-2" value={spouseAddress.city} onChange={e => setSpouseAddress(a => ({ ...a, city: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">State</label>
                      <input className="w-full border rounded px-3 py-2" value={spouseAddress.state} onChange={e => setSpouseAddress(a => ({ ...a, state: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Zip Code</label>
                      <input className="w-full border rounded px-3 py-2" value={spouseAddress.zip} onChange={e => setSpouseAddress(a => ({ ...a, zip: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Country</label>
                      <input className="w-full border rounded px-3 py-2" value={spouseAddress.country} onChange={e => setSpouseAddress(a => ({ ...a, country: e.target.value }))} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 mt-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Nationality <span className="text-red-500">*</span> </label>
                <select
                  className="w-full border rounded px-3 py-2" value={spouseNationality} onChange={(e) => {
                    const value = e.target.value;

                    setSpouseNationality(value);
                    setSpouseVisaType("");
                    setSpouseVisaExpiry("");
                    setSpouseVisaFile(null);
                    setSpousePanFile(null);
                    setSpouseAadhaarFile(null);

                    if (value !== "INDIA") {
                      setSpousePan("");
                      setSpouseAadhaar("");
                    }
                  }}

                >
                  <option value="">Select Nationality</option>
                  {NATIONALITY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>

                <label className="block text-sm font-medium">Passport number<span className="text-red-500">*</span></label>
                <input className="w-full border rounded px-3 py-2" value={spousePassportNumber} onChange={e => {
                  if (isPassportInput(e.target.value)) setSpousePassportNumber(e.target.value);
                }} />

                <label className="block text-sm font-medium">Passport Expiry Date<span className="text-red-500">*</span></label>
                <input type="date"
                  value={spousePassportExpiry}
                  min="1900-01-01"
                  max="9999-12-31"
                  onChange={(e) => setSpousePassportExpiry(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  disabled={onboardingSubmitted && !canEdit}
                />
                <p className="text-xs text-gray-600">Upload all passport documents/pages, including old or previous passports.</p>


                <label className="block text-sm font-medium">Occupation:</label>
                <input className="w-full border rounded px-3 py-2" value={spouseOccupation} onChange={e => setSpouseOccupation(e.target.value)} />


                <FileUploadField label="Passport Document Upload 1:" employeeId={targetEmployeeId || user?.employeeId || user?.id} category="spouse_passport" documentName="Spouse Passport" value={spousePassportFile} onChange={setSpousePassportFile} disabled={onboardingSubmitted && !canEdit} />
                <FileUploadField label="Passport Document Upload 2:" employeeId={targetEmployeeId || user?.employeeId || user?.id} category="spouse_passport_additional" documentName="Spouse Passport Additional Pages" value={spousePassportFile2} onChange={setSpousePassportFile2} disabled={onboardingSubmitted && !canEdit} />
              </div>


              <div className="space-y-2">
                {spouseNationality === "US" && (
                  <>
                    <label className="block text-sm font-medium">SSN<span className="text-red-500">*</span></label>
                    <input
                      className="w-full border rounded px-3 py-2"
                      value={spouseSsn}
                      maxLength={11}
                      inputMode="numeric"
                      onChange={(e) => {
                        if (canEnterSsn(e.target.value)) setSpouseSsn(formatSsn(e.target.value));
                      }}
                    />
                  </>
                )}

                {spouseNationality === "CANADA" && (
                  <>
                    <label className="block text-sm font-medium">SIN<span className="text-red-500">*</span></ label>
                    <input
                      className="w-full border rounded px-3 py-2"
                      value={spouseSin}
                      onChange={(e) => setSpouseSin(e.target.value)}
                    />
                  </>
                )}

                {spouseNationality === "UK" && (
                  <>
                    <label className="block text-sm font-medium">NI<span className="text-red-500">*</span></label>
                    <input
                      className="w-full border rounded px-3 py-2"
                      value={spouseNi}
                      onChange={(e) => setSpouseNi(e.target.value)}
                    />
                  </>
                )}

                {spouseNationality === "AUSTRALIA" && (
                  <>
                    <label className="block text-sm font-medium">TFN<span className="text-red-500">*</span></label>
                    <input
                      className="w-full border rounded px-3 py-2"
                      value={spouseTfn}
                      onChange={(e) => setSpouseTfn(e.target.value)}
                    />
                  </>
                )}

                {spouseNationality === "INDIA" && (
                  <>
                    <label className="block text-sm font-medium">PAN Number<span className="text-red-500">*</span></label>
                    <input
                      className="w-full border rounded px-3 py-2"
                      value={spousePan}
                      onChange={(e) => setSpousePan(e.target.value)}
                    />

                    <label className="block text-sm font-medium">Aadhaar Card Number<span className="text-red-500">*</span></label>
                    <input
                      className="w-full border rounded px-3 py-2"
                      value={spouseAadhaar}
                      onChange={(e) => setSpouseAadhaar(e.target.value)}
                    />
                  </>
                )}

                <label className="block text-sm font-medium">Visa Type<span className="text-red-500">*</span></label>

                <select className="w-full border rounded px-3 py-2"
                  value={spouseVisaType}
                  onChange={(e) => setSpouseVisaType(e.target.value)}
                >
                  <option value="">Select Visa Type</option>

                  {spouseNationality === "US" && (
                    <>
                      <option>H1B</option>
                      <option>F1</option>
                      <option>EAD</option>
                      <option>H4</option>
                      <option>Green Card</option>
                      <option>US Citizen</option>
                      <option>Other</option>
                    </>
                  )}

                  {spouseNationality === "CANADA" && (
                    <>
                      <option>Work Permit</option>
                      <option>PR</option>
                      <option>Citizen</option>
                    </>
                  )}

                  {spouseNationality === "UK" && (
                    <>
                      <option>Work Permit</option>
                      <option>Blue Card</option>
                    </>
                  )}

                  {spouseNationality === "INDIA" && (
                    <>
                      <option>Citizen</option>
                    </>
                  )}

                  {spouseNationality === "AUSTRALIA" && (
                    <>
                      <option>Work Permit</option>
                      <option>PR</option>
                      <option>Citizen</option>
                    </>
                  )}
                </select>

                {spouseVisaType === "Other" && (
                  <input className="w-full border rounded px-3 py-2 mt-2" placeholder="Enter Visa Type" />
                )}


                {!(spouseNationality === "INDIA" && spouseVisaType === "Citizen") && (
                  <>
                    <label className="block text-sm font-medium">
                      Visa Expiry date<span className="text-red-500">*</span>
                    </label>

                    <input type="date"
                      value={spouseVisaExpiry}
                      min="1900-01-01"
                      max="9999-12-31"
                      onChange={(e) => setSpouseVisaExpiry(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                      disabled={onboardingSubmitted && !canEdit}
                    />

                  </>
                )}

                {spouseNationality === "INDIA" ? (
                  <>
                    <FileUploadField label="PAN Document Upload:" employeeId={targetEmployeeId || user?.employeeId || user?.id} category="spouse_pan" documentName="Spouse PAN Document" value={spousePanFile} onChange={setSpousePanFile} disabled={onboardingSubmitted && !canEdit} />
                    <FileUploadField label="Aadhaar Document Upload:" employeeId={targetEmployeeId || user?.employeeId || user?.id} category="spouse_aadhaar" documentName="Spouse Aadhaar Document" value={spouseAadhaarFile} onChange={setSpouseAadhaarFile} disabled={onboardingSubmitted && !canEdit} />
                  </>
                ) : (
                  <FileUploadField label="Visa Document Upload:" employeeId={targetEmployeeId || user?.employeeId || user?.id} category="spouse_visa" documentName="Spouse Visa" value={spouseVisaFile} onChange={setSpouseVisaFile} disabled={onboardingSubmitted && !canEdit} />
                )}
              </div>

              <div className="space-y-2">
                <EmpTypography.label>
                  Spouse Driving License
                  <span className="text-red-500">*</span>
                </EmpTypography.label>

                <select
                  className="w-full border rounded px-3 py-2"
                  value={spouseDrivingLicenseOption}
                  onChange={(e) => {
                    const value = e.target.value;

                    setSpouseDrivingLicenseOption(value);

                    if (value === "NA") {
                      setSpouseDrivingLicense("");
                      setSpouseDlState("");
                      setSpouseDlExpiry("");
                      setSpouseDlFile(null);
                    }
                  }}
                >
                  <option value="">Select Option</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="NA">N/A</option>
                </select>

                {spouseDrivingLicenseOption === "AVAILABLE" && (
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2 mt-2"
                    placeholder="Enter Spouse Driving License Number"
                    value={spouseDrivingLicense}
                    onChange={(e) => setSpouseDrivingLicense(e.target.value)}
                  />
                )}

                {spouseDrivingLicenseOption !== "NA" && (
                  <>
                    <label className="block text-sm font-medium">DL Issue State</label>
                    <DlStateSelect nationality={spouseNationality} value={spouseDlState} onChange={e => setSpouseDlState(e.target.value)} />
                    <label className="block text-sm font-medium">DL Expiry date<span className="text-red-500">*</span></label>
                    <input type="date"
                      value={spouseDlExpiry}
                      min="1900-01-01"
                      max="9999-12-31"
                      onChange={(e) => setSpouseDlExpiry(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                      disabled={onboardingSubmitted && !canEdit}
                    />

                    <FileUploadField label="DL Document Upload:" employeeId={targetEmployeeId || user?.employeeId || user?.id} category="spouse_dl" documentName="Spouse Driving License" value={spouseDlFile} onChange={setSpouseDlFile} disabled={onboardingSubmitted && !canEdit} />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Kids Info */}
        <>
          {maritalStatus === "Married" && (
            <div className="bg-white border rounded-lg p-4 shadow mt-4">
              {/* Toggle Checkbox */}
              <div className="flex items-center gap-2 mb-4">
                <label htmlFor="toggleKidsInfo" className="font-semibold text-lg cursor-pointer">
                  Kids Information
                </label>
                <input
                  type="checkbox"
                  id="toggleKidsInfo"
                  className="toggle toggle-success"
                  checked={showKidsInfo}
                  onChange={() => setShowKidsInfo(!showKidsInfo)}
                />
              </div>

              {/* Conditional Kids Info Form */}
              {showKidsInfo &&
                kidsList.map((kid, idx) => (
                  <div key={idx} className="border border-gray-200 p-4 mb-6 rounded-lg">
                    <span className="font-medium">Kid {idx + 1} : </span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">First Name <span className="text-red-500">*</span></label>
                        <input className="w-full border rounded px-3 py-2" value={kid.firstName} onChange={e => updateKid(idx, "firstName", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Middle Name</label>
                        <input className="w-full border rounded px-3 py-2" value={kid.middleName} onChange={e => updateKid(idx, "middleName", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Last Name <span className="text-red-500">*</span></label>
                        <input className="w-full border rounded px-3 py-2" value={kid.lastName} onChange={e => updateKid(idx, "lastName", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Date of Birth <span className="text-red-500">*</span></label>
                        <input type="date"
                          className="w-full border rounded px-3 py-2"
                          value={kid.dob}
                          min="1900-01-01"
                          max="9999-12-31"
                          onChange={(e) => {
                            updateKid(idx, "dob", e.target.value);
                          }}
                        />
                      </div>


                      {/* Checkbox above address fields */}
                      <div className="mb-2 md:col-span-3">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <input type="checkbox" className="toggle toggle-success" checked={kid.addressSame} onChange={e => updateKidAddressSame(idx, e.target.checked)} />
                          Same as employee's present address
                        </label>
                      </div>

                      {/* Address Fields */}
                      {!kid.addressSame && (
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium mb-1">Present Address</label>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-sm font-medium">Street</label>
                              <input className="w-full border rounded px-3 py-2" value={kid.address.street} onChange={e => updateKidAddress(idx, "street", e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-sm font-medium">City</label>
                              <input className="w-full border rounded px-3 py-2" value={kid.address.city} onChange={e => updateKidAddress(idx, "city", e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-sm font-medium">State</label>
                              <input className="w-full border rounded px-3 py-2" value={kid.address.state} onChange={e => updateKidAddress(idx, "state", e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-sm font-medium">Zip</label>
                              <input className="w-full border rounded px-3 py-2" value={kid.address.zip} onChange={e => updateKidAddress(idx, "zip", e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-sm font-medium">Country</label>
                              <input className="w-full border rounded px-3 py-2" value={kid.address.country} onChange={e => updateKidAddress(idx, "country", e.target.value)} />
                            </div>
                          </div>
                        </div>
                      )}

                      <div><label className="block text-sm font-medium mb-1">
                        Nationality<span className="text-red-500">*</span>
                      </label>

                        <select
                          className="w-full border rounded px-3 py-2"
                          value={kid.nationality}
                          onChange={(e) => {
                            const value = e.target.value;
                            setKidsList(prev => prev.map((currentKid, currentIndex) =>
                              currentIndex === idx ? {
                                ...currentKid,
                                nationality: value,
                                visaType: "",
                                customVisaType: "",
                                visaExpiry: "",
                                pan: value === "INDIA" ? currentKid.pan : "",
                                aadhaar: value === "INDIA" ? currentKid.aadhaar : "",
                                panFile: null,
                                aadhaarFile: null,
                                visaFile: null,
                                docFile: null,
                                docFile2: null,
                              } : currentKid
                            ));
                          }}
                        >

                          <option value="">Select Nationality</option>
                          {NATIONALITY_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}

                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Passport Number<span className="text-red-500">*</span></label>
                        <input className="w-full border rounded px-3 py-2" value={kid.passportNumber} onChange={e => {
                          if (isPassportInput(e.target.value)) updateKid(idx, "passportNumber", e.target.value);
                        }} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Passport Expiry Date<span className="text-red-500">*</span>
                        </label>

                        <input type="date"
                          className="w-full border rounded px-3 py-2"
                          value={kid.passportExpiry}
                          min="1900-01-01"
                          max="9999-12-31"
                          onChange={(e) => {
                            updateKid(idx, "passportExpiry", e.target.value);
                          }}
                        />
                      </div>
                      <FileUploadField
                        label="Passport Document Upload 1:"
                        employeeId={targetEmployeeId || user?.employeeId || user?.id}
                        category={`kid_${idx}_passport`}
                        documentName={`Kid ${idx + 1} Passport`}
                        value={kid.passportFile || null}
                        onChange={(file) => updateKid(idx, "passportFile", file)}
                        disabled={onboardingSubmitted && !canEdit}
                      />
                      <div className="md:col-span-3 text-xs text-gray-600">Upload all passport documents/pages, including old or previous passports.</div>
                      <FileUploadField
                        label="Passport Document Upload 2:"
                        employeeId={targetEmployeeId || user?.employeeId || user?.id}
                        category={`kid_${idx}_passport_additional`}
                        documentName={`Kid ${idx + 1} Passport Additional Pages`}
                        value={kid.passportFile2 || null}
                        onChange={(file) => updateKid(idx, "passportFile2", file)}
                        disabled={onboardingSubmitted && !canEdit}
                      />
                      {/* US */}
                      {kid.nationality === "US" && (
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            SSN <span className="text-red-500">*</span>
                          </label>
                          <input
                            className="w-full border rounded px-3 py-2"
                            value={kid.ssn || ""}
                            maxLength={11}
                            inputMode="numeric"
                            onChange={(e) => {
                              if (canEnterSsn(e.target.value)) updateKid(idx, "ssn", formatSsn(e.target.value));
                            }}
                          />
                        </div>
                      )}

                      {/* Canada */}
                      {kid.nationality === "CANADA" && (
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            SIN <span className="text-red-500">*</span>
                          </label>
                          <input
                            className="w-full border rounded px-3 py-2"
                            value={kid.sin || ""}
                            onChange={(e) => updateKid(idx, "sin", e.target.value)}
                          />
                        </div>
                      )}

                      {/* UK */}
                      {kid.nationality === "UK" && (
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            NI <span className="text-red-500">*</span>
                          </label>
                          <input
                            className="w-full border rounded px-3 py-2"
                            value={kid.ni || ""}
                            onChange={(e) => updateKid(idx, "ni", e.target.value)}
                          />
                        </div>
                      )}

                      {/* Australia */}
                      {kid.nationality === "AUSTRALIA" && (
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            TFN <span className="text-red-500">*</span>
                          </label>
                          <input
                            className="w-full border rounded px-3 py-2"
                            value={kid.tfn || ""}
                            onChange={(e) => updateKid(idx, "tfn", e.target.value)}
                          />
                        </div>
                      )}

                      {/* India */}
                      {kid.nationality === "INDIA" && (
                        <>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              PAN Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              className="w-full border rounded px-3 py-2"
                              value={kid.pan || ""}
                              onChange={(e) => updateKid(idx, "pan", e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Aadhaar Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              className="w-full border rounded px-3 py-2"
                              value={kid.aadhaar || ""}
                              onChange={(e) => updateKid(idx, "aadhaar", e.target.value)}
                            />
                          </div>
                        </>
                      )}
                      <div>
                        <label className="block text-sm font-medium mb-1">Visa Type<span className="text-red-500">*</span></label>

                        <select
                          className="w-full border rounded px-3 py-2"
                          value={kid.visaType}
                          onChange={(e) => updateKidVisaType(idx, e.target.value)}
                        >
                          <option value="">Select Visa Type</option>

                          {kid.nationality === "US" && (
                            <>
                              <option>H1B</option>
                              <option>F1</option>
                              <option>EAD</option>
                              <option>H4</option>
                              <option>Green Card</option>
                              <option>US Citizen</option>
                              <option>Other</option>
                            </>
                          )}

                          {kid.nationality === "CANADA" && (
                            <>
                              <option>Work Permit</option>
                              <option>PR</option>
                              <option>Citizen</option>
                            </>
                          )}

                          {kid.nationality === "UK" && (
                            <>
                              <option>Work Permit</option>
                              <option>Blue Card</option>
                            </>
                          )}

                          {kid.nationality === "INDIA" && (
                            <>
                              <option>Citizen</option>
                            </>
                          )}

                          {kid.nationality === "AUSTRALIA" && (
                            <>
                              <option>Work Permit</option>
                              <option>PR</option>
                              <option>Citizen</option>
                            </>
                          )}
                        </select>
                        {kid.visaType === "Other" && (
                          <input className="w-full border rounded px-3 py-2 mt-2" placeholder="Enter Visa Type" value={kid.customVisaType} onChange={e => updateKidCustomVisaType(idx, e.target.value)} />
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Visa Expiry Date<span className="text-red-500">*</span>
                        </label>

                        <input type="date"
                          className="w-full border rounded px-3 py-2"
                          value={kid.visaExpiry}
                          min="1900-01-01"
                          max="9999-12-31"
                          onChange={(e) => {
                            updateKid(idx, "visaExpiry", e.target.value);
                          }}
                        />
                      </div>

                      {kid.nationality === "INDIA" ? (
                        <>
                          <FileUploadField label="PAN Document Upload:" employeeId={targetEmployeeId || user?.employeeId || user?.id} category={`kid_${idx}_pan`} documentName={`Kid ${idx + 1} PAN Document`} value={kid.panFile || null} onChange={(file) => updateKid(idx, "panFile", file)} disabled={onboardingSubmitted && !canEdit} />
                          <FileUploadField label="Aadhaar Document Upload:" employeeId={targetEmployeeId || user?.employeeId || user?.id} category={`kid_${idx}_aadhaar`} documentName={`Kid ${idx + 1} Aadhaar Document`} value={kid.aadhaarFile || null} onChange={(file) => updateKid(idx, "aadhaarFile", file)} disabled={onboardingSubmitted && !canEdit} />
                        </>
                      ) : (
                        <FileUploadField label="Visa Document Upload:" employeeId={targetEmployeeId || user?.employeeId || user?.id} category={`kid_${idx}`} documentName={`Kid ${idx + 1} Visa`} value={kid.visaFile || null} onChange={(file) => updateKid(idx, "visaFile", file)} disabled={onboardingSubmitted && !canEdit} />
                      )}
                    </div>

                    {/* Delete Button */}
                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        className="text-red-600 px-2 py-1 rounded hover:bg-red-100"
                        onClick={() => removeKid(idx)}
                        aria-label="Delete Kid"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}

              {/* Add Kid Button */}
              {showKidsInfo && (
                <div className="flex justify-end">
                  <EmpTypography.button variant="primary" className="mt-4" onClick={addKid}>
                    + Add
                  </EmpTypography.button>
                </div>
              )}
            </div>
          )}
        </>


        <section className="mt-4">
          <EmpTypography.h2 className="mb-3 font-bold">Onboard Docs</EmpTypography.h2>
          <OnboardDocs
            ref={onboardDocsRef}
            embedded
            readOnly={onboardingSubmitted && !canEdit}
            visaType={visaType}
            i9File={i9File}
            setI9File={setI9File}
            w4File={w4File}
            setW4File={setW4File}
            hasSpouse={maritalStatus === "Married"}
            spouseI9File={spouseI9File}
            setSpouseI9File={setSpouseI9File}
            spouseW4File={spouseW4File}
            setSpouseW4File={setSpouseW4File}
            spouseVisaType={spouseVisaType}
            kids={kidsList}
            setKidDocument={updateKid}
          />
        </section>

        {/* Emergency Contact Info */}
        <div className="bg-white border rounded-lg p-4 shadow mt-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-lg">Emergency Contact info<span className="text-red-500">
              *
            </span> :</span>
            {/*<input type="checkbox" className="toggle toggle-success" defaultChecked /> */}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name<span className="text-red-500">*</span></label>
              <input className="w-full border rounded px-3 py-2" value={emergencyFirstName} onChange={e => setEmergencyFirstName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Middle Name</label>
              <input className="w-full border rounded px-3 py-2" value={emergencyMiddleName} onChange={e => setEmergencyMiddleName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name<span className="text-red-500">*</span></label>
              <input className="w-full border rounded px-3 py-2" value={emergencyLastName} onChange={e => setEmergencyLastName(e.target.value)} />
            </div>
            <div>
              <EmpTypography.label>
                Mobile No <span className="text-red-500">*</span>
              </EmpTypography.label>
              <div className="flex">
                <select
                  value={emergencyPhoneCode}
                  onChange={(e) => setEmergencyPhoneCode(e.target.value)}
                  className="border rounded-l px-2 py-2 bg-white"
                >
                  {COUNTRY_CODES.map((country) => (
                    <option key={country.value} value={country.code}>
                      {country.label} ({country.code})
                    </option>
                  ))}
                </select>

                <input
                  aria-label="phone"
                  value={emergencyPhone}
                  maxLength={10}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setEmergencyPhone(value);
                  }}
                  className="w-full border border-l-0 rounded-r px-3 py-2"
                  placeholder="Enter Mobile Number"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email ID<span className="text-red-500">*</span></label>
              <input className="w-full border rounded px-3 py-2" value={emergencyEmail} onChange={e => setEmergencyEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Relationship<span className="text-red-500">*</span></label>
              <select className="w-full border rounded px-3 py-2" value={emergencyRelationship} onChange={e => setEmergencyRelationship(e.target.value)}>
                <option value="">Select Relationship</option>
                <option>Direct Family member</option>
                <option>Relative</option>
                <option>Friend</option>
              </select>
            </div>
          </div>
        </div>
      </fieldset>
      {
        validationError && (
          <EmpTypography.small className="text-red-600 mb-2">{validationError}</EmpTypography.small>
        )
      }
      <div className="flex justify-end mt-4 gap-2">
        {(!onboardingSubmitted || canEdit) && (
          <EmpTypography.button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</EmpTypography.button>
        )}
        {(!onboardingSubmitted || canEdit) && (
          <EmpTypography.button variant="primary" onClick={() => {
            if (!onboardDocsRef.current?.validateForSubmit()) return;
            setShowConfirmModal(true);
          }}>Submit</EmpTypography.button>
        )}
        {onboardingSubmitted && !canEdit && !permissionGranted && (
          <EmpTypography.button variant="primary" onClick={handleModify}>Request Modify</EmpTypography.button>
        )}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs">
              <EmpTypography.h3 className="mb-2">Confirm Submission</EmpTypography.h3>
              <div className="mb-4 text-sm">Before submitting, please review. Any changes after submission will require admin permission.</div>
              <div className="flex gap-2 justify-end">
                <EmpTypography.button onClick={async () => {
                  setShowConfirmModal(false);
                  // Build body same as Save
                  const payload = {
                    firstName: firstName.trim(),
                    middleName: middleName.trim() || null,
                    lastName: lastName.trim(),
                    email: email.trim() || null,
                    phone: `${getCountryCode(phoneCountry)}${phone}`.trim() || null,
                    phoneCountry,
                    dob: dob || null,
                    presentAddress: presentAddress,
                    previousAddresses,
                    presentEmployer: presentEmployer.trim() || null,
                    whatsappPhone: isWhatsappSame
                      ? `${getCountryCode(phoneCountry)}${phone}`.trim() || null
                      : `${whatsappCode}${whatsappPhone}`.trim() || null,
                    isWhatsappSame,
                    maritalStatus,
                    nationality: nationality.trim() || null,
                    passportNumber: passportNumber.trim() || null,
                    passportExpiry: passportExpiry || null,
                    ssn: ssn.trim() || null,
                    sin: sin.trim() || null,
                    ni: ni.trim() || null,
                    tfn: tfn.trim() || null,
                    pan: pan.trim() || null,
                    aadhaar: aadhaar.trim() || null,
                    visaType: visaType || null,
                    visaExpiry: visaExpiry || null,
                    drivingLicense: drivingLicenseOption === 'N/A' ? 'N/A' : (drivingLicense.trim() || null),
                    dlState: drivingLicenseOption === 'N/A' ? null : (dlState.trim() || null),
                    dlExpiry: drivingLicenseOption === 'N/A' ? null : (dlExpiry || null),
                    emergencyFirstName: emergencyFirstName.trim() || null,
                    emergencyMiddleName: emergencyMiddleName.trim() || null,
                    emergencyLastName: emergencyLastName.trim() || null,
                    emergencyPhone: `${emergencyPhoneCode} ${emergencyPhone}`.trim() || null,
                    emergencyEmail: emergencyEmail.trim() || null,
                    emergencyRelationship: emergencyRelationship.trim() || null,
                    showKidsInfo,
                    passportFile,
                    passportFile2,
                    i9File,
                    w4File,
                    visaFile: nationality === 'INDIA' ? panFile : visaFile,
                    visaFile2: nationality === 'INDIA' ? aadhaarFile : null,
                    dlFile: drivingLicenseOption === 'N/A' ? null : dlFile,
                    marriageCertFile,
                  };
                  const spousePayload = maritalStatus === 'Married' ? {
                    ...spouse, phone: `${spousePhoneCode} ${spousePhone}`.trim(), isSpouseAddressSame,
                    address: spouseAddress, nationality: spouseNationality,
                    passportNumber: spousePassportNumber, passportExpiry: spousePassportExpiry,
                    occupation: spouseOccupation, ssn: spouseSsn, sin: spouseSin, ni: spouseNi, tfn: spouseTfn, pan: spousePan, aadhaar: spouseAadhaar,
                    visaType: spouseVisaType,
                    visaExpiry: spouseVisaExpiry,
                    drivingLicense: spouseDrivingLicenseOption === 'NA' ? 'N/A' : spouseDrivingLicense,
                    dlState: spouseDrivingLicenseOption === 'NA' ? null : spouseDlState,
                    dlExpiry: spouseDrivingLicenseOption === 'NA' ? null : spouseDlExpiry,
                    passportFile: spousePassportFile,
                    passportFile2: spousePassportFile2,
                    i9File: spouseI9File,
                    w4File: spouseW4File,
                    visaFile: spouseNationality === 'INDIA' ? spousePanFile : spouseVisaFile,
                    visaFile2: spouseNationality === 'INDIA' ? spouseAadhaarFile : null,
                    dlFile: spouseDrivingLicenseOption === 'NA' ? null : spouseDlFile,
                  } : null;
                  const kidsPayload = Array.isArray(kidsList)
                    ? kidsList
                      .filter(k => (k.firstName || k.lastName || k.dob))
                      .map(kid => ({
                        ...kid,
                        docFile: kid.nationality === 'INDIA' ? kid.panFile : kid.visaFile,
                        docFile2: kid.nationality === 'INDIA' ? kid.aadhaarFile : null,
                      }))
                    : [];
                  const docsPayload = Array.isArray(documents) ? documents : [];
                  const invalidPersonalField =
                    personalValidationError({ ssn, passportNumber }, 'Employee') ||
                    (spousePayload ? personalValidationError({ ssn: spouseSsn, passportNumber: spousePassportNumber }, 'Spouse') : '') ||
                    kidsPayload.map((kid, index) => personalValidationError({ ssn: kid.ssn, passportNumber: kid.passportNumber }, `Kid ${index + 1}`)).find(Boolean);
                  if (invalidPersonalField) {
                    setValidationError(invalidPersonalField);
                    setShowConfirmModal(false);
                    return;
                  }
                  setValidationError("");
                  const employeeId = targetEmployeeId || user?.employeeId || user?.id;
                  try {
                    if (!employeeId) throw new Error('Missing employeeId in session');
                    const body = { tab: 'personal', payload, spouse: spousePayload, kids: kidsPayload, documents: docsPayload };
                    // Save to draft first (merges with other tabs' data)
                    await saveOnboardingFull(employeeId, body, true);
                    await onboardDocsRef.current?.saveDraft();
                    await syncFileDocs();
                    await submitOnboarding(employeeId, 'personal', { includeOnboardDocs: true });
                    // Update local UI state
                    handleSubmit();
                    alert('Submitted successfully');
                  } catch (err) {
                    console.error('Submit failed', err?.response?.data || err.message || err);
                    const errs = err?.response?.data?.errors;
                    alert('Submit failed:\n' + (Array.isArray(errs) ? errs.map(e => e.msg).join('\n') : (err?.response?.data?.error || err.message || 'unknown')));
                  }
                }}>Confirm</EmpTypography.button>
                <EmpTypography.button onClick={() => setShowConfirmModal(false)}>Cancel</EmpTypography.button>
              </div>
            </div>
          </div>
        )}

        {/* Permission Modal */}
        {/* Reason Modal for Modify */}
        {showReasonModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs">
              <EmpTypography.h3 className="mb-2">Request Admin Permission</EmpTypography.h3>
              <div className="mb-2 text-sm">What do you want to modify?</div>
              <textarea
                className="border rounded w-full p-2 mb-2"
                rows={3}
                value={modifyReason}
                onChange={e => setModifyReason(e.target.value)}
                placeholder="Describe your reason..."
              />
              {reasonError && <EmpTypography.small className="text-red-600 mb-2">{reasonError}</EmpTypography.small>}
              <div className="flex gap-2 justify-end">
                <EmpTypography.button onClick={handleRequestPermission}>Request</EmpTypography.button>
                <EmpTypography.button onClick={handleCloseReasonModal}>Cancel</EmpTypography.button>
              </div>
            </div>
          </div>
        )}
        {showPermissionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs">
              <EmpTypography.h3 className="mb-2">Request Admin Permission</EmpTypography.h3>
              {!permissionRequested && !permissionGranted && (
                <div className="mb-4 text-sm">Do you want to request permission from admin to modify this page?</div>
              )}
              {permissionRequested && !permissionGranted && (
                <div className="mb-4 text-sm text-blue-600">Requesting permission from admin...</div>
              )}
              {permissionGranted && (
                <div className="mb-4 text-sm text-green-600">Permission granted! You can now edit and save this page.</div>
              )}
              <div className="flex gap-2 justify-end">
                {!permissionRequested && !permissionGranted && (
                  <EmpTypography.button onClick={requestPermission}>Request</EmpTypography.button>
                )}
                <EmpTypography.button onClick={closePermissionModal}>Close</EmpTypography.button>
              </div>
            </div>
          </div>
        )}
      </div>
      {saveError && <div className="text-red-600 mt-2">{saveError}</div>}
    </div >
  );
}
