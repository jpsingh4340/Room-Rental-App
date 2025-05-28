import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './AuthForm.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loginWithGoogle, sendPasswordResetEmail } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      alert(err.message);
    }
  };
  const handleGoogle = async () => {
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleForgot = async () => {
    if (!email) {
      return alert('Please enter your email to reset your password.');
    }
    try {
      await sendPasswordResetEmail(email);
      alert('Password reset email sent. Check your inbox.');
    } catch (err) {
      alert(err.message);
    }
  };


