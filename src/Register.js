// src/Register.js
import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../App.css"; // your main CSS


function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("guest");
  const [address, setAddress] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

     try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        role,
        address,
        extraInfo
      });

      // Redirect based on role
      if (role === "admin") navigate("/admin");
      else if (role === "landlord") navigate("/landlord");
      else navigate("/customer");
    } catch (err) {
      setError("Registration failed. Try again.");
    }
  };

    return (
    <div className="container">
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        {error && <div className="error">{error}</div>}

        <label>Email</label>
        <input type="email" required onChange={(e) => setEmail(e.target.value)} />

        <label>Password</label>
        <input type="password" required onChange={(e) => setPassword(e.target.value)} />

        <label>Address</label>
        <input type="text" required onChange={(e) => setAddress(e.target.value)} />

        <label>Role</label>
        <select value={role} onChange={(e) => 
        setRole(e.target.value)}>
          <option value="guest">Guest</option>
          <option value="landlord">Landlord</option>
          <option value="admin">Admin</option>
        </select>

        {role === "admin" && (
          <>
            <label>Admin Code</label>
            <input
              type="text"
              placeholder="Enter admin access code"
              onChange={(e) => setExtraInfo(e.target.value)}
              required
            />
          </>
        )}

        {role === "landlord" && (
          <>
            <label>Business License Number</label>
            <input
              type="text"
              placeholder="Enter your license number"
              onChange={(e) => 
                setExtraInfo(e.target.value)}
              required
            />
          </>
        )}

        {role === "guest" && (
          <>
            <label>Preferred City</label>
            <input
              type="text"
              placeholder="Where do you want to rent?"
              onChange={(e) => setExtraInfo(e.target.value)}
              required
            />
          </>
        )}

        <button type="submit">Register</button>
      </form>
    </div>
  );
}

export default Register;
