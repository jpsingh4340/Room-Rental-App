import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

const FeedbackForm = ({ roomId }) => {
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    await addDoc(collection(db, "rooms", roomId, "feedback"), {
      name,
      comment,
      rating,
      date: new Date().toISOString(),
    });

    setName("");
    setComment("");
    setRating(5);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "10px" }}>
      <h4>Leave Feedback</h4>
      <div>
        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ padding: "5px", width: "100%", marginBottom: "5px" }}
        />
      </div>
      <div>
        <textarea
          placeholder="Your Comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          required
          style={{ padding: "5px", width: "100%", marginBottom: "5px" }}
        />
      </div>
      <div>
        <label>Rating: </label>
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((num) => (
            <option key={num} value={num}>{num}</option>
          ))}
        </select>
      </div>
      <button type="submit" style={{ marginTop: "5px" }}>Submit</button>
      {submitted && <p style={{ color: "green" }}>Thank you for your feedback!</p>}
    </form>
  );
};

const FeedbackList = ({ roomId }) => {
  const [feedbacks, setFeedbacks] = useState([]);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      const querySnapshot = await getDocs(collection(db, "rooms", roomId, "feedback"));
      setFeedbacks(querySnapshot.docs.map((doc) => doc.data()));
    };
    fetchFeedbacks();
  }, [roomId]);
