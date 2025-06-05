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
        {/* Logo / Brand Name */}
        <Link to="/" className="navbar-logo">
          Rental<span className="logo-accent">Haven</span>
        </Link>

        {/* Primary navigation links */}
        <ul className="nav-menu">
          <li className="nav-item">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
              end
            >
              Dashboard
            </NavLink>
          </li>

          <li className="nav-item">
            <NavLink
              to="/findroom"
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
            >
              Find Room
            </NavLink>
          </li>

          {user && user.role === 'admin' && (
            <li className="nav-item">
              <NavLink
                to="/admin/findroom"
                className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }
              >
                Manage Rooms
              </NavLink>
            </li>
          )}

          {user && user.role === 'landlord' && (
            <li className="nav-item">
              <NavLink
                to="/landlord/findroom"
                className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }
              >
                My Rooms
              </NavLink>
            </li>
          )}

          {(user?.role === 'admin' || user?.role === 'landlord') && (
            <li className="nav-item">
              <NavLink
                to="/add-room"
                className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }
              >
                Add Room
              </NavLink>
            </li>
          )}
        </ul>

        {/* Right‐side authentication links / buttons */}
        <div className="nav-auth">
          {user ? (
            <>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }
              >
                Profile
              </NavLink>
              <button className="logout-button" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) =>
                  isActive ? 'nav-link active register-link' : 'nav-link register-link'
                }
              >
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
