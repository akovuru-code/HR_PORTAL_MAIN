# Employee Profile Education - Design Document

## 1. Overview
This document describes the design for the Employee Profile Education screen, covering frontend, backend, and database, based on the requirements and UI style in the provided screenshot.

---

## 2. Frontend Design

### 2.1 UI Structure
- **Header**: Shows user info, search bar, and settings icon.
- **Profile Card**: Displays employee photo, name, SSN, visa status, organization, client info, and status (Active).
- **Navigation Tabs**: Personal Info, Onboard Docs, Work Info, Education (active), Resume & Skills, Documents, Invoices.
- **Education Details Section**: Fields for Degree, University, Major, Year of Completion, Address. Document upload with Add button for multiple entries.
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
- Modular forms and table for easy addition of new education or certification types.
- API and DB designed for future expansion (e.g., more document types).

---

## 7. UI/UX Notes
- Match the attached screenshot for layout, icons, and toggles.
- Use tooltips for action icons.
- Use modals for permission requests.
- Ensure accessibility and responsive design.

---
This design ensures a robust, secure, and user-friendly Employee Profile Education screen, as specified in the requirements and UI reference.
