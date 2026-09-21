import { Routes, Route, Outlet } from "react-router-dom";
import AdminDashboard from "./Dashboard";
import AdminSettings from "./Settings";
import AdminHelp from "./Help";
import AdminTimesheet from "./Timesheet";
import AdminOnboarding from "./Onboarding";
import AdminPayroll from "./Payroll";
import AdminOptions from "./Options";
import AdminInvoice from "./Invoice";
import AdminProjects from "./Projects";
import AdminAnnouncements from "./Announcements";
import AdminDocuments from "./AdminDocuments";
import AdminProfile from "./Profile";
import AdminEmpList from "./EmployeeList";
import EmployeeDetails from "./EmployeeDetails";
import DashboardLayout from "../../Layouts/DashboardLayout";
import EmpOnboard from "../onboarding/TabbedLayout";
import AdminClients from "./Clients";
import AdminVendors from "./Vendors";
import AdminPrimeVendors from "./PrimeVendors";
import AdminCalendar from "./Calendar";
import Company from "../Company";
import AdminRecruiting from "./Recruiting";
import AdminDepartment from "./Department";
import AdminSupportTickets from "./SupportTickets";
import AdminRegister from "./Register";
import AdminManagement from "./AdminManagement";
import ProtectedRoute from "../../components/ProtectedRoute";
import AdminPayments from "./Payments";
import EmployeePerformanceReports from "./EmployeePerformanceReports";
import EmployeeAssociations from "./EmployeeAssociations";



export default (
  <>
    <Route path="dashboard" element={<ProtectedRoute permission="dashboard:view"><AdminDashboard /></ProtectedRoute>} />
    <Route path="settings" element={<AdminSettings />} />
    <Route path="help" element={<AdminHelp />} />
    <Route path="employees" element={<ProtectedRoute permission="employee:read"><AdminEmpList /></ProtectedRoute>} />
    <Route path="employees/:id" element={<ProtectedRoute permission="employee:read"><EmployeeDetails /></ProtectedRoute>} />
    <Route path="timesheet" element={<ProtectedRoute permission="timesheet:view"><AdminTimesheet /></ProtectedRoute>} />
    <Route path="onboarding" element={<EmpOnboard />} />
    <Route path="payroll" element={<ProtectedRoute permission="payroll:view"><AdminPayroll /></ProtectedRoute>} />
    <Route path="options" element={<AdminOptions />} />
    <Route path="employee-associations" element={<ProtectedRoute allowedAdminRoles={['hr', 'accounts', 'payroll']}><EmployeeAssociations /></ProtectedRoute>} />
    <Route path="invoice" element={<ProtectedRoute permission="invoice:manage"><AdminInvoice /></ProtectedRoute>} />
    <Route path="projects" element={<ProtectedRoute permission="operations:manage"><AdminProjects /></ProtectedRoute>} />
    <Route path="options/payments" element={<ProtectedRoute permission="invoice:manage"><AdminPayments /></ProtectedRoute>} />
    <Route path="projects" element={<AdminProjects />} />
    <Route path="profile" element={<AdminProfile />} />
    <Route path="clients" element={<ProtectedRoute permission="operations:manage"><AdminClients /></ProtectedRoute>} />
    <Route path="vendors" element={<ProtectedRoute permission="operations:manage"><AdminVendors /></ProtectedRoute>} />
    <Route path="prime-vendors" element={<ProtectedRoute permission="operations:manage"><AdminPrimeVendors /></ProtectedRoute>} />
    <Route path="calendar" element={<ProtectedRoute permission="calendar:view"><AdminCalendar /></ProtectedRoute>} />
    <Route path="company-info" element={<Company />} />
    <Route path="announcements" element={<ProtectedRoute permission="announcements:manage"><AdminAnnouncements /></ProtectedRoute>} />
    <Route path="documents" element={<ProtectedRoute permission="documents:manage"><AdminDocuments /></ProtectedRoute>} />
    <Route path="recruiting" element={<ProtectedRoute anyPermissions={['recruiting:manage', 'recruiting:view']}><AdminRecruiting /></ProtectedRoute>} />
    <Route path="department" element={<AdminDepartment />} />
    <Route path="support-tickets" element={<ProtectedRoute permission="support_tickets:view"><AdminSupportTickets /></ProtectedRoute>} />
    <Route path="register" element={<ProtectedRoute permission="employee:create"><AdminRegister /></ProtectedRoute>} />
    <Route path="admin-management" element={<ProtectedRoute allowedAccountTypes={["root_admin"]}><AdminManagement /></ProtectedRoute>} />
    <Route path="employee-performance-reports" element={<ProtectedRoute allowedAccountTypes={["root_admin"]}><EmployeePerformanceReports /></ProtectedRoute>} />



  </>



);
