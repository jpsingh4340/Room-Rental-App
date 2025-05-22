import React, { useEffect, useState } from "react";
import { database } from "../firebase"; // adjust path as needed
import { ref, onValue } from "firebase/database";

function GuestRoomList() {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const roomsRef = ref(database, "rooms");

    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedRooms = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value,
        }));
        setRooms(loadedRooms);
      } else {
        setRooms([]);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Available Rooms</h2>
      {rooms.length === 0 ? (
        <p>No rooms found.</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
          {rooms.map((room) => (
            <div
              key={room.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "10px",
                width: "250px",
              }}
            >
              <img
                src={room.image}
                alt={room.title}
                style={{ width: "100%", height: "150px", objectFit: "cover" }}
              />
              <h3>{room.title}</h3>
              <p><strong>Location:</strong> {room.location}</p>
              <p><strong>Price:</strong> ${room.price}/month</p>
              <p>{room.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default GuestRoomList;
