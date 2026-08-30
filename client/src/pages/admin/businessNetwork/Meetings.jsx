import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import { Calendar, Clock, MapPin, Plus, UserCheck, X, ClipboardCheck, Edit3 } from 'lucide-react';
import { useSelector } from 'react-redux';

const Meetings = () => {
  const { user } = useSelector(state => state.auth);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [meetings, setMeetings] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChapterId, setSelectedChapterId] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  // Form Fields
  const [form, setForm] = useState({
    chapter_id: '',
    title: '',
    date: '',
    start_time: '07:00 AM',
    end_time: '08:30 AM',
    location: '',
    meeting_type: 'PHYSICAL',
    agenda: 'Welcome\nMember Introductions\nBusiness Presentation\nReferral Requests\nReferral Recognition\nBusiness Updates\nVisitor Introduction\nAnnouncements\nClosing',
    description: '',
    meeting_link: ''
  });

  // Attendance Tracker state
  const [chapterMembers, setChapterMembers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({}); // { member_id: { status, notes } }

  useEffect(() => {
    fetchChapters();
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [selectedChapterId]);

  const fetchChapters = async () => {
    try {
      const res = await api.get('/business-network/chapters');
      if (res.data.success) {
        setChapters(res.data.chapters);
        if (res.data.chapters.length > 0) {
          setSelectedChapterId(res.data.chapters[0].id);
          setForm(prev => ({ ...prev, chapter_id: res.data.chapters[0].id }));
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMeetings = async () => {
    if (!selectedChapterId) return;
    setLoading(true);
    try {
      const res = await api.get('/business-network/meetings', {
        params: { chapter_id: selectedChapterId }
      });
      if (res.data.success) {
        setMeetings(res.data.meetings);
      }
    } catch (error) {
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/business-network/meetings', form);
      if (res.data.success) {
        toast.success('Meeting scheduled successfully');
        setShowCreateModal(false);
        setForm(prev => ({
          ...prev,
          title: '',
          date: '',
          location: '',
          meeting_link: '',
          description: ''
        }));
        fetchMeetings();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to schedule meeting');
    }
  };

  const handleUpdateStatus = async (meetingId, status) => {
    try {
      const res = await api.put(`/business-network/meetings/${meetingId}/status`, { status });
      if (res.data.success) {
        toast.success(`Meeting marked as ${status.toLowerCase()}`);
        fetchMeetings();
      }
    } catch (error) {
      toast.error('Failed to update meeting status');
    }
  };

  const handleOpenAttendance = async (meeting) => {
    setSelectedMeeting(meeting);
    setChapterMembers([]);
    setAttendanceRecords({});
    setShowAttendanceModal(true);

    try {
      // 1. Fetch chapter members
      const chRes = await api.get(`/business-network/chapters/${meeting.chapter_id}`);
      const members = chRes.data.chapter.members || [];
      setChapterMembers(members);

      // 2. Fetch existing attendance records if any
      const attRes = await api.get(`/business-network/meetings/${meeting.id}/attendance`);
      const existing = attRes.data.attendance || [];
      
      const records = {};
      members.forEach(mem => {
        const matching = existing.find(a => a.member_id === mem.user_id);
        records[mem.user_id] = {
          status: matching ? matching.status : 'PRESENT',
          notes: matching ? matching.notes || '' : ''
        };
      });
      setAttendanceRecords(records);
    } catch (error) {
      toast.error('Failed to load attendance list');
    }
  };

  const handleAttendanceChange = (memberId, status) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        status
      }
    }));
  };

  const handleAttendanceNotesChange = (memberId, notes) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        notes
      }
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedMeeting) return;
    
    const attendanceList = Object.keys(attendanceRecords).map(memberId => ({
      member_id: Number(memberId),
      status: attendanceRecords[memberId].status,
      notes: attendanceRecords[memberId].notes
    }));

    try {
      const res = await api.post(`/business-network/meetings/${selectedMeeting.id}/attendance`, { attendanceList });
      if (res.data.success) {
        toast.success('Attendance recorded successfully');
        setShowAttendanceModal(false);
        // Automatically mark meeting as COMPLETED
        await handleUpdateStatus(selectedMeeting.id, 'COMPLETED');
      }
    } catch (error) {
      toast.error('Failed to record attendance');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chapter Meetings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Schedule meetings, customize agenda, record member attendance, and track metrics.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-opacity-95 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2 w-fit cursor-pointer"
        >
          <Plus size={18} /> Schedule Meeting
        </button>
      </div>

      {/* Chapter Selector */}
      <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <label className="text-xs font-bold text-gray-600 uppercase">Select Chapter:</label>
        <select
          value={selectedChapterId}
          onChange={(e) => setSelectedChapterId(e.target.value)}
          className="px-4 py-2 border border-gray-250 rounded-xl text-sm bg-white md:w-80"
        >
          {chapters.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.name} ({ch.code})
            </option>
          ))}
        </select>
      </div>

      {/* Meetings Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-150 shadow-sm text-gray-400">
          No meetings scheduled for this chapter yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {meetings.map((meet) => (
            <div
              key={meet.id}
              className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${
                    meet.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                    meet.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {meet.status}
                  </span>
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                    {meet.meeting_type}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-gray-900">{meet.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{meet.description}</p>
                </div>

                <div className="space-y-2.5 text-xs text-gray-600 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Calendar size={15} className="text-gray-400 shrink-0" />
                    <span>{new Date(meet.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-gray-400 shrink-0" />
                    <span>{meet.start_time} - {meet.end_time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={15} className="text-gray-400 shrink-0" />
                    <span className="truncate">{meet.location}</span>
                  </div>
                  {meet.meeting_link && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-primary uppercase">Link:</span>
                      <a href={meet.meeting_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                        {meet.meeting_link}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {meet.status === 'SCHEDULED' && (
                <div className="mt-5 pt-4 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus(meet.id, 'CANCELLED')}
                    className="flex-1 bg-white hover:bg-red-50 text-red-600 border border-gray-200 hover:border-red-200 font-bold text-xs py-2 rounded-xl transition-all cursor-pointer text-center"
                  >
                    Cancel Meeting
                  </button>
                  <button
                    onClick={() => handleOpenAttendance(meet)}
                    className="flex-grow-[2] bg-primary hover:bg-opacity-95 text-white font-bold text-xs py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                  >
                    <UserCheck size={14} /> Record Attendance
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-[zoomIn_0.15s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Schedule Chapter Meeting</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Chapter *</label>
                <select
                  required
                  value={form.chapter_id}
                  onChange={(e) => setForm({ ...form, chapter_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-250 rounded-xl text-sm bg-white"
                >
                  {chapters.map(ch => (
                    <option key={ch.id} value={ch.id}>{ch.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Meeting Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Weekly Business Exchange Meeting"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Date *</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Meeting Type *</label>
                  <select
                    value={form.meeting_type}
                    onChange={(e) => setForm({ ...form, meeting_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                  >
                    <option value="PHYSICAL">Physical</option>
                    <option value="ONLINE">Online</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Start Time *</label>
                  <input
                    type="text"
                    required
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    placeholder="e.g. 07:00 AM"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">End Time *</label>
                  <input
                    type="text"
                    required
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    placeholder="e.g. 08:30 AM"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Location / Meeting URL *</label>
                <input
                  type="text"
                  required
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Grand Palace Hotel, Conference Room or Zoom Link"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Virtual Link (Optional)</label>
                <input
                  type="text"
                  value={form.meeting_link}
                  onChange={(e) => setForm({ ...form, meeting_link: e.target.value })}
                  placeholder="Zoom / Teams url if Hybrid or Online"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief briefing details..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Agenda</label>
                <textarea
                  value={form.agenda}
                  onChange={(e) => setForm({ ...form, agenda: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none font-mono"
                />
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 animate-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-opacity-95 transition-all"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-[zoomIn_0.15s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Record Member Attendance</h2>
                <p className="text-xs text-gray-500">Meeting: {selectedMeeting?.title}</p>
              </div>
              <button onClick={() => setShowAttendanceModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chapterMembers.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-6 text-center">No active members registered in this Chapter to log attendance.</p>
              ) : (
                <div className="space-y-4">
                  <div className="divide-y divide-gray-150 border border-gray-150 rounded-2xl overflow-hidden bg-white">
                    {chapterMembers.map((mem) => {
                      const record = attendanceRecords[mem.user_id] || { status: 'PRESENT', notes: '' };
                      return (
                        <div key={mem.user_id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-800">{mem.business_name}</p>
                            <p className="text-xs text-gray-400">{mem.owner_name} | {mem.specialty_name}</p>
                          </div>
                          
                          {/* Attendance Radio select */}
                          <div className="flex items-center gap-3 shrink-0">
                            {['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].map((st) => (
                              <label key={st} className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold">
                                <input
                                  type="radio"
                                  name={`att_${mem.user_id}`}
                                  value={st}
                                  checked={record.status === st}
                                  onChange={() => handleAttendanceChange(mem.user_id, st)}
                                  className="w-4 h-4 text-primary focus:ring-primary/20 accent-primary"
                                />
                                <span className={
                                  record.status === st
                                    ? st === 'PRESENT' ? 'text-green-600 font-bold' :
                                      st === 'LATE' ? 'text-orange-500 font-bold' :
                                      st === 'ABSENT' ? 'text-red-500 font-bold' : 'text-gray-500 font-bold'
                                    : 'text-gray-400'
                                }>
                                  {st.charAt(0) + st.slice(1).toLowerCase()}
                                </span>
                              </label>
                            ))}
                          </div>

                          {/* Notes */}
                          <input
                            type="text"
                            placeholder="Add note (optional)..."
                            value={record.notes}
                            onChange={(e) => handleAttendanceNotesChange(mem.user_id, e.target.value)}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs md:w-44 focus:outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setShowAttendanceModal(false)}
                      className="px-5 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAttendance}
                      className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-opacity-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <ClipboardCheck size={16} /> Save & Complete Meeting
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Meetings;
