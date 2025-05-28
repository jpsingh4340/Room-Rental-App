import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
const Register = () => {
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('guest');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
};