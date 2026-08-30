import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import { ShieldCheck, Search, Filter, RefreshCcw, Calendar, Info, Clock, X } from 'lucide-react';

const Referrals = () => {
  const [referrals, setReferrals] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Details Modal
  const [selectedRef, setSelectedRef] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [notesList, setNotesList] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchChapters();
    fetchReferrals();
  }, [selectedChapterId, selectedStatus]);

  const fetchChapters = async () => {
    try {
      const res = await api.get('/business-network/chapters');
      if (res.data.success) {
        setChapters(res.data.chapters);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/business-network/referrals', {
        params: {
          chapter_id: selectedChapterId || undefined,
          status: selectedStatus || undefined
        }
      });
      if (res.data.success) {
        setReferrals(res.data.referrals);
      }
    } catch (error) {
      toast.error('Failed to load referrals audit log');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (ref) => {
    try {
      const res = await api.get(`/business-network/referrals/${ref.id}`);
      if (res.data.success) {
        setSelectedRef(res.data.referral);
        setHistoryLogs(res.data.history || []);
        setNotesList(res.data.notes || []);
        setShowDetailsModal(true);
      }
    } catch (error) {
      toast.error('Failed to load referral details');
    }
  };

  const filteredReferrals = referrals.filter(r => 
    r.requirement.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.referrer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.recipient_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Referrals Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor networking referrals exchanged by members and audit their conversion pipeline.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by requirement or member..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select
            value={selectedChapterId}
            onChange={(e) => setSelectedChapterId(e.target.value)}
            className="px-4 py-2.5 border border-gray-250 rounded-xl text-xs bg-white focus:outline-none"
          >
            <option value="">All Chapters</option>
            {chapters.map(ch => (
              <option key={ch.id} value={ch.id}>{ch.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-250 rounded-xl text-xs bg-white focus:outline-none"
          >
            <option value="">All Statuses</option>
            {['NEW', 'ACCEPTED', 'CONTACTED', 'MEETING_SCHEDULED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST', 'REJECTED', 'CLOSED'].map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          <button
            onClick={fetchReferrals}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2.5 rounded-xl border transition-colors cursor-pointer"
            title="Refresh List"
          >
            <RefreshCcw size={16} />
          </button>
        </div>
      </div>

      {/* Referrals List Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredReferrals.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-150 shadow-sm text-gray-400">
          No referrals found matching the filter options.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <th className="px-6 py-4">Referral Details</th>
                  <th className="px-6 py-4">Giver (Referrer)</th>
                  <th className="px-6 py-4">Receiver (Recipient)</th>
                  <th className="px-6 py-4">Business Value</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredReferrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-800">{ref.requirement}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">
                        {ref.referral_type} Referral | privacy: {ref.privacy_level.replace('_', ' ')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-700">{ref.referrer_name}</p>
                      <p className="text-[10px] text-gray-400 font-semibold">{ref.referrer_business || 'IBC Vendor'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-700">{ref.recipient_name}</p>
                      <p className="text-[10px] text-gray-400 font-semibold">{ref.recipient_business || 'IBC Vendor'}</p>
                    </td>
                    <td className="px-6 py-4">
                      {ref.status === 'WON' ? (
                        <span className="text-green-600 font-extrabold flex items-center text-xs gap-0.5">
                          <span className="font-semibold">₹</span>{Number(ref.actual_value).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-medium flex items-center text-xs gap-0.5">
                          Est: <span className="font-semibold">₹</span>{Number(ref.estimated_value).toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                        ref.status === 'WON' ? 'bg-green-100 text-green-700' :
                        ref.status === 'LOST' || ref.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {ref.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenDetails(ref)}
                        className="bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Audit Modal */}
      {showDetailsModal && selectedRef && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-[zoomIn_0.15s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Referral Audit Sheet</h2>
                <p className="text-xs text-gray-500">Requirement: <span className="font-semibold text-primary">{selectedRef.requirement}</span></p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Core Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Referrer Giver</p>
                  <p className="font-bold text-gray-800 mt-1">{selectedRef.referrer_name}</p>
                  <p className="text-xs text-gray-500">{selectedRef.referrer_business}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Recipient Receiver</p>
                  <p className="font-bold text-gray-800 mt-1">{selectedRef.recipient_name}</p>
                  <p className="text-xs text-gray-500">{selectedRef.recipient_business}</p>
                </div>
              </div>

              {/* Pipeline details */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1"><Info size={14} /> Pipeline Details:</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <p className="text-gray-600"><span className="font-semibold text-gray-800">Referral Type:</span> {selectedRef.referral_type}</p>
                    <p className="text-gray-600"><span className="font-semibold text-gray-800">Privacy Mode:</span> {selectedRef.privacy_level}</p>
                    <p className="text-gray-600"><span className="font-semibold text-gray-800">Estimated Value:</span> ₹{Number(selectedRef.estimated_value).toLocaleString()}</p>
                    <p className="text-gray-600"><span className="font-semibold text-gray-800">Actual Value Won:</span> ₹{Number(selectedRef.actual_value).toLocaleString()}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-600">
                      <span className="font-semibold text-gray-800">Customer Name:</span> {selectedRef.customer_name || 'N/A (Confidential)'}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-semibold text-gray-800">Customer Contact:</span> {selectedRef.customer_contact || 'N/A (Confidential)'}
                    </p>
                    <p className="text-gray-600"><span className="font-semibold text-gray-800">Expected Timeline:</span> {selectedRef.expected_timeline || 'N/A'}</p>
                    <p className="text-gray-600"><span className="font-semibold text-gray-800">Closed Date:</span> {selectedRef.closed_date ? new Date(selectedRef.closed_date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Status timeline */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1"><Clock size={14} /> Pipeline History Timeline:</h3>
                {historyLogs.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No status timeline logged.</p>
                ) : (
                  <div className="relative border-l border-gray-200 pl-4 ml-2 space-y-4">
                    {historyLogs.map((log) => (
                      <div key={log.id} className="relative">
                        <div className="absolute -left-[21px] top-1 bg-primary text-white p-0.5 rounded-full border-2 border-white">
                          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                        </div>
                        <div className="text-xs">
                          <p className="font-bold text-gray-800">
                            Status changed to <span className="text-primary">{log.status}</span>
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            By {log.updated_by_name} | {new Date(log.created_at).toLocaleString()}
                          </p>
                          {log.notes && (
                            <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100 mt-1 italic">
                              "{log.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Referrals;
