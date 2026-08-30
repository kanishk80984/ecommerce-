import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import { Users, Check, X, Calendar, ClipboardCheck, Phone, Mail, FileText } from 'lucide-react';

const Visitors = () => {
  const [visitors, setVisitors] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  // Assign Meeting state
  const [selectedMeetingId, setSelectedMeetingId] = useState('');

  useEffect(() => {
    fetchVisitors();
    fetchUpcomingMeetings();
  }, [filterStatus]);

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const res = await api.get('/business-network/visitors');
      if (res.data.success) {
        setVisitors(res.data.visitors);
      }
    } catch (error) {
      toast.error('Failed to load visitors list');
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingMeetings = async () => {
    try {
      const res = await api.get('/business-network/meetings');
      if (res.data.success) {
        const upcoming = res.data.meetings.filter(m => m.status === 'SCHEDULED');
        setMeetings(upcoming);
        if (upcoming.length > 0) {
          setSelectedMeetingId(upcoming[0].id);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDecision = async (id, status) => {
    if (status === 'APPROVED' && !selectedMeetingId) {
      toast.error('Please select a meeting to invite the visitor to.');
      return;
    }

    try {
      const res = await api.put(`/business-network/visitors/${id}/decide`, {
        status,
        meeting_id: status === 'APPROVED' ? Number(selectedMeetingId) : null
      });
      if (res.data.success) {
        toast.success(`Visitor status updated to ${status.toLowerCase()}`);
        setSelectedVisitor(null);
        fetchVisitors();
      }
    } catch (error) {
      toast.error('Failed to update visitor decision');
    }
  };

  const handleVisitorAttendance = async (id, status) => {
    try {
      const res = await api.put(`/business-network/visitors/${id}/decide`, { status });
      if (res.data.success) {
        toast.success(`Visitor marked as ${status.toLowerCase()}`);
        setSelectedVisitor(null);
        fetchVisitors();
      }
    } catch (error) {
      toast.error('Failed to update visitor attendance status');
    }
  };

  const filteredVisitors = visitors.filter(v => v.status === filterStatus);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Visitor Registry</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor guest visit requests, invite them to upcoming meetings, and track conversions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-150 pb-px">
        {['PENDING', 'APPROVED', 'ATTENDED', 'NO_SHOW', 'REJECTED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-5 py-3 text-sm font-semibold transition-all border-b-2 -mb-px cursor-pointer ${
              filterStatus === status
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-955'
            }`}
          >
            {status.charAt(0) + status.slice(1).toLowerCase()} ({visitors.filter(v => v.status === status).length})
          </button>
        ))}
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visitors List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          {loading ? (
            <div className="flex justify-center py-20 flex-1 items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredVisitors.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400 py-20">
              <Users size={48} className="mb-2 stroke-1" />
              <p className="text-sm">No visitors in status {filterStatus.toLowerCase()}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <th className="px-6 py-4">Visitor & Business</th>
                    <th className="px-6 py-4">Category & Specialty</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Preferred Date</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredVisitors.map((vis) => (
                    <tr
                      key={vis.id}
                      onClick={() => setSelectedVisitor(vis)}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedVisitor?.id === vis.id ? 'bg-blue-50/20' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-800">{vis.name}</p>
                        <p className="text-xs text-gray-400 font-medium">{vis.business_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-gray-700">{vis.specialty}</span>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{vis.category}</p>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-1"><Phone size={10} /> {vis.phone}</span>
                          <span className="flex items-center gap-1"><Mail size={10} /> {vis.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(vis.preferred_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedVisitor(vis)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Visitor Details Card */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex flex-col min-h-[500px]">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
            <ClipboardCheck size={18} className="text-primary" /> Visitor Sheet
          </h2>

          {selectedVisitor ? (
            <div className="flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <h3 className="font-extrabold text-gray-900 text-base">{selectedVisitor.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Company: <span className="font-bold">{selectedVisitor.business_name}</span></p>
                  <p className="text-[10px] text-primary font-bold uppercase mt-1">
                    {selectedVisitor.category} &gt; {selectedVisitor.specialty}
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="flex items-center gap-2 text-gray-600">
                    <Phone size={14} className="text-gray-400" /> {selectedVisitor.phone}
                  </p>
                  <p className="flex items-center gap-2 text-gray-600">
                    <Mail size={14} className="text-gray-400" /> {selectedVisitor.email}
                  </p>
                  <p className="flex items-center gap-2 text-gray-600">
                    <Calendar size={14} className="text-gray-400" /> Preferred Date:{' '}
                    <span className="font-bold text-gray-800">{new Date(selectedVisitor.preferred_date).toLocaleDateString()}</span>
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase flex items-center gap-1.5">
                    <FileText size={14} /> Reason for Visit
                  </label>
                  <p className="text-xs text-gray-600 bg-gray-50/50 p-3 rounded-xl border border-gray-100 mt-1 italic">
                    "{selectedVisitor.reason_for_visit || 'No reason provided.'}"
                  </p>
                </div>

                {/* APPROVED specific detail: invited meeting */}
                {selectedVisitor.status === 'APPROVED' && selectedVisitor.meeting_id && (
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-primary">
                    <p className="font-bold uppercase text-[9px] tracking-wider text-blue-500">Meeting Invitation Scheduled:</p>
                    <p className="font-semibold text-gray-800 mt-1">Meeting #{selectedVisitor.meeting_id}</p>
                  </div>
                )}
              </div>

              {/* Status Specific Actions */}
              {selectedVisitor.status === 'PENDING' && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  {/* Select upcoming meeting to schedule */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Invite to Chapter Meeting Slot:</label>
                    {meetings.length === 0 ? (
                      <p className="text-xs text-red-500 italic">No upcoming meeting scheduled. Create a meeting first!</p>
                    ) : (
                      <select
                        value={selectedMeetingId}
                        onChange={(e) => setSelectedMeetingId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-250 rounded-lg text-xs bg-white focus:outline-none"
                      >
                        {meetings.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.title} ({new Date(m.date).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDecision(selectedVisitor.id, 'REJECTED')}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-danger border border-red-200 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <X size={15} /> Decline
                    </button>
                    <button
                      disabled={meetings.length === 0}
                      onClick={() => handleDecision(selectedVisitor.id, 'APPROVED')}
                      className={`flex-1 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer ${
                        meetings.length === 0
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-primary hover:bg-opacity-95 text-white'
                      }`}
                    >
                      <Check size={15} /> Approve & Invite
                    </button>
                  </div>
                </div>
              )}

              {selectedVisitor.status === 'APPROVED' && (
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase text-center mb-1">Has the visitor attended?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVisitorAttendance(selectedVisitor.id, 'NO_SHOW')}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-danger border border-red-150 font-bold text-xs py-2 rounded-xl transition-colors cursor-pointer"
                    >
                      No Show
                    </button>
                    <button
                      onClick={() => handleVisitorAttendance(selectedVisitor.id, 'ATTENDED')}
                      className="flex-grow-[2] bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2 rounded-xl transition-colors shadow-sm cursor-pointer"
                    >
                      Mark as Attended
                    </button>
                  </div>
                </div>
              )}

              {['ATTENDED', 'NO_SHOW', 'REJECTED'].includes(selectedVisitor.status) && (
                <div className="pt-4 border-t border-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500">
                  Status: <span className="font-extrabold text-gray-800 ml-1.5">{selectedVisitor.status}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 italic text-xs py-20 text-center">
              <Users size={32} className="mb-2 stroke-1" />
              Select a visitor request to review contact info, preferred date, and approve their visit.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Visitors;
