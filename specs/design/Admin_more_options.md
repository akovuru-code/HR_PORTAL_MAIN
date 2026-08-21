# Admin More Options Screen – UI/UX Design Document

## 1. Overview
This document describes the UI/UX design for the Admin "More Options" screen, based on the requirements and matching the Admin dashboard theme. The screen provides quick navigation cards for key modules and HR tools, using a modern, responsive grid layout.

---

## 2. Page Layout
- **Sidebar:** Persistent on the left, matching Admin dashboard (dark background, icons, active highlight)
- **Top Bar:** Search, user info, and notifications (consistent with Admin dashboard)
- **Main Content:**
  - Title: `More Options:` (large, bold, top-aligned)
  - Grid of option cards, centered with ample padding

```
| Sidebar |   More Options:                |
|         |  [Card][Card][Card]           |
|         |  [Card][Card][Card]           |
|         |  ... (responsive grid)        |
```

---

## 3. Color & Spacing Guidelines
- **Background:** `bg-white` for main content, `bg-gray-900` or `bg-slate-800` for sidebar
- **Card:** `bg-gray-100` (default), `hover:bg-gray-200`, `shadow` on hover, `rounded-xl`, `transition`
- **Text:** `text-gray-900` for titles, `text-gray-700` for card labels
- **Spacing:**
  - Page padding: `p-8` (desktop), `p-4` (mobile)
  - Card gap: `gap-6` (desktop), `gap-4` (mobile)
  - Card padding: `p-6` (desktop), `p-4` (mobile)
- **Typography:**
  - Title: `text-2xl font-bold mb-8`
  - Card label: `text-lg font-medium`

---

## 4. Grid & Responsive Breakpoints
- **Grid Container:** `grid w-full`
- **Columns:**
  - Desktop: `grid-cols-3`
  - Tablet: `grid-cols-2`
  - Mobile: `grid-cols-1`
- **Breakpoints:**
  - `md:` for tablet (≥768px)
  - `lg:` for desktop (≥1024px)
- **Example:**
  ```jsx
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {/* Cards here */}
  </div>
  ```

---

## 5. Suggested Icons for Each Module
- **Departments:** `building-office-2` (🏢)
- **Vendors:** `handshake` (🤝)
- **Clients:** `user-group` (👥)
- **Recruiting:** `user-plus` (➕)
- **Documents:** `document-text` (📄)
- **Projects:** `briefcase` (💼)
- **Assets:** `device-laptop` (💻)
- **Holidays:** `calendar-days` (📅)
- **Policies:** `document-duplicate` (📑)
- **Support Tickets:** `lifebuoy` (🛟)
- **Announcements:** `megaphone` (📢)
- Use Heroicons, Lucide, or similar icon set for consistency

---

## 6. Component Structure & Tailwind Classes

### 6.1 Card Component
```jsx
<div
  className="flex flex-col items-center justify-center bg-gray-100 rounded-xl p-6 shadow-sm hover:bg-gray-200 hover:shadow-md transition cursor-pointer min-h-[120px] text-center"
  tabIndex={0}
  role="button"
  aria-label="Go to Departments"
>
  <Icon className="w-8 h-8 mb-2 text-gray-500" />
  <span className="text-lg font-medium text-gray-900">Departments</span>
</div>
```
- **Accessibility:** `tabIndex`, `role`, `aria-label` for keyboard navigation
- **Hover:** `hover:bg-gray-200`, `hover:shadow-md`, `transition`
- **Icon:** Centered, above label, consistent size

### 6.2 Grid Layout
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Map cards here */}
</div>
```

### 6.3 Page Container
```jsx
<div className="p-8 bg-white min-h-screen">
  <h1 className="text-2xl font-bold mb-8">More Options:</h1>
  {/* Grid here */}
</div>
```

---

## 7. Navigation & Routing
- Each card navigates to its module route (e.g., `/admin/departments`)
- Use React Router's `useNavigate` or `Link` for navigation
- Example:
  ```jsx
  <div onClick={() => navigate('/admin/departments')}>...</div>
  // or
  <Link to="/admin/departments">...</Link>
  ```

---

## 8. Additional Notes
- **Consistency:** Sidebar, top bar, and card style must match the Admin dashboard
- **Responsiveness:** Test on all breakpoints for grid and card sizing
- **Extensibility:** Cards can be added/removed by updating a module list array
- **Accessibility:** All cards must be keyboard and screen-reader accessible

---

This design spec is ready for implementation and matches the Admin dashboard theme and requirements exactly.
