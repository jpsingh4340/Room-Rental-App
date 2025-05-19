// src/pages/RoomListing.js
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase'; // Ensure db is exported from firebase.js
import RoomCard from '../components/RoomCard'; // Your reusable card component
import './RoomListing.css';

const RoomListing = () => {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const fetchRooms = async () => {
      const querySnapshot = await getDocs(collection(db, "rooms"));
      const roomList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRooms(roomList);
    };

    fetchRooms();
  }, []);

  return (
    <div className="room-listing">
      <h2>Available Rooms</h2>
      <div className="room-grid">
        {rooms.map(room => (
          <RoomCard key={room.id} room={room} />
        ))}
      </div>
    </div>
  );
};

export default RoomListing;
