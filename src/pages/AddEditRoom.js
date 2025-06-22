// src/components/AddEditRoom.js
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

export default function AddEditRoom() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { search } = useLocation();
  const editId = new URLSearchParams(search).get('editId');

  // form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    price: '',
    bedrooms: 1,
    bathrooms: 1,
    kitchens: 1,
    lounges: 0,
  });
  // comma- or newline-separated image URLs
  const [imageUrlsRaw, setImageUrlsRaw] = useState('');

  // load existing room if editing
  useEffect(() => {
    if (!editId) return;
    (async () => {
      const ref = doc(db, 'rooms', editId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setForm({
          title: data.title || '',
          description: data.description || '',
          location: data.location || '',
          price: data.price || '',
          bedrooms: data.bedrooms || 1,
          bathrooms: data.bathrooms || 1,
          kitchens: data.kitchens || 1,
          lounges: data.lounges || 0
        });
        setImageUrlsRaw((data.imageUrls || []).join('\n'));
      }
    })();
  }, [editId]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    // parse image URLs
    const imageUrls = imageUrlsRaw
      .split(/\r?\n|,/)
      .map(u => u.trim())
      .filter(u => u);

    const payload = {
      ...form,
      price: Number(form.price),
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      kitchens: Number(form.kitchens),
      lounges: Number(form.lounges),
      imageUrls,
      ownerId: user.uid
    };

    if (editId) {
      await updateDoc(doc(db, 'rooms', editId), payload);
      alert('Room updated');
    } else {
      await addDoc(collection(db, 'rooms'), payload);
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
          <input name="title" value={form.title} onChange={handleChange} required />
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
          <input name="location" value={form.location} onChange={handleChange} required />
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
          Bedrooms
          <input
            name="bedrooms"
            type="number"
            value={form.bedrooms}
            onChange={handleChange}
            min="1"
            required
          />
        </label>

        <label>
          Bathrooms
          <input
            name="bathrooms"
            type="number"
            value={form.bathrooms}
            onChange={handleChange}
            min="1"
            required
          />
        </label>

        <label>
          Kitchens
          <input
            name="kitchens"
            type="number"
            value={form.kitchens}
            onChange={handleChange}
            min="1"
            required
          />
        </label>

        <label>
          Lounges
          <input
            name="lounges"
            type="number"
            value={form.lounges}
            onChange={handleChange}
            min="0"
            required
          />
        </label>

        <label>
          Image URLs (one per line or comma-separated)
          <textarea
            name="imageUrlsRaw"
            value={imageUrlsRaw}
            onChange={e => setImageUrlsRaw(e.target.value)}
            placeholder="https://…"
          />
        </label>

        <button type="submit" className="submit-btn">
          {editId ? 'Update Room' : 'Add Room'}
        </button>
      </form>
    </div>
  );
}
