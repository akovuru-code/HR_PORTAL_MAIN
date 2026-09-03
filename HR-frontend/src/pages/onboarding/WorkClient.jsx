import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
// import { useLocation } from "react-router-dom";
import EmpTypography from "../../components/emp/EmpTypography";
import FileUploadField from "../../components/emp/FileUploadField";
import DocumentUploader from "../../components/emp/DocumentUploader";
import { useAuth } from "../../hooks/useAuth";
import { useAdminView } from "../../contexts/AdminViewContext";
import { useOnboardingPermissions } from "../../hooks/useOnboardingPermissions";
import { saveOnboardingFull, getDraft, getOnboarding } from "../../api/onboarding";
EmpTypography._log && EmpTypography._log();
//import EmpTypography from "../../components/emp/EmpTypography";


const initialClient = {
  name: "",
  address: "",
  startDate: "",
  endDate: "",
  workEmail: "",
  managerEmail: "",
  managerPhone: "",
  managerPhoneCountryCode: "+1",
  remoteWorkLocation: "",
  docs: [], // [{type, files}]
  docFile: null,
};
const initialVendor = {
  name: "",
  startDate: "",
  endDate: "",
  address: "",
  parentName: "",
  email: "",
  finc: "",
  phone: "",
  phoneCountryCode: "+1",
  docs: [], // [{type, files}]
  docFile: null,
};
const initialPrime = {
  name: "",
  startDate: "",
  endDate: "",
  address: "",
  email: "",
  phone: "",
  phoneCountryCode: "+1",
  docs: [], // [{type, files}]
  docFile: null,
};

const MAX_DATE = "9999-12-31";

const toDateInputValue = (value) => {
  if (!value) return "";

  const isoDate = String(value).match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return isoDate || "";
};

const WorkClient = forwardRef(function WorkClient({
  goBack,
  parentClient,
  parentVendor,
  parentPrime,
  parentPrimeVendor,
  employerType = "standalone",
  employerIndex = -1,
  draftTab,
  detailType,
  useParentDataOnly = false
}, ref) {

  // Normalize the selected detail type
  const normalizedDetailType = String(detailType || "")
    .trim()
    .toLowerCase();
  const isStandalone = employerType === "standalone" && !detailType;

  // Compute isolated draft tab per employer
  const effectiveDraftTab = draftTab && draftTab !== "workClient"
    ? draftTab
    : (employerType && employerType !== "standalone"
      ? `workClient-${employerType}-${employerIndex}`
      : "workClient");

  const effectiveParentPrime = parentPrime || parentPrimeVendor;

  // State for radio buttons and conditional fields
  const [clientVendorRadio, setClientVendorRadio] = useState("No");
  const [clientPrimeRadio, setClientPrimeRadio] = useState("No");
  const [clientVendorName, setClientVendorName] = useState("");
  const [clientPrimeVendorName, setClientPrimeVendorName] = useState("");
  // Vendor and Prime radio states per entry
  const [vendorRadios, setVendorRadios] = useState(["Client"]);
  const [vendorClientNames, setVendorClientNames] = useState([""]);
  const [vendorPrimeNames, setVendorPrimeNames] = useState([""]);
  const [primeRadios, setPrimeRadios] = useState(["Client"]);
  const [primeClientNames, setPrimeClientNames] = useState([""]);
  const [primeVendorNames, setPrimeVendorNames] = useState([""]);
  // Build the draft payload
  const buildPayload = () => ({
    tab: effectiveDraftTab, payload: {
      clientInfo, vendorInfo, primeInfo,
      clientVendorRadio, clientPrimeRadio, clientVendorName, clientPrimeVendorName,
      vendorRadios, vendorClientNames, vendorPrimeNames,
      primeClientNames, primeVendorNames,
      employerType, employerIndex,
    }, spouse: null, kids: [], documents: []
  });

  const persistDraft = async () => {
    const employeeId = targetEmployeeId || user?.employeeId || user?.id;
    if (!employeeId) {
      throw new Error("Missing employeeId in session");
    }

    await saveOnboardingFull(employeeId, buildPayload(), true);
  };

  // Expose methods to parent (ProfileWork) via ref
  useImperativeHandle(ref, () => ({
    buildPayload,
    saveDraft: persistDraft,
  }));

  // Auto-save when clicking Back
  const handleBack = async () => {
    try {
      await persistDraft();
      if (typeof goBack === 'function') goBack();
    } catch (err) {
      console.error('[WorkClient] handleBack save error:', err?.response?.data || err.message);
      alert(`Unable to save details: ${err?.response?.data?.error || err.message || "unknown error"}`);
    }
  };

  const { user } = useAuth();
  const { targetEmployeeId } = useAdminView() || {};
  const { canEdit, onboardingSubmitted } = useOnboardingPermissions('canEdit_profilework', 'profileWork');
  const isReadOnly = onboardingSubmitted && !canEdit;

  useEffect(() => {
    async function loadData() {
      const employeeId = targetEmployeeId || user?.employeeId || user?.id;
      if (!employeeId) return;
      let loaded = false;
      // Load submitted data from server (may 404 for new users)
      try {
        const onboardingRes = await getOnboarding(employeeId);
        const allServerClients = onboardingRes?.data?.workClientDetails;
        const serverClients = allServerClients?.filter((detail) => {
          const savedEmployerType = detail.meta?.employerType;
          const savedEmployerIndex = detail.meta?.employerIndex;

          if (employerType === "standalone") {
            // Rows created before employer metadata was introduced belong to
            // the legacy standalone section. Employer-scoped rows must never
            // leak into the standalone View Details form.
            return !savedEmployerType || savedEmployerType === "standalone";
          }

          return savedEmployerType === employerType &&
            Number(savedEmployerIndex) === Number(employerIndex);
        });
        if (serverClients && serverClients.length > 0) {
          const clients = serverClients.filter(c => c.type === 'client').map(c => ({
            ...initialClient,
            name: c.name || '',
            address: c.address || '',
            startDate: c.start_date || '',
            endDate: c.end_date || '',
            workEmail: c.work_email || '',
            managerEmail: c.manager_email || '',
            managerPhone: c.manager_phone || '',
            managerPhoneCountryCode: c.country_code || c.meta?.managerPhoneCountryCode || c.meta?.countryCode || '+1',
            remoteWorkLocation: c.remote_work_location || '',
            docFile: c.doc_file || null,
          }));
          const vendors = serverClients.filter(c => c.type === 'vendor').map(v => ({
            ...initialVendor,
            name: v.name || '',
            address: v.address || '',
            startDate: v.start_date || '',
            endDate: v.end_date || '',
            parentName: v.contact_person || '',
            email: v.email || '',
            phone: v.phone || '',
            phoneCountryCode: v.country_code || v.meta?.phoneCountryCode || v.meta?.countryCode || '+1',
            finc: v.fein || '',
            docFile: v.doc_file || null,
          }));
          const primes = serverClients.filter(c => c.type === 'primeVendor').map(p => ({
            ...initialPrime,
            name: p.name || '',
            address: p.address || '',
            startDate: p.start_date || '',
            endDate: p.end_date || '',
            email: p.email || '',
            phone: p.phone || '',
            phoneCountryCode: p.country_code || p.meta?.phoneCountryCode || p.meta?.countryCode || '+1',
            docFile: p.doc_file || null,
          }));
          if (clients.length > 0) { setClientInfo(clients); loaded = true; }
          if (vendors.length > 0) { setVendorInfo(vendors); loaded = true; }
          if (primes.length > 0) { setPrimeInfo(primes); loaded = true; }
          // Restore radio/conditional states from server
          const radioRecord = serverClients.find(c => c.type === 'radioStates');
          if (radioRecord?.name) {
            try {
              const rs = JSON.parse(radioRecord.name);
              if (rs.clientVendorRadio) setClientVendorRadio(rs.clientVendorRadio);
              if (rs.clientPrimeRadio) setClientPrimeRadio(rs.clientPrimeRadio);
              if (rs.clientVendorName) setClientVendorName(rs.clientVendorName);
              if (rs.clientPrimeVendorName) setClientPrimeVendorName(rs.clientPrimeVendorName);
              if (rs.vendorRadios) setVendorRadios(rs.vendorRadios);
              if (rs.vendorClientNames) setVendorClientNames(rs.vendorClientNames);
              if (rs.vendorPrimeNames) setVendorPrimeNames(rs.vendorPrimeNames);
              if (rs.primeClientNames) setPrimeClientNames(rs.primeClientNames);
              if (rs.primeVendorNames) setPrimeVendorNames(rs.primeVendorNames);
            } catch (e) { }
          }
        }
      } catch (err) { /* server data not available yet */ }
      // Overlay with draft (always try, even if server load failed)
      try {
        const draft = await getDraft(employeeId, effectiveDraftTab);
        if (draft?.data?.payload) {
          const payload = draft.data.payload;
          if (Array.isArray(payload.clientInfo) && payload.clientInfo.length > 0) {
            setClientInfo(payload.clientInfo.map(ci => ({
              ...initialClient,
              ...ci,
              managerPhoneCountryCode: ci.managerPhoneCountryCode || ci.countryCode || '+1',
            })));
            loaded = true;
          }
          if (Array.isArray(payload.vendorInfo) && payload.vendorInfo.length > 0) {
            setVendorInfo(payload.vendorInfo.map(vi => ({
              ...initialVendor,
              ...vi,
              phoneCountryCode: vi.phoneCountryCode || vi.countryCode || '+1',
            })));
            loaded = true;
          }
          if (Array.isArray(payload.primeInfo) && payload.primeInfo.length > 0) {
            setPrimeInfo(payload.primeInfo.map(pi => ({
              ...initialPrime,
              ...pi,
              phoneCountryCode: pi.phoneCountryCode || pi.countryCode || '+1',
            })));
            loaded = true;
          }
          // Restore radio/conditional states
          if (payload.clientVendorRadio) setClientVendorRadio(payload.clientVendorRadio);
          if (payload.clientPrimeRadio) setClientPrimeRadio(payload.clientPrimeRadio);
          if (payload.clientVendorName) setClientVendorName(payload.clientVendorName);
          if (payload.clientPrimeVendorName) setClientPrimeVendorName(payload.clientPrimeVendorName);
          if (payload.vendorRadios) setVendorRadios(payload.vendorRadios);
          if (payload.vendorClientNames) setVendorClientNames(payload.vendorClientNames);
          if (payload.vendorPrimeNames) setVendorPrimeNames(payload.vendorPrimeNames);
          if (payload.primeClientNames) setPrimeClientNames(payload.primeClientNames);
          if (payload.primeVendorNames) setPrimeVendorNames(payload.primeVendorNames);
        }
      } catch (err) { /* draft not available */ }
      // Seed from parent ProfileWork summary data if nothing loaded from server/draft
      if (!loaded && (parentClient || parentVendor || effectiveParentPrime)) {
        if (parentClient?.name) {
          setClientInfo([{
            ...initialClient,
            name: parentClient.name,
            startDate: parentClient.startDate || '',
            endDate: parentClient.endDate || '',
          }]);
        }
        if (parentVendor?.name) {
          setVendorInfo([{
            ...initialVendor,
            name: parentVendor.name,
            startDate: parentVendor.startDate || '',
            endDate: parentVendor.endDate || '',
          }]);
        }
        if (effectiveParentPrime?.name) {
          setPrimeInfo([{
            ...initialPrime,
            name: effectiveParentPrime.name,
            startDate: effectiveParentPrime.startDate || '',
            endDate: effectiveParentPrime.endDate || '',
          }]);
        }
      } else if (loaded && (parentClient || parentVendor || effectiveParentPrime)) {
        // If loaded, update only first item's name/dates if parent had updates, preserving all detailed inputs and uploaded documents
        if (parentClient?.name) {
          setClientInfo(prev => prev.map((ci, i) => i === 0 ? {
            ...ci,
            name: parentClient.name || ci.name,
            startDate: parentClient.startDate || ci.startDate,
            endDate: parentClient.endDate || ci.endDate,
          } : ci));
        }
        if (parentVendor?.name) {
          setVendorInfo(prev => prev.map((vi, i) => i === 0 ? {
            ...vi,
            name: parentVendor.name || vi.name,
            startDate: parentVendor.startDate || vi.startDate,
            endDate: parentVendor.endDate || vi.endDate,
          } : vi));
        }
        if (effectiveParentPrime?.name) {
          setPrimeInfo(prev => prev.map((pi, i) => i === 0 ? {
            ...pi,
            name: effectiveParentPrime.name || pi.name,
            startDate: effectiveParentPrime.startDate || pi.startDate,
            endDate: effectiveParentPrime.endDate || pi.endDate,
          } : pi));
        }
      }
    }
    loadData();
  }, [
    user,
    targetEmployeeId,
    effectiveDraftTab,
    parentClient,
    parentVendor,
    effectiveParentPrime,
    detailType,
    employerType,
    employerIndex,
    useParentDataOnly
  ]);

  // const location = useLocation();
  //const [currentStatus, setCurrentStatus] = useState("");
  const [clientInfo, setClientInfo] = useState([{ ...initialClient }]);
  const [vendorInfo, setVendorInfo] = useState([{ ...initialVendor }]);
  const [primeInfo, setPrimeInfo] = useState([{ ...initialPrime }]);

  // Add handlers
  const handleAdd = (type) => {
    if (isReadOnly) return;
    if (type === "client") setClientInfo((prev) => [...prev, { ...initialClient }]);
    if (type === "vendor") setVendorInfo((prev) => [...prev, { ...initialVendor }]);
    if (type === "prime") setPrimeInfo((prev) => [...prev, { ...initialPrime }]);
  };
  const handleFileUpload = (type, idx, file) => {
    if (isReadOnly || !file) return;
    if (type === "client") setClientInfo((prev) => prev.map((c, i) => i === idx ? { ...c, docs: [...(c.docs || []), file.name] } : c));
    if (type === "vendor") setVendorInfo((prev) => prev.map((v, i) => i === idx ? { ...v, docs: [...(v.docs || []), file.name] } : v));
    if (type === "prime") setPrimeInfo((prev) => prev.map((p, i) => i === idx ? { ...p, docs: [...(p.docs || []), file.name] } : p));
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6 font-employee">

      {/* Current Status 
      <div className="flex items-center gap-2 mb-6">
        <EmpTypography.label>Current Status :</EmpTypography.label>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1"><input type="radio" name="currentStatus" value="Yes" checked={currentStatus === "Yes"} onChange={() => setCurrentStatus("Yes")} /> Yes</label>
          <label className="flex items-center gap-1"><input type="radio" name="currentStatus" value="No" checked={currentStatus === "No"} onChange={() => setCurrentStatus("No")} /> No</label>
        </div>
      </div>*/}

      {/* Client Information */}
      {(isStandalone || normalizedDetailType === "client") && (
        <div className="mb-6 border-b pb-6">
          <EmpTypography.label className="mb-2">Client Information:</EmpTypography.label>
          {clientInfo.map((c, idx) => (
            <div key={idx} className={`mb-4 pb-4 ${idx !== clientInfo.length - 1 ? 'border-b' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <input type="text" placeholder="Client Name" value={c.name} onChange={e => setClientInfo(info => info.map((ci, i) => i === idx ? { ...ci, name: e.target.value } : ci))} className="border rounded px-3 py-2 text-sm w-full max-w-md" disabled={isReadOnly} />
                <input type="text" placeholder="Client Location Address" value={c.address} onChange={e => setClientInfo(info => info.map((ci, i) => i === idx ? { ...ci, address: e.target.value } : ci))} className="border rounded px-3 py-2 text-sm w-full max-w-md" disabled={isReadOnly} />
                <input type="date" max={MAX_DATE} placeholder="Start Date" value={toDateInputValue(c.startDate)} onChange={e => setClientInfo(info => info.map((ci, i) => i === idx ? { ...ci, startDate: e.target.value } : ci))} className="border rounded px-3 py-2 text-sm w-full max-w-md" disabled={isReadOnly} />
                <input type="date" max={MAX_DATE} placeholder="End Date" value={toDateInputValue(c.endDate)} onChange={e => setClientInfo(info => info.map((ci, i) => i === idx ? { ...ci, endDate: e.target.value } : ci))} className="border rounded px-3 py-2 text-sm w-full max-w-md" disabled={isReadOnly} />
                <input type="email" placeholder="Work Email" value={c.workEmail} onChange={e => setClientInfo(info => info.map((ci, i) => i === idx ? { ...ci, workEmail: e.target.value } : ci))} className="border rounded px-3 py-2 text-sm w-full max-w-md" disabled={isReadOnly} />
                <input type="email" placeholder="Client Manager Email" value={c.managerEmail} onChange={e => setClientInfo(info => info.map((ci, i) => i === idx ? { ...ci, managerEmail: e.target.value } : ci))} className="border rounded px-3 py-2 text-sm w-full max-w-md" disabled={isReadOnly} />

                {/* Manager Phone with Country Code */}
                <div className="flex gap-2 w-full max-w-md">
                  <select
                    value={c.managerPhoneCountryCode || "+1"}
                    onChange={e => setClientInfo(info => info.map((ci, i) => i === idx ? { ...ci, managerPhoneCountryCode: e.target.value } : ci))}
                    className="border rounded px-2 py-2 text-sm bg-white shrink-0"
                    disabled={isReadOnly}
                  >
                    <option value="+91">🇮🇳 India (+91)</option>
                    <option value="+1">🇺🇸 USA (+1)</option>
                    <option value="+1-CA">🇨🇦 Canada (+1)</option>
                    <option value="+44">🇬🇧 UK (+44)</option>
                    <option value="+61">🇦🇺 Australia (+61)</option>
                  </select>
                  <input
                    type="tel"
                    placeholder="Client Manager Phone"
                    value={c.managerPhone || ""}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setClientInfo(info => info.map((ci, i) => i === idx ? { ...ci, managerPhone: val } : ci));
                    }}
                    maxLength={10}
                    className="border rounded px-3 py-2 text-sm flex-1 min-w-0"
                    disabled={isReadOnly}
                  />
                </div>

                <input type="text" placeholder="Remote Work Location" value={c.remoteWorkLocation} onChange={e => setClientInfo(info => info.map((ci, i) => i === idx ? { ...ci, remoteWorkLocation: e.target.value } : ci))} className="border rounded px-3 py-2 text-sm w-full max-w-md" disabled={isReadOnly} />
              </div>
              {/* Cilent Radio Group */}
              <div className="flex flex-col md:flex-row gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <EmpTypography.label>Vendor: </EmpTypography.label>
                  <label className="flex items-center gap-1"><input type="radio" name={`clientVendorRadio${idx}`} value="Yes" checked={clientVendorRadio === "Yes"} onChange={() => setClientVendorRadio("Yes")} disabled={isReadOnly} /> Yes</label>
                  <label className="flex items-center gap-1"><input type="radio" name={`clientVendorRadio${idx}`} value="No" checked={clientVendorRadio === "No"} onChange={() => setClientVendorRadio("No")} disabled={isReadOnly} /> No</label>
                </div>
                <div className="flex items-center gap-2">
                  <EmpTypography.label>Prime Vendor: </EmpTypography.label>
                  <label className="flex items-center gap-1"><input type="radio" name={`clientPrimeRadio${idx}`} value="Yes" checked={clientPrimeRadio === "Yes"} onChange={() => setClientPrimeRadio("Yes")} disabled={isReadOnly} /> Yes</label>
                  <label className="flex items-center gap-1"><input type="radio" name={`clientPrimeRadio${idx}`} value="No" checked={clientPrimeRadio === "No"} onChange={() => setClientPrimeRadio("No")} disabled={isReadOnly} /> No</label>
                </div>
              </div>
              {(clientVendorRadio === "Yes") && (
                <div className="mb-2">
                  <EmpTypography.label>Vendor Name:</EmpTypography.label>
                  <input type="text" className="border rounded px-3 py-2 text-sm w-full max-w-md" value={clientVendorName} onChange={e => setClientVendorName(e.target.value)} placeholder="Enter Vendor Name" disabled={isReadOnly} />
                </div>
              )}
              {(clientPrimeRadio === "Yes") && (
                <div className="mb-2">
                  <EmpTypography.label>Prime Vendor Name:</EmpTypography.label>
                  <input type="text" className="border rounded px-3 py-2 text-sm w-full max-w-md" value={clientPrimeVendorName} onChange={e => setClientPrimeVendorName(e.target.value)} placeholder="Enter Prime Vendor Name" disabled={isReadOnly} />
                </div>
              )}
              <div className="flex items-center justify-between mb-2 gap-4">
                <div className="flex flex-col flex-1">
                  <FileUploadField
                    label="Document Upload:"
                    value={c.docFile}
                    onChange={file => setClientInfo(info => info.map((ci, i) => i === idx ? { ...ci, docFile: file } : ci))}
                    employeeId={targetEmployeeId || user?.employeeId || user?.id}
                    category={`work_${employerType}_${employerIndex}_client_${idx}_doc`}
                    documentName={`${employerType === 'present' ? 'Present' : 'Previous'} Employer ${Number(employerIndex) + 1} Client ${idx + 1} Document`}
                    disabled={isReadOnly}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <EmpTypography.button variant="primary" onClick={() => handleAdd("client")} disabled={isReadOnly}>+ Add</EmpTypography.button>
                  {clientInfo.length > 1 && (
                    <button type="button" className="text-red-600 px-2 py-1 rounded hover:bg-red-100 disabled:opacity-50" onClick={() =>
                      setClientInfo(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)}
                      disabled={isReadOnly}
                    >🗑️</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vendor Information */}
      {(isStandalone || normalizedDetailType === "vendor") && (
        <div className="mb-6 border-b pb-6">
          <EmpTypography.label className="mb-2">Vendor Information:</EmpTypography.label>
          {vendorInfo.map((v, idx) => (
            <div key={idx} className={`mb-4 pb-4 ${idx !== vendorInfo.length - 1 ? 'border-b' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <input type="text" placeholder="Vendor Name" value={v.name} onChange={e => setVendorInfo(info => info.map((vi, i) => i === idx ? { ...vi, name: e.target.value } : vi))} className="border rounded px-3 py-2 text-sm w-full max-w-md" disabled={isReadOnly} />
                <input type="text" placeholder="Vendor Person Name" value={v.parentName} onChange={e => setVendorInfo(info => info.map((vi, i) => i === idx ? { ...vi, parentName: e.target.value } : vi))} className="border rounded px-3 py-2 text-sm w-full max-w-md" disabled={isReadOnly} />
                <input type="date" max={MAX_DATE} placeholder="Start Date" value={toDateInputValue(v.startDate)} onChange={e => setVendorInfo(info => info.map((vi, i) => i === idx ? { ...vi, startDate: e.target.value } : vi))} className="border rounded px-3 py-2 text-sm w-full max-w-md" disabled={isReadOnly} />
                <input type="date" max={MAX_DATE} placeholder="End Date" value={toDateInputValue(v.endDate)} onChange={e => setVendorInfo(info => info.map((vi, i) => i === idx ? { ...vi, endDate: e.target.value } : vi))} className="border rounded px-3 py-2 text-sm w-full max-w-md" disabled={isReadOnly} />
                <input type="text" placeholder="Vendor Address" value={v.address} onChange={e => setVendorInfo(info => info.map((vi, i) => i === idx ? { ...vi, address: e.target.value } : vi))} className="border rounded px-3 py-2 text-sm w-full max-w-md" disabled={isReadOnly} />
                <input type="email" placeholder="Vendor Email" value={v.email} onChange={e => setVendorInfo(info => info.map((vi, i) => i === idx ? { ...vi, email: e.target.value } : vi))} className="border rounded px-3 py-2 text-sm w-full max-w-md" disabled={isReadOnly} />

                {/* Vendor Phone with Country Code */}
                <div className="flex gap-2 w-full max-w-md">
                  <select
                    value={v.phoneCountryCode || "+1"}
                    onChange={e => setVendorInfo(info => info.map((vi, i) => i === idx ? { ...vi, phoneCountryCode: e.target.value } : vi))}
                    className="border rounded px-2 py-2 text-sm bg-white shrink-0"
                    disabled={isReadOnly}
                  >
                    <option value="+91">🇮🇳 India (+91)</option>
                    <option value="+1">🇺🇸 USA (+1)</option>
                    <option value="+1-CA">🇨🇦 Canada (+1)</option>
                    <option value="+44">🇬🇧 UK (+44)</option>
                    <option value="+61">🇦🇺 Australia (+61)</option>
                  </select>
                  <input
                    type="tel"
                    placeholder="Vendor Phone"
                    value={v.phone || ""}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setVendorInfo(info => info.map((vi, i) => i === idx ? { ...vi, phone: val } : vi));
                    }}
                    maxLength={10}
                    className="border rounded px-3 py-2 text-sm flex-1 min-w-0"
                    disabled={isReadOnly}
                  />
                </div>

                <input type="text" placeholder="FEIN Vendor" value={v.finc} onChange={e => setVendorInfo(info => info.map((vi, i) => i === idx ? { ...vi, finc: e.target.value } : vi))} className="border rounded px-3 py-2 text-sm w-full max-w-md" disabled={isReadOnly} />
              </div>
              {/* Vendor Yes/No Radio Group */}
              <div className="flex flex-col md:flex-row gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <EmpTypography.label>Client:</EmpTypography.label>
                  <label className="flex items-center gap-1"><input type="radio" name={`vendorRadio${idx}`} value="Yes" checked={vendorRadios[idx] === "Yes"} onChange={() => setVendorRadios(radios => radios.map((r, i) => i === idx ? "Yes" : r))} disabled={isReadOnly} /> Yes</label>
                  <label className="flex items-center gap-1"><input type="radio" name={`vendorRadio${idx}`} value="No" checked={vendorRadios[idx] === "No"} onChange={() => setVendorRadios(radios => radios.map((r, i) => i === idx ? "No" : r))} disabled={isReadOnly} /> No</label>
                </div>
                <div className="flex items-center gap-2">
                  <EmpTypography.label>Prime Vendor:</EmpTypography.label>
                  <label className="flex items-center gap-1"><input type="radio" name={`vendorPrimeRadio${idx}`} value="Yes" checked={vendorPrimeNames[idx] === "Yes"} onChange={() => setVendorPrimeNames(names => names.map((n, i) => i === idx ? "Yes" : n))} disabled={isReadOnly} /> Yes</label>
                  <label className="flex items-center gap-1"><input type="radio" name={`vendorPrimeRadio${idx}`} value="No" checked={vendorPrimeNames[idx] === "No"} onChange={() => setVendorPrimeNames(names => names.map((n, i) => i === idx ? "No" : n))} disabled={isReadOnly} /> No</label>
                </div>
              </div>
              {(vendorRadios[idx] === "Yes") && (
                <div className="mb-2">
                  <EmpTypography.label>Client Name:</EmpTypography.label>
                  <input type="text" className="border rounded px-3 py-2 text-sm w-full max-w-md" value={v.name} onChange={e => setVendorInfo(info => info.map((vi, i) => i === idx ? { ...vi, name: e.target.value } : vi))} placeholder="Enter Client Name" disabled={isReadOnly} />
                </div>
              )}
              {(vendorPrimeNames[idx] === "Yes") && (
                <div className="mb-2">
                  <EmpTypography.label>Prime Vendor Name:</EmpTypography.label>
                  <input type="text" className="border rounded px-3 py-2 text-sm w-full max-w-md" value={v.parentName} onChange={e => setVendorInfo(info => info.map((vi, i) => i === idx ? { ...vi, parentName: e.target.value } : vi))} placeholder="Enter Prime Vendor Name" disabled={isReadOnly} />
                </div>
              )}

              <div className="flex items-center justify-between mb-2 gap-4">
                <div className="flex flex-col flex-1">
                  <FileUploadField
                    label="Document Upload:"
                    value={v.docFile}
                    onChange={file => setVendorInfo(info => info.map((vi, i) => i === idx ? { ...vi, docFile: file } : vi))}
                    employeeId={targetEmployeeId || user?.employeeId || user?.id}
                    category={`work_${employerType}_${employerIndex}_vendor_${idx}_doc`}
                    documentName={`${employerType === 'present' ? 'Present' : 'Previous'} Employer ${Number(employerIndex) + 1} Vendor ${idx + 1} Document`}
                    disabled={isReadOnly}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <EmpTypography.button variant="primary" onClick={() => handleAdd("vendor")} disabled={isReadOnly}>+ Add</EmpTypography.button>
                  {vendorInfo.length > 1 && (
                    <button type="button" className="text-red-600 px-2 py-1 rounded hover:bg-red-100 disabled:opacity-50" onClick={() =>
                      setVendorInfo(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)}
                      disabled={isReadOnly}
                    >🗑️</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Prime Vendor Information */}
      {(isStandalone || normalizedDetailType === "primevendor") && (
        <div className="mb-6">
          <EmpTypography.label className="mb-2">Prime vendor Information:</EmpTypography.label>
          {primeInfo.map((p, idx) => (
            <div key={idx} className={`mb-4 pb-4 ${idx !== primeInfo.length - 1 ? 'border-b' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <input type="text" placeholder="Prime Vendor Name" value={p.name} onChange={e => setPrimeInfo(info => info.map((pi, i) => i === idx ? { ...pi, name: e.target.value } : pi))} className="border rounded px-3 py-2 text-sm w-full max-w-md" disabled={isReadOnly} />
                <input type="date" max={MAX_DATE} placeholder="Start Date" value={toDateInputValue(p.startDate)} onChange={e => setPrimeInfo(info => info.map((pi, i) => i === idx ? { ...pi, startDate: e.target.value } : pi))} className="border rounded px-3 py-2 text-sm w-full max-w-md" disabled={isReadOnly} />
                <input type="date" max={MAX_DATE} placeholder="End Date" value={toDateInputValue(p.endDate)} onChange={e => setPrimeInfo(info => info.map((pi, i) => i === idx ? { ...pi, endDate: e.target.value } : pi))} className="border rounded px-3 py-2 text-sm w-full max-w-md" disabled={isReadOnly} />
                <input type="text" placeholder="Prime Vendor Address" value={p.address} onChange={e => setPrimeInfo(info => info.map((pi, i) => i === idx ? { ...pi, address: e.target.value } : pi))} className="border rounded px-3 py-2 text-sm w-full max-w-md" disabled={isReadOnly} />
                <input type="email" placeholder="Prime Vendor Email" value={p.email} onChange={e => setPrimeInfo(info => info.map((pi, i) => i === idx ? { ...pi, email: e.target.value } : pi))} className="border rounded px-3 py-2 text-sm w-full max-w-md" disabled={isReadOnly} />

                {/* Prime Vendor Phone with Country Code */}
                <div className="flex gap-2 w-full max-w-md">
                  <select
                    value={p.phoneCountryCode || "+1"}
                    onChange={e => setPrimeInfo(info => info.map((pi, i) => i === idx ? { ...pi, phoneCountryCode: e.target.value } : pi))}
                    className="border rounded px-2 py-2 text-sm bg-white shrink-0"
                    disabled={isReadOnly}
                  >
                    <option value="+91">🇮🇳 India (+91)</option>
                    <option value="+1">🇺🇸 USA (+1)</option>
                    <option value="+1-CA">🇨🇦 Canada (+1)</option>
                    <option value="+44">🇬🇧 UK (+44)</option>
                    <option value="+61">🇦🇺 Australia (+61)</option>
                  </select>
                  <input
                    type="tel"
                    placeholder="Prime Vendor Phone"
                    value={p.phone || ""}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setPrimeInfo(info => info.map((pi, i) => i === idx ? { ...pi, phone: val } : pi));
                    }}
                    maxLength={10}
                    className="border rounded px-3 py-2 text-sm flex-1 min-w-0"
                    disabled={isReadOnly}
                  />
                </div>
              </div>
              {/* Prime Vendor Client/Vendor Yes/No Radio Group */}
              <div className="flex flex-col md:flex-row gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <EmpTypography.label>Client:</EmpTypography.label>
                  <label className="flex items-center gap-1"><input type="radio" name={`primeClientRadio${idx}`} value="Yes" checked={primeClientNames[idx] === "Yes"} onChange={() => setPrimeClientNames(names => names.map((n, i) => i === idx ? "Yes" : n))} disabled={isReadOnly} /> Yes</label>
                  <label className="flex items-center gap-1"><input type="radio" name={`primeClientRadio${idx}`} value="No" checked={primeClientNames[idx] === "No"} onChange={() => setPrimeClientNames(names => names.map((n, i) => i === idx ? "No" : n))} disabled={isReadOnly} /> No</label>
                </div>
                <div className="flex items-center gap-2">
                  <EmpTypography.label>Vendor:</EmpTypography.label>
                  <label className="flex items-center gap-1"><input type="radio" name={`primeVendorRadio${idx}`} value="Yes" checked={primeVendorNames[idx] === "Yes"} onChange={() => setPrimeVendorNames(names => names.map((n, i) => i === idx ? "Yes" : n))} disabled={isReadOnly} /> Yes</label>
                  <label className="flex items-center gap-1"><input type="radio" name={`primeVendorRadio${idx}`} value="No" checked={primeVendorNames[idx] === "No"} onChange={() => setPrimeVendorNames(names => names.map((n, i) => i === idx ? "No" : n))} disabled={isReadOnly} /> No</label>
                </div>
              </div>
              {(primeClientNames[idx] === "Yes") && (
                <div className="mb-2">
                  <EmpTypography.label>Client Name:</EmpTypography.label>
                  <input type="text" className="border rounded px-3 py-2 text-sm w-full max-w-md" value={p.name} onChange={e => setPrimeInfo(info => info.map((pi, i) => i === idx ? { ...pi, name: e.target.value } : pi))} placeholder="Enter Client Name" disabled={isReadOnly} />
                </div>
              )}
              {(primeVendorNames[idx] === "Yes") && (
                <div className="mb-2">
                  <EmpTypography.label>Vendor Name:</EmpTypography.label>
                  <input type="text" className="border rounded px-3 py-2 text-sm w-full max-w-md" value={p.name} onChange={e => setPrimeInfo(info => info.map((pi, i) => i === idx ? { ...pi, name: e.target.value } : pi))} placeholder="Enter Vendor Name" disabled={isReadOnly} />
                </div>
              )}
              <div className="flex items-center justify-between mb-2 gap-4">
                <div className="flex flex-col flex-1">
                  <FileUploadField
                    label="Document Upload:"
                    value={p.docFile}
                    onChange={file => setPrimeInfo(info => info.map((pi, i) => i === idx ? { ...pi, docFile: file } : pi))}
                    employeeId={targetEmployeeId || user?.employeeId || user?.id}
                    category={`work_${employerType}_${employerIndex}_prime_${idx}_doc`}
                    documentName={`${employerType === 'present' ? 'Present' : 'Previous'} Employer ${Number(employerIndex) + 1} Prime Vendor ${idx + 1} Document`}
                    disabled={isReadOnly}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <EmpTypography.button variant="primary" onClick={() => handleAdd("prime")} disabled={isReadOnly}>+ Add</EmpTypography.button>
                  {primeInfo.length > 1 && (
                    <button type="button" className="text-red-600 px-2 py-1 rounded hover:bg-red-100 disabled:opacity-50" onClick={() =>
                      setPrimeInfo(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)}
                      disabled={isReadOnly}
                    >🗑️</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Back Button */}
      <div className="flex justify-between items-end mt-8 gap-4 w-full">
        <div>
          <EmpTypography.button variant="primary" onClick={handleBack}>Back</EmpTypography.button>
        </div>
      </div>
    </div>
  );
});

export default WorkClient;
