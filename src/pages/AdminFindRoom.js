// src/components/AdminFindRoom.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import './AdminFindRoom.css';

export default function AdminFindRoom() {
  const [rooms, setRooms] = useState([]);

  const fetchRooms = async () => {
    const snap = await getDocs(collection(db, 'rooms'));
    setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchRooms();

    // Optional: Refresh when window refocuses (e.g., after editing)
    const onFocus = () => fetchRooms();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleDelete = async roomId => {
    if (!window.confirm('Delete this room?')) return;
    await deleteDoc(doc(db, 'rooms', roomId));
    setRooms(prev => prev.filter(r => r.id !== roomId));
  };

  return (
    <div className="admin-findroom-container">
      <div className="admin-findroom-header">
        <h2>Manage Rooms</h2>
        <Link to="/admin/add-room" className="add-room-btn">
          + Add New Room
        </Link>
      </div>

      <div className="room-list">
        {rooms.map(room => (
          <div key={room.id} className="room-item">
            {(room.imageUrls?.[0] || room.imageUrl) && (
              <img
                src={room.imageUrls?.[0] || room.imageUrl}
                alt={room.title}
                className="room-thumb"
              />
            )}
            <div className="room-info">
              <h3>{room.title}</h3>
              <p className="location">{room.location}</p>
              <p className="price">${room.price} / night</p>
              <p className="description">{room.description}</p>

              <p className="room-specs">
                🛏 {room.bedrooms} ⋅ 🛁 {room.bathrooms} ⋅ 🍽️ {room.kitchens} ⋅ 🛋️ {room.lounges}
              </p>

              <div className="room-actions">
                <Link
                  to={`/admin/add-room?editId=${room.id}`}
                  className="action-btn edit-btn"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(room.id)}
                  className="action-btn delete-btn"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
