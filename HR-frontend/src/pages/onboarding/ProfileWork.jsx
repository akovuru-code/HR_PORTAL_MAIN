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

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

const createEmptyDetail = () => ({
  name: "",
  startDate: "",
  endDate: "",
});

const createInitialEmployer = () => ({
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

  /*
   * IMPORTANT:
   * These belong to THIS employer.
   * They are NOT the standalone client/vendor/primeVendor fields.
   */
  client: createEmptyDetail(),
  vendor: createEmptyDetail(),
  primeVendor: createEmptyDetail(),
});

const initialEmployer = createInitialEmployer();

const toDateInputValue = (value) => {
  if (!value) return "";

  const stringValue = String(value);

  /*
   * Handles:
   * 2026-08-19
   * 2026-08-19T00:00:00.000Z
   * 2026-08-19 00:00:00
   */
  const match = stringValue.match(/^\d{4}-\d{2}-\d{2}/);

  if (match) {
    return match[0];
  }

  /*
   * Fallback for other valid date values.
   */
  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  return "";
};

/*
 * Normalize one Client/Vendor/Prime Vendor object.
 *
 * Backend may return either:
 *   startDate
 *   start_date
 *
 * or potentially:
 *   client_start_date
 *
 * We support all without changing unrelated data.
 */
const normalizeDetail = (
  detail,
  flatName = "",
  flatStartDate = "",
  flatEndDate = ""
) => {
  let source = detail;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      source = {};
    }
  }
  source = source || {};

  const name =
    (source.name !== undefined && source.name !== null && source.name !== "")
      ? source.name
      : (source.clientName || source.vendorName || source.primeVendorName || flatName || "");

  const startDateRaw =
    (source.startDate !== undefined && source.startDate !== null && source.startDate !== "")
      ? source.startDate
      : (source.start_date || source.clientStartDate || source.vendorStartDate || source.primeVendorStartDate || flatStartDate || "");

  const endDateRaw =
    (source.endDate !== undefined && source.endDate !== null && source.endDate !== "")
      ? source.endDate
      : (source.end_date || source.clientEndDate || source.vendorEndDate || source.primeVendorEndDate || flatEndDate || "");

  return {
    name: String(name || "").trim(),
    startDate: toDateInputValue(startDateRaw),
    endDate: toDateInputValue(endDateRaw),
  };
};

/*
 * ============================================================
 * NORMALIZE EMPLOYER FROM SERVER / DRAFT
 * ============================================================
 *
 * This is the important persistence fix.
 *
 * Present Employer details are always reconstructed from the
 * employer itself. We DO NOT use the standalone client/vendor/
 * primeVendor state here.
 */
const normalizeEmployer = (employer = {}) => {
  const normalized = {
    ...createInitialEmployer(),
    ...employer,

    startDate: toDateInputValue(
      employer.startDate ??
      employer.start_date ??
      ""
    ),

    endDate: toDateInputValue(
      employer.endDate ??
      employer.end_date ??
      ""
    ),

    // WorkEmployer persists this JSON field as snake_case.  The upload
    // component reads camelCase, so restore it when Work Info is reopened.
    docFile: employer.docFile ?? employer.doc_file ?? null,

    client: normalizeDetail(
      employer.client,
      employer.client_name,
      employer.client_start_date,
      employer.client_end_date
    ),

    vendor: normalizeDetail(
      employer.vendor,
      employer.vendor_name,
      employer.vendor_start_date,
      employer.vendor_end_date
    ),

    primeVendor: normalizeDetail(
      employer.primeVendor ??
      employer.prime_vendor,
      employer.prime_vendor_name,
      employer.prime_vendor_start_date,
      employer.prime_vendor_end_date
    ),
  };

  /*
   * Keep backend naming variants from accidentally replacing
   * the normalized values.
   */
  normalized.client = {
    ...createEmptyDetail(),
    ...normalized.client,
  };

  normalized.vendor = {
    ...createEmptyDetail(),
    ...normalized.vendor,
  };

  normalized.primeVendor = {
    ...createEmptyDetail(),
    ...normalized.primeVendor,
  };

  return normalized;
};

/*
 * ============================================================
 * SERIALIZE EMPLOYER FOR API
 * ============================================================
 *
 * The nested structures are the source of truth:
 *
 * employer.client
 * employer.vendor
 * employer.primeVendor
 *
 * Flat fields are also included for compatibility with a
 * backend which stores these as columns.
 */
const serializeEmployer = (employer = {}, type = "") => {
  const normalized = normalizeEmployer(employer);

  return {
    ...normalized,

    type,

    /*
     * Employer dates
     */
    startDate: toDateInputValue(normalized.startDate),
    endDate: toDateInputValue(normalized.endDate),

    /*
     * Present/Previous employer nested details.
     */
    client: {
      name: normalized.client.name || "",
      startDate: toDateInputValue(
        normalized.client.startDate
      ),
      endDate: toDateInputValue(
        normalized.client.endDate
      ),
    },

    vendor: {
      name: normalized.vendor.name || "",
      startDate: toDateInputValue(
        normalized.vendor.startDate
      ),
      endDate: toDateInputValue(
        normalized.vendor.endDate
      ),
    },

    primeVendor: {
      name: normalized.primeVendor.name || "",
      startDate: toDateInputValue(
        normalized.primeVendor.startDate
      ),
      endDate: toDateInputValue(
        normalized.primeVendor.endDate
      ),
    },

    /*
     * Compatibility fields for APIs/database schemas that
     * store these values directly on work_employers.
     */
    client_name: normalized.client.name || "",
    client_start_date: toDateInputValue(
      normalized.client.startDate
    ),
    client_end_date: toDateInputValue(
      normalized.client.endDate
    ),

    vendor_name: normalized.vendor.name || "",
    vendor_start_date: toDateInputValue(
      normalized.vendor.startDate
    ),
    vendor_end_date: toDateInputValue(
      normalized.vendor.endDate
    ),

    prime_vendor_name:
      normalized.primeVendor.name || "",
    prime_vendor_start_date: toDateInputValue(
      normalized.primeVendor.startDate
    ),
    prime_vendor_end_date: toDateInputValue(
      normalized.primeVendor.endDate
    ),
  };
};

/*
 * ============================================================
 * STANDALONE DETAIL NORMALIZER
 * ============================================================
 *
 * These are intentionally separate from employer details.
 */
const normalizeStandaloneDetail = (detail = {}) => ({
  name: detail.name || "",
  startDate: toDateInputValue(
    detail.startDate ??
    detail.start_date ??
    ""
  ),
  endDate: toDateInputValue(
    detail.endDate ??
    detail.end_date ??
    ""
  ),
});

/*
 * ============================================================
 * BUILD SAVE PAYLOAD
 * ============================================================
 *
 * Both Save and Submit use this exact function.
 */
const buildProfileWorkPayload = ({
  inProject,
  profileStatus,
  presentEmployers,
  previousEmployers,
  projectStatus,
  client,
  vendor,
  primeVendor,
}) => {
  return {
    inProject,
    profileStatus,

    /*
     * IMPORTANT:
     * Present Employer data is serialized independently.
     */
    presentEmployers: presentEmployers.map((employer) =>
      serializeEmployer(employer, "present")
    ),

    /*
     * Previous Employer data stays separate.
     */
    previousEmployers: previousEmployers.map((employer) =>
      serializeEmployer(employer, "previous")
    ),

    projectStatus,

    /*
     * These are standalone details only.
     * They are NOT used for Present Employer details.
     */
    client: normalizeStandaloneDetail(client),
    vendor: normalizeStandaloneDetail(vendor),
    primeVendor: normalizeStandaloneDetail(primeVendor),
  };
};

export default function ProfileWork() {
  const navigate = useNavigate();

  const [inProject, setInProject] = useState("");
  const [activeEmployerDetails, setActiveEmployerDetails] =
    useState(null);

  const workClientRef = useRef(null);

  /*
   * Modify reason modal
   */
  const [showReasonModal, setShowReasonModal] =
    useState(false);

  const [modifyReason, setModifyReason] =
    useState("");

  const [reasonError, setReasonError] =
    useState("");

  const [profileStatus, setProfileStatus] =
    useState("");

  /*
   * Submit modal
   */
  const [showConfirmModal, setShowConfirmModal] =
    useState(false);

  const [validationError, setValidationError] =
    useState("");

  const [saving, setSaving] = useState(false);

  const { user } = useAuth();
  const isRecruitingAdmin = String(user?.adminRole || '').toLowerCase() === 'recruitment';
  const { targetEmployeeId } = useAdminView() || {};

  const employeeId =
    targetEmployeeId ||
    user?.employeeId ||
    user?.id;

  const pageKey = "canEdit_profilework";

  const {
    canEdit,
    onboardingSubmitted,
    canEditDocuments,
    handleSubmit,
    requestPermission,
    showPermissionModal,
    openPermissionModal,
    closePermissionModal,
    permissionRequested,
    permissionGranted,
  } = useOnboardingPermissions(
    pageKey,
    "profileWork"
  );
  const areDocumentsReadOnly = !canEditDocuments;

  /*
   * ============================================================
   * STATE
   * ============================================================
   */

  const [presentEmployers, setPresentEmployers] =
    useState([createInitialEmployer()]);

  const [previousEmployers, setPreviousEmployers] =
    useState([createInitialEmployer()]);

  const [projectStatus, setProjectStatus] =
    useState("");

  /*
   * Standalone Client / Vendor / Prime Vendor.
   *
   * These MUST remain separate from presentEmployers[x].client
   */
  const [client, setClient] = useState(
    createEmptyDetail()
  );

  const [vendor, setVendor] = useState(
    createEmptyDetail()
  );

  const [primeVendor, setPrimeVendor] = useState(
    createEmptyDetail()
  );

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
      setReasonError(
        "Please enter a reason for modification."
      );
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
        (
          err?.response?.data?.error ||
          err?.message ||
          "unknown"
        )
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
          Authorization:
            `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const allEmployers = [
        ...presentEmployers.map((e, i) => ({
          file: e.docFile,
          name:
            `Present Employer ${i + 1} Document`,
          type:
            `present_employer_${i}`,
        })),

        ...previousEmployers.map((e, i) => ({
          file: e.docFile,
          name:
            `Previous Employer ${i + 1} Document`,
          type:
            `previous_employer_${i}`,
        })),
      ];

      for (
        const { file, name, type }
        of allEmployers
      ) {
        if (file?.url) {
          registerDocument({
            employeeId,
            name,
            url: file.url,
            filename: file.filename,
            originalName:
              file.originalName,
            document_type: type,
            fileData: file,
          }).catch(() => { });
        } else {
          api2
            .delete(
              `/documents/type/${encodeURIComponent(
                type
              )}`
            )
            .catch(() => { });
        }
      }
    } catch (err) {
      console.error(
        "Document sync failed:",
        err
      );
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
        throw new Error(
          "Missing employeeId in session"
        );
      }

      /*
       * IMPORTANT:
       * Use one centralized payload builder.
       */
      const payload =
        buildProfileWorkPayload({
          inProject,
          profileStatus,
          presentEmployers,
          previousEmployers,
          projectStatus,
          client,
          vendor,
          primeVendor,
        });

      console.log(
        "PROFILE WORK SAVE PAYLOAD:",
        payload
      );

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

      /*
       * Keep existing WorkClient behavior.
       */
      if (
        workClientRef.current?.saveDraft
      ) {
        await workClientRef.current.saveDraft();
      }

      await syncEmployerDocs();

      alert("Draft saved");
    } catch (err) {
      console.error(
        "Save failed:",
        err
      );

      alert(
        "Save failed: " +
        (
          err?.response?.data?.error ||
          err?.message ||
          "unknown"
        )
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
    let cancelled = false;

    async function loadData() {
      if (!employeeId) return;

      let onboardingRes = null;

      /*
       * --------------------------------------------------------
       * SERVER DATA
       * --------------------------------------------------------
       */

      try {
        onboardingRes =
          await getOnboarding(employeeId);

        if (cancelled) return;

        const empData =
          onboardingRes?.data?.employee;

        if (empData) {
          const currentProfileStatus =
            empData.profileStatus ||
            "On Bench";

          setProfileStatus(
            currentProfileStatus
          );

          setInProject(
            currentProfileStatus ===
              "In Project"
              ? "Yes"
              : "No"
          );
        }

        /*
         * ------------------------------------------------------
         * WORK EMPLOYERS
         * ------------------------------------------------------
         */

        const serverEmployers =
          onboardingRes?.data?.workEmployers;

        if (
          Array.isArray(serverEmployers) &&
          serverEmployers.length > 0
        ) {
          /*
           * PRESENT EMPLOYERS
           *
           * Only data attached to each present employer
           * is used here.
           */
          const present =
            serverEmployers
              .filter(
                (e) =>
                  e.type === "present"
              )
              .map((e) =>
                normalizeEmployer(e)
              );

          /*
           * PREVIOUS EMPLOYERS
           */
          const previous =
            serverEmployers
              .filter(
                (e) =>
                  e.type === "previous"
              )
              .map((e) =>
                normalizeEmployer(e)
              );

          if (
            present.length > 0
          ) {
            setPresentEmployers(
              present
            );
          }

          if (
            previous.length > 0
          ) {
            setPreviousEmployers(
              previous
            );
          }
        }

        /*
         * ------------------------------------------------------
         * STANDALONE CLIENT / VENDOR / PRIME VENDOR
         * ------------------------------------------------------
         *
         * IMPORTANT:
         * These are ONLY loaded into standalone state.
         *
         * They are never used to populate
         * presentEmployers[x].client/vendor/primeVendor.
         */
        const serverClients =
          onboardingRes?.data
            ?.workClientDetails;

        if (
          Array.isArray(
            serverClients
          ) &&
          serverClients.length > 0
        ) {
          const standaloneServerClients =
            serverClients.filter(
              (detail) =>
                !detail.meta
                  ?.employerType ||
                detail.meta
                  .employerType ===
                "standalone"
            );

          const c =
            standaloneServerClients.find(
              (x) =>
                x.type === "client"
            );

          const v =
            standaloneServerClients.find(
              (x) =>
                x.type === "vendor"
            );

          const p =
            standaloneServerClients.find(
              (x) =>
                x.type ===
                "primeVendor"
            );

          if (c) {
            setClient(
              normalizeStandaloneDetail(
                c
              )
            );
          }

          if (v) {
            setVendor(
              normalizeStandaloneDetail(
                v
              )
            );
          }

          if (p) {
            setPrimeVendor(
              normalizeStandaloneDetail(
                p
              )
            );
          }
        }
      } catch (err) {
        console.log(
          "Server data not available yet. Loading draft."
        );
      }

      /*
       * --------------------------------------------------------
       * LOAD DRAFT
       * --------------------------------------------------------
       */

      try {
        const draft =
          await getDraft(
            employeeId,
            "profileWork"
          );

        if (cancelled) return;

        const dp =
          draft?.data?.payload ||
          draft?.payload ||
          (draft?.tab === "profileWork" ? (draft?.data?.payload || draft?.data) : null) ||
          onboardingRes?.data?.drafts?.["profileWork"]?.payload ||
          onboardingRes?.data?.drafts?.["profileWork"]?.data?.payload;

        if (dp) {

          if (
            dp.inProject !==
            undefined
          ) {
            setInProject(
              dp.inProject
            );
          }

          if (
            dp.presentEmployers
          ) {
            const draftPresent =
              dp.presentEmployers.map(
                (emp) =>
                  normalizeEmployer(
                    emp
                  )
              );

            if (
              draftPresent.length >
              0
            ) {
              setPresentEmployers(
                draftPresent
              );
            }
          }

          if (
            dp.previousEmployers
          ) {
            const draftPrevious =
              dp.previousEmployers.map(
                (emp) =>
                  normalizeEmployer(
                    emp
                  )
              );

            if (
              draftPrevious.length >
              0
            ) {
              setPreviousEmployers(
                draftPrevious
              );
            }
          }

          if (
            dp.projectStatus !==
            undefined
          ) {
            setProjectStatus(
              dp.projectStatus
            );
          }

          /*
           * Standalone data only.
           */
          if (dp.client) {
            setClient(
              normalizeStandaloneDetail(
                dp.client
              )
            );
          }

          if (dp.vendor) {
            setVendor(
              normalizeStandaloneDetail(
                dp.vendor
              )
            );
          }

          if (dp.primeVendor) {
            setPrimeVendor(
              normalizeStandaloneDetail(
                dp.primeVendor
              )
            );
          }

          if (dp.profileStatus) {
            setProfileStatus(
              dp.profileStatus
            );
          }
        }
      } catch (err) {
        console.log(
          "No draft found."
        );
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
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
      setPresentEmployers(
        (prev) => {
          const list = [
            ...prev,
          ];

          list[idx] = {
            ...list[idx],
            [field]: value,
          };

          return list;
        }
      );
    } else {
      setPreviousEmployers(
        (prev) => {
          const list = [
            ...prev,
          ];

          list[idx] = {
            ...list[idx],
            [field]: value,
          };

          return list;
        }
      );
    }
  };

  const handleEmployerDocumentChange = (type, idx, file) => {
    handleEmployerChange(type, idx, 'docFile', file);
    const documentType = `${type}_employer_${idx}`;
    if (file?.url) {
      registerDocument({
        employeeId,
        name: `${type === 'present' ? 'Present' : 'Previous'} Employer ${idx + 1} Document`,
        url: file.url,
        filename: file.filename,
        originalName: file.originalName,
        document_type: documentType,
        fileData: file,
      }).catch(() => {});
    }
  };

  /*
   * IMPORTANT:
   * Nested details are updated inside the selected employer.
   */
  const handleEmployerNestedChange = (
    type,
    idx,
    section,
    field,
    value
  ) => {
    const update = (prev) => {
      const list = [
        ...prev,
      ];

      const employer = list[idx];

      list[idx] = {
        ...employer,

        [section]: {
          ...(
            employer?.[section] ||
            createEmptyDetail()
          ),

          [field]: value,
        },
      };

      return list;
    };

    if (type === "present") {
      setPresentEmployers(
        update
      );
    } else {
      setPreviousEmployers(
        update
      );
    }
  };

  const handleAddEmployer = (
    type
  ) => {
    if (isReadOnly) return;

    const newEmployer =
      createInitialEmployer();

    if (type === "present") {
      setPresentEmployers(
        (prev) => [
          ...prev,
          newEmployer,
        ]
      );
    } else {
      setPreviousEmployers(
        (prev) => [
          ...prev,
          newEmployer,
        ]
      );
    }
  };

  const handleDeletePreviousEmployer = (
    index
  ) => {
    if (isReadOnly) return;

    setPreviousEmployers(
      (prev) =>
        prev.filter(
          (_, i) =>
            i !== index
        )
    );
  };

  /*
   * ============================================================
   * OPEN EMPLOYER DETAILS
   * ============================================================
   */

  const openEmployerDetails = async (
    type,
    index,
    employer,
    detailType
  ) => {
    const key =
      `${type}-${index}`;

    if (
      activeEmployerDetails?.key ===
      key &&
      activeEmployerDetails?.detailType ===
      detailType
    ) {
      try {
        await workClientRef.current?.saveDraft?.();
      } catch (err) {
        console.error(
          "Unable to save employer details before closing:",
          err?.response?.data || err?.message || err
        );
        alert(
          "Unable to save details: " +
          (err?.response?.data?.error || err?.message || "unknown error")
        );
        return;
      }

      setActiveEmployerDetails(
        null
      );
      return;
    }

    /*
     * A single WorkClient instance is displayed at a time. Persist its
     * complete employer-specific draft before switching to another section
     * or employer so unmounting cannot discard detailed fields/documents.
     */
    if (activeEmployerDetails) {
      try {
        await workClientRef.current?.saveDraft?.();
      } catch (err) {
        console.error(
          "Unable to save employer details before switching:",
          err?.response?.data || err?.message || err
        );
        alert(
          "Unable to save details: " +
          (err?.response?.data?.error || err?.message || "unknown error")
        );
        return;
      }
    }

    const normalized =
      normalizeEmployer(
        employer
      );

    setActiveEmployerDetails({
      type,
      index,
      key,
      detailType,

      client: {
        ...normalized.client,
      },

      vendor: {
        ...normalized.vendor,
      },

      primeVendor: {
        ...normalized.primeVendor,
      },
    });
  };

  /*
   * ============================================================
   * OPEN STANDALONE DETAILS
   * ============================================================
   */

  const openStandaloneDetails =
    () => {
      const key =
        "standalone";

      if (
        activeEmployerDetails?.key ===
        key
      ) {
        setActiveEmployerDetails(
          null
        );
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
    const year =
      value.split("-")[0];

    if (
      year.length <= 4
    ) {
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

  const handleConfirmSubmit =
    async () => {
      setShowConfirmModal(
        false
      );

      setSaving(true);

      try {
        if (!employeeId) {
          throw new Error(
            "Missing employeeId"
          );
        }

        /*
         * IMPORTANT:
         * Submit uses exactly the same payload structure
         * as Save.
         */
        const payload =
          buildProfileWorkPayload({
            inProject,
            profileStatus,
            presentEmployers,
            previousEmployers,
            projectStatus,
            client,
            vendor,
            primeVendor,
          });

        console.log(
          "PROFILE WORK SUBMIT PAYLOAD:",
          payload
        );

        const body = {
          tab: "profileWork",
          payload,
          spouse: null,
          kids: [],
          documents: [],
        };

        /*
         * Persist ALL profileWork data first.
         */
        await saveOnboardingFull(
          employeeId,
          body,
          true
        );

        /*
         * Preserve existing WorkClient functionality.
         */
        if (
          workClientRef.current
            ?.saveDraft
        ) {
          await workClientRef.current.saveDraft();
        }

        await syncEmployerDocs();

        /*
         * Submit only after the complete payload
         * has successfully been saved.
         */
        await submitOnboarding(
          employeeId,
          "profileWork"
        );

        handleSubmit();

        alert(
          "Submitted successfully"
        );
      } catch (err) {
        console.error(
          "Submit failed",
          err?.response?.data ||
          err?.message ||
          err
        );

        const errs =
          err?.response?.data
            ?.errors;

        alert(
          "Submit failed:\n" +
          (
            Array.isArray(errs)
              ? errs
                .map(
                  (e) =>
                    e.msg
                )
                .join("\n")
              : err?.response?.data
                ?.error ||
              err?.message ||
              "unknown"
          )
        );
      } finally {
        setSaving(false);
      }
    };

  /*
   * ============================================================
   * READ ONLY
   * ============================================================
   */

  const isReadOnly =
    onboardingSubmitted &&
    !canEdit;
  const canSaveOrSubmit = !onboardingSubmitted || canEdit || canEditDocuments;

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6 font-employee">

      {/* ========================================================
          ORGANIZATION
      ======================================================== */}

      <div className="mb-6">

        {/* ======================================================
            PRESENT EMPLOYER
        ====================================================== */}

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
                    key={
                      employerKey
                    }
                    className={`mb-6 pb-6 ${idx !==
                      presentEmployers.length -
                      1
                      ? "border-b"
                      : ""
                      }`}
                  >

                    <div className="flex flex-col gap-6">

                      {/* Employer basic information */}

                      <div>

                        <div className="flex gap-2 mb-2">

                          <input
                            type="text"
                            placeholder="Name"
                            value={
                              emp.name
                            }
                            onChange={(
                              e
                            ) =>
                              handleEmployerChange(
                                "present",
                                idx,
                                "name",
                                e.target
                                  .value
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
                            onChange={(
                              e
                            ) =>
                              handleEmployerChange(
                                "present",
                                idx,
                                "designation",
                                e.target
                                  .value
                              )
                            }
                            className="border rounded px-2 py-1 flex-1"
                            disabled={isReadOnly}
                          />

                        </div>

                        <div className="flex gap-2 mb-2">

                          <input type="date"
                            
                            value={toDateInputValue(
                              emp.startDate
                            )}
                            min="1900-01-01"
                            max="9999-12-31"
                            className="border rounded px-2 py-1 text-sm"
                            onChange={(
                              e
                            ) =>
                              handleEmployerChange(
                                "present",
                                idx,
                                "startDate",
                                e.target
                                  .value
                              )
                            }
                            disabled={
                              isReadOnly
                            }
                          />

                          <input type="date"
                            
                            value={toDateInputValue(
                              emp.endDate
                            )}
                            min="1900-01-01"
                            max="9999-12-31"
                            className="border rounded px-2 py-1 text-sm"
                            onChange={(
                              e
                            ) =>
                              handleEmployerChange(
                                "present",
                                idx,
                                "endDate",
                                e.target
                                  .value
                              )
                            }
                            disabled={
                              isReadOnly
                            }
                          />

                        </div>

                        {/* File upload */}

                        <div className="flex flex-col mb-2">

                          {!isRecruitingAdmin && <FileUploadField
                            label="Document Upload:"
                            employeeId={
                              employeeId
                            }
                            category={`present_employer_${idx}`}
                            documentName={`Present Employer ${idx + 1
                              } Document`}
                            value={
                              emp.docFile
                            }
                            onChange={(
                              fileInfo
                            ) =>
                              handleEmployerDocumentChange("present", idx, fileInfo)
                            }
                            disabled={areDocumentsReadOnly}
                          />}

                          <EmpTypography.small className="text-gray-500 mt-1">
                            Upload all
                            job-related
                            docs –
                            Offer
                            Letters,
                            Payslips,
                            H1b
                            approval
                            copies,
                            OPT/CPT,
                            ALL
                            I-20's,
                            EAD Copies, Experience Letter, I-140, Approval Copy
                          </EmpTypography.small>

                        </div>
                      </div>

                      {/* The existing current-project choice belongs to the
                          present-employer section and is intentionally shown
                          once, after its document-upload area. */}
                      {idx === 0 && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <EmpTypography.label>
                            In Project? <span className="text-red-500">*</span>
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
                                saveOnboarding(employeeId, "profileWork", { profileStatus: "In Project" })
                                  .catch(err => console.error(err));
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
                                saveOnboarding(employeeId, "profileWork", { profileStatus: "On Bench" })
                                  .catch(err => console.error(err));
                              }}
                              disabled={isReadOnly}
                            />
                            No
                          </label>
                        </div>
                      )}

                      {/* ==================================================
                          PRESENT EMPLOYER CLIENT / VENDOR / PRIME VENDOR
                          ================================================== */}

                      {inProject === "Yes" && (
                        <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* CLIENT */}

                        <div className="order-3">

                          <EmpTypography.label>
                            Client Details:
                          </EmpTypography.label>

                          <input
                            type="text"
                            value={
                              emp.client
                                ?.name ||
                              ""
                            }
                            placeholder="Enter client name"
                            className="border p-1 w-full"
                            onChange={(
                              e
                            ) =>
                              handleEmployerNestedChange(
                                "present",
                                idx,
                                "client",
                                "name",
                                e.target
                                  .value
                              )
                            }
                            disabled={
                              isReadOnly
                            }
                          />

                          <div>

                            <EmpTypography.h2>
                              Start Date:
                            </EmpTypography.h2>

                            <input type="date"
                              
                              value={toDateInputValue(
                                emp.client
                                  ?.startDate
                              )}
                              min="1900-01-01"
                              max="9999-12-31"
                              className="border p-1 w-full"
                              onChange={(
                                e
                              ) =>
                                handleEmployerNestedChange(
                                  "present",
                                  idx,
                                  "client",
                                  "startDate",
                                  e.target
                                    .value
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

                            <input type="date"
                              
                              value={toDateInputValue(
                                emp.client
                                  ?.endDate
                              )}
                              min="1900-01-01"
                              max="9999-12-31"
                              className="border p-1 w-full"
                              onChange={(
                                e
                              ) =>
                                handleEmployerNestedChange(
                                  "present",
                                  idx,
                                  "client",
                                  "endDate",
                                  e.target
                                    .value
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
                                emp,
                                "client"
                              )
                            }
                          >
                            <EmpTypography.small>
                              View Details
                              &gt;&gt;
                            </EmpTypography.small>
                          </EmpTypography.button>

                        </div>

                        {/* VENDOR */}

                        <div className="order-1">

                          <EmpTypography.label>
                            Vendor Details:
                          </EmpTypography.label>

                          <input
                            type="text"
                            value={
                              emp.vendor
                                ?.name ||
                              ""
                            }
                            placeholder="Enter vendor name"
                            className="border p-1 w-full"
                            onChange={(
                              e
                            ) =>
                              handleEmployerNestedChange(
                                "present",
                                idx,
                                "vendor",
                                "name",
                                e.target
                                  .value
                              )
                            }
                            disabled={
                              isReadOnly
                            }
                          />

                          <div>

                            <EmpTypography.h2>
                              Start Date:
                            </EmpTypography.h2>

                            <input type="date"
                              
                              value={toDateInputValue(
                                emp.vendor
                                  ?.startDate
                              )}
                              min="1900-01-01"
                              max="9999-12-31"
                              className="border p-1 w-full"
                              onChange={(
                                e
                              ) =>
                                handleEmployerNestedChange(
                                  "present",
                                  idx,
                                  "vendor",
                                  "startDate",
                                  e.target
                                    .value
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

                            <input type="date"
                              
                              value={toDateInputValue(
                                emp.vendor
                                  ?.endDate
                              )}
                              min="1900-01-01"
                              max="9999-12-31"
                              className="border p-1 w-full"
                              onChange={(
                                e
                              ) =>
                                handleEmployerNestedChange(
                                  "present",
                                  idx,
                                  "vendor",
                                  "endDate",
                                  e.target
                                    .value
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
                                emp,
                                "vendor"
                              )
                            }
                          >
                            <EmpTypography.small>
                              View Details
                              &gt;&gt;
                            </EmpTypography.small>
                          </EmpTypography.button>

                        </div>

                        {/* PRIME VENDOR */}

                        <div className="order-2">

                          <EmpTypography.label>
                            Prime Vendor Details:
                          </EmpTypography.label>

                          <input
                            type="text"
                            value={
                              emp
                                .primeVendor
                                ?.name ||
                              ""
                            }
                            placeholder="Enter prime vendor name"
                            className="border p-1 w-full"
                            onChange={(
                              e
                            ) =>
                              handleEmployerNestedChange(
                                "present",
                                idx,
                                "primeVendor",
                                "name",
                                e.target
                                  .value
                              )
                            }
                            disabled={
                              isReadOnly
                            }
                          />

                          <div>

                            <EmpTypography.h2>
                              Start Date:
                            </EmpTypography.h2>

                            <input type="date"
                              
                              value={toDateInputValue(
                                emp
                                  .primeVendor
                                  ?.startDate
                              )}
                              min="1900-01-01"
                              max="9999-12-31"
                              className="border p-1 w-full"
                              onChange={(
                                e
                              ) =>
                                handleEmployerNestedChange(
                                  "present",
                                  idx,
                                  "primeVendor",
                                  "startDate",
                                  e.target
                                    .value
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

                            <input type="date"
                              
                              value={toDateInputValue(
                                emp
                                  .primeVendor
                                  ?.endDate
                              )}
                              min="1900-01-01"
                              max="9999-12-31"
                              className="border p-1 w-full"
                              onChange={(
                                e
                              ) =>
                                handleEmployerNestedChange(
                                  "present",
                                  idx,
                                  "primeVendor",
                                  "endDate",
                                  e.target
                                    .value
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
                                emp,
                                "primeVendor"
                              )
                            }
                          >
                            <EmpTypography.small>
                              View Details
                              &gt;&gt;
                            </EmpTypography.small>
                          </EmpTypography.button>

                        </div>

                      </div>

                      {/* WorkClient for Present Employer */}

                      {isDetailsOpen && (
                        <div className="mt-4">

                          <WorkClient
                            key={`${employerKey}-${activeEmployerDetails.detailType}`}
                            detailType={
                              activeEmployerDetails.detailType
                            }
                            ref={
                              workClientRef
                            }
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
                            parentPrime={
                              activeEmployerDetails.primeVendor
                            }
                            parentPrimeVendor={
                              activeEmployerDetails.primeVendor
                            }
                            employerType="present"
                            employerIndex={
                              idx
                            }
                            documentsReadOnly={areDocumentsReadOnly}
                            draftTab={`workClient-present-${idx}`}
                            useParentDataOnly
                          />

                        </div>
                      )}
                        </>
                      )}

                    </div>

                    {idx !==
                      presentEmployers.length -
                      1 && (
                        <hr className="border-t-4 border-gray-800 mt-8" />
                      )}

                  </div>
                );
              }
            )}

          </div>

        {/* ======================================================
            PREVIOUS EMPLOYER
        ====================================================== */}

        <div>

          <EmpTypography.label className="text-lg font-bold mb-4">
            Previous Employer <span className="text-red-500">
              *</span>
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
                  key={
                    employerKey
                  }
                  className={`mb-6 pb-6 ${idx !==
                    previousEmployers.length -
                    1
                    ? "border-b"
                    : ""
                    }`}
                >

                  {/* Employer name/designation */}

                  <div className="flex gap-2 mb-2">

                    <input
                      type="text"
                      placeholder="Name"
                      value={
                        emp.name
                      }
                      onChange={(
                        e
                      ) =>
                        handleEmployerChange(
                          "previous",
                          idx,
                          "name",
                          e.target
                            .value
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
                      onChange={(
                        e
                      ) =>
                        handleEmployerChange(
                          "previous",
                          idx,
                          "designation",
                          e.target
                            .value
                        )
                      }
                      className="border rounded px-2 py-1 flex-1"
                      disabled={isReadOnly}
                    />

                  </div>

                  {/* Dates */}

                  <div className="flex gap-2 mb-2">

                    <input type="date"
                      
                      value={toDateInputValue(
                        emp.startDate
                      )}
                      min="1900-01-01"
                      max="9999-12-31"
                      onChange={(
                        e
                      ) =>
                        handleEmployerChange(
                          "previous",
                          idx,
                          "startDate",
                          e.target
                            .value
                        )
                      }
                      className="border rounded px-2 py-1 text-sm"
                      disabled={
                        isReadOnly
                      }
                    />

                    <input type="date"
                      
                      value={toDateInputValue(
                        emp.endDate
                      )}
                      min="1900-01-01"
                      max="9999-12-31"
                      onChange={(
                        e
                      ) =>
                        handleEmployerChange(
                          "previous",
                          idx,
                          "endDate",
                          e.target
                            .value
                        )
                      }
                      className="border rounded px-2 py-1 text-sm"
                      disabled={
                        isReadOnly
                      }
                    />

                  </div>

                  {/* File Upload */}

                  <div className="flex flex-col mb-2">

                    {!isRecruitingAdmin && <FileUploadField
                      label="Document Upload:"
                      employeeId={
                        employeeId
                      }
                      category={`previous_employer_${idx}`}
                      documentName={`Previous Employer ${idx + 1
                        } Document`}
                      value={
                        emp.docFile
                      }
                      onChange={(
                        fileInfo
                      ) =>
                        handleEmployerDocumentChange("previous", idx, fileInfo)
                      }
                      disabled={areDocumentsReadOnly}
                    />}

                    <EmpTypography.small className="text-gray-500 mt-1">
                      Upload all
                      job-related
                      docs –
                      Offer
                      Letters,
                      Payslips,
                      H1b
                      approval
                      copies,
                      OPT/CPT,
                      ALL
                      I-20's,
                      EAD Copies, Experience Letter, I-140, Approval Copy
                    </EmpTypography.small>

                  </div>

                  {/* Previous employer client / vendor / prime vendor */}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      ["Vendor", "vendor", "Enter vendor name"],
                      ["Prime Vendor", "primeVendor", "Enter prime vendor name"],
                      ["Client", "client", "Enter client name"],
                    ].map(([label, detailType, placeholder]) => (
                      <div key={detailType}>
                        <EmpTypography.label>{label} Details:</EmpTypography.label>

                        <input
                          type="text"
                          value={emp[detailType]?.name || ""}
                          placeholder={placeholder}
                          className="border p-1 w-full"
                          onChange={(e) =>
                            handleEmployerNestedChange(
                              "previous",
                              idx,
                              detailType,
                              "name",
                              e.target.value
                            )
                          }
                          disabled={isReadOnly}
                        />

                        <div>
                          <EmpTypography.h2>Start Date:</EmpTypography.h2>
                          <input type="date"
                            
                            value={toDateInputValue(emp[detailType]?.startDate)}
                            min="1900-01-01"
                            max="9999-12-31"
                            className="border p-1 w-full"
                            onChange={(e) =>
                              handleEmployerNestedChange(
                                "previous",
                                idx,
                                detailType,
                                "startDate",
                                e.target.value
                              )
                            }
                            disabled={isReadOnly}
                          />
                        </div>

                        <div>
                          <EmpTypography.h2>End Date:</EmpTypography.h2>
                          <input type="date"
                            
                            value={toDateInputValue(emp[detailType]?.endDate)}
                            min="1900-01-01"
                            max="9999-12-31"
                            className="border p-1 w-full"
                            onChange={(e) =>
                              handleEmployerNestedChange(
                                "previous",
                                idx,
                                detailType,
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
                          onClick={() =>
                            openEmployerDetails(
                              "previous",
                              idx,
                              emp,
                              detailType
                            )
                          }
                        >
                          <EmpTypography.small>
                            View Details &gt;&gt;
                          </EmpTypography.small>
                        </EmpTypography.button>
                      </div>
                    ))}
                  </div>

                  {isDetailsOpen && (
                    <div className="mt-4 mb-6">
                      <WorkClient
                        key={`${employerKey}-${activeEmployerDetails.detailType}`}
                        ref={workClientRef}
                        goBack={() => setActiveEmployerDetails(null)}
                        parentClient={activeEmployerDetails.client}
                        parentVendor={activeEmployerDetails.vendor}
                        parentPrime={activeEmployerDetails.primeVendor}
                        parentPrimeVendor={activeEmployerDetails.primeVendor}
                        employerType="previous"
                        employerIndex={idx}
                        documentsReadOnly={areDocumentsReadOnly}
                        draftTab={`workClient-previous-${idx}`}
                        detailType={activeEmployerDetails.detailType}
                        useParentDataOnly
                      />
                    </div>
                  )}

                  {/* Add / Delete */}

                  <div className="flex justify-between items-center mt-2">

                    <EmpTypography.button
                      variant="primary"
                      onClick={() =>
                        handleAddEmployer(
                          "previous"
                        )
                      }
                      disabled={
                        isReadOnly
                      }
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
                          disabled={
                            isReadOnly
                          }
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
          STANDALONE WORK CLIENT
      ======================================================== */}

      {activeEmployerDetails?.key ===
        "standalone" && (
          <div className="mt-6">

            <WorkClient
              ref={
                workClientRef
              }
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
              parentPrime={
                activeEmployerDetails.primeVendor
              }
              parentPrimeVendor={
                activeEmployerDetails.primeVendor
              }
              employerType="standalone"
              employerIndex={-1}
              documentsReadOnly={areDocumentsReadOnly}
              draftTab="workClient"
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

        {(
          canSaveOrSubmit
        ) && (
            <EmpTypography.button
              variant="primary"
              onClick={
                handleSave
              }
              disabled={
                saving
              }
            >
              {saving
                ? "Saving..."
                : "Save"}
            </EmpTypography.button>
          )}

        {(
          canSaveOrSubmit
        ) && (
            <EmpTypography.button
              variant="primary"
              onClick={() =>
                setShowConfirmModal(
                  true
                )
              }
              disabled={
                saving
              }
            >
              Submit
            </EmpTypography.button>
          )}

        {onboardingSubmitted &&
          !canEditDocuments &&
          !permissionGranted && (
            <EmpTypography.button
              variant="primary"
              onClick={
                handleModify
              }
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
              Before submitting,
              please review.
              Any changes after
              submission will
              require admin
              permission.
            </div>

            <div className="flex gap-2 justify-end">

              <EmpTypography.button
                onClick={
                  handleConfirmSubmit
                }
                disabled={
                  saving
                }
              >
                {saving
                  ? "Submitting..."
                  : "Confirm"}
              </EmpTypography.button>

              <EmpTypography.button
                onClick={() =>
                  setShowConfirmModal(
                    false
                  )
                }
                disabled={
                  saving
                }
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
              What do you want
              to modify?
            </div>

            <textarea
              className="border rounded w-full p-2 mb-2"
              rows={3}
              value={
                modifyReason
              }
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
                  Do you want to
                  request
                  permission from
                  admin to modify
                  this page?
                </div>
              )}

            {permissionRequested &&
              !permissionGranted && (
                <div className="mb-4 text-sm text-blue-600">
                  Requesting
                  permission
                  from admin...
                </div>
              )}

            {permissionGranted && (
              <div className="mb-4 text-sm text-green-600">
                Permission
                granted! You can
                now edit and save
                this page.
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
