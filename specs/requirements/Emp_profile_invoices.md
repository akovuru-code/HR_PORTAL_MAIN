# Employee Profile Invoices - EARS Requirements

## Overview
This document specifies the requirements for the Employee Profile Invoices screen using the EARS (Easy Approach to Requirements Syntax) format, covering frontend, backend, and database. The UI and styling must match the attached screenshot. This screen is only accessible to admins; employees cannot view invoice details.

## 1. Access Control
- The system shall allow only admins to access and view the Invoices screen and its details.
- The system shall prevent employees from viewing or accessing the Invoices screen and its details.

## 2. Invoice Submission
- When an admin accesses the Invoices screen, the system shall display a form or section for submitting invoice details.
- The system shall display a Submit button at the bottom of the screen.
- The system shall allow the admin to submit invoice details for an employee.

## 3. Data Locking and Override
- When an employee completes all tabs and clicks Save, the system shall lock the data for all tabs, including invoices, preventing further changes by the employee.
- If the employee wishes to change any data after saving, the system shall require the employee to submit a request for admin permission.
- When the admin grants permission, the system shall unlock the relevant data for editing by the employee.
- The system shall notify the employee when permission is granted or denied.

## 4. Permissions and Restrictions
- The system shall prevent employees from overriding or changing any data after it is saved, unless admin permission is granted.
- The system shall provide a mechanism for employees to request override permission from the admin.

## 5. Usability
- The system shall provide clear feedback for successful submissions, saves, and permission requests.
- The system shall display all fields and actions in a user-friendly and accessible manner.
- The UI and styling shall match the attached screenshot, including layout, icons, and section separation.

## 6. Modifications & Improvements
- The system should support invoice status tracking (e.g., submitted, approved, paid).
- The system should allow admins to view a history of invoice submissions and changes.
- The system should provide notifications to employees and admins regarding invoice status and permission requests.

---
This requirements document is based on the provided UI screenshot and user description, using the EARS format for clarity and completeness, with suggested improvements for usability and admin control.
