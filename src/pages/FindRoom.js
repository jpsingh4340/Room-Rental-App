
import React, { useState, useEffect, useContext } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { sampleRooms } from '../data/sampleRooms';
import './FindRoom.css';

// Define the regions for filtering
const regions = [
  'All',
  'Auckland CBD',
  'West Auckland',
  'South Auckland',
  'East Auckland',
  'North Auckland',
];

const FindRoom = () => {
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [date, setDate] = useState(new Date());
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Fetch rooms (and seed if empty)
  useEffect(() => {
    const fetchAndSeed = async () => {
      const roomsCol = collection(db, 'rooms');
      const snap = await getDocs(roomsCol);

      if (snap.empty) {
        await Promise.all(
          sampleRooms.map(room => addDoc(roomsCol, room))
        );
        const seeded = await getDocs(roomsCol);
        const loaded = seeded.docs.map(d => ({ id: d.id, ...d.data() }));
        setRooms(loaded);
        setFilteredRooms(loaded);
      } else {
        const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRooms(loaded);
        setFilteredRooms(loaded);
      }
    };
    fetchAndSeed();
  }, []);

  // Update filtered rooms when region or room list changes
  useEffect(() => {
    if (selectedRegion === 'All') {
      setFilteredRooms(rooms);
    } else {
      setFilteredRooms(
        rooms.filter(room => room.location.includes(selectedRegion))
      );
    }
  }, [selectedRegion, rooms]);

  const handleRegionChange = (e) => {
    setSelectedRegion(e.target.value);
  };

  const handleBook = (room) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'guest') {
      return alert('Only guests can book rooms');
    }
    setSelectedRoom(room);
  };

  const confirmBooking = async () => {
    await addDoc(collection(db, 'bookings'), {
      roomId: selectedRoom.id,
      userId: user.uid,
      ownerId: selectedRoom.ownerId,
      date: date.toISOString(),
      price: selectedRoom.price,
      createdAt: new Date().toISOString(),
    });
    alert('Booking confirmed!');
    setSelectedRoom(null);
  };

  return (
    <div className="findroom-container">
      <h2>Available Rooms</h2>

      {/* Region Filter */}
      <div className="filter-container">
        <label htmlFor="region-select">Filter by Region:</label>
        <select
          id="region-select"
          value={selectedRegion}
          onChange={handleRegionChange}
        >
          {regions.map(region => (
            <option key={region} value={region}>{region}</option>
          ))}
        </select>
      </div>

      {/* Room Grid */}
      <div className="room-grid">
        {filteredRooms.map(room => (
          <div key={room.id} className="room-card">
            {room.imageUrl && (
              <img src={room.imageUrl} alt={room.title} className="room-image" />
            )}
            <div className="room-details">
              <h3>{room.title}</h3>
              <p className="location">{room.location}</p>
              <p className="description">{room.description}</p>
              <p className="price">${room.price} / night</p>
              <button
                className="book-btn"
                onClick={() => handleBook(room)}
              >Book</button>
            </div>
          </div>
        ))}
      </div>

      {/* Booking Modal */}
      {selectedRoom && (
        <div className="booking-modal">
          <div className="modal-content">
            <h3>Book: {selectedRoom.title}</h3>
            <DatePicker
              selected={date}
              onChange={setDate}
              inline
            />
            <div className="modal-actions">
              <button onClick={confirmBooking}>Confirm</button>
              <button onClick={() => setSelectedRoom(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindRoom;

