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

  return (
    <div className="auth-form-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit} className="auth-form">
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
        <button type="submit" className="btn primary">Login</button>
      </form>

      <div className="auth-helper-text">
        <button onClick={handleForgot} className="link-btn">Forgot Password?</button>
      </div>
      <div className="auth-divider">or</div>
      <button onClick={handleGoogle} className="btn google-btn">
        Continue with Google
      </button>

      <div className="auth-helper-text">
        Don't have an account? <Link to="/register">Register here</Link>
      </div>
    </div>
  );
};

export default Login;
