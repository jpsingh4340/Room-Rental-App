import React, { useState, useEffect, useContext } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../context/AuthContext';
import './DashboardAdmin.css';

const adminOffers = [
  {
    id: 1,
    title: 'Partner Promotion',
    description: 'Earn extra commission on partner listings.',
    imageUrl: 'https://images.unsplash.com/photo-1506702315536-dd8b83e2dcf9?auto=format&fit=crop&w=800&q=60',
  },
  {
    id: 2,
    title: 'Feature Spotlight',
    description: 'Get your newest listings featured for free.',
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=60',
  },
  {
    id: 3,
    title: 'Dashboard Tips',
    description: 'Learn how to increase your booking rate.',
    imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=60',
  },
];

const DashboardAdmin = () => {
  const [stats, setStats] = useState({ rooms: 0, bookings: 0, revenue: 0 });
  const [offerIndex, setOfferIndex] = useState(0);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchStats = async () => {
      const [roomsSnap, bookingsSnap] = await Promise.all([
        getDocs(collection(db, 'rooms')),
        getDocs(collection(db, 'bookings')),
      ]);

      let revenue = 0;
      bookingsSnap.docs.forEach(d => {
        const price = d.data().price || 0;
        revenue += price;
      });

      setStats({
        rooms: roomsSnap.size,
        bookings: bookingsSnap.size,
        revenue,
      });
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setOfferIndex(i => (i + 1) % adminOffers.length);
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  const offer = adminOffers[offerIndex];

  return (
    <div className="dashboard-admin">
      <h2>Admin Dashboard</h2>
      <div className="stats-grid">
        <div className="stat-card"><h3>Total Rooms</h3><p>{stats.rooms}</p></div>
        <div className="stat-card"><h3>Total Bookings</h3><p>{stats.bookings}</p></div>
        <div className="stat-card"><h3>Total Revenue</h3><p>${stats.revenue}</p></div>
      </div>

      <section className="offers-section">
        <h3>Admin Promotions</h3>
        <div className="offer-card">
          <img src={offer.imageUrl} alt={offer.title} className="offer-image" />
          <div className="offer-details">
            <h4>{offer.title}</h4>
            <p>{offer.description}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardAdmin;
