# Employee Profile Invoices - Design Document

## 1. Overview
This document describes the design for the Employee Profile Invoices screen, covering frontend, backend, and database, based on the requirements and UI style in the provided screenshot. This screen is only accessible to admins; employees cannot view invoice details.

---

## 2. Frontend Design

### 2.1 UI Structure
- **Header**: Shows user info, search bar, and settings icon.
- **Profile Card**: Displays employee photo, name, SSN, visa status, organization, client info, and status (Active).
- **Navigation Tabs**: Personal Info, Onboard Docs, Work Info, Education, Resume & Skills, Documents, Invoices (active).
- **Invoice Submission Section**: Form or section for submitting invoice details (fields can be added as needed for invoice number, date, amount, status, etc.).
- **Submit Button**: Green button at the bottom of the screen for submitting invoice details.
- **Styling**: Match the attached screenshot for layout, spacing, icons, and section separation. Use rounded corners, light backgrounds, and clear section headers.
- **Access Control**: Hide this screen and its details from employees; only admins can access.

### 2.2 Component Breakdown
- `ProfileHeader`: Employee info and status.
- `TabsNav`: Navigation tabs.
- `InvoiceFormSection`: Invoice fields and submit button.
- `PermissionRequestModal`: Modal for employees to request data override (if needed for future extensibility).

### 2.3 Validation & Feedback
- Show error messages for required fields.
- Show success messages for submissions and permission requests.
- Disable editing for employees after data is saved, unless admin permission is granted.

---

## 3. Backend Design

### 3.1 API Endpoints
- `GET /api/invoices/:employeeId` — Get all invoice details for an employee (admin only).
- `POST /api/invoices/:employeeId` — Submit or update invoice details (admin only).
- `POST /api/invoices/:employeeId/request-override` — Request admin permission to override data (for future extensibility).
- `GET /api/invoices/:employeeId/permissions` — Get override request status.
- `GET /api/invoices/:employeeId/history` — Get invoice submission and change history.
- `POST /api/invoices/:employeeId/status` — Update invoice status (submitted, approved, paid, etc.).
- `POST /api/invoices/:employeeId/notify` — Notify employees/admins about invoice status or permission requests.

### 3.2 Permissions Logic
- Only admins can view, submit, or update invoice details.
- Employees cannot access or view invoice details.
- Data is locked for employees after saving; override only possible with admin permission.
- Notify employees/admins of status and permission changes.

---

## 4. Database Design

### 4.1 Tables/Collections
- **Invoices**
  - id
  - employeeId
  - invoiceNumber
  - invoiceDate
  - amount
  - status (submitted/approved/paid)
  - submittedBy (admin)
  - lastModified
- **OverrideRequests**
  - id
  - employeeId
  - section (invoices)
  - status (pending/approved/denied)
  - requestedAt
  - resolvedAt
- **InvoiceHistory**
  - id
  - invoiceId
  - action (created/updated/statusChanged)
  - performedBy
  - timestamp

---

## 5. Security & Permissions
- Only allow admins to view and edit invoice details.
- Employees cannot access invoice data.
- All submissions and changes are logged for audit.
- Sensitive info encrypted at rest.

---

## 6. Extensibility
- Modular forms and tables for easy addition of new invoice fields or status types.
- API and DB designed for future expansion (e.g., invoice attachments, multi-step approval).

---

## 7. UI/UX Notes
- Match the attached screenshot for layout, icons, and toggles.
- Use tooltips for action icons.
- Use modals for permission requests (if needed).
- Ensure accessibility and responsive design.
- Provide clear feedback for all actions.

---
This design ensures a robust, secure, and admin-controlled Employee Profile Invoices screen, as specified in the requirements and UI reference, with suggested improvements for extensibility and auditability.
