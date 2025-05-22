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
    imageUrl: 'https://in.images.search.yahoo.com/search/images;_ylt=Awrx_b14kS5olQIAGaS7HAx.;_ylu=Y29sbwNzZzMEcG9zAzEEdnRpZAMEc2VjA3BpdnM-?p=spring+season+room+image&fr2=piv-web&type=E210IN885G0&fr=mcafee#id=2&iurl=https%3A%2F%2Ffoyr.com%2Flearn%2Fwp-content%2Fuploads%2F2022%2F09%2Fsunroom-decorating-ideas-for-all-seasons-1-1024x732.jpeg&action=click',
  },
  {
    id: 2,
    title: 'Long-Stay Special',
    description: 'Book 7 nights, get 1 free.',
    imageUrl: 'https://images.unsplash.com/photo-1595735975331-4bcf45a0f861?auto=format&fit=crop&w=800&q=60',
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
