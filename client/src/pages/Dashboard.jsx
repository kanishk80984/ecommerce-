import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import * as rrdPkg from 'react-router-dom';
const { useNavigate } = rrdPkg;
import { logout } from '../store/authSlice';
import AdminDashboard from '../components/AdminDashboard';
import VendorDashboard from '../components/VendorDashboard';
import CustomerDashboard from '../components/CustomerDashboard';

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'VENDOR' && !user?.is_approved) {
      navigate('/vendor/onboarding');
    }
  }, [user, navigate]);

  if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') return <AdminDashboard user={user} />;
  if (user?.role === 'VENDOR') return <VendorDashboard user={user} />;
  return <CustomerDashboard user={user} />;
};

export default Dashboard;
