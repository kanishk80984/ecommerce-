import React, { useState, useEffect } from 'react';
import { CreditCard, Search, AlertCircle, RefreshCcw } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';

const RefundsManagement = () => {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useSelector((state) => state.auth);
  
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      const endpoint = isSuperAdmin ? '/superadmin/refund-requests' : '/admin/refund-requests';
      const { data } = await api.get(endpoint);
      if (data.success) {
        setRefunds(data.refunds);
      }
    } catch (error) {
      toast.error('Failed to fetch refund requests');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      const endpoint = isSuperAdmin ? `/superadmin/refund-requests/${id}/status` : `/admin/refund-requests/${id}/status`;
      const { data } = await api.put(endpoint, { status });
      if (data.success) {
        toast.success(data.message);
        fetchRefunds();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const filteredRefunds = refunds.filter(r => 
    r.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.order_id?.toString().includes(searchTerm)
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ADMIN_APPROVED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
      case 'REFUNDED': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <RefreshCcw className="text-primary" size={28} />
            Refund Requests
          </h2>
          <p className="text-gray-500 mt-1">
            {isSuperAdmin ? 'Process approved refunds' : 'Review and approve customer refunds'}
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by customer name or order ID..."
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
        ) : filteredRefunds.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-100">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-500 font-medium">No refund requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Date</th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Order ID</th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Customer</th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Bank Details</th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Amount</th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Status</th>
                  <th  className="py-4 px-4 text-sm font-semibold text-gray-600  text-left" >Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRefunds.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-sm text-primary font-mono">
                      #{r.order_id}
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm font-medium text-gray-800">{r.user_name}</p>
                      <p className="text-xs text-gray-500">{r.user_email}</p>
                    </td>
                    <td className="py-4 px-4">
                      {r.account_number ? (
                        <div>
                          <p className="text-xs font-medium text-gray-700">{r.bank_name}</p>
                          <p className="text-xs text-gray-500">A/C: {r.account_number}</p>
                          <p className="text-xs text-gray-500">IFSC: {r.ifsc_code}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-red-500">Not provided</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm font-bold text-gray-800">
                      ₹{parseFloat(r.amount).toFixed(2)}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(r.status)}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-left space-x-2">
                      {!isSuperAdmin && r.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(r.id, 'ADMIN_APPROVED')}
                            className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-xs font-medium transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(r.id, 'REJECTED')}
                            className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-xs font-medium transition"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {isSuperAdmin && r.status === 'ADMIN_APPROVED' && (
                        <button
                          onClick={() => handleStatusUpdate(r.id, 'REFUNDED')}
                          className="px-3 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded-md text-xs font-medium transition"
                        >
                          Mark Refunded
                        </button>
                      )}
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

export default RefundsManagement;
