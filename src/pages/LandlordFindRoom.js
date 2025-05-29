import React, { useState, useEffect, useContext } from 'react';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const LandlordFindRoom = () => {
  const { user } = useContext(AuthContext);
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'rooms'), where('ownerId', '==', user.uid));
    getDocs(q).then(snap => setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

   const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'rooms', id));
    setRooms(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div>
      <h2>Landlord: Manage Your Rooms</h2>
      <Link to="/add-room">List New Room</Link>
      <ul>
        {rooms.map(r => (
          <li key={r.id}>
            {r.title} (${r.price})
            <Link to={`/add-room?editId=${r.id}`}>Edit</Link>
            <button onClick={() => handleDelete(r.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};
