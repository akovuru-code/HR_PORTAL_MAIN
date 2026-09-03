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
import AdminPayments from "./Payments";



export default (
  <>
    <Route path="dashboard" element={<AdminDashboard />} />
    <Route path="settings" element={<AdminSettings />} />
    <Route path="help" element={<AdminHelp />} />
    <Route path="employees" element={<AdminEmpList />} />
    <Route path="employees/:id" element={<EmployeeDetails />} />
    <Route path="timesheet" element={<AdminTimesheet />} />
    <Route path="onboarding" element={<EmpOnboard />} />
    <Route path="payroll" element={<AdminPayroll />} />
    <Route path="options" element={<AdminOptions />} />
    <Route path="options/payments" element={<AdminPayments />} />
    <Route path="invoice" element={<AdminInvoice />} />
    <Route path="projects" element={<AdminProjects />} />
    <Route path="profile" element={<AdminProfile />} />
    <Route path="clients" element={<AdminClients />} />
    <Route path="vendors" element={<AdminVendors />} />
    <Route path="prime-vendors" element={<AdminPrimeVendors />} />
    <Route path="calendar" element={<AdminCalendar />} />
    <Route path="company-info" element={<Company />} />
    <Route path="announcements" element={<AdminAnnouncements />} />
    <Route path="documents" element={<AdminDocuments />} />
    <Route path="recruiting" element={<AdminRecruiting />} />
    <Route path="department" element={<AdminDepartment />} />
    <Route path="support-tickets" element={<AdminSupportTickets />} />
    <Route path="register" element={<AdminRegister />} />



  </>



);
