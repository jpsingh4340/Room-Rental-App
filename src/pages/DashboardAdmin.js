// src/pages/DashboardAdmin.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import './DashboardAdmin.css';

const DashboardAdmin = () => {
  const [stats, setStats] = useState({
    rooms: 0,
    bookings: 0,
    revenue: 0,
    landlords: 0,
    guests: 0,
  });
  const [approvedLandlords, setApprovedLandlords] = useState([]);
  const [pendingLandlords, setPendingLandlords] = useState([]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [roomsSnap, bookingsSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, 'rooms')),
          getDocs(collection(db, 'bookings')),
          getDocs(collection(db, 'users')),
        ]);

        // counts
        const roomsCount = roomsSnap.size;
        const bookingsCount = bookingsSnap.size;

        // revenue
        const bookingsData = bookingsSnap.docs.map(d => d.data());
        const totalRevenue = bookingsData.reduce((sum, b) => sum + (Number(b.price) || 0), 0);

        // split landlords
        const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const landlords = allUsers.filter(u => u.role === 'landlord');
        const approved = landlords.filter(u => u.isApproved);
        const pending  = landlords.filter(u => !u.isApproved);
        const guests   = allUsers.filter(u => u.role === 'guest');

        setStats({
          rooms: roomsCount,
          bookings: bookingsCount,
          revenue: totalRevenue,
          landlords: landlords.length,
          guests: guests.length,
        });

        setApprovedLandlords(approved);
        setPendingLandlords(pending);
      } catch (err) {
        console.error('Error loading admin stats:', err);
      }
    };

    loadStats();
  }, []);

  const approve = async uid => {
    try {
      await updateDoc(doc(db, 'users', uid), { isApproved: true });
      // move from pending → approved in UI
      setPendingLandlords(pl => pl.filter(u => u.id !== uid));
      setApprovedLandlords(al => [...al, pendingLandlords.find(u => u.id === uid)]);
    } catch (err) {
      console.error('Error approving landlord:', err);
    }
  };

  return (
    <div className="dashboard-admin">
      <h2>Admin Dashboard</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Rooms</h3>
          <p>{stats.rooms}</p>
        </div>
        <div className="stat-card">
          <h3>Total Bookings</h3>
          <p>{stats.bookings}</p>
        </div>
        <div className="stat-card">
          <h3>Total Revenue</h3>
          <p>${stats.revenue.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <h3>Total Landlords</h3>
          <p>{stats.landlords}</p>
        </div>
        <div className="stat-card">
          <h3>Total Guests</h3>
          <p>{stats.guests}</p>
        </div>
      </div>

      {approvedLandlords.length > 0 && (
        <section className="approved-section">
          <h3>Approved Landlords</h3>
          <ul>
            {approvedLandlords.map(u => (
              <li key={u.id}>
                {u.fullName} &lt;{u.email}&gt;
              </li>
            ))}
          </ul>
        </section>
      )}

      {pendingLandlords.length > 0 && (
        <section className="pending-section">
          <h3>Pending Landlord Approvals</h3>
          <ul>
            {pendingLandlords.map(u => (
              <li key={u.id}>
                {u.fullName} &lt;{u.email}&gt;
                <button onClick={() => approve(u.id)}>Approve</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default DashboardAdmin;
