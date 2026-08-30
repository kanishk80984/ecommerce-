import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreditCard, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';

const AdminVendorPayoutDetails = () => {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSelector((state) => state.auth);
  
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    fetchPayouts();
  }, [vendorId]);

  const fetchPayouts = async () => {
    try {
      const endpoint = isSuperAdmin 
        ? `/superadmin/payouts/vendor/${vendorId}` 
        : `/admin/payouts/vendor/${vendorId}`;
      const { data } = await api.get(endpoint);
      if (data.success) {
        setPayouts(data.payouts);
      }
    } catch (error) {
      toast.error('Failed to fetch vendor payouts');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      const endpoint = isSuperAdmin 
        ? `/superadmin/payouts/${id}/status` 
        : `/admin/payouts/${id}/status`;
      const { data } = await api.put(endpoint, { status });
      if (data.success) {
        toast.success(data.message);
        fetchPayouts();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const vendorInfo = payouts.length > 0 ? payouts[0] : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600 transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <CreditCard className="text-primary" size={28} />
              Vendor Payout Details
            </h2>
            <p className="text-gray-500 mt-1">
              {vendorInfo?.vendor_name || 'Vendor'}
            </p>
          </div>
        </div>
      </div>

      {vendorInfo && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Bank Details</h3>
          {vendorInfo.account_number ? (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <p className="text-xs text-gray-500">Bank Name</p>
                <p className="text-sm font-medium text-gray-800">{vendorInfo.bank_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Account Holder</p>
                <p className="text-sm font-medium text-gray-800">{vendorInfo.account_holder_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Account Number</p>
                <p className="text-sm font-medium text-gray-800">{vendorInfo.account_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">IFSC Code</p>
                <p className="text-sm font-medium text-gray-800">{vendorInfo.ifsc_code}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Branch Location</p>
                <p className="text-sm font-medium text-gray-800">{vendorInfo.branch_location || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">UPI ID</p>
                <p className="text-sm font-medium text-gray-800">{vendorInfo.upi_id || '-'}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-500">Bank details not provided by vendor.</p>
          )}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Completed Sales (Payouts)</h3>
        {payouts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No payout records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Date</th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Order Details</th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Amount</th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700 max-w-xs">
                      {p.details || 'Sales Payout'}
                    </td>
                    <td className="py-4 px-4 text-sm font-bold text-gray-800">
                      ₹{parseFloat(p.amount).toFixed(2)}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(p.status)}`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-left space-x-2">
                      {!isSuperAdmin && p.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(p.id, 'ADMIN_APPROVED')}
                            className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-xs font-medium transition"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(p.id, 'CANCELLED')}
                            className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-xs font-medium transition"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {isSuperAdmin && p.status === 'ADMIN_APPROVED' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(p.id, 'PAID')}
                            className="px-3 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded-md text-xs font-medium transition"
                          >
                            Mark Paid
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(p.id, 'CANCELLED')}
                            className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-xs font-medium transition"
                          >
                            Cancel
                          </button>
                        </>
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

export default AdminVendorPayoutDetails;
