# Employee Profile Documents - Design Document

## 1. Overview
This document describes the design for the Employee Profile Documents screen, covering frontend, backend, and database, based on the requirements and UI style in the provided screenshot.

---

## 2. Frontend Design

### 2.1 UI Structure
- **Header**: Shows user info, search bar, and settings icon.
- **Profile Card**: Displays employee photo, name, SSN, visa status, organization, client info, and status (Active).
- **Navigation Tabs**: Personal Info, Onboard Docs, Work Info, Education, Resume & Skills, Documents (active), Invoices.
- **Documents Filter Section**: Dropdown for category type, file upload, and Result button to filter documents.
- **Documents Table**: Table with columns for S.No, File Name, Expiry Date, Modified By, and Document actions (download, view, upload). Shows only documents visible to employees.
- **Restricted Documents Table**: Separate table for documents only visible to admins, with the same columns and actions.
- **Styling**: Match the attached screenshot for layout, spacing, icons, and section separation. Use rounded corners, light backgrounds, and clear section headers.
- **Improvements**: Support drag-and-drop file upload, bulk upload/download, and document expiry notifications.

### 2.2 Component Breakdown
- `ProfileHeader`: Employee info and status.
- `TabsNav`: Navigation tabs.
- `DocumentsFilterSection`: Category dropdown, file upload, and filter result.
- `DocumentsTable`: Table for employee-visible documents.
- `RestrictedDocumentsTable`: Table for admin-only documents.
- `PermissionRequestModal`: Modal for requesting admin override.
- Use tooltips and icons for document actions.

### 2.3 Validation & Feedback
- Show error messages for required fields.
- Show success messages for uploads, saves, and permission requests.
- Disable upload button if document is locked.
- Show document expiry notifications.

---

## 3. Backend Design

### 3.1 API Endpoints
- `GET /api/documents/:employeeId` — Get all documents for employee, separated by visibility (employee/admin).
- `POST /api/documents/:employeeId/upload` — Upload a document (if allowed).
- `POST /api/documents/:employeeId/request-override` — Request admin permission to override a document.
- `GET /api/documents/:employeeId/permissions` — Get override request status.
- `GET /api/documents/:employeeId/download/:docId` — Download a document.
- `POST /api/documents/:employeeId/bulk-upload` — Bulk upload documents.
- `GET /api/documents/:employeeId/bulk-download` — Bulk download documents.
- `GET /api/documents/:employeeId/expiry-notifications` — Get document expiry notifications.

### 3.2 Permissions Logic
- Block upload if document is already uploaded and not unlocked by admin.
- Allow override only if admin has granted permission (tracked per document).
- Notify employee of permission status.
- Restrict access to admin-only documents for employees.

---

## 4. Database Design

### 4.1 Tables/Collections
- **Documents**
  - id
  - employeeId
  - fileName
  - fileUrl
  - categoryType
  - expiryDate
  - modifiedBy
  - isRestricted (bool)
  - status (locked/unlocked)
  - lastModified
  - overrideRequested (bool)
  - overrideGranted (bool)
- **OverrideRequests**
  - id
  - employeeId
  - documentId
  - status (pending/approved/denied)
  - requestedAt
  - resolvedAt
- **DocumentExpiryNotifications**
  - id
  - employeeId
  - documentId
  - expiryDate
  - notified (bool)
  - notificationDate

---

## 5. Security & Permissions
- Only allow employees to upload if permitted.
- Only admin can unlock documents for override.
- All uploads virus-scanned and validated.
- Sensitive info encrypted at rest.
- Restrict access to admin-only documents for employees.

---

## 6. Extensibility
- Modular tables and forms for easy addition of new document types.
- API and DB designed for future expansion (e.g., more document types, notification features).

---

## 7. UI/UX Notes
- Match the attached screenshot for layout, icons, and toggles.
- Use tooltips for action icons.
- Use modals for permission requests.
- Ensure accessibility and responsive design.
- Support drag-and-drop file upload and bulk document management.
- Provide document expiry notifications to users.

---
This design ensures a robust, secure, and user-friendly Employee Profile Documents screen, as specified in the requirements and UI reference, with suggested improvements for usability.
