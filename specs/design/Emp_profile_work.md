# Employee Profile Work Info - Design Document

## 1. Overview
This document describes the design for the Employee Profile Work Info screen, covering frontend, backend, and database, based on the requirements and UI style in the provided screenshot.

---

## 2. Frontend Design

### 2.1 UI Structure
- **Header**: Shows user info, search bar, and settings icon.
- **Profile Card**: Displays employee photo, name, SSN, visa status, organization, client info, and status (Active).
- **Navigation Tabs**: Personal Info, Onboard Docs, Work Info (active), Education, Resume & Skills, Documents, Invoices.
- **Organization Section**: Two columns for Present Employer and Previous Employer, each with:
  - Employer name, start/end date, designation
  - Experience letter upload status
  - Checkboxes for Payslips, H1B approval copies, I-797, EAD copies
  - Document upload (disabled if already uploaded unless admin permission granted)
  - Add button for multiple entries
- **Project Assignment**: Dropdown for "In project/Not" status.
- **Client/Vendor/Prime Vendor Details**: Three columns with name, start/end date, and "View Details" link for each.
- **Styling**: Match the attached screenshot for layout, spacing, icons, and section separation. Use rounded corners, light backgrounds, and clear section headers.

### 2.2 Component Breakdown
- `ProfileHeader`: Employee info and status.
- `TabsNav`: Navigation tabs.
- `EmployerSection`: Handles present/previous employer entries, document upload, and checkboxes.
- `ProjectStatusDropdown`: Dropdown for project status.
- `EntityDetails`: For Client, Vendor, Prime Vendor info and details link.
- `PermissionRequestModal`: Modal for requesting admin override.
- Use tooltips and icons for document actions.

### 2.3 Validation & Feedback
- Show error messages for required fields.
- Show success messages for uploads, saves, and permission requests.
- Disable upload button if document is locked.

---

## 3. Backend Design

### 3.1 API Endpoints
- `GET /api/work-info/:employeeId` — Get all work info, employer entries, and project status for employee.
- `POST /api/work-info/:employeeId/employer` — Add or update employer entry (present/previous).
- `POST /api/work-info/:employeeId/upload` — Upload a document (if allowed).
- `POST /api/work-info/:employeeId/request-override` — Request admin permission to override a document.
- `GET /api/work-info/:employeeId/permissions` — Get override request status.
- `GET /api/work-info/:employeeId/download/:docId` — Download a document.

### 3.2 Permissions Logic
- Block upload if document is already uploaded and not unlocked by admin.
- Allow override only if admin has granted permission (tracked per document).
- Notify employee of permission status.

---

## 4. Database Design

### 4.1 Tables/Collections
- **EmployerEntries**
  - id
  - employeeId
  - type (present/previous)
  - employerName
  - startDate
  - endDate
  - designation
  - payslipsUploaded (bool)
  - h1bApprovalUploaded (bool)
  - i797Uploaded (bool)
  - eadUploaded (bool)
  - documentUrl
  - status (locked/unlocked)
  - lastModified
  - overrideRequested (bool)
  - overrideGranted (bool)
- **ProjectStatus**
  - id
  - employeeId
  - inProject (bool)
  - lastModified
- **EntityDetails**
  - id
  - employeeId
  - type (client/vendor/primeVendor)
  - name
  - startDate
  - endDate
  - detailsUrl
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
- Sensitive info encrypted at rest.

---

## 6. Extensibility
- Modular forms and table for easy addition of new employer or document types.
- API and DB designed for future expansion (e.g., more document types).

---

## 7. UI/UX Notes
- Match the attached screenshot for layout, icons, and toggles.
- Use tooltips for action icons.
- Use modals for permission requests.
- Ensure accessibility and responsive design.

---
This design ensures a robust, secure, and user-friendly Employee Profile Work Info screen, as specified in the requirements and UI reference.
