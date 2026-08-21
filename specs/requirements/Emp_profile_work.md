# Employee Profile Work Info - EARS Requirements

## Overview
This document specifies the requirements for the Employee Profile Work Info screen using the EARS (Easy Approach to Requirements Syntax) format, covering frontend, backend, and database. The UI and styling must match the attached screenshot.

## 1. Organization & Experience Management
- When an employee accesses the Work Info screen, the system shall display sections for Present Employer and Previous Employer, each with fields for employer name, start/end date, designation, and experience letter upload status.
- The system shall allow the employee to upload documents (Payslips, H1B approvals, Other Documents) for each employer, if not already uploaded.
- When a document is uploaded and saved, the system shall prevent the employee from overriding or replacing the document.
- If the employee wishes to override or update a document after it is saved, the system shall require the employee to submit a request for admin permission.
- When the admin grants permission, the system shall allow the employee to upload a new version of the document.
- The system shall display checkboxes for uploaded document types (Payslips, H1B approval copies, I-797, EAD copies) and their status.
- The system shall allow employees to add multiple employer entries (present and previous) using an Add button.

## 2. Project Assignment
- The system shall display a dropdown for "In project/Not" status.
- The system shall allow the employee to select their current project status from the dropdown.

## 3. Client, Vendor, and Prime Vendor Details
- The system shall display sections for Client, Vendor, and Prime Vendor (if any), each with fields for name, start/end date, and a link to view details.
- The system shall allow the employee to view details for each entity by clicking the "View Details" link.

## 4. Permissions and Restrictions
- The system shall prevent employees from overriding or replacing uploaded documents unless admin permission is granted.
- The system shall provide a mechanism for employees to request override permission from the admin.
- The system shall notify the employee when permission is granted or denied.

## 5. Usability
- The system shall provide clear feedback for successful uploads, saves, and permission requests.
- The system shall display all fields and actions in a user-friendly and accessible manner.
- The UI and styling shall match the attached screenshot, including layout, icons, and section separation.

---
This requirements document is based on the provided UI screenshot and user description, using the EARS format for clarity and completeness.
