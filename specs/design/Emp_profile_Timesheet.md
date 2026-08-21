# Employee Profile Timesheet - Design Document

## 1. Overview
This document describes the design for the Employee Profile Timesheet screens (Day, Week, Month, and Leave Request), covering frontend, backend, and database, based on the requirements and UI style in the provided screenshots.

---

## 2. Frontend Design

### 2.1 UI Structure
- **Sidebar**: Navigation for Dashboard, Onboarding, Payroll, Timesheet, Help, and Settings.
- **Header**: Search bar, user info, and notifications.
- **Timesheet Tab**: Three main views: Day, Week, and Month, selectable via toggle buttons.
- **Day View**: Shows each day of the week, total hours, and a large "New Time Entry" button. Modal for new entry with Date, Time, Project Type, Project, and Notes. Start Timer option.
- **Week View**: Shows each day of the week, total hours, and buttons for "Add Time Row" and "Copy Last Week Time". Modal for adding a time row with Project Time and Project selection. Editable time grid for each project.
- **Month View**: Calendar grid for the month, with hours per day. Summary section for Hours, Approval Status, Client Approval Status, and Utilization.
- **Leave Request**: Modal for submitting leave with Date, Reason, and Attachment. Status display for leave requests.
- **Styling**: Match the attached screenshots for layout, spacing, icons, and section separation. Use modern, clean UI with clear buttons and modals.
- **Improvements**: Support drag-and-drop file upload for leave attachments, bulk time entry, and notifications.

### 2.2 Component Breakdown
- `SidebarNav`: Main navigation.
- `HeaderBar`: Search, user info, notifications.
- `TimesheetTabs`: Day/Week/Month toggle.
- `DayView`: Daily time entry and summary.
- `WeekView`: Weekly time entry, add/copy row, and summary.
- `MonthView`: Monthly calendar and summary.
- `TimeEntryModal`: Modal for new/edit time entry.
- `AddTimeRowModal`: Modal for adding a time row (week view).
- `LeaveRequestModal`: Modal for leave requests.
- `SummarySection`: Hours, approval, and utilization summary.
- `PermissionRequestModal`: Modal for requesting admin override.

### 2.3 Validation & Feedback
- Show error messages for required fields.
- Show success messages for submissions and permission requests.
- Disable editing for submitted timesheets unless admin permission is granted.
- Show leave request status and notifications.

---

## 3. Backend Design

### 3.1 API Endpoints
- `GET /api/timesheet/:employeeId?view=day|week|month` — Get timesheet data for the selected view.
- `POST /api/timesheet/:employeeId/entry` — Add or update a time entry.
- `POST /api/timesheet/:employeeId/submit` — Submit timesheet for approval.
- `POST /api/timesheet/:employeeId/request-override` — Request admin permission to override a submitted timesheet.
- `GET /api/timesheet/:employeeId/permissions` — Get override request status.
- `POST /api/timesheet/:employeeId/leave-request` — Submit a leave request.
- `GET /api/timesheet/:employeeId/leave-status` — Get leave request status.
- `GET /api/timesheet/:employeeId/summary` — Get summary data (hours, approval, utilization).
- `POST /api/timesheet/:employeeId/copy-last-week` — Copy last week's time entries.
- `POST /api/timesheet/:employeeId/notify` — Notify employees/admins about timesheet or leave status.

### 3.2 Permissions Logic
- Block editing of submitted timesheets unless admin permission is granted.
- Allow override only if admin has granted permission (tracked per timesheet/entry).
- Notify employees/admins of status and permission changes.
- Only allow employees to edit their own timesheets.
- Admins can view, approve, or reject timesheets and leave requests.

---

## 4. Database Design

### 4.1 Tables/Collections
- **TimesheetEntries**
  - id
  - employeeId
  - date
  - hours
  - projectType
  - projectId
  - notes
  - status (draft/submitted/approved/rejected)
  - createdAt
  - updatedAt
  - overrideRequested (bool)
  - overrideGranted (bool)
- **TimesheetSummaries**
  - id
  - employeeId
  - weekStart
  - weekEnd
  - totalHours
  - billableHours
  - nonBillableHours
  - timeOff
  - utilization
  - approvalStatus
  - clientApprovalStatus
- **LeaveRequests**
  - id
  - employeeId
  - date
  - reason
  - attachmentUrl
  - status (pending/approved/denied)
  - createdAt
  - updatedAt
- **OverrideRequests**
  - id
  - employeeId
  - timesheetEntryId
  - status (pending/approved/denied)
  - requestedAt
  - resolvedAt
- **AuditLogs**
  - id
  - employeeId
  - action
  - details
  - timestamp

---

## 5. Security & Permissions
- Only allow employees to edit their own timesheets.
- Only allow editing of submitted timesheets with admin permission.
- All submissions and changes are logged for audit.
- Sensitive info encrypted at rest.

---

## 6. Extensibility
- Modular forms and tables for easy addition of new time entry or leave types.
- API and DB designed for future expansion (e.g., overtime, project billing, advanced reporting).

---

## 7. UI/UX Notes
- Match the attached screenshots for layout, icons, and toggles.
- Use tooltips for action icons.
- Use modals for permission and leave requests.
- Ensure accessibility and responsive design.
- Provide clear feedback for all actions.
- Support drag-and-drop file upload and bulk time entry.
- Provide notifications and reminders for timesheet and leave actions.

---
This design ensures a robust, secure, and user-friendly Employee Profile Timesheet module, as specified in the requirements and UI reference, with suggested improvements for usability, extensibility, and admin control.
