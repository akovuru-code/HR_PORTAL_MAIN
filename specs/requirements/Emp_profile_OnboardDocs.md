# Employee Profile Onboard Documents - EARS Requirements

## Overview
This document specifies the requirements for the Employee Profile Onboard Documents screen using the EARS (Easy Approach to Requirements Syntax) format.

## 1. Document Management
- When an employee accesses the Onboard Documents screen, the system shall display a table of required documents with columns for S.No, File Name, Template, Modified By, and Document actions (download, view, upload).
- The system shall allow the employee to upload documents for each required file, if not already uploaded.
- When a document is uploaded and saved, the system shall prevent the employee from overriding or replacing the document.
- If the employee wishes to override or update a document after it is saved, the system shall require the employee to submit a request for admin permission.
- When the admin grants permission, the system shall allow the employee to upload a new version of the document.
- The system shall allow employees to download and view any document listed in the table.
- The system shall display the name of the user who last modified each document.

## 2. Bank Details Section
- When the Bank Details toggle is enabled, the system shall display input fields for Bank Name, Account Number, Routing Number, and Account Type.
- The system shall require all bank detail fields to be filled before saving.
- The system shall allow the employee to edit and save their bank details.

## 3. Insurance Section
- When the Insurance toggle is enabled, the system shall display input fields for:
  - Whom to add (dropdown)
  - Type of Insurance (dropdown)
  - Type of Insurance for Spouse (dropdown)
  - Type of Insurance for Children (dropdown)
  - Total number of members with insurance (dropdown)
- The system shall require all insurance fields to be filled before saving.
- The system shall allow the employee to edit and save their insurance information.

## 4. Permissions and Restrictions
- The system shall prevent employees from overriding or replacing uploaded documents unless admin permission is granted.
- The system shall provide a mechanism for employees to request override permission from the admin.
- The system shall notify the employee when permission is granted or denied.

## 5. Usability
- The system shall provide clear feedback for successful uploads, saves, and permission requests.
- The system shall display all fields and actions in a user-friendly and accessible manner.

---
This requirements document is based on the provided UI screenshot and user description, using the EARS format for clarity and completeness.
