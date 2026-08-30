import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import api from '../services/api';

const CustomerDashboard = ({ user }) => {
  const dispatch = useDispatch();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data.products);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    alert(`Added ${product.name} to cart! (Cart logic to be implemented)`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg">Customer Dashboard</h1>
        </div>
        <button 
          onClick={() => dispatch(logout())}
          className="bg-white text-primary px-4 py-1 rounded text-sm font-semibold hover:bg-gray-100"
        >
          Sign Out
        </button>
      </header>
      <main className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="bg-white p-4 md:p-8 rounded-[12px] shadow-sm border border-gray-100 mb-8">
          <p className="text-secondary text-xs font-bold tracking-wider mb-2">STATUS: SIGNED IN</p>
          <h2 className="text-3xl font-bold text-primary mb-2">Welcome back, {user?.name}!</h2>
          <p className="text-gray-600 mb-6">You can track your orders and shop our latest products here.</p>
        </div>

        <h2 className="text-2xl font-bold text-primary mb-6">Latest Products</h2>
        
        {loading ? (
          <p>Loading products...</p>
        ) : products.length === 0 ? (
          <p className="text-gray-500">No products available at the moment.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(p => (
              <div key={p.id} className="bg-white rounded-[12px] shadow-sm border border-gray-100 overflow-hidden flex flex-col group">
                <div className="h-48 bg-gray-100 flex items-center justify-center p-4">
                  <span className="text-4xl text-gray-300">📦</span>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-lg text-primary truncate" title={p.name}>{p.name}</h3>
                  <p className="text-sm text-gray-500 mb-2 truncate">By {p.vendor_name || 'Unknown Vendor'}</p>
                  
                  <div className="mt-auto">
                    <div className="flex items-center gap-2 mb-4">
                      <p className="text-xl font-bold">₹{p.price}</p>
                      {p.mrp > p.price && (
                        <p className="text-sm text-gray-400 line-through">₹{p.mrp}</p>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => addToCart(p)}
                      className="w-full bg-secondary text-white font-bold py-2 rounded hover:bg-primary transition-colors"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerDashboard;
