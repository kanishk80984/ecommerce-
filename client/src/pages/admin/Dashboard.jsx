import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';

const AdminDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [stats, setStats] = useState({ vendors: 0, products: 0, users: 0 });

  useEffect(() => {
    const fetchStats = () => {
      api.get('/admin/analytics')
        .then(res => {
          if (res.data.success) {
            const data = res.data.data;
            const vendorCount = data.vendors?.reduce((acc, curr) => acc + curr.count, 0) || 0;
            const userCount = data.users?.reduce((acc, curr) => acc + curr.count, 0) || 0;
            setStats({
              vendors: vendorCount,
              products: data.total_products || 0,
              users: userCount
            });
          }
        })
        .catch(err => console.error("Failed to fetch dashboard stats", err));
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5001);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">
        {isSuperAdmin ? 'Super Admin Dashboard' : 'Admin Dashboard'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium uppercase">Total Users</h3>
          <p className="text-3xl font-bold mt-2">{stats.users}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium uppercase">Total Vendors</h3>
          <p className="text-3xl font-bold mt-2">{stats.vendors}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium uppercase">Total Products</h3>
          <p className="text-3xl font-bold mt-2">{stats.products}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
