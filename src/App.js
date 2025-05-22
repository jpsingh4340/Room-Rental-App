import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import RoleBasedDashboard from './components/RoleBasedDashboard';
import FindRoom from './pages/FindRoom';
import AdminFindRoom from './pages/AdminFindRoom';
import LandlordFindRoom from './pages/LandlordFindRoom';
import AddEditRoom from './pages/AddEditRoom';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          {/* Home / Role‐based dashboard */}
          <Route path="/" element={<RoleBasedDashboard />} />

          {/* Public find-room page */}
          <Route path="/findroom" element={<FindRoom />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected pages */}
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />

          {/* Admin & landlord room management */}
          <Route
            path="/admin/findroom"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminFindRoom />
              </PrivateRoute>
            }
          />
          <Route
            path="/landlord/findroom"
            element={
              <PrivateRoute roles={['landlord']}>
                <LandlordFindRoom />
              </PrivateRoute>
            }
          />
          <Route
            path="/add-room"
            element={
              <PrivateRoute roles={['admin', 'landlord']}>
                <AddEditRoom />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;