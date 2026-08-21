# Employee Sidebar Requirements (EARS)

## Context
This document specifies the requirements for the employee sidebar in the HR portal. The sidebar must be visible only to users with the EMP (employee) role, and its UI and styling must match the attached screenshot exactly.

## Functional Requirements

1. When a user logs in with the EMP role, the system shall display a sidebar on the left side of the screen, as shown in the attached screenshot.
2. The sidebar shall contain the following navigation items, in order:
   - Dashboard
   - Onboarding
   - Payroll
   - Timesheet
   - (at the bottom) Help
   - (at the bottom) Settings
3. The sidebar shall not display any admin or non-employee navigation items for EMP users.
4. The sidebar shall use the same icons, colors, spacing, and typography as shown in the screenshot.
5. The sidebar shall remain visible and fixed while navigating between employee pages.
6. When a navigation item is active, it shall be highlighted as shown in the screenshot.
7. The sidebar shall be responsive and visually consistent across supported browsers and screen sizes.

## Non-Functional Requirements

1. The sidebar shall load quickly and not introduce performance bottlenecks.
2. The sidebar code shall be maintainable, modular, and ready for production use.
3. The sidebar shall be accessible, supporting keyboard navigation and screen readers.

## Backend/API Requirements

1. The backend shall provide user role information (EMP or ADMIN) upon login and in the user session/token.
2. The backend shall not expose admin navigation or data to EMP users via API.

## Database Requirements

1. The user table/model shall include a 'role' field with possible values: 'EMP', 'ADMIN'.
2. The system shall enforce that only users with role 'EMP' can access employee sidebar and related routes.
