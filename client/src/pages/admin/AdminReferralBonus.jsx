import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

const AdminReferralBonus = () => {
  const [bonus, setBonus] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchBonus();
  }, []);

  const fetchBonus = async () => {
    try {
      setFetching(true);
      const res = await api.get('/admin/vendor-referral-bonus');
      if (res.data.success) {
        setBonus(res.data.bonus.toString());
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch referral bonus');
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!bonus || isNaN(bonus) || Number(bonus) < 0) {
      toast.error('Please enter a valid positive number');
      return;
    }

    try {
      setLoading(true);
      const res = await api.put('/admin/vendor-referral-bonus', { bonus: Number(bonus) });
      if (res.data.success) {
        toast.success(res.data.message);
        setBonus(res.data.bonus.toString());
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update referral bonus');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="p-8 text-center text-gray-500">Loading referral bonus...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Vendor Referral Bonus</h2>
          <p className="text-sm text-gray-500 mt-1">Configure the amount a vendor earns when they successfully refer a new vendor.</p>
        </div>
        
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Referral Bonus Amount (₹)</label>
            <input
              type="number"
              value={bonus}
              onChange={(e) => setBonus(e.target.value)}
              placeholder="e.g. 500"
              className="w-full border rounded-lg p-3 focus:border-blue-500 outline-none transition-colors"
              min="0"
              required
            />
            <p className="text-xs text-gray-500 mt-2">This amount will be applied to all new successful referrals going forward. It will not affect existing pending referrals.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            <Save size={18} />
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminReferralBonus;
