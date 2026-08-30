import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import { ClipboardCheck, ThumbsUp, Calendar, Info, Clock, MessageSquare, Plus, Check, X, Send } from 'lucide-react';
import { store } from '../../../store';

const Referrals = () => {
  const [filterType, setFilterType] = useState('received'); // 'received' or 'given'
  const [givenReferrals, setGivenReferrals] = useState([]);
  const [receivedReferrals, setReceivedReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Detail Modal States
  const [selectedRef, setSelectedRef] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [notesList, setNotesList] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: '',
    notes: '',
    actual_value: 0.00,
    estimated_value: 0.00
  });

  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionData, setDecisionData] = useState({ id: null, status: '' });

  // Comments Form state
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/business-network/referrals');
      if (res.data.success) {
        const allRefs = res.data.referrals;
        const user = store.getState().auth.user;
        const loggedInUserId = user?.id;

        const given = allRefs.filter(r => r.referrer_id === loggedInUserId);
        const received = allRefs.filter(r => r.recipient_id === loggedInUserId && r.referrer_id !== loggedInUserId);

        setGivenReferrals(given);
        setReceivedReferrals(received);
      }
    } catch (error) {
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (id) => {
    try {
      const res = await api.get(`/business-network/referrals/${id}`);
      if (res.data.success) {
        setSelectedRef(res.data.referral);
        setHistoryLogs(res.data.history || []);
        setNotesList(res.data.notes || []);
        setShowDetailModal(true);
      }
    } catch (error) {
      toast.error('Failed to load referral logs');
    }
  };

  const handleOpenDecisionModal = (id, status) => {
    setDecisionData({ id, status });
    setShowDecisionModal(true);
  };

  const confirmDecision = async () => {
    try {
      const { id, status } = decisionData;
      const res = await api.put(`/business-network/referrals/${id}/status`, { status, notes: `Referral ${status.toLowerCase()}` });
      if (res.data.success) {
        toast.success(`Referral ${status.toLowerCase()} successfully`);
        fetchReferrals();
        if (showDetailModal) fetchDetails(id);
        setShowDecisionModal(false);
      }
    } catch (error) {
      toast.error('Failed to register decision');
    }
  };

  const handleOpenStatusModal = (ref) => {
    setSelectedRef(ref);
    setStatusForm({
      status: ref.status,
      notes: '',
      actual_value: ref.actual_value || ref.estimated_value || 0.00,
      estimated_value: ref.estimated_value || 0.00
    });
    setShowStatusModal(true);
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRef) return;
    try {
      const res = await api.put(`/business-network/referrals/${selectedRef.id}/status`, statusForm);
      if (res.data.success) {
        toast.success('Status updated successfully');
        setShowStatusModal(false);
        fetchReferrals();
        fetchDetails(selectedRef.id);
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedRef) return;
    try {
      const res = await api.post(`/business-network/referrals/${selectedRef.id}/notes`, { notes: commentText });
      if (res.data.success) {
        toast.success('Comment posted');
        setCommentText('');
        fetchDetails(selectedRef.id);
      }
    } catch (error) {
      toast.error('Failed to post comment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Referral Network Pipeline</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor your given referrals and track incoming opportunities from lead to business won.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-150 pb-px">
        <button
          onClick={() => setFilterType('received')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-px cursor-pointer transition-all ${
            filterType === 'received'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Received Referrals ({receivedReferrals.length})
        </button>
        <button
          onClick={() => setFilterType('given')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-px cursor-pointer transition-all ${
            filterType === 'given'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Given Referrals ({givenReferrals.length})
        </button>
      </div>

      {/* Referral cards */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (filterType === 'received' ? receivedReferrals : givenReferrals).length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-150 shadow-sm text-gray-400">
          No referrals in this category yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {(filterType === 'received' ? receivedReferrals : givenReferrals).map((ref) => (
            <div
              key={ref.id}
              className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                    ref.status === 'WON' ? 'bg-green-100 text-green-700' :
                    ref.status === 'LOST' || ref.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {ref.status}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">
                    {ref.referral_type}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-gray-800">{ref.requirement}</h4>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {filterType === 'received' 
                      ? `From Giver: ${ref.referrer_name} (${ref.referrer_business})`
                      : `To Recipient: ${ref.recipient_name} (${ref.recipient_business})`
                    }
                  </p>
                </div>

                <div className="space-y-2 text-xs text-gray-500 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span>Sharing Mode:</span>
                    <span className="font-semibold text-gray-700 uppercase text-[10px]">{ref.privacy_level.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Closed value:</span>
                    {ref.status === 'WON' ? (
                      <span className="text-green-600 font-extrabold flex items-center gap-0.5">
                        <span className="font-semibold">₹</span>{Number(ref.actual_value).toLocaleString()}
                      </span>
                    ) : (
                      <span className="font-semibold text-gray-600 flex items-center gap-0.5">
                        Est: <span className="font-semibold">₹</span>{Number(ref.estimated_value).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 mt-4 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => fetchDetails(ref.id)}
                  className="flex-1 bg-white hover:bg-gray-50 border text-gray-700 font-bold text-xs py-2 rounded-xl transition-colors cursor-pointer text-center"
                >
                  View Details & Logs
                </button>

                {filterType === 'received' && ref.status === 'NEW' && (
                  <>
                    <button
                      onClick={() => handleOpenDecisionModal(ref.id, 'REJECTED')}
                      className="bg-red-50 hover:bg-red-100 text-danger p-2 rounded-xl border border-red-150 transition-colors"
                      title="Decline Opportunity"
                    >
                      <X size={15} />
                    </button>
                    <button
                      onClick={() => handleOpenDecisionModal(ref.id, 'ACCEPTED')}
                      className="bg-primary hover:bg-opacity-95 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-0.5"
                    >
                      <Check size={14} /> Accept
                    </button>
                  </>
                )}

                {filterType === 'received' && ref.status !== 'NEW' && ref.status !== 'REJECTED' && ref.status !== 'WON' && ref.status !== 'LOST' && ref.status !== 'CLOSED' && (
                  <button
                    onClick={() => handleOpenStatusModal(ref)}
                    className="bg-primary hover:bg-opacity-95 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1 flex-1"
                  >
                    <Clock size={14} /> Update Status
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Referral Pipeline Modal */}
      {showDetailModal && selectedRef && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-[zoomIn_0.15s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Referral Track Sheet</h2>
                <p className="text-xs text-gray-500">Requirement: <span className="font-semibold text-primary">{selectedRef.requirement}</span></p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-gray-600">
              {/* Partner Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Giver (Referrer)</p>
                  <p className="font-bold text-gray-800 mt-1 text-sm">{selectedRef.referrer_name}</p>
                  <p className="text-xs text-gray-500">{selectedRef.referrer_business}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Receiver (Recipient)</p>
                  <p className="font-bold text-gray-800 mt-1 text-sm">{selectedRef.recipient_name}</p>
                  <p className="text-xs text-gray-500">{selectedRef.recipient_business}</p>
                </div>
              </div>

              {/* Client Info (masked or shown) */}
              <div className="p-4 border rounded-2xl space-y-2">
                <h3 className="text-xs font-bold text-gray-800 uppercase flex items-center gap-1"><Info size={14} /> Client Lead Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold text-gray-500">Customer Name:</p>
                    <p className="font-bold text-gray-800 mt-0.5">{selectedRef.customer_name || 'Hidden (Accept required)'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-500">Contact details:</p>
                    <p className="font-bold text-gray-800 mt-0.5">{selectedRef.customer_contact || 'Hidden (Accept required)'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-500">Expected Value (₹):</p>
                    <p className="font-bold text-gray-850 mt-0.5">₹{Number(selectedRef.estimated_value).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-500">Actual Won Value (₹):</p>
                    <p className="font-extrabold text-green-600 mt-0.5">₹{Number(selectedRef.actual_value).toLocaleString()}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="font-semibold text-gray-500">Description:</p>
                    <p className="font-medium text-gray-700 mt-0.5">{selectedRef.description || 'No description provided'}</p>
                  </div>
                </div>
              </div>

              {/* Status Log */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-800 uppercase flex items-center gap-1"><Clock size={14} /> Status Pipeline History</h3>
                <div className="relative border-l border-gray-200 pl-4 ml-2 space-y-4">
                  {historyLogs.map(log => (
                    <div key={log.id} className="relative">
                      <div className="absolute -left-[21px] top-1 bg-primary text-white p-0.5 rounded-full border-2 border-white">
                        <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">Status updated to <span className="text-primary">{log.status}</span></p>
                        <p className="text-[10px] text-gray-400 mt-0.5">By {log.updated_by_name} | {new Date(log.created_at).toLocaleString()}</p>
                        {log.notes && (
                          <p className="bg-gray-50 p-2 border rounded-lg mt-1 italic">"{log.notes}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments Thread */}
              <div className="space-y-3 pt-3 border-t border-gray-150">
                <h3 className="text-xs font-bold text-gray-800 uppercase flex items-center gap-1"><MessageSquare size={14} /> Thread Comments</h3>
                
                {/* Comment list */}
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {notesList.length === 0 ? (
                    <p className="text-[10px] text-gray-400 italic">No comments posted yet.</p>
                  ) : (
                    notesList.map(note => (
                      <div key={note.id} className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-100">
                        <p className="font-bold text-gray-800 text-[10px]">{note.author_name} <span className="font-normal text-gray-400 ml-1.5">{new Date(note.created_at).toLocaleString()}</span></p>
                        <p className="text-xs text-gray-600 mt-1">{note.notes}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment input form */}
                <form onSubmit={handlePostComment} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Type comments to collaborate..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-250 rounded-xl text-xs focus:outline-none"
                  />
                  <button type="submit" className="bg-primary hover:bg-opacity-95 text-white p-2 rounded-xl flex items-center justify-center shrink-0 w-9 h-9">
                    <Send size={15} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Pipeline Status Modal */}
      {showStatusModal && selectedRef && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-md flex flex-col overflow-hidden animate-[zoomIn_0.15s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Update Referral Pipeline Status</h2>
              <button onClick={() => setShowStatusModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-600 mb-1.5 uppercase">Pipeline Stage *</label>
                <select
                  required
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-250 rounded-lg text-xs bg-white"
                >
                  <option value="ACCEPTED">ACCEPTED (Confirm and accept opportunity)</option>
                  <option value="CONTACTED">CONTACTED (Client has been contacted)</option>
                  <option value="MEETING_SCHEDULED">MEETING_SCHEDULED (Meeting scheduled with client)</option>
                  <option value="PROPOSAL_SENT">PROPOSAL_SENT (Proposal or quote sent)</option>
                  <option value="NEGOTIATION">NEGOTIATION (Price negotiation stage)</option>
                  <option value="WON">WON (Deal successfully closed)</option>
                  <option value="LOST">LOST (Deal lost)</option>
                  <option value="CLOSED">CLOSED (Archived / Closed)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-600 mb-1.5 uppercase">Estimated Business Value (₹) *</label>
                <input
                  type="number"
                  required
                  value={statusForm.estimated_value}
                  onChange={(e) => setStatusForm({ ...statusForm, estimated_value: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-700"
                />
              </div>

              {statusForm.status === 'WON' && (
                <div>
                  <label className="block font-bold text-gray-600 mb-1.5 uppercase">Actual Business Value Won (₹) *</label>
                  <input
                    type="number"
                    required
                    value={statusForm.actual_value}
                    onChange={(e) => setStatusForm({ ...statusForm, actual_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-green-600"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-600 mb-1.5 uppercase">Status Notes / Progress Update</label>
                <textarea
                  value={statusForm.notes}
                  onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
                  placeholder="e.g. Sent corporate pricing packages sheet..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-lg font-bold shadow-sm"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Decision Confirmation Modal */}
      {showDecisionModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-sm flex flex-col overflow-hidden animate-[zoomIn_0.15s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">
                {decisionData.status === 'ACCEPTED' ? 'Accept Referral' : 'Decline Referral'}
              </h2>
              <button onClick={() => setShowDecisionModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg bg-gray-100">
                <X size={14} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-600 font-semibold leading-relaxed">
                Are you sure you want to {decisionData.status === 'ACCEPTED' ? 'accept' : 'decline'} this referral opportunity?
              </p>
              
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setShowDecisionModal(false)}
                  className="flex-1 px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDecision}
                  className={`flex-1 text-white font-bold text-xs py-2 rounded-xl transition-all shadow-md cursor-pointer ${
                    decisionData.status === 'ACCEPTED' 
                      ? 'bg-primary hover:bg-opacity-95' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {decisionData.status === 'ACCEPTED' ? 'Yes, Accept' : 'Yes, Decline'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Referrals;
