// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Importing pages
import Login from './pages/Login';
import Register from "./pages/Register";
import UserProfile from "./pages/UserProfile";
import GuestDashboard from "./pages/GuestDashboard";
import GuestFindRoom from "./pages/GuestFindRoom";
import AdminDashboard from "./pages/AdminDashboard";
import LandlordDashboard from "./pages/LandlordDashboard";
import LandlordFindRoom from "./pages/LandlordFindRoom";
import AdminFindRoom from "./pages/AdminFindRoom";

// Optional Navbar component (used for site-wide navigation)
import Navbar from "./components/Navbar";

import { auth } from "./firebase"; // Firebase authentication object

function App() {
  // Get the currently signed-in user from Firebase Auth
  const user = auth.currentUser;

  return (
    <Router>
      {/* Optional Navbar, rendered on all pages */}
      <Navbar />

      <Routes>
        {/* Redirect base path "/" to guest dashboard */}
        <Route path="/" element={<Navigate to="/guest-dashboard" />} />

        {/* Publicly accessible routes */}
        <Route path="/guest-dashboard" element={<GuestDashboard />} />
        <Route path="/guest-rooms" element={<GuestFindRoom />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes – accessible only when user is logged in */}
        <Route
          path="/landlord-dashboard"
          element={user ? <LandlordDashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin-dashboard"
          element={user ? <AdminDashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/landlord-rooms"
          element={user ? <LandlordFindRoom /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin-rooms"
          element={user ? <AdminFindRoom /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={user ? <UserProfile /> : <Navigate to="/login" />}
        />

        {/* Catch-all route for unmatched paths – shows 404 error */}
        <Route path="*" element={<h2 style={{ padding: "2rem" }}>404 - Page Not Found</h2>} />
      </Routes>
    </Router>
  );
}

export default App;
