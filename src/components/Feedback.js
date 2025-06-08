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
