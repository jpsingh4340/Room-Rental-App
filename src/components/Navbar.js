import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css'; // We'll create this CSS file next

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/rooms">Rent Haaven</Link>
      </div>
      <ul className="navbar-links">
        <li><Link to="/GuestDashboard">Dashboard</Link></li>
        <li><Link to="/find-room">Find Room</Link></li>
        <li><Link to="/login">Login</Link> / <Link to="/register">Register</Link></li>
        <li><Link to="/profile">Profile</Link></li>
      </ul>
    </nav>
  );
}

export default Navbar;
