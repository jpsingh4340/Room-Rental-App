// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserProfile from "./pages/UserProfile";
import GuestDashboard from "./pages/GuestDashboard";
import GuestFindRoom from "./pages/GuestFindRoom";
import AdminDashboard from "./pages/AdminDashboard";
import LandlordDashboard from "./pages/LandlordDashboard";
import LandlordFindRoom from "./pages/LandlordFindRoom";
import AdminFindRoom from "./pages/AdminFindRoom";
import Navbar from "./components/Navbar"; // Optional if using navigation
import { auth } from "./firebase";



function App() {
  const user = auth.currentUser;

  return (
    <Router>
      <Navbar /> {/* Optional: Only if you’ve created a Navbar component */}

      <Routes>
        {/* Default redirect to guest dashboard */}
        <Route path="/" element={<Navigate to="/guest-dashboard" />} />

        {/* Public pages */}
        <Route path="/guest-dashboard" element={<GuestDashboard />} />
        <Route path="/guest-rooms" element={<GuestFindRoom />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Private pages – visible only after login */}
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

        {/* Catch-all 404 */}
        <Route path="*" element={<h2 style={{ padding: "2rem" }}>404 - Page Not Found</h2>} />
      </Routes>
    </Router>
  );
}

export default App;
