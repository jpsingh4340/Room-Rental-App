// ✨ Feature: AddEditRoom component to add or edit a room entry

import React, { useState, useEffect, useContext } from 'react';
// 🧱 Firebase imports for Firestore operations
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
// 🧑‍🤝‍🧑 Get the current authenticated user
import { AuthContext } from '../context/AuthContext';
// 🧭 React Router utilities
import { useNavigate, useLocation } from 'react-router-dom';
// 🎨 Styling for AddEditRoom form
import './AddEditRoom.css';

const AddEditRoom = () => {
  // 🧑‍💼 Get current user from AuthContext
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const editId = params.get('editId'); // 🛠 Get editId from query params

  // 📝 Form state initialized
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    price: '',
    imageUrl: ''
  });

  // 🔁 useEffect to load existing room data when in edit mode
  useEffect(() => {
    if (editId) {
      (async () => {
        const ref = doc(db, 'rooms', editId);
        const snap = await getDoc(ref);
        if (snap.exists()) setForm(snap.data()); // ✅ Populate form with existing data
      })();
    }
  }, [editId]);

  // 🎯 Update form state on input change
  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  // 📤 Handle form submission (create or update)
  const handleSubmit = async e => {
    e.preventDefault();
    if (editId) {
      // 🔄 Update existing room
      await updateDoc(doc(db, 'rooms', editId), form);
      alert('Room updated');
    } else {
      // ➕ Add new room with ownerId
      await addDoc(collection(db, 'rooms'), {
        ...form,
        ownerId: user.uid
      });
      alert('Room added');
    }
    navigate('/admin/findroom'); // 🚀 Redirect after save
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
        </label>
        <label>
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Location
          <input
            name="location"
            value={form.location}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Price (per night)
          <input
            name="price"
            type="number"
            value={form.price}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Image URL
          <input
            name="imageUrl"
            value={form.imageUrl}
            onChange={handleChange}
          />
        </label>
        <button type="submit" className="submit-btn">
          {editId ? 'Update Room' : 'Add Room'}
        </button>
      </form>
    </div>
  );
};

export default AddEditRoom; // 🚢 Export component for use in routes/pages
