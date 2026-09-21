# Employee Profile Education - Design Document

## 1. Overview
This document describes the design for the Employee Profile Education screen, covering frontend, backend, and database, based on the requirements and UI style in the provided screenshot.

---

## 2. Frontend Design

### 2.1 UI Structure
- **Header**: Shows user info, search bar, and settings icon.
- **Profile Card**: Displays employee photo, name, SSN, visa status, organization, client info, and status (Active).
- **Navigation Tabs**: Personal Info, Onboard Docs, Work Info, Education (active), Resume & Skills, Documents, Invoices.
- **Education Details Section**: Five fixed cards ordered Master's, Degree, Bachelor's, Class 12th, High School. Each uses the existing Degree card's rounded border, shadow, padding, responsive fields, and document upload. Fields are Degree, University, Major, Address, Start Date, and End Date. Education Add/Delete controls are removed.
- **Legacy qualifications**: Explicit saved levels take priority; recognizable older qualifications map to their level. Ambiguous and duplicate records remain editable in an existing-qualifications area inside the Degree card. Additional saved documents remain available as links.
- **Certifications Section**: Fields for Certificate Name, Organization, Attachment. Document upload with Add button for multiple entries. List of uploaded certificates with file name.
- **Evaluation Section**: File upload field for evaluation documents.
- **Styling**: Match the attached screenshot for layout, spacing, icons, and section separation. Use rounded corners, light backgrounds, and clear section headers.

### 2.2 Component Breakdown
- `ProfileHeader`: Employee info and status.
- `TabsNav`: Navigation tabs.
- `EducationDetailsSection`: Education info fields and document upload.
- `CertificationsSection`: Certification info fields, document upload, and list.
- `EvaluationSection`: Evaluation document upload.
- `PermissionRequestModal`: Modal for requesting admin override.
- Use tooltips and icons for document actions.

### 2.3 Validation & Feedback
- Show error messages for required fields.
- Show success messages for uploads, saves, and permission requests.
- Disable upload button if document is locked.

---

## 3. Backend Design

### 3.1 API Endpoints
- `GET /api/education/:employeeId` — Get all education, certification, and evaluation info for employee.
- `POST /api/education/:employeeId/education-doc` — Upload an education document (if allowed).
- `POST /api/education/:employeeId/certification` — Add or update a certification entry.
- `POST /api/education/:employeeId/certification-doc` — Upload a certification document (if allowed).
- `POST /api/education/:employeeId/evaluation` — Upload an evaluation document (if allowed).
- `POST /api/education/:employeeId/request-override` — Request admin permission to override a document.
- `GET /api/education/:employeeId/permissions` — Get override request status.
- `GET /api/education/:employeeId/download/:docId` — Download a document.

### 3.2 Permissions Logic
- Block upload if document is already uploaded and not unlocked by admin.
- Allow override only if admin has granted permission (tracked per document).
- Notify employee of permission status.

---

## 4. Database Design

### 4.1 Tables/Collections
- **EducationDetails**
  - id
  - employeeId
  - educationLevel (nullable; stored as `educations.education_level`, independent of degree text)
  - degree
  - university
  - major
  - yearOfCompletion
  - address
  - documentUrl
  - status (locked/unlocked)
  - lastModified
  - overrideRequested (bool)
  - overrideGranted (bool)
- **Certifications**
  - id
  - employeeId
  - certificateName
  - organization
  - documentUrl
  - status (locked/unlocked)
  - lastModified
  - overrideRequested (bool)
  - overrideGranted (bool)
- **Evaluations**
  - id
  - employeeId
  - documentUrl
  - status (locked/unlocked)
  - lastModified
  - overrideRequested (bool)
  - overrideGranted (bool)
- **OverrideRequests**
  - id
  - employeeId
  - documentId
  - section (education/certification/evaluation)
  - status (pending/approved/denied)
  - requestedAt
  - resolvedAt

---

## 5. Security & Permissions
- Only allow employees to upload if permitted.
- Only admin can unlock documents for override.
- All uploads virus-scanned and validated.
- Sensitive info encrypted at rest.

---

## 6. Extensibility
- Education levels are fixed; certification and evaluation entries retain their existing independent controls.
- API and DB designed for future expansion (e.g., more document types).

### Education persistence and rollout
- Apply `HR-Backend/migrations/20260919_education_levels.sql` before deploying the updated backend. The additive migration leaves existing rows and associations intact; it does not backfill guessed levels.
- `src/utils/educationPersistence.js` updates education records by employee-scoped identity, with level matching for new fixed cards. Omitted legacy records and additional uploads are retained.
- Certification changes preserve existing associations; the UI sends explicit deleted certification IDs rather than interpreting omissions in older drafts as deletions.
- Drafts without level identifiers remain supported. A blank new card is a UI placeholder, not a stored qualification.
- The existing onboarding endpoints and submission transaction remain in use. The employee page and active admin details page share the same Education component.

---

## 7. UI/UX Notes
- Match the attached screenshot for layout, icons, and toggles.
- Use tooltips for action icons.
- Use modals for permission requests.
- Ensure accessibility and responsive design.

---
This design ensures a robust, secure, and user-friendly Employee Profile Education screen, as specified in the requirements and UI reference.
