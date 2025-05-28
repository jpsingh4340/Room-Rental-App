import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
const Register = () => {
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('guest');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  
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
   