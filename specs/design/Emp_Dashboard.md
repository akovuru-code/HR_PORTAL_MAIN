# Employee Dashboard Design Document

## 1. Overview
This document provides the design for the Employee Dashboard, as specified in the requirements and matching the attached screenshot. The design covers frontend UI/UX, backend API, and database schema, ensuring dynamic data, modern styling, and extensibility.

---

## 2. Frontend Design

### 2.1 Technology Stack
- React (with functional components and hooks)
- React Router for navigation
- CSS-in-JS or Tailwind CSS for styling (to match screenshot)
- Chart.js or Recharts for donut chart (Training Progress)
- Context API or Redux for state management (if needed)

### 2.2 Layout & Components
- **Sidebar:**
  - Fixed vertical sidebar with logo, navigation (Dashboard, Onboarding, Payroll, Timesheet), Help, and Settings.
  - Active item highlighted; icons as per screenshot.
- **Header:**
  - Search bar (top center)
  - User avatar and email (top right)
  - Date range picker (top right, styled as per screenshot)
- **Main Content:**
  - Greeting: "Good Morning, [Name]" and current date
  - Shortcuts Links: Card with dynamic buttons (Timesheet, Payroll, Projects) and "Add Shortcut" button
  - Training Progress: Donut chart in a card
  - Action Items: List of dynamic reminders (right side)
  - Active Projects: Card with list of current projects

### 2.3 Dynamic Data
- All data (greeting, shortcuts, training, action items, projects) fetched from backend APIs
- Loading spinners for each widget while fetching
- Error states for failed API calls

### 2.4 Accessibility & Responsiveness
- All controls keyboard accessible
- Color contrast meets WCAG AA
- Responsive layout for desktop and mobile

---

## 3. Backend/API Design

### 3.1 Technology Stack
- Node.js with Express.js
- JWT-based authentication
- RESTful API endpoints

### 3.2 Endpoints
- `GET /api/dashboard` — Returns all dashboard data for the logged-in employee:
  - Profile (name, email, avatar)
  - Shortcuts (array)
  - Training progress (array of modules with completion %)
  - Action items (array)
  - Active projects (array)
- `POST /api/dashboard/shortcuts` — Add a new shortcut
- `GET /api/projects/active` — List of active projects for employee
- `GET /api/training/progress` — Training progress data
- `GET /api/action-items` — Action items for employee

### 3.3 Security
- All endpoints require authentication
- Only return data for the authenticated employee
- No sensitive data exposed

### 3.4 Performance
- Use caching for static data (e.g., project list)
- Optimize queries for dashboard aggregation

---

## 4. Database Design

### 4.1 Tables
- **employees**: id, name, email, avatar_url, ...
- **dashboard_shortcuts**: id, employee_id, label, link, icon
- **training_progress**: id, employee_id, module, percent_complete
- **action_items**: id, employee_id, type, message, due_date, status
- **projects**: id, name, description, status
- **employee_projects**: id, employee_id, project_id, role, start_date, end_date

### 4.2 Relationships
- One employee has many dashboard_shortcuts
- One employee has many training_progress records
- One employee has many action_items
- Many-to-many: employees <-> projects (via employee_projects)

### 4.3 Extensibility
- New widgets/data sources can be added by creating new tables and endpoints
- Dashboard layout customizable per employee (future enhancement)

---

## 5. Modifications & Improvements
- Allow employees to customize shortcuts and dashboard layout
- Add notification system for new action items
- Support for internationalization (i18n)

---

*This design ensures a dynamic, secure, and user-friendly employee dashboard, matching the provided UI and supporting future extensibility.*
