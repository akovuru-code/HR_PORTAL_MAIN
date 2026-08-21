# Employee Profile Resume & Skills - Design Document

## 1. Overview
This document describes the design for the Employee Profile Resume & Skills screen, covering frontend, backend, and database, based on the requirements and UI style in the provided screenshot.

---

## 2. Frontend Design

### 2.1 UI Structure
- **Header**: Shows user info, search bar, and settings icon.
- **Profile Card**: Displays employee photo, name, SSN, visa status, organization, client info, and status (Active).
- **Navigation Tabs**: Personal Info, Onboard Docs, Work Info, Education, Resume & Skills (active), Documents, Invoices.
- **Filter Resume/CV Section**: Dropdown for category type, file upload, and Result button to filter resumes.
- **Resume/CV Section**: Shows uploaded Resume/CV file name, file upload, and preview/summary. Prevents override unless admin permission is granted.
- **Cover Letter Section**: Shows uploaded Cover Letter file name, file upload, and preview/summary. Prevents override unless admin permission is granted.
- **Skills Section**: Text area for entering and editing skills. Save button for skills.
- **Styling**: Match the attached screenshot for layout, spacing, icons, and section separation. Use rounded corners, light backgrounds, and clear section headers.
- **Improvements**: Support multiple Resume/CV and Cover Letter uploads, drag-and-drop file upload, and skills suggestion based on resume content.

### 2.2 Component Breakdown
- `ProfileHeader`: Employee info and status.
- `TabsNav`: Navigation tabs.
- `ResumeFilterSection`: Category dropdown, file upload, and filter result.
- `ResumeSection`: Resume upload, file name, and preview.
- `CoverLetterSection`: Cover letter upload, file name, and preview.
- `SkillsSection`: Skills text area and save button.
- `PermissionRequestModal`: Modal for requesting admin override.
- Use tooltips and icons for document actions.

### 2.3 Validation & Feedback
- Show error messages for required fields.
- Show success messages for uploads, saves, and permission requests.
- Disable upload button if document is locked.
- Show preview or summary of uploaded files.

---

## 3. Backend Design

### 3.1 API Endpoints
- `GET /api/skills/:employeeId` — Get all resume, cover letter, and skills info for employee.
- `POST /api/skills/:employeeId/resume` — Upload a Resume/CV file (if allowed).
- `POST /api/skills/:employeeId/cover-letter` — Upload a Cover Letter file (if allowed).
- `POST /api/skills/:employeeId/skills` — Save or update skills info.
- `POST /api/skills/:employeeId/request-override` — Request admin permission to override a document.
- `GET /api/skills/:employeeId/permissions` — Get override request status.
- `GET /api/skills/:employeeId/download/:docId` — Download a document.
- `POST /api/skills/:employeeId/filter-resume` — Filter resumes by category and file.

### 3.2 Permissions Logic
- Block upload if document is already uploaded and not unlocked by admin.
- Allow override only if admin has granted permission (tracked per document).
- Notify employee of permission status.

---

## 4. Database Design

### 4.1 Tables/Collections
- **Resumes**
  - id
  - employeeId
  - fileName
  - fileUrl
  - categoryType
  - isActive (bool)
  - summary
  - status (locked/unlocked)
  - lastModified
  - overrideRequested (bool)
  - overrideGranted (bool)
- **CoverLetters**
  - id
  - employeeId
  - fileName
  - fileUrl
  - isActive (bool)
  - summary
  - status (locked/unlocked)
  - lastModified
  - overrideRequested (bool)
  - overrideGranted (bool)
- **Skills**
  - id
  - employeeId
  - skillsText
  - suggestions (array)
  - lastModified
- **OverrideRequests**
  - id
  - employeeId
  - documentId
  - section (resume/coverLetter)
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
- Modular forms and table for easy addition of new resume or cover letter types.
- API and DB designed for future expansion (e.g., more document types, skills suggestions).

---

## 7. UI/UX Notes
- Match the attached screenshot for layout, icons, and toggles.
- Use tooltips for action icons.
- Use modals for permission requests.
- Ensure accessibility and responsive design.
- Support drag-and-drop file upload and multiple file management.
- Provide skills suggestions based on resume parsing.

---
This design ensures a robust, secure, and user-friendly Employee Profile Resume & Skills screen, as specified in the requirements and UI reference, with suggested improvements for usability.
