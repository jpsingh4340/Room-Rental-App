import React, { useState, useEffect, useContext } from 'react';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './AddEditRoom.css';

// If editing, load existing
  useEffect(() => {
    if (editId) {
      (async () => {
        const ref = doc(db, 'rooms', editId);
        const snap = await getDoc(ref);
        if (snap.exists()) setForm(snap.data());
      })();
    }
  }, [editId]);