// Central router wiring public, support, admin, and provider routes with role protection.
import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "../pages/Customer/Login";
import Signup from "../pages/Customer/Signup";
import DiscoverLanding from "../pages/Customer/DiscoverLanding";
import CustomerDashboard from "../pages/Customer/Dashboard";
import AboutUs from "../pages/About/AboutUs";
import Services from "../pages/Customer/Services";
import GetStarted from "../pages/Customer/GetStarted";
import Insights from "../pages/Customer/Insights";
import SupportDashboard from "../pages/Support/SupportDashboard";
import AgentDashboard from "../pages/Support/AgentDashboard";
import AdminLogin from "../pages/Admin/AdminLogin";
import AdminDashboard from "../pages/Admin/AdminDashboard";
import ManageUsers from "../pages/Admin/ManageUsers";
import ManagerApprovals from "../pages/Admin/ManagerApprovals";
import ForgotPassword from "../pages/Admin/ForgotPassword";
import StaffLogin from "../pages/Admin/StaffLogin";
import ProviderDashboard from "../pages/ServiceProvider/ProviderDashboard";
import ProviderLogin from "../pages/ServiceProvider/ProviderLogin";
import ProviderRegistration from "../pages/ServiceProvider/ProviderRegistration";
import AgentLogin from "../pages/Support/AgentLogin";
import { RoleProtectedRoute } from "./ProtectedRoutes";

const PublicSupportPage = Insights;

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<DiscoverLanding />} />
        <Route path="/discover" element={<DiscoverLanding />} />
        <Route path="/login" element={<Login defaultMode="login" />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/services" element={<Services />} />
        <Route path="/help" element={<PublicSupportPage />} />
        <Route path="/get-started" element={<GetStarted />} />
        <Route path="/staff/login" element={<StaffLogin />} />
        <Route path="/provider/register" element={<ProviderRegistration />} />
        <Route path="/provider/login" element={<ProviderLogin />} />
        <Route path="/agent/login" element={<AgentLogin />} />
        <Route path="/support/login" element={<AgentLogin />} />

        {/* Protected routes */}
        <Route path="/my-board" element={<CustomerDashboard />} />
        <Route path="/dashboard" element={<Navigate to="/my-board" replace />} />
        <Route
          path="/admin/dashboard"
          element={
            <RoleProtectedRoute requiredRole="Administrator" redirectTo="/admin/login">
              <AdminDashboard />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RoleProtectedRoute requiredRole="Administrator" redirectTo="/admin/login">
              <ManageUsers />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/manager-approvals"
          element={
            <RoleProtectedRoute requiredRole="Administrator" redirectTo="/admin/login">
              <ManagerApprovals />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/provider/dashboard"
          element={
            <RoleProtectedRoute requiredRole="Service Provider" redirectTo="/provider/login">
              <ProviderDashboard />
            </RoleProtectedRoute>
          }
        />
        <Route path="/support" element={<SupportDashboard />} />
        <Route
          path="/agent-dashboard"
          element={
            <RoleProtectedRoute requiredRole="Customer Support" redirectTo="/agent/login">
              <AgentDashboard />
            </RoleProtectedRoute>
          }
        />

        {/* Admin auth helpers (public) */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/forgot-password" element={<ForgotPassword />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
