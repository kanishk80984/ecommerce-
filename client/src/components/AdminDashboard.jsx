import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import api from '../services/api';
import DeliveryIntegrationSettings from '../pages/admin/DeliveryIntegrationSettings';

const AdminDashboard = ({ user }) => {
  const dispatch = useDispatch();
  const [vendors, setVendors] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(user?.role === 'SUPER_ADMIN' ? 'VENDORS' : 'ANALYTICS'); 
  const [vendorSubTab, setVendorSubTab] = useState('MANAGE');

  const [plans, setPlans] = useState([]);
  const [planForm, setPlanForm] = useState({
    name: '', tier: 'BASIC', monthly_price: '', yearly_price: '',
    product_limit: '', image_limit: '5', storage_limit: '100', ad_credits: '0',
    featured_listing: false, homepage_listing: false, premium_badge: false,
    analytics_access: false, bulk_upload: false, bulk_export: false,
    ai_description: false, commission_percentage: '10.00'
  });

  useEffect(() => {
    fetchVendors();
    fetchPlans();
    fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/admin/analytics');
      setAnalytics(res.data.data);
    } catch (error) {
      console.error('Error fetching analytics', error);
    }
  };

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/vendors');
      setVendors(res.data.vendors);
    } catch (error) {
      console.error('Error fetching vendors', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await api.get('/admin/plans');
      setPlans(res.data.plans);
    } catch (error) {
      console.error('Error fetching plans', error);
    }
  };

  const handlePlanChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPlanForm({ ...planForm, [name]: type === 'checkbox' ? checked : value });
  };

  const createPlan = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/plans', planForm);
      alert('Plan created successfully');
      fetchPlans();
    } catch (error) {
      alert('Failed to create plan');
    }
  };

  const updateVendorStatus = async (id, action) => {
    try {
      await api.put(`/admin/vendors/${id}/status`, { action });
      fetchVendors(); // Refresh list
    } catch (error) {
      alert('Failed to update vendor status');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg">{user?.role === 'SUPER_ADMIN' ? 'Super Admin Dashboard' : 'Admin Dashboard'}</h1>
        </div>
        <button 
          onClick={() => dispatch(logout())}
          className="bg-white text-primary px-4 py-1 rounded text-sm font-semibold hover:bg-gray-100"
        >
          Sign Out
        </button>
      </header>

      <main className="p-8 max-w-6xl mx-auto">
        <div className="flex gap-4 mb-8">
          {user?.role !== 'SUPER_ADMIN' && (
            <button onClick={() => setActiveTab('ANALYTICS')} className={`px-6 py-2 rounded-[8px] font-bold ${activeTab === 'ANALYTICS' ? 'bg-secondary text-white' : 'bg-gray-200 text-gray-600'}`}>Analytics</button>
          )}
          <button onClick={() => setActiveTab('VENDORS')} className={`px-6 py-2 rounded-[8px] font-bold ${activeTab === 'VENDORS' ? 'bg-secondary text-white' : 'bg-gray-200 text-gray-600'}`}>
            {user?.role === 'SUPER_ADMIN' ? 'Vendors' : 'Vendor Approvals'}
          </button>
          {user?.role !== 'SUPER_ADMIN' && (
            <button onClick={() => setActiveTab('PLANS')} className={`px-6 py-2 rounded-[8px] font-bold ${activeTab === 'PLANS' ? 'bg-secondary text-white' : 'bg-gray-200 text-gray-600'}`}>Subscription Plans</button>
          )}
          {user?.role === 'SUPER_ADMIN' && (
            <button onClick={() => setActiveTab('DELIVERY')} className={`px-6 py-2 rounded-[8px] font-bold flex items-center gap-2 ${activeTab === 'DELIVERY' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              Delivery API
            </button>
          )}
        </div>

        {activeTab === 'ANALYTICS' && analytics && (
          <div className="bg-white p-8 rounded-[12px] shadow-sm border border-gray-100 animate-fade-in">
            <h2 className="text-2xl font-bold text-primary mb-6">Overall Platform Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-50 p-6 rounded-[8px] border border-gray-200 text-center">
                <p className="text-sm font-bold text-gray-500 uppercase mb-2">Total Users</p>
                <p className="text-3xl font-bold text-primary">{analytics.users.reduce((acc, curr) => acc + curr.count, 0)}</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-[8px] border border-gray-200 text-center">
                <p className="text-sm font-bold text-gray-500 uppercase mb-2">Total Vendors</p>
                <p className="text-3xl font-bold text-secondary">{analytics.vendors.reduce((acc, curr) => acc + curr.count, 0)}</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-[8px] border border-gray-200 text-center">
                <p className="text-sm font-bold text-gray-500 uppercase mb-2">Total Products</p>
                <p className="text-3xl font-bold text-accent">{analytics.total_products}</p>
              </div>
            </div>

            <div className="h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.users.map(u => ({ name: u.role, value: u.count }))}
                    cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value"
                  >
                    <Cell key="cell-0" fill="#1E3B32" />
                    <Cell key="cell-1" fill="#F97316" />
                    <Cell key="cell-2" fill="#2874F0" />
                    <Cell key="cell-3" fill="#6B7280" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'VENDORS' && (
          <div className="bg-white p-8 rounded-[12px] shadow-sm border border-gray-100 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-primary">Vendors</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setVendorSubTab('MANAGE')} 
                  className={`px-4 py-1.5 text-sm font-bold rounded ${vendorSubTab === 'MANAGE' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  Manage Vendors
                </button>
                <button 
                  onClick={() => setVendorSubTab('APPROVE')} 
                  className={`px-4 py-1.5 text-sm font-bold rounded ${vendorSubTab === 'APPROVE' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  Approve Vendors
                </button>
              </div>
            </div>
            
            {loading ? (
              <p>Loading vendors...</p>
            ) : vendors.length === 0 ? (
              <p>No vendors found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-4 font-semibold text-gray-600">ID</th>
                      <th className="p-4 font-semibold text-gray-600">Name / Business</th>
                      <th className="p-4 font-semibold text-gray-600">Type</th>
                      <th className="p-4 font-semibold text-gray-600">KYC Status</th>
                      <th className="p-4 font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.filter(v => vendorSubTab === 'APPROVE' ? v.kyc_status === 'PENDING' : true).length === 0 && (
                      <tr><td colSpan="5" className="p-4 text-center text-gray-500">No vendors in this category.</td></tr>
                    )}
                    {vendors
                      .filter(v => vendorSubTab === 'APPROVE' ? v.kyc_status === 'PENDING' : true)
                      .map((v) => (
                      <tr key={v.id} className="border-b border-gray-100">
                        <td className="p-4 text-gray-500">#{v.id}</td>
                        <td className="p-4">
                          <p className="font-bold text-text-main">{v.name}</p>
                          <p className="text-sm text-gray-500">{v.business_name || 'N/A'}</p>
                        </td>
                        <td className="p-4 text-sm font-semibold">{v.vendor_type || 'N/A'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs font-bold rounded ${v.kyc_status === 'APPROVED' ? 'bg-green-100 text-green-700' : v.kyc_status === 'PENDING' ? 'bg-orange-100 text-orange-700' : v.kyc_status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                            {v.kyc_status || 'EMPTY'}
                          </span>
                        </td>
                        <td className="p-4">
                          {vendorSubTab === 'APPROVE' && v.kyc_status === 'PENDING' && (
                            <div className="flex gap-2">
                              <button onClick={() => updateVendorStatus(v.id, 'APPROVE')} className="bg-green-500 text-white px-3 py-1 text-xs font-bold rounded hover:bg-green-600">Approve</button>
                              <button onClick={() => updateVendorStatus(v.id, 'REJECT')} className="bg-red-500 text-white px-3 py-1 text-xs font-bold rounded hover:bg-red-600">Reject</button>
                            </div>
                          )}
                          {vendorSubTab === 'MANAGE' && v.kyc_status === 'APPROVED' && (
                            <button onClick={() => updateVendorStatus(v.id, 'REJECT')} className="bg-gray-200 text-gray-700 px-3 py-1 text-xs font-bold rounded hover:bg-gray-300">Suspend</button>
                          )}
                          {vendorSubTab === 'MANAGE' && v.kyc_status === 'PENDING' && (
                            <span className="text-gray-400 text-xs italic">Go to Approve Vendors</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'PLANS' && (
          <div className="bg-white p-8 rounded-[12px] shadow-sm border border-gray-100 animate-fade-in">
             <h2 className="text-2xl font-bold text-primary mb-6">Create Subscription Plan</h2>
             
             <form onSubmit={createPlan} className="mb-12 bg-gray-50 p-6 rounded-[8px] border border-gray-200">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                 <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Plan Name</label>
                   <input type="text" name="name" value={planForm.name} onChange={handlePlanChange} required className="w-full border border-gray-300 rounded p-2 text-sm" />
                 </div>
                 <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tier</label>
                   <select name="tier" value={planForm.tier} onChange={handlePlanChange} className="w-full border border-gray-300 rounded p-2 text-sm">
                     <option value="BASIC">Basic</option>
                     <option value="SILVER">Silver</option>
                     <option value="GOLD">Gold</option>
                     <option value="PLATINUM">Platinum</option>
                     <option value="ENTERPRISE">Enterprise</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Monthly Price (₹)</label>
                   <input type="number" name="monthly_price" value={planForm.monthly_price} onChange={handlePlanChange} required className="w-full border border-gray-300 rounded p-2 text-sm" />
                 </div>
                 <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Yearly Price (₹)</label>
                   <input type="number" name="yearly_price" value={planForm.yearly_price} onChange={handlePlanChange} required className="w-full border border-gray-300 rounded p-2 text-sm" />
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                 <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Product Limit (0=unlim)</label>
                   <input type="number" name="product_limit" value={planForm.product_limit} onChange={handlePlanChange} required className="w-full border border-gray-300 rounded p-2 text-sm" />
                 </div>
                 <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Commission %</label>
                   <input type="number" step="0.01" name="commission_percentage" value={planForm.commission_percentage} onChange={handlePlanChange} required className="w-full border border-gray-300 rounded p-2 text-sm" />
                 </div>
                 <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Storage Limit (MB)</label>
                   <input type="number" name="storage_limit" value={planForm.storage_limit} onChange={handlePlanChange} className="w-full border border-gray-300 rounded p-2 text-sm" />
                 </div>
                 <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ad Credits</label>
                   <input type="number" name="ad_credits" value={planForm.ad_credits} onChange={handlePlanChange} className="w-full border border-gray-300 rounded p-2 text-sm" />
                 </div>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                 <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured_listing" checked={planForm.featured_listing} onChange={handlePlanChange} /> Featured Listing</label>
                 <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="homepage_listing" checked={planForm.homepage_listing} onChange={handlePlanChange} /> Homepage Listing</label>
                 <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="premium_badge" checked={planForm.premium_badge} onChange={handlePlanChange} /> Premium Badge</label>
                 <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="analytics_access" checked={planForm.analytics_access} onChange={handlePlanChange} /> Analytics Access</label>
                 <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="bulk_upload" checked={planForm.bulk_upload} onChange={handlePlanChange} /> Bulk Upload</label>
                 <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="bulk_export" checked={planForm.bulk_export} onChange={handlePlanChange} /> Bulk Export</label>
                 <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ai_description" checked={planForm.ai_description} onChange={handlePlanChange} /> AI Description</label>
               </div>

               <button type="submit" className="bg-primary text-white px-6 py-2 rounded font-bold hover:opacity-90">Create Plan</button>
             </form>

             <h2 className="text-xl font-bold text-primary mb-4">Existing Plans</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map(p => (
                  <div key={p.id} className="border border-gray-200 rounded-[8px] p-4 shadow-sm">
                    <h3 className="font-bold text-lg">{p.name} <span className="text-xs bg-accent text-white px-2 py-1 rounded ml-2">{p.tier}</span></h3>
                    <p className="text-2xl font-bold mt-2">₹{p.monthly_price}<span className="text-sm font-normal text-gray-500">/mo</span></p>
                    <div className="mt-4 text-sm text-gray-600 space-y-1">
                      <p>• {p.product_limit === 0 ? 'Unlimited' : p.product_limit} Products</p>
                      <p>• {p.commission_percentage}% Commission</p>
                      {p.premium_badge ? <p>• Premium Badge</p> : null}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

         {activeTab === 'DELIVERY' && user?.role === 'SUPER_ADMIN' && (
           <div className="animate-fade-in">
             <DeliveryIntegrationSettings />
           </div>
         )}

      </main>
    </div>
  );
};

export default AdminDashboard;
