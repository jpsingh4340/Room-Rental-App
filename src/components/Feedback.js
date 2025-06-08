import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

const FeedbackForm = ({ roomId, userId }) => {
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "rooms", roomId, "feedback"), {
      userId,
      comment,
      rating,
      date: new Date().toISOString(),
    });
    setComment("");
    setRating(5);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h4>Leave Feedback</h4>
      <textarea
        placeholder="Your Comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        required
      />
      <br />
      <label>Rating:</label>
      <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
        {[1, 2, 3, 4, 5].map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <br />
      <button type="submit">Submit</button>
      {submitted && <p>✅ Feedback submitted!</p>}
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

  return (
    <div>
      <h4>Feedback</h4>
      {feedbacks.length === 0 ? (
        <p>No feedback yet.</p>
      ) : (
        feedbacks.map((fb, idx) => (
          <div key={idx}>
            <strong>{fb.userId}</strong>: {fb.rating}/5
            <p>{fb.comment}</p>
          </div>
        ))
      )}
    </div>
  );
};

const Feedback = ({ roomId }) => {
  const [canGiveFeedback, setCanGiveFeedback] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const checkBooking = async () => {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) return;

      setUserId(user.uid);

      const bookingsRef = collection(db, "bookings");
      const q = query(
        bookingsRef,
        where("roomId", "==", roomId),
        where("userId", "==", user.uid)
      );
      const result = await getDocs(q);

      if (!result.empty) {
        setCanGiveFeedback(true);
      }
    };

    checkBooking();
  }, [roomId]);

  return (
    <div>
      {canGiveFeedback && userId ? (
        <FeedbackForm roomId={roomId} userId={userId} />
      ) : (
        <p style={{ fontStyle: "italic", color: "gray" }}>
          Only users who booked this room can leave feedback.
        </p>
      )}
      <FeedbackList roomId={roomId} />
    </div>
  );
};

export default Feedback;
