# Admin Dashboard Design Document (EARS Format)

## 1. Overview
This document describes the design for the Admin Dashboard landing page, based on the attached screenshot and requirements. The dashboard is the first page shown to users with the Admin role after login. The design follows the EARS (Easy Approach to Requirements Syntax) format for clarity and completeness.

---

## 2. Requirements (EARS)

### 2.1 Landing Page
- When an Admin logs in, the system shall redirect the user to the Admin Dashboard page as shown in the screenshot.
- The system shall ensure the layout, UI, and styling match the attached design exactly.

### 2.2 Greeting Section
- The system shall greet the admin with the message: `Good Morning, [Admin Name]`.
- The system shall display the current date below or beside the greeting.

### 2.3 Alerts Panel
- The system shall display a section titled `Alerts:` on the right side of the dashboard.
- The system shall list alert messages related to employee information, such as:
  - Expiring EADs
  - Expiring driver’s licenses
  - Projects ending soon
- The system shall allow for dynamic addition and removal of alert messages.

### 2.4 Sidebar Navigation
- The system shall display a sidebar with navigation items:
  - Dashboard
  - Employees
  - Timesheet
  - Onboarding
  - More
  - Help
  - Settings
- The system shall highlight the active section in the sidebar.

### 2.5 Charts and Stats
- The system shall display visual circular charts for employee status:
  - Training
  - On Job
  - Waiting
- The system shall display company growth statistics, including:
  - Growth number (e.g., 2,568)
  - Growth percentage (e.g., ↓2.1%)
  - A line graph comparing the last 6 days to the previous week
- The system shall provide a button to view a detailed report.

### 2.6 Componentization
- The frontend shall be built in React and styled with TailwindCSS.
- The backend shall use Node.js and Express to serve alert and status data via REST APIs.
- The database shall be PostgreSQL or MongoDB, storing:
  - Employee status
  - Alerts
  - Admin user sessions
- The frontend shall use modular React components for:
  - Sidebar navigation
  - Greeting section
  - Alerts panel
  - Status charts
  - Company growth stats and line graph

---

## 3. UI/UX Notes
- The dashboard layout, spacing, and color scheme shall match the attached screenshot exactly.
- All sections shall be responsive and accessible.
- Charts and graphs shall use a modern, visually appealing style.
- Alerts and stats shall update dynamically based on backend data.

---

## 4. Extensibility & Security
- The system should allow for easy addition of new alert types and dashboard widgets.
- Only authenticated admins shall access the dashboard; sessions shall be securely managed.
- All sensitive data shall be protected in transit and at rest.

---

## 5. Implementation Notes
- Use React context or Redux for global state (e.g., admin session, alerts).
- Use chart libraries (e.g., Chart.js, Recharts) for visualizations.
- Backend APIs should be RESTful and secured with authentication middleware.
- Database schema should support efficient querying of alerts and employee status.

---

This design document is ready for the development team to implement the Admin Dashboard as specified.
