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

  // Format joined date (assumes user.createdAt is a timestamp string or Date string)
  const joinedDate = user?.createdAt
    ? (() => {
        const d = new Date(user.createdAt);
        return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
      })()
    : '—';

  // 1) Load bookings + fallback room data
  useEffect(() => {
    if (!user) return;

    const loadBookings = async () => {
      try {
        const bookingQ = query(
          collection(db, 'bookings'),
          where('userId', '==', user.uid)
        );
        const snap = await getDocs(bookingQ);
        const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Extract unique room IDs from bookings
        const roomIds = [...new Set(raw.map(b => b.roomId))];

        // Fetch room docs in parallel
        const roomDocs = await Promise.all(
          roomIds.map(id => getDoc(doc(db, 'rooms', id)))
        );

        // Create a map of room data keyed by roomId
        const roomsMap = {};
        roomDocs.forEach(rd => {
          if (rd.exists()) roomsMap[rd.id] = rd.data();
        });

        // Merge bookings with room data or fallback snapshot fields
        setBookings(
          raw.map(b => ({
            ...b,
            room: roomsMap[b.roomId] || {
              title: b.roomTitle || 'Untitled Room',
              imageUrl: b.roomImageUrl || '/room-placeholder.png',
              description: b.roomDescription || ''
            }
          }))
        );
      } catch (error) {
        console.error('Error loading bookings:', error);
      }
    };

    loadBookings();
  }, [user]);

  // 2) Check which bookings already have feedback submitted
  useEffect(() => {
    if (!user || bookings.length === 0) return;

    const checkSubmitted = async () => {
      const flags = {};
      await Promise.all(
        bookings.map(async b => {
          const fbQ = query(
            collection(db, 'feedbacks'),
            where('bookingId', '==', b.id),
            where('userId', '==', user.uid)
          );
          const fbSnap = await getDocs(fbQ);
          if (!fbSnap.empty) flags[b.id] = true;
        })
      );
      setSubmitted(flags);
    };

    checkSubmitted();
  }, [bookings, user]);

  // Handlers for star ratings and comments
  const handleRating = (bid, value) =>
    setRatings(prev => ({ ...prev, [bid]: value }));

  const handleMouseEnter = (bid, value) =>
    setHoverRatings(prev => ({ ...prev, [bid]: value }));

  const handleMouseLeave = bid =>
    setHoverRatings(prev => ({ ...prev, [bid]: 0 }));

  const handleComment = (bid, text) =>
    setComments(prev => ({ ...prev, [bid]: text }));

  // Submit feedback to 'feedbacks' collection
  const submitFeedback = async booking => {
    const bid = booking.id;
    try {
      await addDoc(collection(db, 'feedbacks'), {
        roomId: booking.roomId,
        bookingId: bid,
        userId: user.uid,
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
      {/* Profile Header */}
      <div className="profile-header">
        <img
          src={user.photoURL || '/avatars/profile.png'}
          alt="Avatar"
          className="profile-avatar-large"
        />
        <div className="profile-info-box">
          <h2 className="profile-name">{user.fullName || user.email}</h2>
          <p className="profile-role">{user.role?.toUpperCase() || 'USER'}</p>
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

      {/* Bookings and Feedback Section */}
      <div className="profile-bookings-section">
        <h3>Your Previous Bookings</h3>

        {bookings.length === 0 ? (
          <p className="no-bookings">You have no previous bookings.</p>
        ) : (
          <ul className="booking-list">
            {bookings.map(b => {
              // Parse startDate for display (booking dates stored as 'YYYY-MM-DD' strings)
              const startDateObj = b.startDate ? new Date(b.startDate) : null;
              const endDateObj = b.endDate ? new Date(b.endDate) : null;
              const dateStr = startDateObj && !isNaN(startDateObj.getTime())
                ? `${startDateObj.toLocaleDateString()} - ${endDateObj ? endDateObj.toLocaleDateString() : ''}`
                : '—';

              // Use totalPrice from booking
              const priceDisplay = b.totalPrice != null ? b.totalPrice : 0;

              // Star rating current hover or selected
              const current = hoverRatings[b.id] || ratings[b.id] || 0;

              return (
                <li key={b.id} className="booking-item">
                  <img
                    className="booking-thumb"
                    src={b.room.imageUrl || '/room-placeholder.png'}
                    alt={b.room.title || 'Room'}
                  />

                  <div className="booking-details">
                    <h4 className="booking-title">{b.room.title}</h4>

                    {b.room.description && (
                      <p className="booking-desc">{b.room.description}</p>
                    )}

                    <p className="booking-price">
                      Price: ${Number(priceDisplay).toFixed(2)}
                    </p>

                    <p className="booking-date">Dates: {dateStr}</p>

                    {/* Feedback section */}
                    {submitted[b.id] ? (
                      <p className="feedback-thanks">Thank you for your feedback!</p>
                    ) : (
                      <div className="feedback-form">
                        <h4>Give Feedback</h4>
                        <div className="star-rating">
                          {[1, 2, 3, 4, 5].map(n => (
                            <button
                              key={n}
                              type="button"
                              className={current >= n ? 'star selected' : 'star'}
                              onClick={() => handleRating(b.id, n)}
                              onMouseEnter={() => handleMouseEnter(b.id, n)}
                              onMouseLeave={() => handleMouseLeave(b.id)}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={comments[b.id] || ''}
                          onChange={e => handleComment(b.id, e.target.value)}
                          placeholder="Your comments…"
                        />
                        <button
                          className="submit-feedback-btn"
                          onClick={() => submitFeedback(b)}
                          disabled={ratings[b.id] === 0}
                          title={ratings[b.id] === 0 ? 'Please select a rating' : ''}
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
        )}
      </div>
    </div>
  );
};

export default Profile;
