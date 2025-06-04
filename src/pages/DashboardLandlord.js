import React, { useState, useEffect, useContext } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './landlorddashboard.css';

const DashboardLandlord = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [revenue, setRevenue] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [roomCount, setRoomCount] = useState(0);

  // Fetch bookings for earnings and count
  useEffect(() => {
    const fetchBookings = async () => {
      const snap = await getDocs(collection(db, 'bookings'));
      let total = 0;
      let count = 0;
      snap.forEach(doc => {
        const data = doc.data();
        if (data.ownerId === user.uid) {
          total += data.price;
          count += 1;
        }
      });
      setRevenue(total);
      setBookingCount(count);
    };
    fetchBookings();
  }, [user]);

  // Fetch rooms listed by landlord
  useEffect(() => {
    const fetchRooms = async () => {
      const snap = await getDocs(collection(db, 'rooms'));
      let count = 0;
      snap.forEach(doc => {
        const data = doc.data();
        if (data.ownerId === user.uid) count += 1;
      });
      setRoomCount(count);
    };
    fetchRooms();
  }, [user]);

  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title">Landlord Dashboard</h2>

      <div className="stats-grid">
        <div className="card">
          <div className="label">Earnings</div>
          <div className="value">${revenue.toFixed(2)}</div>
        </div>
        <div className="card">
          <div className="label">Bookings</div>
          <div className="value">{bookingCount}</div>
        </div>
        <div className="card">
          <div className="label">Active Listings</div>
          <div className="value">{roomCount}</div>
        </div>
      </div>

      <div className="instructions">
        <h3>How to List a New Room</h3>
        <ol>
          <li>Click the <strong>"List New Room"</strong> button below.</li>
          <li>Enter the room details: title, description, price, and upload photos.</li>
          <li>Review your entry and hit <strong>"Add Room"</strong>.</li>
          <li>Your listing will appear under Active Listings.</li>
        </ol>
      </div>

      <button
        className="list-room-btn"
        onClick={() => navigate('/add-room')}
      >
        List New Room
      </button>
    </div>
  );
};

export default DashboardLandlord;