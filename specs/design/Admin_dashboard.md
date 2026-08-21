# Admin Dashboard Design Document

## 1. Overview
This document details the design for the Admin Dashboard landing page, as specified in the requirements and matching the attached screenshot. The dashboard is the first page shown to users with the Admin role after login. The design covers frontend architecture, backend API needs, and database schema suggestions.

---

## 2. Frontend Architecture

### 2.1 Technology Stack
- **Framework:** React (with functional components and hooks)
- **Styling:** TailwindCSS (for exact match to the screenshot)
- **State Management:** React Context or Redux (for session, alerts, and dashboard data)
- **Charting:** Chart.js or Recharts (for circular status charts and line graph)

### 2.2 Component Structure
- **AppLayout**: Main wrapper for sidebar and dashboard content
- **SidebarNav**: Navigation for Dashboard, Employees, Timesheet, Onboarding, More, Help, Settings
  - Highlights the active section
- **DashboardHeader**: Displays greeting ("Good Morning, [Admin Name]") and current date
- **AlertsPanel**: Fetches and displays alert messages (expiring EADs, licenses, projects ending)
- **StatusCharts**: Three circular charts for Training, On Job, Waiting (with percentage and label)
- **CompanyGrowth**: Shows growth number, percentage, and a line graph for last 6 days vs last week
- **ReportButton**: Button to view detailed report

### 2.3 UI/UX Details
- Layout, spacing, and color scheme must match the screenshot exactly
- Responsive design for desktop and tablet
- All sections and charts update dynamically from backend data
- Alerts panel is scrollable if there are many alerts
- Charts use modern, visually appealing styles

---

## 3. Backend API Design

### 3.1 Technology Stack
- **Framework:** Node.js with Express
- **Authentication:** JWT or session-based (admin-only access)
- **Data Source:** PostgreSQL or MongoDB

### 3.2 API Endpoints
- `GET /api/admin/dashboard/alerts`  
  - Returns: List of alert messages (expiring EADs, licenses, projects ending)
- `GET /api/admin/dashboard/status`  
  - Returns: Employee status counts/percentages (Training, On Job, Waiting)
- `GET /api/admin/dashboard/growth`  
  - Returns: Company growth stats (number, percentage, line graph data)
- `GET /api/admin/session`  
  - Returns: Admin user info (name, session, etc.)

### 3.3 API Behavior
- All endpoints require admin authentication
- Alerts are generated from employee document expiry, project end dates, etc.
- Status and growth data are aggregated from employee and company records

---

## 4. Database Schema Suggestions

### 4.1 Tables/Collections

#### **Admins**
- id (PK)
- name
- email
- password_hash
- last_login
- session_token

#### **Employees**
- id (PK)
- name
- status (enum: training, on_job, waiting)
- ead_expiry_date
- driver_license_expiry
- project_end_date
- ...other fields

#### **Alerts**
- id (PK)
- type (ead_expiry, license_expiry, project_end, ...)
- message
- employee_id (FK)
- created_at
- resolved (bool)

#### **CompanyStats**
- id (PK)
- date
- growth_number
- growth_percent
- sales_last_6_days (array)
- sales_last_week (array)

### 4.2 Relationships
- Alerts reference Employees
- CompanyStats is time-series for dashboard graphs

---

## 5. Security & Extensibility
- Only authenticated admins can access dashboard APIs and UI
- All sensitive data is encrypted in transit and at rest
- Schema allows for easy addition of new alert types and dashboard widgets
- Modular React components for future dashboard expansion

---

## 6. Implementation Notes
- Use React Context or Redux for global state (admin session, alerts)
- Use chart libraries (Chart.js, Recharts) for visualizations
- Backend APIs are RESTful and secured with authentication middleware
- Database schema supports efficient querying of alerts and employee status

---

This design is ready for implementation and matches the requirements and UI reference exactly.
