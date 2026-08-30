import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Search, AlertCircle, Eye } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';

const PayoutsManagement = () => {
  const navigate = useNavigate();
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useSelector((state) => state.auth);
  
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      const endpoint = isSuperAdmin ? '/superadmin/payouts' : '/admin/payouts';
      const { data } = await api.get(endpoint);
      if (data.success) {
        setPayouts(data.payouts);
      }
    } catch (error) {
      toast.error('Failed to fetch payouts');
    } finally {
      setLoading(false);
    }
  };

  const groupedPayouts = payouts.reduce((acc, p) => {
    if (!acc[p.vendor_id]) {
      acc[p.vendor_id] = {
        vendor_id: p.vendor_id,
        vendor_name: p.vendor_name,
        vendor_email: p.vendor_email,
        total_amount: 0,
        latest_date: p.created_at,
        has_pending: false,
        all_paid: true
      };
    }
    acc[p.vendor_id].total_amount += parseFloat(p.amount);
    if (new Date(p.created_at) > new Date(acc[p.vendor_id].latest_date)) {
      acc[p.vendor_id].latest_date = p.created_at;
    }
    if (p.status === 'PENDING') {
      acc[p.vendor_id].has_pending = true;
    }
    if (p.status !== 'PAID') {
      acc[p.vendor_id].all_paid = false;
    }
    return acc;
  }, {});

  const filteredGroups = Object.values(groupedPayouts).filter(g => 
    g.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ADMIN_APPROVED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PAID': return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CreditCard className="text-primary" size={28} />
            Vendor Payouts
          </h2>
          <p className="text-gray-500 mt-1">
            {isSuperAdmin ? 'Process vendor payouts' : 'Review and approve vendor payouts'}
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by vendor name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-100">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-500 font-medium">No vendors with payouts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Last Request Date</th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Vendor</th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Total Amount</th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Status</th>
                  <th  className="py-4 px-4 text-sm font-semibold text-gray-600  text-left" >Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map((g) => (
                  <tr key={g.vendor_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {new Date(g.latest_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm font-medium text-gray-800">{g.vendor_name}</p>
                      <p className="text-xs text-gray-500">{g.vendor_email}</p>
                    </td>
                    <td className="py-4 px-4 text-sm font-bold text-gray-800">
                      ₹{g.total_amount.toFixed(2)}
                    </td>
                    <td className="py-4 px-4">
                      {g.has_pending ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium border bg-yellow-100 text-yellow-800 border-yellow-200">
                          PENDING ACTIONS
                        </span>
                      ) : g.all_paid ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                          ALL PAID
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium border bg-blue-100 text-blue-800 border-blue-200">
                          PROCESSING
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-left space-x-2">
                      <button
                        onClick={() => navigate(isSuperAdmin ? `/superadmin/vendor-payouts/${g.vendor_id}` : `/admin/vendor-payouts/${g.vendor_id}`)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-xs font-medium transition inline-flex items-center gap-1"
                      >
                        <Eye size={14} /> View Details
                      </button>
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

export default PayoutsManagement;
