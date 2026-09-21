/*import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import './index.css'; // Ensure Tailwind css is imported
import React from 'react';
import LoginPage from './components/LoginPage';

function App() {
  return <LoginPage />;
}

export default App;
*/

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";


import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Register from "./pages/Register";
import Layout from "./components/Layout";
import NotFound from "./pages/NotFound";
import AuthLayout from './layouts/AuthLayout';
import adminRoutes from "./pages/admin";
import employeeRoutes from "./pages/employee";
import onboardingRoutes from "./pages/onboarding";
import Unauthorized from "./pages/unauthorized";
import EmpLayout from "./components/emp/EmpLayout";
import EmployeeDashboard from "./pages/employee/Dashboard";
import EmpPersonalDetails from './pages/onboarding/EmpPersonalDetails';
import DashboardLayout from "./Layouts/DashboardLayout";
import Company from "./pages/Company";
import CompanyLayout from "./components/companyLayout";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/company" element={<CompanyLayout><Company /></CompanyLayout>} />


        {/* Protected Layout */}
        <Route path="/admin" element={<ProtectedRoute allowedAccountTypes={["root_admin", "admin"]}><Layout /></ProtectedRoute>}> {adminRoutes}</Route>
        <Route path="/employee" element={<Layout />}>{employeeRoutes}</Route>
        <Route path="/onboarding" element={<Layout />}>{onboardingRoutes}</Route>
        {/* Fallback: redirect /admin/onboarding and /employee/onboarding to shared onboarding */}
        {/* <Route path="/admin/onboarding" element={<Navigate to="/onboarding/EmpPersonalDetails" replace />} />*/}
        {/*<Route path="/admin/onboarding" element={<EmpPersonalDetails />} /> */}


        {/* Unauthorized */}
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* 404 Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
