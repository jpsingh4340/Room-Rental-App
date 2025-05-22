import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, push } from "firebase/database";
import database from "../firebase"; // adjust the path if needed

function AddRoom() {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    const newRoom = {
      title,
      location,
      price,
      image,
      description,
      createdAt: new Date().toISOString()
    };

    // Save to Firebase Realtime Database
    push(ref(database, "rooms"), newRoom)
      .then(() => {
        alert("Room added successfully!");
        // Reset form
        setTitle("");
        setLocation("");
        setPrice("");
        setImage("");
        setDescription("");
        // Redirect or update UI
        navigate("/");
      })
      .catch((error) => {
        console.error("Error adding room:", error);
        alert("Failed to add room.");
      });
  };

  return (
    <div style={styles.container}>
      <h2>Add Room</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input type="text" placeholder="Room Title" value={title} onChange={(e) => setTitle(e.target.value)} required style={styles.input} />
        <input type="text" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} required style={styles.input} />
        <input type="number" placeholder="Price per month" value={price} onChange={(e) => setPrice(e.target.value)} required style={styles.input} />
        <input type="text" placeholder="Image URL" value={image} onChange={(e) => setImage(e.target.value)} required style={styles.input} />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required style={styles.textarea} />
        <button type="submit" style={styles.button}>Add Room</button>
      </form>
    </div>
  );
}

const styles = {
  container: { maxWidth: "600px", margin: "0 auto", padding: "20px" },
  form: { display: "flex", flexDirection: "column" },
  input: { marginBottom: "15px", padding: "10px", fontSize: "16px" },
  textarea: { height: "100px", marginBottom: "15px", padding: "10px", fontSize: "16px" },
  button: { padding: "10px", backgroundColor: "#007bff", color: "#fff", fontSize: "16px", border: "none", cursor: "pointer" }
};

export default AddRoom;
