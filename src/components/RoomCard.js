// src/components/RoomCard.js
import React from 'react';
import './RoomCard.css';

const RoomCard = ({ room }) => {
  return (
    <div className="room-card">
      <img src={room.imageUrl} alt={room.title} />
      <h3>{room.title}</h3>
      <p>{room.description}</p>
      <p><strong>Price:</strong> ${room.price}/month</p>
      <p><strong>Location:</strong> {room.location}</p>
    </div>
  );
};

export default RoomCard;
