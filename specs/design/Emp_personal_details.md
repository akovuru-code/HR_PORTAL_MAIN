# Employee Personal Details Design

## 1. Overview
This document describes the design for the Employee Personal Details feature, based on the requirements in `emp_personal_requirement.md` and the attached UI screenshot. The design covers frontend, backend, and database layers, ensuring seamless navigation, robust data handling, and a pixel-perfect user interface.

---

## 2. Frontend Design

### 2.1 Navigation & Routing
- Use React Router to define a shared onboarding route (`/onboarding/EmpPersonalDetails`) accessible to both admin and employee roles.
- Sidebar links for both roles should point to this route for "Onboarding".
- Add fallback redirects from `/admin/onboarding` and `/employee/onboarding` to `/onboarding/EmpPersonalDetails`.

### 2.2 Component Structure
- **EmpPersonalDetails.jsx**: Main component rendering the personal details form and all sections.
- **Tabs/Buttons**: Rendered at the top for navigation between Personal Info, Onboard Docs, Work Info, Education, Resumes & Skills, Documents, and Invoices. Use a tab or button group UI component.
- **Profile Summary Card**: Fixed at the top, displaying Name, SSN, Visa Status, Organization, Client Name, Work Email, Work Location, Completion Date, and Status. Includes an Edit button.
- **Section Components**:
	- Personal Info: All fields as per screenshot, including file uploads.
	- Spouse Information: Toggleable section, all fields and file uploads.
	- Kids Information: Toggleable, repeatable section, all fields and file uploads. Add button for multiple entries.
	- Emergency Contact Info: Toggleable section, all fields (no radio button for toggle).
- **Toggles**: Use switch components for enabling/disabling Spouse, Kids, and Emergency Contact sections.
- **File Uploads**: Use styled file input controls for document uploads in each section.
- **Validation**: Required fields marked with * must be validated before submission.
- **Styling**: Use CSS (or Tailwind CSS) to match the attached screenshot for layout, spacing, font, and color.
- **Responsiveness**: Ensure layout adapts to desktop and tablet screens.

### 2.3 State Management
- Use React state/hooks to manage form data, toggles, and file uploads.
- Use controlled components for all form fields.
- Maintain arrays for kids' information and uploaded files.

### 2.4 API Integration
- Fetch and populate employee details on component mount.
- Submit updates via API on save.
- Handle file uploads via API endpoints.
- Show error/success messages as appropriate.

---

## 3. Backend Design

### 3.1 API Endpoints
- **GET /api/onboarding/personal-details**: Fetch employee personal details (auth required).
- **PUT /api/onboarding/personal-details**: Update employee personal details (auth required).
- **POST /api/onboarding/documents**: Upload document files for any section.
- **GET /api/onboarding/documents/:id**: Download document files.
- All endpoints require authentication and role check (employee or admin).
- Validate and sanitize all incoming data.

### 3.2 Business Logic
- Toggle fields (spouse, kids, emergency contact) are boolean in the data model.
- Support multiple kids' entries per employee.
- Enforce required fields and file upload constraints.
- No radio button logic for emergency contact toggle.
- Store file metadata and provide download URLs.

---

## 4. Database Design

### 4.1 Schema
- **employee_personal_details**: Stores main personal info fields.
- **employee_spouse_info**: Linked by employee ID, stores spouse details.
- **employee_kids_info**: Linked by employee ID, supports multiple entries.
- **employee_emergency_contact**: Linked by employee ID, stores emergency contact info.
- **employee_documents**: Linked by employee ID and section, stores file metadata.
- Boolean fields for toggles (spouse_enabled, kids_enabled, emergency_contact_enabled).
- No field for emergency contact radio button.

### 4.2 Relationships
- Use foreign keys to link related tables to the main employee record.
- Enforce referential integrity and required fields.

---

## 5. Security & Validation
- All API endpoints require authentication.
- Only allow access to personal details for the logged-in employee or admin.
- Validate all required fields and file types on backend.
- Sanitize all user input to prevent injection attacks.
- Store files securely and restrict access to authorized users.

---

## 6. Error Handling & UX
- Show clear error messages for validation and upload failures.
- Show success messages on successful save/upload.
- Disable Save button until all required fields are valid.
- Show loading indicators during API calls.

---

## 7. Accessibility
- All form controls, toggles, and buttons must be accessible via keyboard and screen readers.
- Use proper labels and ARIA attributes.

---

## 8. Exclusions
- No radio button for toggling Emergency Contact section.
- No access to personal details for unauthenticated users.

---

## 9. UI Reference
- All UI and styling must match the attached screenshot for Emp_personal_details.

---

*End of design document.*
# Emp_personal_details Design Document

## 1. Overview
This document provides the design for the Employee Personal Details Management System as described in the requirements. It covers UI structure, data models, API endpoints, and validation logic.

## 2. UI Design

### 2.1 Main Employee Profile Section
- **Profile Picture**: Circular image with edit overlay (click to upload/change photo).
- **Basic Info**: Display fields for Name, SSN, Visa Status, Organization.
- **Client Info**: Fields for Client Name, Work Email, Manager, Completion Date.
- **Actions**: Buttons for Active/Inactive toggle, Edit, and a settings (gear) icon.

### 2.2 Navigation Tabs
- Tabs: Personal Info (default), Onboard, Work Info, Education, Resume & Skills, Documents, Invoices.

### 2.3 Personal Information Form
- **Fields**: First Name, Mobile No (with country code), Email ID, Date of Birth, Present Address, Marital Status, SSN, Driving License, Nationality, Visa Status, Visa Expire Date, DL Expire Date, Passport Number, Passport Expire Date, Document Upload (3 files).
- **Validation**: Required fields, email format, phone format, date pickers, secure input for SSN.

### 2.4 Spouse Information Section
- **Toggle**: Show/hide section.
- **Fields**: First/Middle/Last Name, Mobile No, Email ID, Date of Birth, Present Address, Nationality, SSN, Driving License, Passport Number, Visa Status, Visa Expire Date, DL Expire Date, Passport Expire Date, Document Upload, Occupation, Marriage Certificate upload.

### 2.5 Kids Information Section
- **Toggle**: Show/hide section.
- **Add Button**: Add multiple children.
- **Fields**: First/Middle/Last Name, Date of Birth, Nationality, SSN, Passport Number, Visa Status, Passport Expire Date, Visa Expire Date, Document Upload.

### 2.6 Emergency Contact Section
- **Toggle**: Show/hide section.
- **Fields**: First/Middle/Last Name, Mobile No, Email.

## 3. Data Model

### 3.1 Employee
- id: string
- photoUrl: string
- name: string
- ssn: string
- visaStatus: string
- organization: string
- client: { name: string, workEmail: string, manager: string, completionDate: Date }
- personalInfo: { ...fields as above }
- spouseInfo: { enabled: boolean, ...fields as above }
- kids: [ { ...fields as above } ]
- emergencyContact: { enabled: boolean, ...fields as above }
- documents: [ { type: string, url: string } ]

## 4. API Endpoints

- `GET /api/employees/:id` - Fetch employee details
- `POST /api/employees` - Create new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

## 5. Validation Logic
- All required fields must be filled
- Email fields must be valid emails
- Phone numbers must match country code and format
- Dates must be valid and not in the future (where applicable)
- SSN and other sensitive fields must be securely handled
- File uploads must accept only allowed types (PDF, JPG, PNG)

## 6. Security
- Sensitive data (SSN, documents) must be encrypted in storage
- File uploads must be virus scanned and validated
- Role-based access for editing/viewing personal details

## 7. Error Handling
- User-friendly error messages for validation and server errors
- Logging for failed operations

## 8. Extensibility
- Modular form sections for easy addition/removal of fields
- API designed for future expansion (e.g., more document types)

---
This design ensures the Employee Personal Details Management System is robust, secure, and user-friendly, meeting all requirements from the provided specification.
