import React from "react";
import { Link } from "react-router-dom";
import { auth } from "../firebase";

const Navbar = ({ user }) => {
  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <nav style={styles.navbar}>
      <h2>Rental Haven</h2>
      <div>
        {user ? (
          <>
            <Link to="/roomlisting" style={styles.link}>Room Listings</Link>
            <button onClick={handleLogout} style={styles.button}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" style={styles.link}>Login</Link>
            <Link to="/register" style={styles.link}>Register</Link>
            <Link to="/addroom" style={styles.link}>Add Room</Link>
            <Link to="/guest-rooms">Browse Rooms</Link>


          </>
        )}
      </div>
    </nav>
  );
};

const styles = {
  navbar: {
    padding: "1rem 2rem",
    backgroundColor: "#007bff",
    color: "white",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  link: {
    marginRight: "1rem",
    color: "white",
    textDecoration: "none",
    fontWeight: "bold",
  },
  button: {
    padding: "0.5rem 1rem",
    backgroundColor: "white",
    color: "#007bff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};

export default Navbar;
