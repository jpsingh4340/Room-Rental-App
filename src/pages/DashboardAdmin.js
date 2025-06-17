import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
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

        const roomsCount = roomsSnap.size;
        const bookingsCount = bookingsSnap.size;

        const bookingsData = bookingsSnap.docs.map(d => d.data());
        const totalRevenue = bookingsData.reduce((sum, b) => sum + (Number(b.price) || 0), 0);

        const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const landlords = allUsers.filter(u => u.role === 'landlord');
        const approved = landlords.filter(u => u.isApproved);
        const pending = landlords.filter(u => !u.isApproved);
        const guests = allUsers.filter(u => u.role === 'guest');

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
      setPendingLandlords(pl => pl.filter(u => u.id !== uid));
      const approvedUser = pendingLandlords.find(u => u.id === uid);
      if (approvedUser) {
        setApprovedLandlords(al => [...al, { ...approvedUser, isApproved: true }]);
      }
    } catch (err) {
      console.error('Error approving landlord:', err);
    }
  };

  const deleteLandlord = async uid => {
    const confirm = window.confirm("Are you sure you want to delete this landlord?");
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, 'users', uid));
      setApprovedLandlords(al => al.filter(u => u.id !== uid));
      setPendingLandlords(pl => pl.filter(u => u.id !== uid));
    } catch (err) {
      console.error('Error deleting landlord:', err);
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
                <button onClick={() => deleteLandlord(u.id)} className="delete-btn">Delete</button>
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
                <button onClick={() => deleteLandlord(u.id)} className="delete-btn">Delete</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default DashboardAdmin;
