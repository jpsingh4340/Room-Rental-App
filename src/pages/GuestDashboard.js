import React, { useEffect, useState } from "react";
import "../App.css";

const images = [
  "/images/room1.jpg",
  "/images/room2.jpg",
  "/images/room3.jpg"
];

function GuestDashboard() {
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 3000); // change every 3 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="container">
      <h2>Welcome to Our Room Rental Platform</h2>

      <img
        src={images[currentImage]}
        alt="Slideshow"
        style={{ width: "100%", borderRadius: "8px", maxHeight: "300px", objectFit: "cover", marginBottom: "1rem" }}
      />

      <section>
        <h3>Why Choose Us?</h3>
        <p>
          Find affordable, verified rooms across India. No middlemen. Book directly with trusted landlords.
        </p>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h3>🔥 Current Offers</h3>
        <ul>
          <li>Get ₹500 off on your first room booking</li>
          <li>Refer a friend & earn rewards</li>
          <li>Student discount – 10% off with valid ID</li>
        </ul>
      </section>
    </div>
  );
}

export default GuestDashboard;
