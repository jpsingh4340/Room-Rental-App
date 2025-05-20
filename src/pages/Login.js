import React from 'react';
import './Auth.css'; 
import Login from './Login'; 

const Login = () => {
  return (
    <div className="auth-container">
      <h2>Login</h2>
      <form className="auth-form">
        <label>Email:</label>
        <input type="email" required />
        
        <label>Password:</label>
        <input type="password" required />
        
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
