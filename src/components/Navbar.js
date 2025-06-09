// src/components/Navbar.js
import React, { useContext } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          Rental<span className="logo-accent">Haven</span>
        </Link>

        {/* Primary nav always shows Dashboard & Find Room */}
        <ul className="nav-menu">
          <li className="nav-item">
            <NavLink to="/" end className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }>
              Dashboard
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/findroom" className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }>
              Find Room
            </NavLink>
          </li>

          {/* Admin only */}
          {user?.role === 'admin' && (
            <li className="nav-item">
              <NavLink to="/admin/findroom" className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }>
                Manage Rooms
              </NavLink>
            </li>
          )}

          {/* Landlord only */}
          {user?.role === 'landlord' && (
            <li className="nav-item">
              <NavLink to="/landlord/findroom" className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }>
                My Rooms
              </NavLink>
            </li>
          )}

          {/* Both admin & landlord */}
          {['admin', 'landlord'].includes(user?.role) && (
            <li className="nav-item">
              <NavLink to="/add-room" className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }>
                Add Room
              </NavLink>
            </li>
          )}
        </ul>

        {/* Right‐side auth links */}
        <div className="nav-auth">
          {user ? (
            <>
              <NavLink to="/profile" className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }>
                Profile
              </NavLink>
              <button className="logout-button" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }>
                Login
              </NavLink>
              <NavLink to="/register" className={({ isActive }) =>
                  isActive ? 'nav-link active register-link' : 'nav-link register-link'
                }>
                Register
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
