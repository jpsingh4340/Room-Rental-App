 import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase'; 

import './PaymentPage.css';
const PaymentPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentInfo, setPaymentInfo] = useState({
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
  });
 useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        setErrorMsg('Invalid booking ID.');
        setLoading(false);
        return;
      }
console.log('Fetching booking with ID:', bookingId); // ✅ Debug log

      try {
        const docRef = doc(db, 'bookings', bookingId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setBooking(docSnap.data());
        } else {
          setErrorMsg('Booking not found.');
        }
 } catch (error) {
        console.error('Error fetching booking:', error);
        setErrorMsg('Failed to load booking.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

const handleInputChange = (e) => {
    setPaymentInfo({ ...paymentInfo, [e.target.name]: e.target.value });
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    const { cardholderName, cardNumber, expiryDate, cvv } = paymentInfo;

    if (!cardholderName || !cardNumber || !expiryDate || !cvv) {
      alert('Please fill in all payment fields.');
      return;
    }

