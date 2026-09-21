import { Route } from "react-router-dom";
import ProtectedRoute from "../../components/ProtectedRoute";

import EmployeeDashboard from "./Dashboard";
import EmpPayroll from "./Payroll";
import EmployeeProjects from "./Projects";
import EmployeeProfile from "./Profile";
import EmployeeTimesheet from "./Timesheet";
import EmployeeHelp from "./Help";
import EmployeeSettings from "./Settings";
import PerformanceReport from "./PerformanceReport";
import React from "react";
import EmpOnboard from "../onboarding/TabbedLayout";

const DummyEmployeeHome = () => {
  console.log("Rendering DummyEmployeeHome");
  return <div className="p-8 text-2xl">Welcome to the Employee Portal</div>;
};

export default [
  <Route
    key="employee-home"
    index
    element={<DummyEmployeeHome />}
  />,
  <Route
    key="dashboard"
    path="dashboard"
    element={
      <ProtectedRoute allowedRoles={["employee"]}>
        <EmployeeDashboard />
      </ProtectedRoute>
    }
  />,
  <Route
    key="onboarding"
    path="onboarding"
    element={
      <ProtectedRoute allowedRoles={["employee"]}>
        <EmpOnboard />
      </ProtectedRoute>
    }
  />,
  <Route
    key="payroll"
    path="payroll"
    element={
      <ProtectedRoute allowedRoles={["employee"]}>
        <EmpPayroll />
      </ProtectedRoute>
    }
  />,
  <Route
    key="projects"
    path="projects"
    element={
      <ProtectedRoute allowedRoles={["employee"]}>
        <EmployeeProjects />
      </ProtectedRoute>
    }
  />,
  <Route
    key="profile"
    path="profile"
    element={
      <ProtectedRoute allowedRoles={["employee"]}>
        <EmployeeProfile />
      </ProtectedRoute>
    }
  />,
  <Route
    key="timesheet"
    path="timesheet"
    element={
      <ProtectedRoute allowedRoles={["employee"]}>
        <EmployeeTimesheet />
      </ProtectedRoute>
    }
  />,
  <Route
    key="performance-report"
    path="performance-report"
    element={
      <ProtectedRoute allowedRoles={["employee"]}>
        <PerformanceReport />
      </ProtectedRoute>
    }
  />,
  <Route
    key="help"
    path="help"
    element={
      <ProtectedRoute allowedRoles={["employee"]}>
        <EmployeeHelp />
      </ProtectedRoute>
    }
  />,
  <Route
    key="settings"
    path="settings"
    element={
      <ProtectedRoute allowedRoles={["employee"]}>
        <EmployeeSettings />
      </ProtectedRoute>
    }
  />
];
