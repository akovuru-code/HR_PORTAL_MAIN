# Employee Sidebar Design

## Overview
This design document describes the frontend, backend, and database implementation for the employee sidebar, based on the requirements in `Emp_sidebar.md` and the attached screenshot. The sidebar is visible only to users with the EMP role and must match the provided UI exactly.

---

## Frontend Design

### Component Structure
- `Sidebar.jsx` (or `components/common/Sidebar.jsx`):
  - Renders the sidebar UI for EMP users.
  - Uses React Router's `NavLink` for navigation.
  - Accepts user role as a prop or via context/hook (e.g., `useAuth`).
  - Only renders EMP navigation items for EMP users.
  - Uses icons and styles matching the screenshot (e.g., color palette, spacing, rounded corners, active state, etc.).
  - Sidebar is fixed on the left and responsive.
  - Bottom section contains Help and Settings links, styled as shown.

### Styling
- Use Tailwind CSS for all styling (as in the screenshot).
- Sidebar background: muted blue/gray (`#5a6ace` or as in screenshot).
- Active item: highlighted with rounded background and lighter color.
- Icons: Use appropriate React icon library (e.g., `react-icons/fa`).
- Font, spacing, and icon sizes match screenshot.

### Accessibility
- All navigation items are keyboard accessible.
- Use `aria-label` and semantic HTML for navigation.

---

## Backend Design

### API/Session
- On login, backend returns user object with `role` field (`EMP` or `ADMIN`).
- Role is stored in JWT/session and available to frontend via `/api/auth/me` or similar endpoint.
- Backend enforces that only EMP users can access employee routes/data.

---

## Database Design

### User Table/Model
- Field: `role` (string, enum: 'EMP', 'ADMIN')
- Field: `email`, `name`, etc.
- On registration or user creation, assign correct role.

---

## Security & Production Readiness
- Sidebar code is modular, clean, and free of debug code.
- Role checks are enforced both client and server side.
- No admin links/data are exposed to EMP users.
- Sidebar is visually and functionally identical to screenshot for EMP users.

---

## Navigation Items (EMP)
- Dashboard
- Onboarding
- Payroll
- Timesheet
- Help (bottom)
- Settings (bottom)

---

## Notes
- Admin users see a different sidebar (not covered here).
- All navigation and UI states (active, hover, etc.) match screenshot.
