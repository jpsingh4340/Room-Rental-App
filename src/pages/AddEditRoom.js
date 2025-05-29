import React, { useState, useEffect, useContext } from 'react';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './AddEditRoom.css';

const AddEditRoom = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const editId = params.get('editId');

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    price: '',
    imageUrl: ''
  });
