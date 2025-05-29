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

  // If editing, load existing
  useEffect(() => {
    if (editId) {
      (async () => {
        const ref = doc(db, 'rooms', editId);
        const snap = await getDoc(ref);
        if (snap.exists()) setForm(snap.data());
      })();
    }
  }, [editId]);

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (editId) {
      await updateDoc(doc(db, 'rooms', editId), form);
      alert('Room updated');
    } else {
      await addDoc(collection(db, 'rooms'), {
        ...form,
        ownerId: user.uid
      });
      alert('Room added');
    }
    navigate('/admin/findroom');
  };
  return (
    <div className="add-edit-container">
      <h2>{editId ? 'Edit Room' : 'Add New Room'}</h2>
      <form className="room-form" onSubmit={handleSubmit}>
        <label>
          Title
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
          />
