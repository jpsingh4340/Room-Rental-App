// src/pages/Profile.js
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import './Profile.css';

const Profile = () => {
  const { user } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [ratings, setRatings] = useState({});
  const [hoverRatings, setHoverRatings] = useState({});
  const [comments, setComments] = useState({});
  const [submitted, setSubmitted] = useState({});

  // Format joined date, or show “—” if invalid
  const joinedDate = user?.createdAt
    ? (() => {
        const d = new Date(user.createdAt);
        return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
      })()
    : '—';

  // 1) Load this user's bookings and room info
  useEffect(() => {
    const loadBookings = async () => {
      if (!user) return;
      const bookingQ = query(
        collection(db, 'bookings'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(bookingQ);
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Fetch each room's data
      const roomIds = [...new Set(raw.map(b => b.roomId))];
      const roomDocs = await Promise.all(
        roomIds.map(id => getDoc(doc(db, 'rooms', id)))
      );
      const roomsMap = roomDocs.reduce((m, rd) => {
        if (rd.exists()) m[rd.id] = rd.data();
        return m;
      }, {});

      setBookings(
        raw.map(b => ({
          ...b,
          room: roomsMap[b.roomId] || {}
        }))
      );
    };

    loadBookings();
  }, [user]);

  // 2) After bookings load, check which already have feedback
  useEffect(() => {
    const checkSubmitted = async () => {
      if (!user || bookings.length === 0) return;
      const flags = {};
      for (const b of bookings) {
        const fbQ = query(
          collection(db, 'feedbacks'),
          where('bookingId', '==', b.id),
          where('userId', '==', user.uid)
        );
        const fbSnap = await getDocs(fbQ);
        if (!fbSnap.empty) {
          flags[b.id] = true;
        }
      }
      setSubmitted(flags);
    };

    checkSubmitted();
  }, [bookings, user]);

  // Handlers for star‐rating hover/click and comment text
  const handleRating = (bookingId, value) =>
    setRatings(prev => ({ ...prev, [bookingId]: value }));

  const handleMouseEnter = (bookingId, value) =>
    setHoverRatings(prev => ({ ...prev, [bookingId]: value }));

  const handleMouseLeave = bookingId =>
    setHoverRatings(prev => ({ ...prev, [bookingId]: 0 }));

  const handleComment = (bookingId, text) =>
    setComments(prev => ({ ...prev, [bookingId]: text }));

  // Submit new feedback to Firestore
  const submitFeedback = async booking => {
    const bid = booking.id;
    try {
      await addDoc(collection(db, 'feedbacks'), {
        roomId: booking.roomId,
        userId: user.uid,
        bookingId: bid,
        rating: ratings[bid] || 0,
        comment: comments[bid] || '',
        createdAt: Timestamp.now()
      });
      setSubmitted(prev => ({ ...prev, [bid]: true }));
    } catch (err) {
      console.error('Feedback submission error:', err);
    }
  };

  return (
    <div className="profile-container">
      {/* Header */}
      <div className="profile-header">
        <img
          src={user.photoURL || '/avatars/profile.png'}
          alt="Avatar"
          className="profile-avatar-large"
        />
        <div className="profile-info-box">
          <h2 className="profile-name">
            {user.fullName || user.email}
          </h2>
          <p className="profile-role">
            {user.role?.toUpperCase()}
          </p>
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

      {/* Bookings & Feedback */}
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
              const currentRating =
                hoverRatings[b.id] ||
                ratings[b.id] ||
                0;

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
                    <p className="booking-price">
                      Price: $
                      {Number(b.price || 0).toFixed(2)}
                    </p>
                    {b.room.description && (
                      <p className="booking-desc">
                        {b.room.description.substring(
                          0,
                          80
                        )}
                        …
                      </p>
                    )}
                    <p className="booking-date">
                      Booked on {dateStr}
                    </p>

                    {/* Feedback form or thank-you */}
                    {submitted[b.id] ? (
                      <p className="feedback-thanks">
                        Thank you for your
                        feedback!
                      </p>
                    ) : (
                      <div className="feedback-form">
                        <h4>Give Feedback</h4>
                        <div className="star-rating">
                          {[1, 2, 3, 4, 5].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() =>
                                handleRating(
                                  b.id,
                                  n
                                )
                              }
                              onMouseEnter={() =>
                                handleMouseEnter(
                                  b.id,
                                  n
                                )
                              }
                              onMouseLeave={() =>
                                handleMouseLeave(
                                  b.id
                                )
                              }
                              className={
                                currentRating >= n
                                  ? 'star selected'
                                  : 'star'
                              }
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={comments[b.id] || ''}
                          onChange={e =>
                            handleComment(
                              b.id,
                              e.target.value
                            )
                          }
                          placeholder="Your comments"
                        />
                        <button
                          className="submit-feedback-btn"
                          onClick={() =>
                            submitFeedback(b)
                          }
                        >
                          Submit Feedback
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="no-bookings">
            You have no previous bookings.
          </p>
        )}
      </div>
    </div>
  );
};

export default Profile;
