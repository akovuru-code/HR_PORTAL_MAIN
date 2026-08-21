# Admin Sidebar Design Document

## 1. Overview
This document details the design for the Admin Sidebar, as specified in the requirements and matching the attached screenshot. The sidebar is visible to users with the Admin role after login and is consistent across all admin pages.

---

## 2. Frontend Design

### 2.1 Technology Stack
- **Framework:** React (functional components)
- **Styling:** TailwindCSS (for exact match to the screenshot)
- **Icons:** Use a modern icon library (e.g., react-icons) for sidebar icons

### 2.2 Component Structure
- **SidebarNav**: Main sidebar component
  - Receives active route/page as a prop
  - Renders menu items in the following order:
    1. Dashboard
    2. Employees
    3. Timesheet
    4. Onboarding
    5. More
  - Renders "Help" and "Settings" at the bottom, separated from the main menu
  - Each menu item includes an icon and label matching the screenshot
  - Highlights the active menu item
  - Responsive and accessible (keyboard navigation, ARIA roles)
- **AppLayout**: Wraps all admin pages and includes SidebarNav
- **Role-based Rendering**: SidebarNav is only rendered for users with the Admin role

### 2.3 UI/UX Details
- Sidebar background: deep navy (#0b1229 or similar)
- Sidebar width: fixed (matches screenshot)
- Menu item spacing: consistent vertical gaps
- Active menu item: rounded rectangle, blue highlight, bold text
- Icons: visually match screenshot (color, size, alignment)
- "Help" and "Settings": always at the bottom, no duplicates
- Sidebar persists across all admin pages
- Sidebar is fully responsive and accessible

---

## 3. Backend Design

- **Authentication Middleware**: Ensures only admin users can access admin pages and sidebar
- **User Role Storage**: User roles (e.g., admin) are stored in the database and included in the session/JWT
- **API Endpoint**: `/api/auth/session` returns user info and role for frontend rendering

---

## 4. Database Design

- **admins** table includes a `role` column (e.g., 'admin')
- User role is checked on login and included in session/JWT
- Only users with role 'admin' are shown the admin sidebar

---

## 5. Extensibility & Consistency
- SidebarNav is a modular, reusable component
- Menu items are defined in a config array for easy updates
- Styling and layout are enforced via Tailwind utility classes
- SidebarNav is imported and used in all admin page layouts for consistency

---

This design is ready for implementation and matches the requirements and UI reference exactly.
