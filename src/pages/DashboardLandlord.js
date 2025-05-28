import React, { useState, useEffect, useContext } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../context/AuthContext';

const DashboardLandlord = () => {
  const { user } = useContext(AuthContext);
  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
    const fetchRevenue = async () => {
      const snap = await getDocs(collection(db, 'bookings'));
      let total = 0;
      snap.forEach(doc => {
        const data = doc.data();
        if (data.ownerId === user.uid) total += data.price;
      });
      setRevenue(total);
    };
    fetchRevenue();
  }, [user]);

  return (
    <div>
      <h2>Landlord Dashboard</h2>
      <div>Your Earnings: ${revenue}</div>
    </div>
  );
};

export default DashboardLandlord;