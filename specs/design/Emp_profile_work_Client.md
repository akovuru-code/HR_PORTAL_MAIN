# Employee Profile Work Client - Design Document

## 1. Overview
This document describes the design for the Employee Profile Work Client screen, covering frontend, backend, and database, based on the requirements and UI style in the provided screenshot.

---

## 2. Frontend Design

### 2.1 UI Structure
- **Header**: Shows user info, search bar, and settings icon.
- **Profile Card**: Displays employee photo, name, SSN, visa status, organization, client info, and status (Active).
- **Current Status**: Editable field for the current status of the client engagement.
- **Client Information Section**: Fields for client name, address, work email, manager email, manager phone, remote work location. Document upload (MSA, Client Letter, Other Documents) with Add button for multiple entries.
- **Vendor Information Section**: Fields for vendor name, start/end date, address, parent name, email, FIN/C, and document types (COI, Vendor DOC, MSA, PO). Document upload with Add button for multiple entries.
- **Prime Vendor Information Section**: Field for prime vendor name. Document upload (MSA, PO, PV Letter) with Add button for multiple entries.
- **Back/Save Button**: For navigation and saving changes.
- **Styling**: Match the attached screenshot for layout, spacing, icons, and section separation. Use rounded corners, light backgrounds, and clear section headers.

### 2.2 Component Breakdown
- `ProfileHeader`: Employee info and status.
- `CurrentStatusField`: Editable status field.
- `ClientInfoSection`: Client info fields and document upload.
- `VendorInfoSection`: Vendor info fields and document upload.
- `PrimeVendorInfoSection`: Prime vendor info and document upload.
- `PermissionRequestModal`: Modal for requesting admin override.
- Use tooltips and icons for document actions.

### 2.3 Navigation
- This screen is only accessible when a user clicks the "View Details" button in the Emp_profile_work screen.

### 2.4 Validation & Feedback
- Show error messages for required fields.
- Show success messages for uploads, saves, and permission requests.
- Disable upload button if document is locked.

---

## 3. Backend Design

### 3.1 API Endpoints
- `GET /api/work-client/:entityType/:entityId` — Get all info and documents for the selected client, vendor, or prime vendor.
- `POST /api/work-client/:entityType/:entityId/upload` — Upload a document (if allowed).
- `POST /api/work-client/:entityType/:entityId/request-override` — Request admin permission to override a document.
- `POST /api/work-client/:entityType/:entityId/status` — Update current status.
- `GET /api/work-client/:entityType/:entityId/permissions` — Get override request status.
- `GET /api/work-client/:entityType/:entityId/download/:docId` — Download a document.

### 3.2 Permissions Logic
- Block upload if document is already uploaded and not unlocked by admin.
- Allow override only if admin has granted permission (tracked per document).
- Notify user of permission status.

---

## 4. Database Design

### 4.1 Tables/Collections
- **WorkClientEntities**
  - id
  - employeeId
  - entityType (client/vendor/primeVendor)
  - name
  - address
  - email
  - phone
  - parentName (vendor only)
  - finc (vendor only)
  - remoteWorkLocation (client only)
  - startDate
  - endDate
  - currentStatus
  - lastModified
- **WorkClientDocuments**
  - id
  - entityId
  - entityType
  - documentType (MSA, Client Letter, COI, Vendor DOC, PO, PV Letter, etc.)
  - documentUrl
  - status (locked/unlocked)
  - lastModified
  - overrideRequested (bool)
  - overrideGranted (bool)
- **OverrideRequests**
  - id
  - entityId
  - entityType
  - documentId
  - status (pending/approved/denied)
  - requestedAt
  - resolvedAt

---

## 5. Security & Permissions
- Only allow users to upload if permitted.
- Only admin can unlock documents for override.
- All uploads virus-scanned and validated.
- Sensitive info encrypted at rest.

---

## 6. Extensibility
- Modular forms and table for easy addition of new document or entity types.
- API and DB designed for future expansion (e.g., more document types).

---

## 7. UI/UX Notes
- Match the attached screenshot for layout, icons, and toggles.
- Use tooltips for action icons.
- Use modals for permission requests.
- Ensure accessibility and responsive design.

---
This design ensures a robust, secure, and user-friendly Employee Profile Work Client screen, as specified in the requirements and UI reference.
