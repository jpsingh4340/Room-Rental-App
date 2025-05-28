import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="navbar">
      <Link to="/">Dashboard</Link>
      <Link to="/findroom">Find Room</Link>

      {user && user.role === 'admin' && (
        <Link to="/admin/findroom">Manage Rooms</Link>
      )}
      {user && user.role === 'landlord' && (
        <Link to="/landlord/findroom">My Rooms</Link>
      )}
      {(user?.role === 'admin' || user?.role === 'landlord') && (
        <Link to="/add-room">Add Room</Link>
      )}

      {user ? (
        <>
          <Link to="/profile">Profile</Link>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </>
      )}
    </nav>
  );
};

export default Navbar;