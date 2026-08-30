import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import { Check, X, ClipboardList, Info, FileText, CheckCircle, XCircle } from 'lucide-react';

const ChapterApplications = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [selectedReq, setSelectedReq] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/business-network/membership-requests');
      if (res.data.success) {
        setRequests(res.data.requests);
      }
    } catch (error) {
      toast.error('Failed to load membership applications');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (id, status) => {
    if (!window.confirm(`Are you sure you want to ${status.toLowerCase()} this application?`)) return;
    try {
      const res = await api.put(`/business-network/membership-requests/${id}/decide`, { status });
      if (res.data.success) {
        toast.success(`Application ${status.toLowerCase()} successfully`);
        setSelectedReq(null);
        fetchRequests();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit decision');
    }
  };

  const filteredRequests = requests.filter(r => r.status === filterStatus);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chapter Applications</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review and decide membership requests from vendors wanting to join chapters.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-150 pb-px">
        {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-5 py-3 text-sm font-semibold transition-all border-b-2 -mb-px cursor-pointer ${
              filterStatus === status
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-950'
            }`}
          >
            {status} Applications ({requests.filter(r => r.status === status).length})
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          {loading ? (
            <div className="flex justify-center py-20 flex-1 items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400 py-20">
              <ClipboardList size={48} className="mb-2 stroke-1" />
              <p className="text-sm">No {filterStatus.toLowerCase()} applications found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <th className="px-6 py-4">Vendor & Business</th>
                    <th className="px-6 py-4">Chapter</th>
                    <th className="px-6 py-4">Specialty</th>
                    <th className="px-6 py-4">Submitted Date</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredRequests.map((req) => (
                    <tr
                      key={req.id}
                      onClick={() => setSelectedReq(req)}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedReq?.id === req.id ? 'bg-blue-50/20' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-100 border shrink-0 flex items-center justify-center font-bold text-gray-400 overflow-hidden">
                            {req.business_logo ? (
                              <img src={req.business_logo} alt={req.business_name} className="w-full h-full object-cover" />
                            ) : (
                              req.business_name?.[0]
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{req.business_name || 'Vendor Profile'}</p>
                            <p className="text-xs text-gray-400">{req.owner_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-700">{req.chapter_name}</span>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{req.chapter_code}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-secondary/10 text-secondary text-xs px-2.5 py-0.5 rounded-full font-bold uppercase">
                          {req.specialty_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedReq(req)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Details Sidebar Panel */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex flex-col min-h-[500px]">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
            <Info size={18} className="text-primary" /> Application Details
          </h2>

          {selectedReq ? (
            <div className="flex-1 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                {/* Vendor Overview */}
                <div className="p-4 bg-gray-50 rounded-2xl flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-200 border shrink-0 flex items-center justify-center font-bold text-gray-500 overflow-hidden">
                    {selectedReq.business_logo ? (
                      <img src={selectedReq.business_logo} alt={selectedReq.business_name} className="w-full h-full object-cover" />
                    ) : (
                      selectedReq.business_name?.[0]
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 leading-tight">{selectedReq.business_name}</h3>
                    <p className="text-xs text-gray-400">{selectedReq.owner_name}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{selectedReq.owner_email} | {selectedReq.owner_phone}</p>
                  </div>
                </div>

                {/* Scope */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 border border-gray-150 rounded-xl">
                    <p className="text-gray-400 font-medium">Applying Chapter</p>
                    <p className="font-bold text-gray-700 mt-0.5">{selectedReq.chapter_name}</p>
                  </div>
                  <div className="p-3 border border-gray-150 rounded-xl">
                    <p className="text-gray-400 font-medium">Business Specialty</p>
                    <p className="font-bold text-secondary mt-0.5 uppercase">{selectedReq.specialty_name}</p>
                  </div>
                </div>

                {/* Form Fields responses */}
                <div className="space-y-3.5 pt-2">
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase flex items-center gap-1.5">
                      <FileText size={14} /> Why do you want to join?
                    </label>
                    <p className="text-xs text-gray-600 bg-gray-50/50 p-3 rounded-xl border border-gray-100 mt-1 italic">
                      "{selectedReq.why_join || 'No explanation provided.'}"
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase flex items-center gap-1.5">
                      <FileText size={14} /> Expected Contribution
                    </label>
                    <p className="text-xs text-gray-600 bg-gray-50/50 p-3 rounded-xl border border-gray-100 mt-1 italic">
                      "{selectedReq.expected_contribution || 'No response.'}"
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase flex items-center gap-1.5">
                      <FileText size={14} /> Referral Interests
                    </label>
                    <p className="text-xs text-gray-600 bg-gray-50/50 p-3 rounded-xl border border-gray-100 mt-1 italic">
                      "{selectedReq.referral_interests || 'No response.'}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons (Only for Pending requests) */}
              {selectedReq.status === 'PENDING' ? (
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleDecision(selectedReq.id, 'REJECTED')}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-danger border border-red-200 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <X size={16} /> Reject
                  </button>
                  <button
                    onClick={() => handleDecision(selectedReq.id, 'APPROVED')}
                    className="flex-1 bg-primary hover:bg-opacity-95 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Check size={16} /> Approve Member
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-sm font-bold">
                  {selectedReq.status === 'APPROVED' ? (
                    <span className="text-green-600 flex items-center gap-1.5 bg-green-50 border border-green-200 px-4 py-2 rounded-xl">
                      <CheckCircle size={16} /> Approved Application
                    </span>
                  ) : (
                    <span className="text-red-500 flex items-center gap-1.5 bg-red-50 border border-red-150 px-4 py-2 rounded-xl">
                      <XCircle size={16} /> Rejected Application
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 italic text-xs py-20 text-center">
              <ClipboardList size={32} className="mb-2 stroke-1" />
              Select an application from the table list to see its details and review motivation responses.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChapterApplications;
