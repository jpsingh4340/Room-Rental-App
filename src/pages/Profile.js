import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import './Profile.css';

const Profile = () => {
  const { user } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);

  // Format joined date, or show “—” if invalid
  const joinedDate = user?.createdAt
    ? (() => {
        const d = new Date(user.createdAt);
        return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
      })()
    : '—';

  useEffect(() => {
    const loadBookings = async () => {
      if (!user) return;
      const q = query(
        collection(db, 'bookings'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // load room info
      const roomIds = [...new Set(raw.map(b => b.roomId))];
      const roomDocs = await Promise.all(
        roomIds.map(id => getDoc(doc(db, 'rooms', id)))
      );
      const roomsMap = roomDocs.reduce((m, rd) => {
        if (rd.exists()) m[rd.id] = rd.data();
        return m;
      }, {});

      const withRooms = raw.map(b => ({
        ...b,
        room: roomsMap[b.roomId] || {}
      }));
      setBookings(withRooms);
    };

    loadBookings();
  }, [user]);

  return (
    <div className="profile-container">
      {/* Header box */}
      <div className="profile-header">
        <img
          src={user.photoURL || '/avatars/profile.png'}
          alt="Avatar"
          className="profile-avatar-large"
        />
        <div className="profile-info-box">
          <h2 className="profile-name">{user.fullName || user.email}</h2>
          <p className="profile-role">{user.role?.toUpperCase()}</p>
          <div className="profile-basic-info">
            <div className="info-item">
              <label>Email</label>
              <span>{user.email}</span>
            </div>
            <div className="info-item">
              <label>Joined</label>
              <span>{joinedDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings section */}
      <div className="profile-bookings-section">
        <h3>Your Previous Bookings</h3>
        {bookings.length > 0 ? (
          <ul className="booking-list">
            {bookings.map(b => {
              const dateObj = b.date?.toDate
                ? b.date.toDate()
                : new Date(b.date);
              const dateStr = isNaN(dateObj.getTime())
                ? '—'
                : dateObj.toLocaleDateString();

              return (
                <li key={b.id} className="booking-item">
                  <img
                    src={b.room.imageUrl || '/room-placeholder.png'}
                    alt={b.room.title || 'Room'}
                    className="booking-thumb"
                  />
                  <div className="booking-details">
                    <strong className="booking-title">
                      {b.room.title || b.roomName}
                    </strong>

                    {/* New price line */}
                    <p className="booking-price">
                      Price: ${Number(b.price || 0).toFixed(2)}
                    </p>

                    {b.room.description && (
                      <p className="booking-desc">
                        {b.room.description.substring(0, 80)}…
                      </p>
                    )}

                    <p className="booking-date">Booked on {dateStr}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="no-bookings">You have no previous bookings.</p>
        )}
      </div>
    </div>
  );
};

export default Profile;
