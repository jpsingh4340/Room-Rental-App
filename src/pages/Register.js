import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (!terms) {
      alert('You must accept the terms and conditions');
      return;
    }
    try {
      await register(fullName, email, password, role);
      navigate('/login');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="form-container">
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="guest">Guest</option>
          <option value="admin">Admin</option>
          <option value="landlord">Landlord</option>
        </select>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <label>
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
          />{' '}
          I agree to the terms and conditions
        </label>
        <button type="submit">Register</button>
      </form>
    </div>
  );
};

export default Register;