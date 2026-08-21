# Employee Profile Onboard Documents - Design Document

## 1. Overview
This document describes the design for the Employee Profile Onboard Documents screen, covering frontend, backend, and database, based on the requirements and UI style in the provided screenshot.

---

## 2. Frontend Design

### 2.1 UI Structure
- **Header**: Shows user info, search bar, and settings icon.
- **Profile Card**: Displays employee photo, name, SSN, visa status, organization, client info, and status (Active).
- **Navigation Tabs**: Personal Info, Onboard Docs (active), Work Info, Education, Resume & Skills, Documents, Invoices.
- **Documents Table**: Columns for S.No, File Name, Template, Modified By, Document (actions: download, view, upload).
- **Bank Details Section**: Toggle to show/hide. Fields: Bank Name, ACC No, Routing No, Account Type (dropdown).
- **Insurance Section**: Toggle to show/hide. Fields: Whom to add, Type of Insurance, Type for Spouse, Type for Children, Total members (all dropdowns).
- **Styling**: Use a clean, modern look with rounded corners, light backgrounds, and clear section separation. Match the attached screenshot for layout, spacing, and icon usage.

### 2.2 Component Breakdown
- `ProfileHeader`: Employee info and status.
- `TabsNav`: Navigation tabs.
- `DocumentsTable`: Table with upload/download/view actions. Disable upload if already uploaded unless admin permission is granted.
- `BankDetailsForm`: Toggleable section with validation.
- `InsuranceForm`: Toggleable section with validation.
- `PermissionRequestModal`: Modal for requesting admin override.
- Use tooltips and icons for document actions.

### 2.3 Validation & Feedback
- Show error messages for required fields.
- Show success messages for uploads, saves, and permission requests.
- Disable upload button if document is locked.

---

## 3. Backend Design

### 3.1 API Endpoints
- `GET /api/onboard-docs/:employeeId` — Get all onboard docs, bank, and insurance info for employee.
- `POST /api/onboard-docs/:employeeId/upload` — Upload a document (if allowed).
- `POST /api/onboard-docs/:employeeId/request-override` — Request admin permission to override a document.
- `POST /api/onboard-docs/:employeeId/bank` — Save or update bank details.
- `POST /api/onboard-docs/:employeeId/insurance` — Save or update insurance info.
- `GET /api/onboard-docs/:employeeId/permissions` — Get override request status.
- `GET /api/onboard-docs/:employeeId/download/:docId` — Download a document.

### 3.2 Permissions Logic
- Block upload if document is already uploaded and not unlocked by admin.
- Allow override only if admin has granted permission (tracked per document).
- Notify employee of permission status.

---

## 4. Database Design

### 4.1 Tables/Collections
- **EmployeeDocuments**
  - id
  - employeeId
  - fileName
  - templateLink
  - modifiedBy
  - documentUrl
  - status (locked/unlocked)
  - lastModified
  - overrideRequested (bool)
  - overrideGranted (bool)
- **BankDetails**
  - id
  - employeeId
  - bankName
  - accNo
  - routingNo
  - accountType
  - lastModified
- **InsuranceDetails**
  - id
  - employeeId
  - whomToAdd
  - insuranceType
  - spouseInsuranceType
  - childrenInsuranceType
  - totalMembers
  - lastModified
- **OverrideRequests**
  - id
  - employeeId
  - documentId
  - status (pending/approved/denied)
  - requestedAt
  - resolvedAt

---

## 5. Security & Permissions
- Only allow employees to upload if permitted.
- Only admin can unlock documents for override.
- All uploads virus-scanned and validated.
- Sensitive info (bank, insurance) encrypted at rest.

---

## 6. Extensibility
- Modular forms and table for easy addition of new document types or fields.
- API and DB designed for future expansion (e.g., more insurance types).

---

## 7. UI/UX Notes
- Match the attached screenshot for layout, icons, and toggles.
- Use tooltips for action icons.
- Use modals for permission requests.
- Ensure accessibility and responsive design.

---
This design ensures a robust, secure, and user-friendly Employee Profile Onboard Documents screen, as specified in the requirements and UI reference.
