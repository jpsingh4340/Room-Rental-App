import React, { useState, useEffect } from 'react';
import './DashboardGuest.css';

const infoCards = [
  { id: 1, title: '24/7 Support', description: 'We’re here to help you around the clock.' },
  { id: 2, title: 'Easy Booking', description: 'Reserve rooms in just a few clicks.' },
  { id: 3, title: 'Secure Payments', description: 'All transactions are encrypted and safe.' },
];

const guestOffers = [
  {
    id: 1,
    title: 'Spring Discount',
    description: 'Save 20% on all bookings this spring!',
    imageUrl: 'https://static01.nyt.com/images/2023/04/01/travel/00spring-hotels-hudson-valley-7/oakImage-1678216893139-videoSixteenByNine3000.jpg',
  },
  {
    id: 2,
    title: 'Long-Stay Special',
    description: 'Book 7 nights, get 1 free.',
    imageUrl: 'https://selected-ryokan.com/wp-content/uploads/2015/11/7aae1e12b00db63f51491c177a252f34.jpg',
  },
  {
    id: 3,
    title: 'Weekend Getaway',
    description: 'Weekend bookings include free breakfast.',
    imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=60',
  },
];

const DashboardGuest = () => {
  const [offerIndex, setOfferIndex] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setOfferIndex(i => (i + 1) % guestOffers.length);
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  const offer = guestOffers[offerIndex];

  return (
    <div className="dashboard-guest">
      <h2>Welcome to Rental Haven!</h2>

      <div className="info-grid">
        {infoCards.map(c => (
          <div key={c.id} className="info-card">
            <h3>{c.title}</h3>
            <p>{c.description}</p>
          </div>
        ))}
      </div>

      <section className="offers-section">
        <h3>Current Offers</h3>
        <div className="offer-card">
          <img src={offer.imageUrl} alt={offer.title} className="offer-image" />
          <div className="offer-details">
            <h4>{offer.title}</h4>
            <p>{offer.description}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardGuest;
