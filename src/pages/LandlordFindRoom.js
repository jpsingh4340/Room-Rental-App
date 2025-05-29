import React, { useState, useEffect, useContext } from 'react';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const LandlordFindRoom = () => 
  const { user } = useContext(AuthContext);
  const [rooms, setRooms] = useState([]);