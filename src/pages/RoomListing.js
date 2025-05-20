// src/pages/RoomListing.js
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

function RoomListing() {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const fetchRooms = async () => {
      const roomsCollection = collection(db, "rooms");
      const snapshot = await getDocs(roomsCollection);
      const roomsList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRooms(roomsList);
    };

    fetchRooms();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Available Rooms</h2>
      {rooms.length === 0 ? (
        <p>No rooms listed yet.</p>
      ) : (
        <div style={{ display: "grid", gap: "20px" }}>
          {rooms.map((room) => (
            <div
              key={room.id}
              style={{
                border: "1px solid #ccc",
                padding: "10px",
                borderRadius: "10px",
              }}
            >
              <h3>{room.title}</h3>
              <p><strong>Location:</strong> {room.location}</p>
              <p><strong>Price:</strong> ₹{room.price}</p>
              <img
                src={room.imageUrl}
                alt={room.title}
                style={{ width: "100%", maxWidth: "300px", borderRadius: "8px" }}
              />
              <p>{room.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RoomListing;
