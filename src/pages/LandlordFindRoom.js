import React, { useState, useEffect, useContext } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const LandlordFindRoom = () => {
  const { user } = useContext(AuthContext);
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch rooms owned by this landlord
  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      setError(null);

      try {
        const q = query(
          collection(db, 'rooms'),
          where('ownerId', '==', user.uid)
        );
        const snap = await getDocs(q);
        const roomList = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setRooms(roomList);
        setFilteredRooms(roomList); // initialize filtered list
      } catch (err) {
        console.error('Error fetching rooms:', err);
        setError('Failed to load rooms. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (user && user.uid) {
      fetchRooms();
    }
  }, [user]);

  // Filter rooms whenever searchTerm or rooms change
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRooms(rooms);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredRooms(
        rooms.filter((room) =>
          room.title.toLowerCase().includes(lower)
        )
      );
    }
  }, [searchTerm, rooms]);

  // Handle room deletion with confirmation
  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this room? This action cannot be undone.'
    );
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'rooms', id));
      // Remove from both rooms and filteredRooms
      setRooms((prev) => prev.filter((r) => r.id !== id));
      setFilteredRooms((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Error deleting room:', err);
      alert('Could not delete the room. Please try again.');
    }
  };

  if (loading) {
    return <div>Loading your rooms…</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="landlord-container">
      <h2>Landlord: Manage Your Rooms</h2>

      {/* Link to add a new room */}
      <div className="top-bar">
        <Link to="/add-room" className="btn btn-primary">
          + List New Room
        </Link>

        {/* Search input */}
        <input
          type="text"
          placeholder="Search by title…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
          style={{ marginLeft: '1rem', padding: '0.5rem', flexGrow: 1 }}
        />
      </div>

      {filteredRooms.length === 0 ? (
        <p>No rooms found{searchTerm ? ` for "${searchTerm}"` : ''}.</p>
      ) : (
        <ul className="room-list">
          {filteredRooms.map((r) => (
            <li key={r.id} className="room-card">
              <div className="room-header">
                <h3>{r.title}</h3>
                <span className="room-price">${r.price}</span>
              </div>

              {/* Optionally show a thumbnail if you store image URLs in r.imageUrl */}
              {r.imageUrl && (
                <div className="room-thumb">
                  <img
                    src={r.imageUrl}
                    alt={`${r.title} thumbnail`}
                    style={{
                      maxWidth: '200px',
                      borderRadius: '4px',
                      objectFit: 'cover',
                    }}
                  />
                </div>
              )}

              <p className="room-description">
                {r.description
                  ? r.description.substring(0, 100) + '…'
                  : 'No description provided.'}
              </p>

              <div className="room-actions">
                {/* View Details (if you have a RoomDetails route) */}
                <Link
                  to={`/room/${r.id}`}
                  className="btn btn-secondary"
                >
                  View Details
                </Link>

                {/* Edit Link preserves editId in query params */}
                <Link
                  to={`/add-room?editId=${r.id}`}
                  className="btn btn-info"
                  style={{ marginLeft: '0.5rem' }}
                >
                  Edit
                </Link>

                {/* Delete with confirmation */}
                <button
                  onClick={() => handleDelete(r.id)}
                  className="btn btn-danger"
                  style={{ marginLeft: '0.5rem' }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* You can add pagination or “Load More” button here if you expect many rooms */}
    </div>
  );
};

export default LandlordFindRoom;
