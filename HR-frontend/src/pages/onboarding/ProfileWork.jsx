import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import EmpTypography from "../../components/emp/EmpTypography";
import FileUploadField from "../../components/emp/FileUploadField";
import { useOnboardingPermissions } from "../../hooks/useOnboardingPermissions";
import { useAuth } from "../../hooks/useAuth";
import { useAdminView } from "../../contexts/AdminViewContext";

import {
  saveOnboardingFull,
  submitOnboarding,
  getDraft,
  getOnboarding,
  registerDocument,
  saveOnboarding,
} from "../../api/onboarding";

import WorkClient from "./WorkClient";

EmpTypography._log && EmpTypography._log();

const initialEmployer = {
  name: "",
  startDate: "",
  endDate: "",
  designation: "",
  payslips: false,
  experienceLetter: false,
  h1b: false,
  i797: false,
  ead: false,
  opt: false,
  all20: false,
  docs: [],
  docFile: null,

  client: {
    name: "",
    startDate: "",
    endDate: "",
  },

  vendor: {
    name: "",
    startDate: "",
    endDate: "",
  },

  primeVendor: {
    name: "",
    startDate: "",
    endDate: "",
  },
};

const toDateInputValue = (value) => {
  if (!value) return "";

  return String(value).match(/^\d{4}-\d{2}-\d{2}/)?.[0] || "";
};

export default function ProfileWork() {
  const navigate = useNavigate();

  const [inProject, setInProject] = useState("");
  const [activeEmployerDetails, setActiveEmployerDetails] = useState(null);

  const workClientRef = useRef(null);

  // Modify reason modal
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [modifyReason, setModifyReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const [profileStatus, setProfileStatus] = useState("");

  // Submit modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [validationError, setValidationError] = useState("");
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();
  const { targetEmployeeId } = useAdminView() || {};

  const employeeId = targetEmployeeId || user?.employeeId || user?.id;

  const pageKey = "canEdit_profilework";

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
  } = useOnboardingPermissions(pageKey, "profileWork");

  const [presentEmployers, setPresentEmployers] = useState([
    { ...initialEmployer },
  ]);

  const [previousEmployers, setPreviousEmployers] = useState([
    { ...initialEmployer },
  ]);

  const [projectStatus, setProjectStatus] = useState("");

  // Standalone Client / Vendor / Prime Vendor
  const [client, setClient] = useState({
    name: "",
    startDate: "",
    endDate: "",
  });

  const [vendor, setVendor] = useState({
    name: "",
    startDate: "",
    endDate: "",
  });

  const [primeVendor, setPrimeVendor] = useState({
    name: "",
    startDate: "",
    endDate: "",
  });

  /*
   * ============================================================
   * MODIFY PERMISSION
   * ============================================================
   */

  const handleModify = () => {
    setShowReasonModal(true);
    setModifyReason("");
    setReasonError("");
  };

  const handleRequestPermission = async () => {
    if (!modifyReason.trim()) {
      setReasonError("Please enter a reason for modification.");
      return;
    }

    setReasonError("");

    try {
      await requestPermission(modifyReason);

      alert("Request submitted");

      setShowReasonModal(false);
      setModifyReason("");
    } catch (err) {
      console.error(err);

      alert(
        "Failed to submit request: " +
        (err?.response?.data?.error ||
          err?.message ||
          "unknown")
      );
    }
  };

  const handleCloseReasonModal = () => {
    setShowReasonModal(false);
    setModifyReason("");
    setReasonError("");
  };

  /*
   * ============================================================
   * DOCUMENT SYNC
   * ============================================================
   */

  const syncEmployerDocs = async () => {
    try {
      const api2 = (
        await import("axios")
      ).default.create({
        baseURL: "/api",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const allEmployers = [
        ...presentEmployers.map((e, i) => ({
          file: e.docFile,
          name: `Present Employer ${i + 1} Document`,
          type: `present_employer_${i}`,
        })),

        ...previousEmployers.map((e, i) => ({
          file: e.docFile,
          name: `Previous Employer ${i + 1} Document`,
          type: `previous_employer_${i}`,
        })),
      ];

      for (const { file, name, type } of allEmployers) {
        if (file?.url) {
          registerDocument({
            name,
            url: file.url,
            filename: file.filename,
            originalName: file.originalName,
            document_type: type,
            fileData: file,
          }).catch(() => { });
        } else {
          api2
            .delete(`/documents/type/${encodeURIComponent(type)}`)
            .catch(() => { });
        }
      }
    } catch (err) {
      console.error("Document sync failed:", err);
    }
  };

  /*
   * ============================================================
   * SAVE
   * ============================================================
   */

  const handleSave = async () => {
    if (
      !presentEmployers ||
      presentEmployers.length === 0 ||
      !presentEmployers[0].name
    ) {
      setValidationError(
        "At least one present employer name is required."
      );
      return;
    }

    setValidationError("");
    setSaving(true);

    try {
      if (!employeeId) {
        throw new Error("Missing employeeId in session");
      }

      const payload = {
        inProject,
        profileStatus,
        presentEmployers,
        previousEmployers,
        projectStatus,
        client,
        vendor,
        primeVendor,
      };

      const body = {
        tab: "profileWork",
        payload,
        spouse: null,
        kids: [],
        documents: [],
      };

      await saveOnboardingFull(employeeId, body, true);

      if (workClientRef.current?.saveDraft) {
        await workClientRef.current.saveDraft();
      }

      await syncEmployerDocs();

      alert("Draft saved");
    } catch (err) {
      console.error("Save failed:", err);

      alert(
        "Save failed: " +
        (err?.response?.data?.error ||
          err?.message ||
          "unknown")
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ============================================================
   * LOAD DATA
   * ============================================================
   */

  useEffect(() => {
    async function loadData() {
      if (!employeeId) return;

      // Load submitted/server data
      try {
        const onboardingRes = await getOnboarding(employeeId);

        const empData = onboardingRes?.data?.employee;

        if (empData) {
          const currentProfileStatus =
            empData.profileStatus || "On Bench";

          setProfileStatus(currentProfileStatus);

          if (currentProfileStatus === "In Project") {
            setInProject("Yes");
          } else {
            setInProject("No");
          }
        }

        const serverEmployers =
          onboardingRes?.data?.workEmployers;

        if (
          serverEmployers &&
          serverEmployers.length > 0
        ) {
          const present = serverEmployers
            .filter((e) => e.type === "present")
            .map((e) => ({
              ...initialEmployer,

              name: e.name || "",
              designation: e.designation || "",
              startDate: e.start_date || "",
              endDate: e.end_date || "",
              docFile: e.doc_file || null,

              client: {
                name: e.client?.name || "",
                startDate:
                  e.client?.start_date ||
                  e.client?.startDate ||
                  "",
                endDate:
                  e.client?.end_date ||
                  e.client?.endDate ||
                  "",
              },

              vendor: {
                name: e.vendor?.name || "",
                startDate:
                  e.vendor?.start_date ||
                  e.vendor?.startDate ||
                  "",
                endDate:
                  e.vendor?.end_date ||
                  e.vendor?.endDate ||
                  "",
              },

              primeVendor: {
                name: e.primeVendor?.name || "",
                startDate:
                  e.primeVendor?.start_date ||
                  e.primeVendor?.startDate ||
                  "",
                endDate:
                  e.primeVendor?.end_date ||
                  e.primeVendor?.endDate ||
                  "",
              },
            }));

          const previous = serverEmployers
            .filter((e) => e.type === "previous")
            .map((e) => ({
              ...initialEmployer,

              name: e.name || "",
              designation: e.designation || "",
              startDate: e.start_date || "",
              endDate: e.end_date || "",
              docFile: e.doc_file || null,

              client: {
                name: e.client?.name || "",
                startDate:
                  e.client?.start_date ||
                  e.client?.startDate ||
                  "",
                endDate:
                  e.client?.end_date ||
                  e.client?.endDate ||
                  "",
              },

              vendor: {
                name: e.vendor?.name || "",
                startDate:
                  e.vendor?.start_date ||
                  e.vendor?.startDate ||
                  "",
                endDate:
                  e.vendor?.end_date ||
                  e.vendor?.endDate ||
                  "",
              },

              primeVendor: {
                name: e.primeVendor?.name || "",
                startDate:
                  e.primeVendor?.start_date ||
                  e.primeVendor?.startDate ||
                  "",
                endDate:
                  e.primeVendor?.end_date ||
                  e.primeVendor?.endDate ||
                  "",
              },
            }));

          if (present.length > 0) {
            setPresentEmployers(present);
          }

          if (previous.length > 0) {
            setPreviousEmployers(previous);
          }
        }

        const serverClients =
          onboardingRes?.data?.workClientDetails;

        if (
          serverClients &&
          serverClients.length > 0
        ) {
          const c = serverClients.find(
            (x) => x.type === "client"
          );

          const v = serverClients.find(
            (x) => x.type === "vendor"
          );

          const p = serverClients.find(
            (x) => x.type === "primeVendor"
          );

          if (c) {
            setClient({
              name: c.name || "",
              startDate: c.start_date || "",
              endDate: c.end_date || "",
            });
          }

          if (v) {
            setVendor({
              name: v.name || "",
              startDate: v.start_date || "",
              endDate: v.end_date || "",
            });
          }

          if (p) {
            setPrimeVendor({
              name: p.name || "",
              startDate: p.start_date || "",
              endDate: p.end_date || "",
            });
          }
        }
      } catch (err) {
        console.log(
          "Server data not available yet. Loading draft."
        );
      }

      // Load draft
      try {
        const draft = await getDraft(
          employeeId,
          "profileWork"
        );

        if (draft?.data?.payload) {
          const dp = draft.data.payload;

          if (dp.inProject !== undefined) {
            setInProject(dp.inProject);
          }

          if (dp.presentEmployers) {
            setPresentEmployers(
              dp.presentEmployers.map((emp) => ({
                ...initialEmployer,
                ...emp,

                client: {
                  ...initialEmployer.client,
                  ...(emp.client || {}),
                },

                vendor: {
                  ...initialEmployer.vendor,
                  ...(emp.vendor || {}),
                },

                primeVendor: {
                  ...initialEmployer.primeVendor,
                  ...(emp.primeVendor || {}),
                },
              }))
            );
          }

          if (dp.previousEmployers) {
            setPreviousEmployers(
              dp.previousEmployers.map((emp) => ({
                ...initialEmployer,
                ...emp,

                client: {
                  ...initialEmployer.client,
                  ...(emp.client || {}),
                },

                vendor: {
                  ...initialEmployer.vendor,
                  ...(emp.vendor || {}),
                },

                primeVendor: {
                  ...initialEmployer.primeVendor,
                  ...(emp.primeVendor || {}),
                },
              }))
            );
          }

          if (dp.projectStatus) {
            setProjectStatus(dp.projectStatus);
          }

          if (dp.client) {
            setClient(dp.client);
          }

          if (dp.vendor) {
            setVendor(dp.vendor);
          }

          if (dp.primeVendor) {
            setPrimeVendor(dp.primeVendor);
          }

          if (dp.profileStatus) {
            setProfileStatus(dp.profileStatus);
          }
        }
      } catch (err) {
        console.log("No draft found.");
      }
    }

    loadData();
  }, [employeeId]);

  /*
   * ============================================================
   * EMPLOYER HANDLERS
   * ============================================================
   */

  const handleEmployerChange = (
    type,
    idx,
    field,
    value
  ) => {
    if (type === "present") {
      setPresentEmployers((prev) => {
        const list = [...prev];

        list[idx] = {
          ...list[idx],
          [field]: value,
        };

        return list;
      });
    } else {
      setPreviousEmployers((prev) => {
        const list = [...prev];

        list[idx] = {
          ...list[idx],
          [field]: value,
        };

        return list;
      });
    }
  };

  const handleEmployerNestedChange = (
    type,
    idx,
    section,
    field,
    value
  ) => {
    if (type === "present") {
      setPresentEmployers((prev) => {
        const list = [...prev];

        list[idx] = {
          ...list[idx],

          [section]: {
            ...list[idx][section],
            [field]: value,
          },
        };

        return list;
      });
    } else {
      setPreviousEmployers((prev) => {
        const list = [...prev];

        list[idx] = {
          ...list[idx],

          [section]: {
            ...list[idx][section],
            [field]: value,
          },
        };

        return list;
      });
    }
  };

  const handleAddEmployer = (type) => {
    if (isReadOnly) return;

    const newEmployer = {
      ...initialEmployer,

      client: {
        ...initialEmployer.client,
      },

      vendor: {
        ...initialEmployer.vendor,
      },

      primeVendor: {
        ...initialEmployer.primeVendor,
      },
    };

    if (type === "present") {
      setPresentEmployers((prev) => [
        ...prev,
        newEmployer,
      ]);
    } else {
      setPreviousEmployers((prev) => [
        ...prev,
        newEmployer,
      ]);
    }
  };

  const handleDeletePreviousEmployer = (index) => {
    if (isReadOnly) return;

    setPreviousEmployers((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  /*
   * ============================================================
   * OPEN EMPLOYER DETAILS
   * ============================================================
   *
   * IMPORTANT:
   * The old code had another copy of this logic OUTSIDE
   * this function. That was causing:
   *
   * Unexpected token
   *
   * because `key`, `type`, and `employer` were out of scope.
   */

  const openEmployerDetails = (
    type,
    index,
    employer
  ) => {
    const key = `${type}-${index}`;

    // If same employer is clicked again, close details
    if (
      activeEmployerDetails?.key === key
    ) {
      setActiveEmployerDetails(null);
      return;
    }

    setActiveEmployerDetails({
      type,
      index,
      key,

      client: {
        name: employer.client?.name || "",

        startDate:
          employer.client?.startDate ||
          employer.client?.start_date ||
          "",

        endDate:
          employer.client?.endDate ||
          employer.client?.end_date ||
          "",
      },

      vendor: {
        name: employer.vendor?.name || "",

        startDate:
          employer.vendor?.startDate ||
          employer.vendor?.start_date ||
          "",

        endDate:
          employer.vendor?.endDate ||
          employer.vendor?.end_date ||
          "",
      },

      primeVendor: {
        name:
          employer.primeVendor?.name || "",

        startDate:
          employer.primeVendor?.startDate ||
          employer.primeVendor?.start_date ||
          "",

        endDate:
          employer.primeVendor?.endDate ||
          employer.primeVendor?.end_date ||
          "",
      },
    });
  };

  /*
   * ============================================================
   * STANDALONE DETAILS
   * ============================================================
   */

  const openStandaloneDetails = () => {
    const key = "standalone";

    if (
      activeEmployerDetails?.key === key
    ) {
      setActiveEmployerDetails(null);
      return;
    }

    setActiveEmployerDetails({
      key,
      type: "standalone",
      index: -1,

      client: {
        ...client,
      },

      vendor: {
        ...vendor,
      },

      primeVendor: {
        ...primeVendor,
      },
    });
  };

  /*
   * ============================================================
   * DATE CHANGE HELPERS
   * ============================================================
   */

  const handleDateChange = (
    setter,
    field,
    value
  ) => {
    const year = value.split("-")[0];

    if (year.length <= 4) {
      setter((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  /*
   * ============================================================
   * SUBMIT
   * ============================================================
   */

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setSaving(true);

    try {
      if (!employeeId) {
        throw new Error("Missing employeeId");
      }

      const payload = {
        inProject,
        profileStatus,
        presentEmployers,
        previousEmployers,
        projectStatus,
        client,
        vendor,
        primeVendor,
      };

      const body = {
        tab: "profileWork",
        payload,
        spouse: null,
        kids: [],
        documents: [],
      };

      await saveOnboardingFull(
        employeeId,
        body,
        true
      );

      if (workClientRef.current?.saveDraft) {
        await workClientRef.current.saveDraft();
      }

      await syncEmployerDocs();

      await submitOnboarding(
        employeeId,
        "profileWork"
      );

      handleSubmit();

      alert("Submitted successfully");
    } catch (err) {
      console.error(
        "Submit failed",
        err?.response?.data ||
        err?.message ||
        err
      );

      const errs =
        err?.response?.data?.errors;

      alert(
        "Submit failed:\n" +
        (Array.isArray(errs)
          ? errs
            .map((e) => e.msg)
            .join("\n")
          : err?.response?.data?.error ||
          err?.message ||
          "unknown")
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  const isReadOnly =
    onboardingSubmitted && !canEdit;

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6 font-employee">

      {/* ========================================================
          IN PROJECT
      ======================================================== */}

      <div className="mb-6 flex items-center gap-4">
        <EmpTypography.label>
          In Project?{" "}
          <span className="text-red-500">
            *
          </span>
        </EmpTypography.label>

        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="inProject"
            value="Yes"
            checked={inProject === "Yes"}
            onChange={() => {
              setInProject("Yes");
              setProfileStatus("In Project");

              saveOnboarding(
                employeeId,
                "profileWork",
                {
                  profileStatus:
                    "In Project",
                }
              ).catch((err) =>
                console.error(err)
              );
            }}
            disabled={isReadOnly}
          />

          Yes
        </label>

        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="inProject"
            value="No"
            checked={inProject === "No"}
            onChange={() => {
              setInProject("No");
              setProfileStatus("On Bench");

              saveOnboarding(
                employeeId,
                "profileWork",
                {
                  profileStatus:
                    "On Bench",
                }
              ).catch((err) =>
                console.error(err)
              );
            }}
            disabled={isReadOnly}
          />

          No
        </label>
      </div>

      {/* ========================================================
          ORGANIZATION
      ======================================================== */}

      <div className="mb-6">

        {/* ======================================================
            PRESENT EMPLOYER
        ====================================================== */}

        {inProject === "Yes" && (
          <div className="mb-10">

            <EmpTypography.label className="text-lg font-bold mb-4">
              Present Employer
              <span className="text-red-500">
                *
              </span>
            </EmpTypography.label>

            {presentEmployers.map(
              (emp, idx) => {
                const employerKey =
                  `present-${idx}`;

                const isDetailsOpen =
                  activeEmployerDetails?.key ===
                  employerKey;

                return (
                  <div
                    key={employerKey}
                    className={`mb-6 pb-6 ${idx !==
                        presentEmployers.length - 1
                        ? "border-b"
                        : ""
                      }`}
                  >

                    {/* Employer basic information */}

                    <div className="flex flex-col gap-6">

                      <div>
                        <div className="flex gap-2 mb-2">

                          <input
                            type="text"
                            placeholder="Name"
                            value={emp.name}
                            onChange={(e) =>
                              handleEmployerChange(
                                "present",
                                idx,
                                "name",
                                e.target.value
                              )
                            }
                            className="border rounded px-2 py-1 flex-1"
                            disabled={isReadOnly}
                          />

                          <input
                            type="text"
                            placeholder="Designation"
                            value={
                              emp.designation
                            }
                            onChange={(e) =>
                              handleEmployerChange(
                                "present",
                                idx,
                                "designation",
                                e.target.value
                              )
                            }
                            className="border rounded px-2 py-1 flex-1"
                            disabled={isReadOnly}
                          />

                        </div>

                        <div className="flex gap-2 mb-2">

                          <input
                            type="date"
                            value={toDateInputValue(
                              emp.startDate
                            )}
                            min="1900-01-01"
                            max="9999-12-31"
                            className="border rounded px-2 py-1 text-sm"
                            onChange={(e) =>
                              handleEmployerChange(
                                "present",
                                idx,
                                "startDate",
                                e.target.value
                              )
                            }
                            disabled={isReadOnly}
                          />

                          <input
                            type="date"
                            value={toDateInputValue(
                              emp.endDate
                            )}
                            min="1900-01-01"
                            max="9999-12-31"
                            className="border rounded px-2 py-1 text-sm"
                            onChange={(e) =>
                              handleEmployerChange(
                                "present",
                                idx,
                                "endDate",
                                e.target.value
                              )
                            }
                            disabled={isReadOnly}
                          />

                        </div>

                        {/* File upload */}

                        <div className="flex flex-col mb-2">

                          <FileUploadField
                            label="Document Upload:"
                            employeeId={employeeId}
                            category={`present_employer_${idx}`}
                            documentName={`Present Employer ${idx + 1
                              } Document`}
                            value={emp.docFile}
                            onChange={(fileInfo) =>
                              handleEmployerChange(
                                "present",
                                idx,
                                "docFile",
                                fileInfo
                              )
                            }
                            disabled={isReadOnly}
                          />

                          <EmpTypography.small className="text-gray-500 mt-1">
                            Upload all job-related
                            docs – Offer Letters,
                            Payslips, H1b approval
                            copies, OPT/CPT, ALL
                            I-20's, EAD Copies
                          </EmpTypography.small>

                        </div>
                      </div>

                      {/* Client / Vendor / Prime Vendor */}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Client */}

                        <div>
                          <EmpTypography.label>
                            Client Details:
                          </EmpTypography.label>

                          <input
                            type="text"
                            value={
                              emp.client?.name ||
                              ""
                            }
                            placeholder="Enter client name"
                            className="border p-1 w-full"
                            onChange={(e) =>
                              handleEmployerNestedChange(
                                "present",
                                idx,
                                "client",
                                "name",
                                e.target.value
                              )
                            }
                            disabled={isReadOnly}
                          />

                          <div>
                            <EmpTypography.h2>
                              Start Date:
                            </EmpTypography.h2>

                            <input
                              type="date"
                              value={toDateInputValue(
                                emp.client?.startDate
                              )}
                              min="1900-01-01"
                              max="9999-12-31"
                              className="border p-1 w-full"
                              onChange={(e) =>
                                handleEmployerNestedChange(
                                  "present",
                                  idx,
                                  "client",
                                  "startDate",
                                  e.target.value
                                )
                              }
                              disabled={
                                isReadOnly
                              }
                            />
                          </div>

                          <div>
                            <EmpTypography.h2>
                              End Date:
                            </EmpTypography.h2>

                            <input
                              type="date"
                              value={toDateInputValue(
                                emp.client?.endDate
                              )}
                              min="1900-01-01"
                              max="9999-12-31"
                              className="border p-1 w-full"
                              onChange={(e) =>
                                handleEmployerNestedChange(
                                  "present",
                                  idx,
                                  "client",
                                  "endDate",
                                  e.target.value
                                )
                              }
                              disabled={
                                isReadOnly
                              }
                            />
                          </div>

                          <EmpTypography.button
                            variant="link"
                            className="text-blue-600 mt-2 p-0 bg-transparent shadow-none hover:underline"
                            onClick={() =>
                              openEmployerDetails(
                                "present",
                                idx,
                                emp
                              )
                            }
                          >
                            <EmpTypography.small>
                              View Details &gt;&gt;
                            </EmpTypography.small>
                          </EmpTypography.button>
                        </div>

                        {/* Vendor */}

                        <div>
                          <EmpTypography.label>
                            Vendor Details:
                          </EmpTypography.label>

                          <input
                            type="text"
                            value={
                              emp.vendor?.name ||
                              ""
                            }
                            placeholder="Enter vendor name"
                            className="border p-1 w-full"
                            onChange={(e) =>
                              handleEmployerNestedChange(
                                "present",
                                idx,
                                "vendor",
                                "name",
                                e.target.value
                              )
                            }
                            disabled={isReadOnly}
                          />

                          <div>
                            <EmpTypography.h2>
                              Start Date:
                            </EmpTypography.h2>

                            <input
                              type="date"
                              value={toDateInputValue(
                                emp.vendor?.startDate
                              )}
                              min="1900-01-01"
                              max="9999-12-31"
                              className="border p-1 w-full"
                              onChange={(e) =>
                                handleEmployerNestedChange(
                                  "present",
                                  idx,
                                  "vendor",
                                  "startDate",
                                  e.target.value
                                )
                              }
                              disabled={
                                isReadOnly
                              }
                            />
                          </div>

                          <div>
                            <EmpTypography.h2>
                              End Date:
                            </EmpTypography.h2>

                            <input
                              type="date"
                              value={toDateInputValue(
                                emp.vendor?.endDate
                              )}
                              min="1900-01-01"
                              max="9999-12-31"
                              className="border p-1 w-full"
                              onChange={(e) =>
                                handleEmployerNestedChange(
                                  "present",
                                  idx,
                                  "vendor",
                                  "endDate",
                                  e.target.value
                                )
                              }
                              disabled={
                                isReadOnly
                              }
                            />
                          </div>

                          <EmpTypography.button
                            variant="link"
                            className="text-blue-600 mt-2 p-0 bg-transparent shadow-none hover:underline"
                            onClick={() =>
                              openEmployerDetails(
                                "present",
                                idx,
                                emp
                              )
                            }
                          >
                            <EmpTypography.small>
                              View Details &gt;&gt;
                            </EmpTypography.small>
                          </EmpTypography.button>
                        </div>

                        {/* Prime Vendor */}

                        <div>
                          <EmpTypography.label>
                            Prime Vendor Details:
                          </EmpTypography.label>

                          <input
                            type="text"
                            value={
                              emp.primeVendor
                                ?.name || ""
                            }
                            placeholder="Enter prime vendor name"
                            className="border p-1 w-full"
                            onChange={(e) =>
                              handleEmployerNestedChange(
                                "present",
                                idx,
                                "primeVendor",
                                "name",
                                e.target.value
                              )
                            }
                            disabled={isReadOnly}
                          />

                          <div>
                            <EmpTypography.h2>
                              Start Date:
                            </EmpTypography.h2>

                            <input
                              type="date"
                              value={toDateInputValue(
                                emp.primeVendor
                                  ?.startDate
                              )}
                              min="1900-01-01"
                              max="9999-12-31"
                              className="border p-1 w-full"
                              onChange={(e) =>
                                handleEmployerNestedChange(
                                  "present",
                                  idx,
                                  "primeVendor",
                                  "startDate",
                                  e.target.value
                                )
                              }
                              disabled={
                                isReadOnly
                              }
                            />
                          </div>

                          <div>
                            <EmpTypography.h2>
                              End Date:
                            </EmpTypography.h2>

                            <input
                              type="date"
                              value={toDateInputValue(
                                emp.primeVendor
                                  ?.endDate
                              )}
                              min="1900-01-01"
                              max="9999-12-31"
                              className="border p-1 w-full"
                              onChange={(e) =>
                                handleEmployerNestedChange(
                                  "present",
                                  idx,
                                  "primeVendor",
                                  "endDate",
                                  e.target.value
                                )
                              }
                              disabled={
                                isReadOnly
                              }
                            />
                          </div>

                          <EmpTypography.button
                            variant="link"
                            className="text-blue-600 mt-2 p-0 bg-transparent shadow-none hover:underline"
                            onClick={() =>
                              openEmployerDetails(
                                "present",
                                idx,
                                emp
                              )
                            }
                          >
                            <EmpTypography.small>
                              View Details &gt;&gt;
                            </EmpTypography.small>
                          </EmpTypography.button>
                        </div>

                      </div>

                      {/* WorkClient for Present Employer */}

                      {isDetailsOpen && (
                        <div className="mt-4">
                          <WorkClient
                            key={employerKey}
                            ref={workClientRef}
                            goBack={() =>
                              setActiveEmployerDetails(
                                null
                              )
                            }
                            parentClient={
                              activeEmployerDetails.client
                            }
                            parentVendor={
                              activeEmployerDetails.vendor
                            }
                            parentPrimeVendor={
                              activeEmployerDetails.primeVendor
                            }
                            employerType="present"
                            employerIndex={idx}
                            useParentDataOnly
                          />
                        </div>
                      )}

                    </div>

                    {idx !==
                      presentEmployers.length - 1 && (
                        <hr className="border-t-4 border-gray-800 mt-8" />
                      )}

                  </div>
                );
              }
            )}

          </div>
        )}

        {/* ======================================================
            PREVIOUS EMPLOYER
        ====================================================== */}

        <div>

          <EmpTypography.label className="text-lg font-bold mb-4">
            Previous Employer
          </EmpTypography.label>

          {previousEmployers.map(
            (emp, idx) => {
              const employerKey =
                `previous-${idx}`;

              const isDetailsOpen =
                activeEmployerDetails?.key ===
                employerKey;

              return (
                <div
                  key={employerKey}
                  className={`mb-6 pb-6 ${idx !==
                      previousEmployers.length - 1
                      ? "border-b"
                      : ""
                    }`}
                >

                  {/* WorkClient details */}

                  {isDetailsOpen && (
                    <div className="mt-4 mb-6">
                      <WorkClient
                        key={employerKey}
                        ref={workClientRef}
                        goBack={() =>
                          setActiveEmployerDetails(
                            null
                          )
                        }
                        parentClient={
                          activeEmployerDetails.client
                        }
                        parentVendor={
                          activeEmployerDetails.vendor
                        }
                        parentPrimeVendor={
                          activeEmployerDetails.primeVendor
                        }
                        employerType="previous"
                        employerIndex={idx}
                        useParentDataOnly
                      />
                    </div>
                  )}

                  {/* Employer name/designation */}

                  <div className="flex gap-2 mb-2">

                    <input
                      type="text"
                      placeholder="Name"
                      value={emp.name}
                      onChange={(e) =>
                        handleEmployerChange(
                          "previous",
                          idx,
                          "name",
                          e.target.value
                        )
                      }
                      className="border rounded px-2 py-1 flex-1"
                      disabled={isReadOnly}
                    />

                    <input
                      type="text"
                      placeholder="Designation"
                      value={emp.designation}
                      onChange={(e) =>
                        handleEmployerChange(
                          "previous",
                          idx,
                          "designation",
                          e.target.value
                        )
                      }
                      className="border rounded px-2 py-1 flex-1"
                      disabled={isReadOnly}
                    />

                  </div>

                  {/* Dates */}

                  <div className="flex gap-2 mb-2">

                    <input
                      type="date"
                      value={toDateInputValue(
                        emp.startDate
                      )}
                      min="1900-01-01"
                      max="9999-12-31"
                      onChange={(e) =>
                        handleEmployerChange(
                          "previous",
                          idx,
                          "startDate",
                          e.target.value
                        )
                      }
                      className="border rounded px-2 py-1 text-sm"
                      disabled={isReadOnly}
                    />

                    <input
                      type="date"
                      value={toDateInputValue(
                        emp.endDate
                      )}
                      min="1900-01-01"
                      max="9999-12-31"
                      onChange={(e) =>
                        handleEmployerChange(
                          "previous",
                          idx,
                          "endDate",
                          e.target.value
                        )
                      }
                      className="border rounded px-2 py-1 text-sm"
                      disabled={isReadOnly}
                    />

                  </div>

                  {/* File Upload */}

                  <div className="flex flex-col mb-2">

                    <FileUploadField
                      label="Document Upload:"
                      employeeId={employeeId}
                      category={`previous_employer_${idx}`}
                      documentName={`Previous Employer ${idx + 1
                        } Document`}
                      value={emp.docFile}
                      onChange={(fileInfo) =>
                        handleEmployerChange(
                          "previous",
                          idx,
                          "docFile",
                          fileInfo
                        )
                      }
                      disabled={isReadOnly}
                    />

                    <EmpTypography.small className="text-gray-500 mt-1">
                      Upload all job-related
                      docs – Offer Letters,
                      Payslips, H1b approval
                      copies, OPT/CPT, ALL
                      I-20's, EAD Copies
                    </EmpTypography.small>

                  </div>

                  {/* View Details */}

                  <EmpTypography.button
                    variant="link"
                    className="text-blue-600 mt-2 p-0 bg-transparent shadow-none hover:underline"
                    onClick={() =>
                      openEmployerDetails(
                        "previous",
                        idx,
                        emp
                      )
                    }
                  >
                    <EmpTypography.small>
                      View Details &gt;&gt;
                    </EmpTypography.small>
                  </EmpTypography.button>

                  {/* Add / Delete */}

                  <div className="flex justify-between items-center mt-2">

                    <EmpTypography.button
                      variant="primary"
                      onClick={() =>
                        handleAddEmployer(
                          "previous"
                        )
                      }
                      disabled={isReadOnly}
                    >
                      + Add
                    </EmpTypography.button>

                    {previousEmployers.length >
                      1 && (
                        <button
                          type="button"
                          className="text-red-600 px-2 py-1 rounded hover:bg-red-100 disabled:opacity-50"
                          onClick={() =>
                            handleDeletePreviousEmployer(
                              idx
                            )
                          }
                          disabled={isReadOnly}
                        >
                          🗑️
                        </button>
                      )}

                  </div>

                </div>
              );
            }
          )}

        </div>

      </div>

      {/* ========================================================
          STANDALONE CLIENT / VENDOR / PRIME VENDOR
      ======================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">

        {/* Client */}

        <div>

          <EmpTypography.label>
            Client Details:
          </EmpTypography.label>

          <input
            type="text"
            value={client.name}
            placeholder="Enter client name"
            className="border p-1 w-full"
            onChange={(e) =>
              setClient((prev) => ({
                ...prev,
                name: e.target.value,
              }))
            }
            disabled={isReadOnly}
          />

          <div>
            <EmpTypography.h2>
              Start Date:
            </EmpTypography.h2>

            <input
              type="date"
              value={toDateInputValue(
                client.startDate
              )}
              min="1900-01-01"
              max="9999-12-31"
              className="border p-1 w-full"
              onChange={(e) =>
                handleDateChange(
                  setClient,
                  "startDate",
                  e.target.value
                )
              }
              disabled={isReadOnly}
            />
          </div>

          <div>
            <EmpTypography.h2>
              End Date:
            </EmpTypography.h2>

            <input
              type="date"
              value={toDateInputValue(
                client.endDate
              )}
              min="1900-01-01"
              max="9999-12-31"
              className="border p-1 w-full"
              onChange={(e) =>
                handleDateChange(
                  setClient,
                  "endDate",
                  e.target.value
                )
              }
              disabled={isReadOnly}
            />
          </div>

          <EmpTypography.button
            variant="link"
            className="text-blue-600 mt-2 p-0 bg-transparent shadow-none hover:underline"
            onClick={openStandaloneDetails}
          >
            <EmpTypography.small>
              View Details &gt;&gt;
            </EmpTypography.small>
          </EmpTypography.button>

        </div>

        {/* Vendor */}

        <div>

          <EmpTypography.label>
            Vendor Details:
          </EmpTypography.label>

          <input
            type="text"
            value={vendor.name}
            placeholder="Enter vendor name"
            className="border p-1 w-full"
            onChange={(e) =>
              setVendor((prev) => ({
                ...prev,
                name: e.target.value,
              }))
            }
            disabled={isReadOnly}
          />

          <div>
            <EmpTypography.h2>
              Start Date:
            </EmpTypography.h2>

            <input
              type="date"
              value={toDateInputValue(
                vendor.startDate
              )}
              min="1900-01-01"
              max="9999-12-31"
              className="border p-1 w-full"
              onChange={(e) =>
                handleDateChange(
                  setVendor,
                  "startDate",
                  e.target.value
                )
              }
              disabled={isReadOnly}
            />
          </div>

          <div>
            <EmpTypography.h2>
              End Date:
            </EmpTypography.h2>

            <input
              type="date"
              value={toDateInputValue(
                vendor.endDate
              )}
              min="1900-01-01"
              max="9999-12-31"
              className="border p-1 w-full"
              onChange={(e) =>
                handleDateChange(
                  setVendor,
                  "endDate",
                  e.target.value
                )
              }
              disabled={isReadOnly}
            />
          </div>

          <EmpTypography.button
            variant="link"
            className="text-blue-600 mt-2 p-0 bg-transparent shadow-none hover:underline"
            onClick={openStandaloneDetails}
          >
            <EmpTypography.small>
              View Details &gt;&gt;
            </EmpTypography.small>
          </EmpTypography.button>

        </div>

        {/* Prime Vendor */}

        <div>

          <EmpTypography.label>
            Prime Vendor Details:
          </EmpTypography.label>

          <input
            type="text"
            value={primeVendor.name}
            placeholder="Enter prime vendor name"
            className="border p-1 w-full"
            onChange={(e) =>
              setPrimeVendor((prev) => ({
                ...prev,
                name: e.target.value,
              }))
            }
            disabled={isReadOnly}
          />

          <div>
            <EmpTypography.h2>
              Start Date:
            </EmpTypography.h2>

            <input
              type="date"
              value={toDateInputValue(
                primeVendor.startDate
              )}
              min="1900-01-01"
              max="9999-12-31"
              className="border p-1 w-full"
              onChange={(e) =>
                handleDateChange(
                  setPrimeVendor,
                  "startDate",
                  e.target.value
                )
              }
              disabled={isReadOnly}
            />
          </div>

          <div>
            <EmpTypography.h2>
              End Date:
            </EmpTypography.h2>

            <input
              type="date"
              value={toDateInputValue(
                primeVendor.endDate
              )}
              min="1900-01-01"
              max="9999-12-31"
              className="border p-1 w-full"
              onChange={(e) =>
                handleDateChange(
                  setPrimeVendor,
                  "endDate",
                  e.target.value
                )
              }
              disabled={isReadOnly}
            />
          </div>

          <EmpTypography.button
            variant="link"
            className="text-blue-600 mt-2 p-0 bg-transparent shadow-none hover:underline"
            onClick={openStandaloneDetails}
          >
            <EmpTypography.small>
              View Details &gt;&gt;
            </EmpTypography.small>
          </EmpTypography.button>

        </div>

      </div>

      {/* Standalone WorkClient */}

      {activeEmployerDetails?.key ===
        "standalone" && (
          <div className="mt-6">

            <WorkClient
              ref={workClientRef}
              goBack={() =>
                setActiveEmployerDetails(null)
              }
              parentClient={
                activeEmployerDetails.client
              }
              parentVendor={
                activeEmployerDetails.vendor
              }
              parentPrimeVendor={
                activeEmployerDetails.primeVendor
              }
              employerType="standalone"
              employerIndex={-1}
              useParentDataOnly
            />

          </div>
        )}

      {/* ========================================================
          VALIDATION
      ======================================================== */}

      {validationError && (
        <EmpTypography.small className="text-red-600 mb-2 block">
          {validationError}
        </EmpTypography.small>
      )}

      {/* ========================================================
          SAVE / SUBMIT / MODIFY BUTTONS
      ======================================================== */}

      <div className="flex justify-end mt-4 gap-2">

        {(!onboardingSubmitted ||
          canEdit) && (
            <EmpTypography.button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </EmpTypography.button>
          )}

        {(!onboardingSubmitted ||
          canEdit) && (
            <EmpTypography.button
              variant="primary"
              onClick={() =>
                setShowConfirmModal(true)
              }
              disabled={saving}
            >
              Submit
            </EmpTypography.button>
          )}

        {onboardingSubmitted &&
          !canEdit &&
          !permissionGranted && (
            <EmpTypography.button
              variant="primary"
              onClick={handleModify}
            >
              Request Modify
            </EmpTypography.button>
          )}

      </div>

      {/* ========================================================
          CONFIRMATION MODAL
      ======================================================== */}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">

          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs">

            <EmpTypography.h3 className="mb-2">
              Confirm Submission
            </EmpTypography.h3>

            <div className="mb-4 text-sm">
              Before submitting, please review.
              Any changes after submission will
              require admin permission.
            </div>

            <div className="flex gap-2 justify-end">

              <EmpTypography.button
                onClick={handleConfirmSubmit}
                disabled={saving}
              >
                {saving
                  ? "Submitting..."
                  : "Confirm"}
              </EmpTypography.button>

              <EmpTypography.button
                onClick={() =>
                  setShowConfirmModal(false)
                }
                disabled={saving}
              >
                Cancel
              </EmpTypography.button>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================
          MODIFY REASON MODAL
      ======================================================== */}

      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">

          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs">

            <EmpTypography.h3 className="mb-2">
              Request Admin Permission
            </EmpTypography.h3>

            <div className="mb-2 text-sm">
              What do you want to modify?
            </div>

            <textarea
              className="border rounded w-full p-2 mb-2"
              rows={3}
              value={modifyReason}
              onChange={(e) =>
                setModifyReason(
                  e.target.value
                )
              }
              placeholder="Describe your reason..."
            />

            {reasonError && (
              <EmpTypography.small className="text-red-600 mb-2 block">
                {reasonError}
              </EmpTypography.small>
            )}

            <div className="flex gap-2 justify-end">

              <EmpTypography.button
                onClick={
                  handleRequestPermission
                }
              >
                Request
              </EmpTypography.button>

              <EmpTypography.button
                onClick={
                  handleCloseReasonModal
                }
              >
                Cancel
              </EmpTypography.button>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================
          PERMISSION MODAL
      ======================================================== */}

      {showPermissionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">

          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs">

            <EmpTypography.h3 className="mb-2">
              Request Admin Permission
            </EmpTypography.h3>

            {!permissionRequested &&
              !permissionGranted && (
                <div className="mb-4 text-sm">
                  Do you want to request
                  permission from admin to
                  modify this page?
                </div>
              )}

            {permissionRequested &&
              !permissionGranted && (
                <div className="mb-4 text-sm text-blue-600">
                  Requesting permission from
                  admin...
                </div>
              )}

            {permissionGranted && (
              <div className="mb-4 text-sm text-green-600">
                Permission granted! You can now
                edit and save this page.
              </div>
            )}

            <div className="flex gap-2 justify-end">

              {!permissionRequested &&
                !permissionGranted && (
                  <EmpTypography.button
                    onClick={
                      requestPermission
                    }
                  >
                    Request
                  </EmpTypography.button>
                )}

              <EmpTypography.button
                onClick={
                  closePermissionModal
                }
              >
                Close
              </EmpTypography.button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
