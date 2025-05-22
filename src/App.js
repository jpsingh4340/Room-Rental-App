import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import AddRoom from "./pages/AddRoom";
import GuestRoomList from "./pages/GuestRoomList";


// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import RoomListing from "./pages/GuestRoomList";
import Navbar from "./components/Navbar";



function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <Router>
      <Navbar user={user} />
      <Routes>
        {/* Redirect root to login or home based on auth */}
        <Route
          path="/"
          element={
            user ? <Navigate to="/roomlisting" /> : <Navigate to="/login" />
          }
        />

        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/addroom" element={<AddRoom /> } />
        <Route path="/guest-rooms" element={<GuestRoomList />} />



        {/* Private Routes */}
        <Route
          path="/roomlisting"
          element={user ? <RoomListing /> : <Navigate to="/login" />}
        />
        
      </Routes>
    </Router>
  );
}

export default App;
