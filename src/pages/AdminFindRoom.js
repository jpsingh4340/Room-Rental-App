import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import './AdminFindRoom.css';

const AdminFindRoom = () => {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const fetchRooms = async () => {
      const snap = await getDocs(collection(db, 'rooms'));
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchRooms();
  }, []);

  const handleDelete = async (roomId) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    await deleteDoc(doc(db, 'rooms', roomId));
    setRooms(prev => prev.filter(r => r.id !== roomId));
  };

  return (
    <div className="admin-findroom-container">
      <div className="admin-findroom-header">
        <h2>Manage Rooms</h2>
        <Link to="/add-room" className="add-room-btn">
          + Add New Room
        </Link>
      </div>