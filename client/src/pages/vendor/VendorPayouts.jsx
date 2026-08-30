import React, { useState, useEffect } from 'react';
import { CreditCard, AlertCircle, Clock } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const VendorPayouts = () => {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      const { data } = await api.get('/vendor/payouts');
      if (data.success) {
        setPayouts(data.payouts);
      }
    } catch (error) {
      toast.error('Failed to fetch payouts');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ADMIN_APPROVED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PAID': return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'PENDING': return 'Pending Admin Approval';
      case 'ADMIN_APPROVED': return 'Processing Payment';
      case 'PAID': return 'Paid Successfully';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CreditCard className="text-primary" size={28} />
            My Payouts
          </h2>
          <p className="text-gray-500 mt-1">Track your product sales payouts and status</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-100">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-500 font-medium">No payouts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Date</th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Order/Item Details</th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Amount</th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4 text-sm text-gray-600 flex items-center gap-2">
                      <Clock size={14} className="text-gray-400" />
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700 max-w-xs truncate">
                      {p.details || 'Sales Payout'}
                    </td>
                    <td className="py-4 px-4 text-sm font-bold text-gray-800">
                      ₹{parseFloat(p.amount).toFixed(2)}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(p.status)}`}>
                        {getStatusText(p.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorPayouts;
