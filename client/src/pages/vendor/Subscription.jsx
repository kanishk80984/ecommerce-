import React, { useState } from 'react';

const Subscription = () => {
  const [loading, setLoading] = useState(false);

  const handlePurchase = (planName) => {
    setLoading(true);
    setTimeout(() => {
      alert(`Successfully subscribed to ${planName} Plan!`);
      setLoading(false);
    }, 1000);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Subscription Plans</h2>
      
      {/* Current Subscription Status */}
      <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md mb-8">
        <h3 className="font-bold">No Active Subscription</h3>
        <p className="text-sm mt-1">You must purchase a yearly subscription to upload products and start selling.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {/* Sample Plan */}
        <div className="bg-white border-2 border-primary rounded-lg overflow-hidden shadow-sm relative">
          <div className="absolute top-0 right-0 bg-secondary text-gray-900 font-bold text-xs px-3 py-1 rounded-bl-lg">RECOMMENDED</div>
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-800">Gold Plan</h3>
            <div className="mt-4 flex items-baseline text-4xl font-extrabold">
              ₹10,000
              <span className="ml-1 text-xl font-medium text-gray-500">/year</span>
            </div>
            
            <ul className="mt-6 space-y-4 text-sm text-gray-600">
              <li className="flex gap-2"><span className="text-green-500">✓</span> Unlimited Product Uploads</li>
              <li className="flex gap-2"><span className="text-green-500">✓</span> ₹10 Lakhs Free Business Volume</li>
              <li className="flex gap-2"><span className="text-green-500">✓</span> 5% Service Charge on excess</li>
              <li className="flex gap-2"><span className="text-green-500">✓</span> Premium Support</li>
            </ul>

            <button 
              onClick={() => handlePurchase('Gold')}
              disabled={loading}
              className="mt-8 block w-full bg-primary py-3 px-4 border border-transparent rounded-md text-center font-bold text-white hover:bg-blue-700"
            >
              {loading ? 'Processing...' : 'Subscribe Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
