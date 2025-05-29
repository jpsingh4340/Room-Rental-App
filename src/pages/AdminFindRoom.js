import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import './AdminFindRoom.css';

const AdminFindRoom = () => {
  const [rooms, setRooms] = useState([]);