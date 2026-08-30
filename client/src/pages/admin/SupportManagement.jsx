import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { UserCheck, Clock, UserX } from 'lucide-react';

const SupportManagement = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('APPROVED'); // 'APPROVED' | 'PENDING' | 'REJECTED'

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/admin/support-requests');
      setRequests(res.data.requests || []);
    } catch (error) {
      console.error('Error fetching support requests', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, action) => {
    try {
      await api.put(`/admin/support-requests/${id}/status`, { action });
      fetchRequests();
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this technical support account?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      fetchRequests();
    } catch (error) {
      alert('Failed to delete support user');
    }
  };

  const filteredRequests = requests.filter(r => {
    const isRejected = r.is_suspended && r.suspension_reason === 'Application Rejected';
    if (activeTab === 'APPROVED') return !!r.is_approved && !r.is_suspended;
    if (activeTab === 'PENDING') return !r.is_approved && !isRejected;
    if (activeTab === 'REJECTED') return isRejected;
    return true;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Technical Support Management</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button 
          onClick={() => setActiveTab('APPROVED')}
          className={`pb-2 px-2 text-sm font-semibold transition-colors flex items-center gap-1.5 ${activeTab === 'APPROVED' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <UserCheck className="w-4 h-4" /> Approved Support
        </button>
        <button 
          onClick={() => setActiveTab('PENDING')}
          className={`pb-2 px-2 text-sm font-semibold transition-colors flex items-center gap-1.5 ${activeTab === 'PENDING' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Clock className="w-4 h-4" /> Pending Requests
        </button>
        <button 
          onClick={() => setActiveTab('REJECTED')}
          className={`pb-2 px-2 text-sm font-semibold transition-colors flex items-center gap-1.5 ${activeTab === 'REJECTED' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <UserX className="w-4 h-4" /> Rejected Applications
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 justify-between py-3 border-b border-gray-100 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
                <div className="h-8 bg-gray-200 rounded w-24" />
              </div>
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No {activeTab === 'APPROVED' ? 'approved support accounts' : activeTab === 'PENDING' ? 'pending requests' : 'rejected applications'} found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-sm uppercase text-gray-500">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Phone</th>
                  <th className="p-4 font-medium">Status</th>
                  <th  className="p-4 font-medium  text-left" >Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map(req => {
                  const isRejected = req.is_suspended && req.suspension_reason === 'Application Rejected';
                  return (
                    <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 font-semibold text-gray-800">{req.name}</td>
                      <td className="p-4 text-gray-600">{req.email}</td>
                      <td className="p-4 text-gray-600">{req.phone || 'N/A'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          req.is_approved ? 'bg-green-100 text-green-800' :
                          isRejected ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {req.is_approved ? 'APPROVED' : isRejected ? 'REJECTED' : 'PENDING'}
                        </span>
                      </td>
                      <td className="p-4 text-left flex justify-start items-center gap-2">
                        {(!req.is_approved && !isRejected) && (
                          <>
                            <button 
                              onClick={() => handleStatusUpdate(req.id, 'APPROVE')} 
                              className="text-xs font-bold px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleStatusUpdate(req.id, 'REJECT')} 
                              className="text-xs font-bold px-3 py-1.5 border border-gray-600 text-gray-600 bg-transparent hover:bg-gray-50 rounded transition-colors shadow-sm"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {isRejected && (
                          <button 
                            onClick={() => handleStatusUpdate(req.id, 'APPROVE')} 
                            className="text-xs font-bold px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm"
                          >
                            Approve
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteUser(req.id)} 
                          className="text-xs font-bold px-3 py-1.5 border border-red-600 text-red-600 bg-transparent hover:bg-red-50 rounded transition-colors shadow-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportManagement;
