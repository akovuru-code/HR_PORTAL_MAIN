# Employee Personal Details Requirements (EARS Format)

## Introduction
This document specifies the requirements for the Employee Personal Details feature in the HR system, covering frontend, backend, and database aspects. The requirements are based on the attached UI screenshot and user flow. The feature must ensure that when an employee logs in and clicks "Onboarding" in the sidebar, they are navigated to the Employee Personal Details screen, which matches the provided UI and styling. The emergency contact section must not use a radio button.

---

## 1. Frontend Requirements

### 1.1 Navigation & Access
- The system shall display the Employee Personal Details screen when a user with the employee role clicks "Onboarding" in the sidebar.
- The system shall ensure that both admin and employee roles can access the onboarding section, but the Employee Personal Details screen is shown by default for employees.

### 1.2 UI & Styling
- The system shall render the Employee Personal Details screen with a layout, fields, and styling matching the attached screenshot.
- The system shall display the following sections as tabs or buttons:
  - Personal Info
  - Onboard Docs
  - Work Info
  - Education
  - Resumes & Skills
  - Documents
  - Invoices
- The system shall display a profile summary card at the top with fields for Name, SSN, Visa Status, Organization, Client Name, Work Email, Work Location, Completion Date, and Status (Active).
- The system shall provide an Edit button for the profile summary card.
- The system shall display the following sections with their respective fields:
  - Personal Info (with all fields as shown, including file uploads)
  - Spouse Information (toggleable, with all fields as shown, including file uploads)
  - Kids Information (toggleable, repeatable, with all fields as shown, including file uploads)
  - Emergency Contact Info (toggleable, with all fields as shown, but without a radio button)
- The system shall use toggles (switches) for enabling/disabling Spouse, Kids, and Emergency Contact sections, not radio buttons.
- The system shall use file input controls for document uploads as shown.
- The system shall use consistent spacing, font sizes, and colors as per the screenshot.

### 1.3 Form Behavior
- The system shall allow users to add multiple kids' information entries.
- The system shall validate required fields (marked with *) before allowing submission.
- The system shall allow uploading of documents for each section as shown.
- The system shall not use a radio button for the Emergency Contact section toggle.

---

## 2. Backend Requirements

### 2.1 API Endpoints
- The system shall provide RESTful API endpoints for:
  - Fetching employee personal details (GET)
  - Updating employee personal details (PUT/PATCH)
  - Uploading and retrieving documents for each section (POST/GET)
- The system shall ensure that only authenticated users with the employee or admin role can access these endpoints.
- The system shall validate and sanitize all input data.
- The system shall support file uploads for document fields, storing file metadata and providing download URLs.

### 2.2 Business Logic
- The system shall allow toggling of Spouse, Kids, and Emergency Contact sections in the data model.
- The system shall support multiple kids' entries per employee.
- The system shall enforce required fields as per the frontend.
- The system shall not require or process a radio button value for Emergency Contact.

---

## 3. Database Requirements

### 3.1 Schema
- The system shall store employee personal details in a dedicated table (e.g., `employee_personal_details`).
- The system shall store spouse information in a related table (e.g., `employee_spouse_info`), linked by employee ID.
- The system shall store kids' information in a related table (e.g., `employee_kids_info`), supporting multiple entries per employee.
- The system shall store emergency contact information in a related table (e.g., `employee_emergency_contact`), linked by employee ID.
- The system shall store document metadata (file name, path, upload date, etc.) in a related table (e.g., `employee_documents`).
- The system shall include boolean fields to indicate if Spouse, Kids, and Emergency Contact sections are enabled for each employee.
- The system shall not include any field for an emergency contact radio button.

### 3.2 Constraints
- The system shall enforce referential integrity between employee and related tables.
- The system shall enforce required fields at the database level where appropriate.
- The system shall support efficient querying and updating of all personal details and related information.

---

## 4. Non-Functional Requirements
- The system shall ensure all personal and document data is securely stored and transmitted.
- The system shall provide responsive UI for desktop and tablet devices.
- The system shall provide clear error messages for validation and upload failures.
- The system shall ensure accessibility for all form controls and toggles.

---

## 5. Exclusions
- The system shall not use a radio button for toggling the Emergency Contact section.
- The system shall not allow access to personal details for unauthenticated users.

---

## 6. Acceptance Criteria
- When an employee logs in and clicks "Onboarding", the Employee Personal Details screen is shown with the exact layout and styling as the screenshot.
- All fields, toggles, and file uploads work as shown.
- No radio button is present for Emergency Contact.
- Data is correctly stored, retrieved, and updated via the backend and database.

---

*End of requirements.*
