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
try {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        paymentStatus: 'paid',
        paymentDate: new Date().toISOString(),
        paymentDetails: {
          cardholderName,
          last4: cardNumber.slice(-4),
        },
      });

 alert('Payment successful!');
      navigate('/thank-you');
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('Payment failed. Try again.');
    }
  };

  if (loading) return <div className="loading">Loading booking details...</div>;
  if (errorMsg) return <div className="error">{errorMsg}</div>;

return (
    <div className="payment-container">
      <div className="payment-card">
        <h2>Confirm Your Payment</h2>
        <div className="booking-summary">
          <img src={booking.roomImageUrl} alt="Room" />
          <div className="booking-info">
            <h3>{booking.roomTitle}</h3>
            <p>{booking.roomDescription}</p>
            <p><strong>Dates:</strong> {booking.startDate} to {booking.endDate}</p>
            <p><strong>Nights:</strong> {booking.nights}</p>
            <p><strong>Price per night:</strong> ₹{booking.pricePerNight}</p>
            <p><strong>Total:</strong> ₹{booking.totalPrice}</p>
          </div>
        </div>
        <form onSubmit={handlePayment} className="payment-form">
          <h3>Payment Details</h3>
          <input
            type="text"
            name="cardholderName"
            placeholder="Cardholder Name"
            value={paymentInfo.cardholderName}
            onChange={handleInputChange}
            required
          />
<input
            type="text"
            name="cardNumber"
            placeholder="Card Number"
            maxLength="16"
            value={paymentInfo.cardNumber}
            onChange={handleInputChange}
            required
          />
          <div className="payment-row">
            <input
              type="text"
              name="expiryDate"
              placeholder="MM/YY"
              value={paymentInfo.expiryDate}
              onChange={handleInputChange}
              required
            />
<input
              type="text"
              name="cvv"
              placeholder="CVV"
              maxLength="3"
              value={paymentInfo.cvv}
              onChange={handleInputChange}
              required
            />
          </div>
          <button type="submit">Pay ₹{booking.totalPrice}</button>
        </form>
      </div>
    </div>
  );
};

export default PaymentPage;
