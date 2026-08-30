import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { MapPin, Store } from 'lucide-react';
import MapView from '../../components/location/MapView';

const VendorManagement = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('APPROVED'); // 'APPROVED' | 'PENDING' | 'SUSPENDED'

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await api.get('/admin/vendors');
      setVendors(res.data.vendors);
    } catch (error) {
      console.error('Error fetching vendors', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, action) => {
    try {
      await api.put(`/admin/vendors/${id}/status`, { action });
      fetchVendors();
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const handleDeleteVendor = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this vendor and all their data?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      fetchVendors();
    } catch (error) {
      alert('Failed to delete vendor');
    }
  };

  const handleSuspendVendor = async (id) => {
    const reason = window.prompt('Enter suspension reason:');
    if (!reason || !reason.trim()) {
      alert('Suspension reason is required');
      return;
    }
    try {
      await api.put(`/admin/vendors/${id}/suspend`, { reason });
      fetchVendors();
    } catch (error) {
      alert('Failed to suspend vendor');
    }
  };

  const handleUnsuspendVendor = async (id) => {
    if (!window.confirm('Unsuspend this vendor?')) return;
    try {
      await api.put(`/admin/vendors/${id}/unsuspend`);
      fetchVendors();
    } catch (error) {
      alert('Failed to unsuspend vendor');
    }
  };

  const filteredVendors = vendors.filter(v => {
    if (activeTab === 'APPROVED') return v.kyc_status === 'APPROVED' && !v.is_suspended;
    if (activeTab === 'PENDING') return (v.kyc_status === 'PENDING' || !v.kyc_status) && !v.is_suspended;
    if (activeTab === 'SUSPENDED') return v.is_suspended;
    return true;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Vendor Management</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button 
          onClick={() => setActiveTab('APPROVED')}
          className={`pb-2 px-2 text-sm font-semibold transition-colors ${activeTab === 'APPROVED' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Approved Vendors
        </button>
        <button 
          onClick={() => setActiveTab('PENDING')}
          className={`pb-2 px-2 text-sm font-semibold transition-colors ${activeTab === 'PENDING' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Pending Requests
        </button>
        <button 
          onClick={() => setActiveTab('SUSPENDED')}
          className={`pb-2 px-2 text-sm font-semibold transition-colors ${activeTab === 'SUSPENDED' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Suspended Accounts
        </button>
        <button 
          onClick={() => setActiveTab('MAP')}
          className={`pb-2 px-2 text-sm font-semibold transition-colors flex items-center gap-1.5 ${activeTab === 'MAP' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <MapPin className="w-4 h-4" />
          Store Locations Map
        </button>
      </div>

      {activeTab === 'MAP' ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-gray-900">OpenStreetMap Vendor Store Directory</h4>
                <p className="text-xs text-gray-500">Showing all approved vendor shop pins with location coordinates</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 font-extrabold text-xs rounded-full">
              {vendors.filter(v => v.latitude && v.longitude).length} Stores Pinned
            </span>
          </div>

          <MapView
            markers={vendors.filter(v => v.latitude && v.longitude)}
            height="550px"
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
         {loading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 justify-between py-3 border-b border-gray-100 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
                <div className="h-6 bg-gray-200 rounded w-16" />
                <div className="h-6 bg-gray-200 rounded w-16" />
                <div className="h-8 bg-gray-200 rounded w-24" />
              </div>
            ))}
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No {activeTab === 'APPROVED' ? 'approved vendors' : activeTab === 'PENDING' ? 'pending requests' : 'suspended accounts'} found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-sm uppercase text-gray-500">
                  <th className="p-4 font-medium">Business Name</th>
                  <th className="p-4 font-medium">Owner Name</th>
                  <th className="p-4 font-medium">Vendor Type</th>
                  <th className="p-4 font-medium">Status</th>
                  <th  className="p-4 font-medium text-left" >Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map(vendor => (
                  <tr key={vendor.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-semibold text-gray-800">{vendor.business_name || 'N/A'}</td>
                    <td className="p-4 text-gray-600">{vendor.name}</td>
                    <td className="p-4 text-gray-600">{vendor.vendor_type || 'N/A'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        vendor.is_suspended ? 'bg-red-100 text-red-800' :
                        vendor.kyc_status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        vendor.kyc_status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {vendor.is_suspended ? 'SUSPENDED' : vendor.kyc_status || 'INCOMPLETE'}
                      </span>
                    </td>
                    <td className="p-4 flex justify-start items-center gap-2">
                      {/* Actions for pending or not approved */}
                      {(!vendor.is_suspended && vendor.kyc_status !== 'APPROVED') && (
                        <>
                          <button 
                            onClick={() => handleStatusUpdate(vendor.id, 'APPROVE')} 
                            className="text-xs font-bold px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(vendor.id, 'REJECT')} 
                            className="text-xs font-bold px-3 py-1.5 border border-gray-600 text-gray-600 bg-transparent hover:bg-gray-50 rounded transition-colors shadow-sm"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {/* Suspend / Unsuspend for approved vendors */}
                      {vendor.kyc_status === 'APPROVED' && !vendor.is_suspended && (
                        <button 
                          onClick={() => handleSuspendVendor(vendor.id)} 
                          className="text-xs font-bold px-3 py-1.5 border border-indigo-900 text-indigo-900 bg-transparent hover:bg-indigo-50 rounded transition-colors shadow-sm"
                        >
                          Suspend
                        </button>
                      )}
                      {!!vendor.is_suspended && (
                        <button 
                          onClick={() => handleUnsuspendVendor(vendor.id)} 
                          className="text-xs font-bold px-3 py-1.5 border border-green-600 text-green-600 bg-transparent hover:bg-green-50 rounded transition-colors shadow-sm"
                        >
                          Unsuspend
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteVendor(vendor.id)} 
                        className="text-xs font-bold px-3 py-1.5 border border-red-600 text-red-600 bg-transparent hover:bg-red-50 rounded transition-colors shadow-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default VendorManagement;
