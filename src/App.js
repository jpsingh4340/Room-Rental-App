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

<Route
            path="/admin/findroom"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminFindRoom />
              </PrivateRoute>
            }