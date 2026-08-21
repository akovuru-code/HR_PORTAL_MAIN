# Employee Profile Timesheet - EARS Requirements

## Overview
This document specifies the requirements for the Employee Profile Timesheet screens using the EARS (Easy Approach to Requirements Syntax) format, covering frontend, backend, and database. The UI and styling must match the attached screenshots. The timesheet tab provides three options: Day, Week, and Month views, and includes leave request functionality.

## 1. Timesheet Entry (Day/Week/Month)
- When an employee accesses the Timesheet tab, the system shall display options to view and fill timesheets by Day, Week, or Month.
- The system shall display a calendar or grid for the selected view, showing each day of the period and total hours.
- The system shall allow the employee to add a new time entry by clicking the "New Time Entry" button (Day view) or "Add Time Row" (Week view).
- The system shall display a modal or side panel for entering time details, including Date, Time (hours), Project Type, Project, and Notes.
- The system shall allow the employee to start a timer for time tracking.
- The system shall allow the employee to copy last week's time entries (Week view).
- The system shall display a summary of hours (billable, non-billable, time off), client approval status, and utilization percentage (Week/Month view).
- The system shall allow the employee to edit or delete time entries before submitting.
- The system shall allow the employee to submit the timesheet for approval.
- When a timesheet is submitted, the system shall prevent the employee from overriding or editing the data unless admin permission is granted.
- If the employee wishes to override or update a submitted timesheet, the system shall require the employee to submit a request for admin permission.
- When the admin grants permission, the system shall allow the employee to edit the timesheet.

## 2. Leave Request
- The system shall allow the employee to submit a leave request from the Timesheet tab.
- The system shall display a modal for leave request entry, including Date, Reason (dropdown), and Attachment (optional).
- The system shall allow the employee to cancel or submit the leave request.
- The system shall display the status of leave requests (pending, approved, denied).

## 3. Permissions and Restrictions
- The system shall prevent employees from overriding or editing submitted timesheets or leave requests unless admin permission is granted.
- The system shall provide a mechanism for employees to request override permission from the admin.
- The system shall notify the employee when permission is granted or denied.

## 4. Usability
- The system shall provide clear feedback for successful submissions, saves, and permission requests.
- The system shall display all fields and actions in a user-friendly and accessible manner.
- The UI and styling shall match the attached screenshots, including layout, icons, and section separation.

## 5. Modifications & Improvements
- The system should support drag-and-drop file upload for leave attachments.
- The system should allow bulk time entry for efficiency.
- The system should provide notifications and reminders for timesheet submission and approval.
- The system should allow admins to view, approve, or reject timesheets and leave requests.
- The system should provide audit logs for all timesheet and leave actions.

---
This requirements document is based on the provided UI screenshots and user description, using the EARS format for clarity and completeness, with suggested improvements for usability and admin control.
