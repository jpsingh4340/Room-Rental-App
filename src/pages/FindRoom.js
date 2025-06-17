// src/components/FindRoom.js
import React, { useState, useEffect, useContext } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  doc,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { sampleRooms } from '../data/sampleRooms';
import './FindRoom.css';

const regions = [
  'All',
  'Auckland CBD',
  'West Auckland',
  'South Auckland',
  'East Auckland',
  'North Auckland',
];

// RoomCard Component
function RoomCard({ room, feedbacks = [], onBook, onOpenDetail }) {
  const images = room.imageUrls?.length ? room.imageUrls : [room.imageUrl];
  const [idx, setIdx] = useState(0);

  const prev = e => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length); };
  const next = e => { e.stopPropagation(); setIdx(i => (i + 1) % images.length); };

  const avgRating = feedbacks.length
    ? Math.floor(feedbacks.reduce((sum, r) => sum + r.rating, 0) / feedbacks.length)
    : 0;

  return (
    <div className="room-card" onClick={() => onOpenDetail(room)}>
      <div className="card-carousel" data-count={images.length}>
        <button className="carousel-btn prev" onClick={prev}>‹</button>
        <img src={images[idx]} alt={room.title} className="room-image" />
        <button className="carousel-btn next" onClick={next}>›</button>
      </div>
      <div className="room-info">
        <h3>{room.title}</h3>
        <p className="location">{room.location}</p>
        <p className="price">${room.price} / night</p>
        <p className="room-specs">
          🛏 {room.bedrooms} ⋅ 🛁 {room.bathrooms} ⋅ 🍽️ {room.kitchens} ⋅ 🛋️ {room.lounges}
        </p>

        {feedbacks.length > 0 && (
          <div className="card-feedback">
            <div className="star-rating">
              {[1,2,3,4,5].map(n => (
                <span key={n} className={n <= avgRating ? 'star selected' : 'star'}>★</span>
              ))}
            </div>
            <span className="review-count">
              {feedbacks.length} review{feedbacks.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        <button
          className="book-btn"
          onClick={e => { e.stopPropagation(); onBook(room); }}
        >
          Book
        </button>
      </div>
    </div>
  );
}

export default function FindRoom() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [feedbacks, setFeedbacks] = useState({});
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [bookingRoom, setBookingRoom] = useState(null);
  const [detailRoom, setDetailRoom] = useState(null);
  const [detailImgIdx, setDetailImgIdx] = useState(0);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  useEffect(() => {
    const fetchAndSeed = async () => {
      const roomsCol = collection(db, 'rooms');
      const snap = await getDocs(roomsCol);
      let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (snap.docs.length !== sampleRooms.length) {
        // Delete all current docs
        await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'rooms', d.id))));
        // Add sample rooms
        await Promise.all(sampleRooms.map(r => addDoc(roomsCol, r)));
        // Fetch again
        const newSnap = await getDocs(roomsCol);
        docs = newSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      setRooms(docs);
      setFilteredRooms(docs);
    };
    fetchAndSeed();
  }, []);

  useEffect(() => {
    if (!rooms.length) return;
    const fetchFeedbacks = async () => {
      const data = {};
      for (let room of rooms) {
        const fbQ = query(collection(db, 'feedbacks'), where('roomId', '==', room.id));
        const fbSnap = await getDocs(fbQ);
        const reviews = await Promise.all(
          fbSnap.docs.map(async snap => {
            const { rating, comment, userId } = snap.data();
            let username = 'Anonymous';
            try {
              const uDoc = await getDoc(doc(db, 'users', userId));
              if (uDoc.exists()) username = uDoc.data().fullName || uDoc.data().email;
            } catch {}
            return { id: snap.id, rating, comment, username };
          })
        );
        data[room.id] = reviews;
      }
      setFeedbacks(data);
    };
    fetchFeedbacks();
  }, [rooms]);

  useEffect(() => {
    setFilteredRooms(
      selectedRegion === 'All'
        ? rooms
        : rooms.filter(r => r.location.includes(selectedRegion))
    );
  }, [selectedRegion, rooms]);

  const handleBook = room => {
    if (!user) return navigate('/login');
    if (user.role !== 'guest') return alert('Only guests can book rooms');
    setBookingRoom(room);
    if (detailRoom?.id !== room.id) {
      setDetailRoom(null);
      setTimeout(() => {
        setDetailRoom(room);
        setDetailImgIdx(0);
      }, 10);
    }
  };

  const confirmBooking = async () => {
    if (endDate < startDate) {
      alert('End date cannot be before start date.');
      return;
    }

    const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    if (nights === 0) {
      alert('Please select at least 1 night.');
      return;
    }

    const totalPrice = bookingRoom.price * nights;

    try {
      const docRef = await addDoc(collection(db, 'bookings'), {
        roomId: bookingRoom.id,
        userId: user.uid,
        ownerId: bookingRoom.ownerId,
        roomTitle: bookingRoom.title,
        roomImageUrl: bookingRoom.imageUrl,
        roomDescription: bookingRoom.description,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        nights,
        pricePerNight: bookingRoom.price,
        totalPrice,
        createdAt: new Date().toISOString()
      });

      navigate(`/payment/${docRef.id}`);
    } catch (err) {
      alert('Error booking room: ' + err.message);
    }
  };

  const openDetail = room => {
    setDetailRoom(room);
    setDetailImgIdx(0);
    setBookingRoom(null);
  };
  const closeDetail = () => {
    setDetailRoom(null);
    setBookingRoom(null);
  };

  return (
    <div className="findroom-container">
      <h2>Available Rooms</h2>

      <div className="filter-container">
        <label>Filter by Region:</label>
        <select
          value={selectedRegion}
          onChange={e => setSelectedRegion(e.target.value)}
        >
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="room-grid">
        {filteredRooms.map(room => (
          <RoomCard
            key={room.id}
            room={room}
            feedbacks={feedbacks[room.id] || []}
            onBook={handleBook}
            onOpenDetail={openDetail}
          />
        ))}
      </div>

      {detailRoom && (
        <div className="detail-overlay">
          <div className="detail-container">
            <button className="close-btn" onClick={closeDetail}>
              ← Back to Results
            </button>
            <div className="detail-main">
              <div className="detail-carousel">
                <button
                  className="carousel-btn prev"
                  onClick={() =>
                    setDetailImgIdx(i =>
                      (i - 1 + (detailRoom.imageUrls?.length || 1)) % (detailRoom.imageUrls?.length || 1)
                    )
                  }
                >‹</button>
                <img
                  src={detailRoom.imageUrls?.[detailImgIdx] || detailRoom.imageUrl}
                  alt={detailRoom.title}
                  className="detail-img"
                />
                <button
                  className="carousel-btn next"
                  onClick={() =>
                    setDetailImgIdx(i =>
                      (i + 1) % (detailRoom.imageUrls?.length || 1)
                    )
                  }
                >›</button>
              </div>

              <div className="detail-text">
                <h2>{detailRoom.title}</h2>
                <p className="location">{detailRoom.location}</p>
                <p className="description">{detailRoom.description}</p>
                <p className="room-specs detail-specs">
                  🛏 {detailRoom.bedrooms} ⋅ 🛁 {detailRoom.bathrooms} ⋅ 🍽️ {detailRoom.kitchens} ⋅ 🛋️ {detailRoom.lounges}
                </p>

                {(!bookingRoom || bookingRoom.id !== detailRoom.id) ? (
                  <button className="book-btn" onClick={() => handleBook(detailRoom)}>
                    Book This Room
                  </button>
                ) : (
                  <div className="booking-form">
                    <div className="date-picker-wrapper">
                      <label>Start Date:</label>
                      <DatePicker selected={startDate} onChange={setStartDate} />
                      <label>End Date:</label>
                      <DatePicker selected={endDate} onChange={setEndDate} />
                    </div>
                    <div className="modal-actions">
                      <button onClick={confirmBooking}>Confirm</button>
                      <button onClick={() => setBookingRoom(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <h3>Reviews</h3>
            <div className="reviews-section">
              {(feedbacks[detailRoom.id] || []).length > 0 ? (
                feedbacks[detailRoom.id].map(r => (
                  <div key={r.id} className="review-item">
                    <strong>{r.username}</strong>
                    <div className="star-rating">
                      {[1,2,3,4,5].map(i => (
                        <span key={i} className={i <= r.rating ? 'star selected' : 'star'}>
                          ★
                        </span>
                      ))}
                    </div>
                    <p>{r.comment}</p>
                  </div>
                ))
              ) : (
                <p className="no-reviews">No reviews yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
