import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import DashboardGuest from '../pages/DashboardGuest';
import DashboardAdmin from '../pages/DashboardAdmin';
import DashboardLandlord from '../pages/DashboardLandlord';

const RoleBasedDashboard = () => {
  const { user } = useContext(AuthContext);
  if (user?.role === 'admin') return <DashboardAdmin />;
  if (user?.role === 'landlord') return <DashboardLandlord />;
  return <DashboardGuest />;
};

export default RoleBasedDashboard;