import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import api from '../services/api';
import { LayoutDashboard, PackagePlus, Wallet, LogOut, Menu } from 'lucide-react';

const VendorDashboard = ({ user }) => {
  const dispatch = useDispatch();
  const [data, setData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Payment Settings State
  const [settingsForm, setSettingsForm] = useState({
    upi_id: '', bank_account: '', ifsc_code: ''
  });

  // Product Form State
  const [productForm, setProductForm] = useState({
    name: '', category_id: '1', sku: '', barcode: '',
    short_description: '', description: '', warranty: '', return_policy: '',
    weight: '', stock: '1', mrp: '', price: '', offer_price: '', gst_percentage: '18',
    highlights: '', specifications: {}
  });

  useEffect(() => {
    fetchDashboard();
    fetchPlans();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/vendor/dashboard');
      setData(res.data);
      if (res.data.profile) {
        setSettingsForm({
          upi_id: res.data.profile.upi_id || '',
          bank_account: res.data.profile.bank_account || '',
          ifsc_code: res.data.profile.ifsc_code || ''
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await api.get('/admin/plans'); // Needs to be public or vendor-accessible
      setPlans(res.data.plans);
    } catch (error) {
      console.error(error);
    }
  };

  const handleProductChange = (e) => {
    setProductForm({ ...productForm, [e.target.name]: e.target.value });
  };

  const handleSettingsChange = (e) => {
    setSettingsForm({ ...settingsForm, [e.target.name]: e.target.value });
  };

  const submitSettings = async (e) => {
    e.preventDefault();
    try {
      await api.put('/vendor/profile', settingsForm);
      alert('Payment settings updated successfully!');
      fetchDashboard();
    } catch (error) {
      console.error(error);
      alert('Failed to update payment settings.');
    }
  };

  const submitProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...productForm };
      
      // Transform highlights string to array
      if (typeof payload.highlights === 'string') {
        payload.highlights = payload.highlights.split('\n').filter(h => h.trim() !== '');
      }
      
      await api.post('/vendor/products', payload);
      alert('Product created successfully!');
      fetchDashboard();
      setActiveTab('OVERVIEW');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create product');
    }
  };

  const purchaseSubscription = async (planId) => {
    try {
      // In a real app, this would redirect to Razorpay/Stripe
      alert('Mock Payment Gateway: Processing payment for Plan ID ' + planId);
      // For now, let's mock the backend call (need to create this API endpoint)
      await api.post('/vendor/subscribe', { plan_id: planId });
      alert('Subscription Activated!');
      fetchDashboard();
    } catch (error) {
      alert(error.response?.data?.message || 'Subscription failed');
    }
  };

  if (loading) return <div className="p-10 text-center">Loading dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-primary text-white p-4 flex justify-between items-center shadow-md z-20">
        <h1 className="font-bold text-lg">Vendor Dashboard</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Menu */}
      <aside className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-64 bg-white border-r border-gray-200 shrink-0 h-screen z-10`}>
        <div className="hidden md:block p-6 border-b border-gray-100 shrink-0">
          <h1 className="font-extrabold text-xl text-primary">Vendor Panel</h1>
        </div>
        
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto min-h-0">
          <button 
            onClick={() => { setActiveTab('OVERVIEW'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-[8px] font-medium transition-colors ${activeTab === 'OVERVIEW' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          <button 
            onClick={() => { setActiveTab('PRODUCTS'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-[8px] font-medium transition-colors ${activeTab === 'PRODUCTS' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <PackagePlus size={20} />
            Add Product
          </button>
          <button 
            onClick={() => { setActiveTab('SETTINGS'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-[8px] font-medium transition-colors ${activeTab === 'SETTINGS' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Wallet size={20} />
            Payment Settings
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100 shrink-0 mt-auto">
          <button 
            onClick={() => dispatch(logout())}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 font-medium hover:bg-red-50 rounded-[8px] transition-colors"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        
        {/* If NO Active Subscription, show Plans */}
        {!data?.subscription ? (
          <div className="bg-white p-8 rounded-[12px] shadow-sm border border-gray-100 text-center">
            <h2 className="text-3xl font-bold text-primary mb-4">Choose a Subscription Plan</h2>
            <p className="text-gray-600 mb-8">You must purchase a vendor subscription plan to start selling.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {plans.map(p => (
                <div key={p.id} className="border-2 border-gray-100 hover:border-secondary transition-colors rounded-[12px] p-6 shadow-sm flex flex-col">
                  <h3 className="font-bold text-xl">{p.name} <span className="text-xs bg-accent text-white px-2 py-1 rounded ml-2 align-middle">{p.tier}</span></h3>
                  <p className="text-3xl font-bold mt-4">₹{p.monthly_price}<span className="text-base font-normal text-gray-500">/mo</span></p>
                  <div className="mt-6 mb-8 text-sm text-gray-600 space-y-3 flex-1">
                    <p className="flex items-center gap-2">✅ {p.product_limit === 0 ? 'Unlimited' : p.product_limit} Product Listings</p>
                    <p className="flex items-center gap-2">✅ {p.commission_percentage}% Sales Commission</p>
                    <p className="flex items-center gap-2">✅ {p.image_limit} Images per product</p>
                    {p.premium_badge ? <p className="flex items-center gap-2 text-primary font-bold">✨ Premium Seller Badge</p> : null}
                    {p.featured_listing ? <p className="flex items-center gap-2 text-primary font-bold">⭐ Featured Placement</p> : null}
                  </div>
                  <button onClick={() => purchaseSubscription(p.id)} className="w-full bg-secondary text-white font-bold py-3 rounded-[8px] hover:bg-primary transition-colors">
                    Subscribe Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // ACTIVE SUBSCRIPTION DASHBOARD
          <div className="max-w-5xl mx-auto">

            {activeTab === 'OVERVIEW' && (
              <div className="bg-white p-8 rounded-[12px] shadow-sm border border-gray-100 animate-fade-in">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-primary mb-2">{data.profile.business_name}</h2>
                    <p className="text-gray-600">Active Plan: <span className="font-bold text-secondary">{data.subscription.plan_name}</span></p>
                  </div>
                  <div className="bg-green-50 text-green-700 px-4 py-2 rounded-[8px] font-bold border border-green-200 text-sm">
                    Verified Seller
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="border border-gray-100 p-6 rounded-[12px] shadow-sm bg-gray-50">
                    <p className="text-sm font-semibold text-gray-500 uppercase">Total Products</p>
                    <p className="text-4xl font-bold text-primary mt-2">{data.stats.total_products}</p>
                    <p className="text-xs text-gray-400 mt-1">Limit: {data.subscription.product_limit === 0 ? 'Unlimited' : data.subscription.product_limit}</p>
                  </div>
                  <div className="border border-gray-100 p-6 rounded-[12px] shadow-sm bg-gray-50">
                    <p className="text-sm font-semibold text-gray-500 uppercase">Total Orders</p>
                    <p className="text-4xl font-bold text-primary mt-2">{data.stats.total_orders}</p>
                  </div>
                  <div className="border border-gray-100 p-6 rounded-[12px] shadow-sm bg-gray-50">
                    <p className="text-sm font-semibold text-gray-500 uppercase">Commission Rate</p>
                    <p className="text-4xl font-bold text-primary mt-2">10%</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'PRODUCTS' && (
              <div className="bg-white p-8 rounded-[12px] shadow-sm border border-gray-100 animate-fade-in">
                <h2 className="text-2xl font-bold text-primary mb-6">Advanced Product Upload</h2>
                
                <form onSubmit={submitProduct} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Product Name</label>
                      <input type="text" name="name" value={productForm.name} onChange={handleProductChange} required className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Category</label>
                      <select name="category_id" value={productForm.category_id} onChange={handleProductChange} className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none">
                        <option value="1">Electronics</option>
                        <option value="2">Fashion</option>
                        <option value="3">Home & Furniture</option>
                        <option value="4">Grocery</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">MRP (₹)</label>
                      <input type="number" name="mrp" value={productForm.mrp} onChange={handleProductChange} required className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Selling Price (₹)</label>
                      <input type="number" name="price" value={productForm.price} onChange={handleProductChange} required className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Stock Inventory</label>
                      <input type="number" name="stock" value={productForm.stock} onChange={handleProductChange} required className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">GST %</label>
                      <input type="number" name="gst_percentage" value={productForm.gst_percentage} onChange={handleProductChange} className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Short Description</label>
                    <textarea name="short_description" value={productForm.short_description} onChange={handleProductChange} rows="2" className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Full Description</label>
                    <textarea name="description" value={productForm.description} onChange={handleProductChange} rows="4" className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Product Highlights (One per line)</label>
                    <textarea name="highlights" value={productForm.highlights} onChange={handleProductChange} rows="3" placeholder="32 MB RAM | 32 MB ROM&#10;1.4 GHz Clock Speed&#10;0.8MP Rear Camera" className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Warranty Details</label>
                    <input type="text" name="warranty" value={productForm.warranty} onChange={handleProductChange} placeholder="1 Year Manufacturer Warranty" className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">SKU (Stock Keeping Unit)</label>
                      <input type="text" name="sku" value={productForm.sku} onChange={handleProductChange} className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Weight (kg)</label>
                      <input type="number" step="0.01" name="weight" value={productForm.weight} onChange={handleProductChange} className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none" />
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                     <button type="submit" className="bg-primary text-white font-bold py-3 px-8 rounded-[8px] hover:opacity-90">
                       Publish Product
                     </button>
                  </div>
                </form>
              </div>
            )}
            {activeTab === 'SETTINGS' && (
              <div className="bg-white p-8 rounded-[12px] shadow-sm border border-gray-100 animate-fade-in">
                <h2 className="text-2xl font-bold text-primary mb-6">Payment Collection Settings</h2>
                <p className="text-gray-500 mb-6">Add your UPI ID and Bank Account details below to receive payouts for your sales.</p>
                <form onSubmit={submitSettings} className="space-y-6 max-w-2xl">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">UPI ID</label>
                    <input type="text" name="upi_id" value={settingsForm.upi_id} onChange={handleSettingsChange} placeholder="example@upi" className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bank Account Number</label>
                    <input type="text" name="bank_account" value={settingsForm.bank_account} onChange={handleSettingsChange} placeholder="Account Number" className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">IFSC Code</label>
                    <input type="text" name="ifsc_code" value={settingsForm.ifsc_code} onChange={handleSettingsChange} placeholder="IFSC Code" className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none" />
                  </div>
                  <div className="flex justify-end pt-4">
                     <button type="submit" className="bg-primary text-white font-bold py-3 px-8 rounded-[8px] hover:opacity-90">
                       Save Payment Settings
                     </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};

export default VendorDashboard;
