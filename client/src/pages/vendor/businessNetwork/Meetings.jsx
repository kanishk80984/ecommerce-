import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import { Calendar, Clock, MapPin, ClipboardList, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

const Meetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState(null);

  useEffect(() => {
    fetchMeetingsAndAttendance();
  }, []);

  const fetchMeetingsAndAttendance = async () => {
    setLoading(true);
    try {
      // 1. Get my memberships
      const memRes = await api.get('/business-network/my-memberships');
      if (memRes.data.success && memRes.data.activeMembership) {
        const activeMem = memRes.data.activeMembership;
        setMembership(activeMem);

        // 2. Get meetings list
        const meetRes = await api.get('/business-network/meetings', {
          params: { chapter_id: activeMem.chapter_id }
        });
        if (meetRes.data.success) {
          setMeetings(meetRes.data.meetings);
        }

        // 3. Get my attendance stats
        const dashRes = await api.get('/business-network/dashboard/vendor');
        if (dashRes.data.success) {
          setAttendance(dashRes.data.stats); // includes attended, missed, attendancePercent
        }
      }
    } catch (error) {
      toast.error('Failed to load meeting details');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceBadge = (status) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-100 text-green-700 border-green-200';
      case 'LATE': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'ABSENT': return 'bg-red-100 text-red-750 border-red-200';
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chapter Meetings & Attendance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review upcoming chapter meeting schedules, virtual links, and audit your personal attendance cards.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : !membership ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-150 shadow-sm text-gray-400">
          You are not currently an active member of any Chapter. Join a chapter to view meetings.
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Attendance Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Attendance Percentage</p>
              <p className="text-3xl font-extrabold text-primary mt-2">{attendance?.attendancePercent || 0}%</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Meetings Attended</p>
              <p className="text-3xl font-extrabold text-green-600 mt-2">{attendance?.meetingsAttended || 0}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Meetings Missed</p>
              <p className="text-3xl font-extrabold text-red-500 mt-2">{attendance?.meetingsMissed || 0}</p>
            </div>
          </div>

          {/* Meetings Schedule lists */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Chapter Schedule ({meetings.length}):</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {meetings.map((meet) => (
                <div
                  key={meet.id}
                  className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase ${
                        meet.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                        meet.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {meet.status}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">
                        {meet.meeting_type}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-extrabold text-gray-800">{meet.title}</h4>
                      <p className="text-xs text-gray-400 mt-1">{meet.description}</p>
                    </div>

                    <div className="space-y-2.5 text-xs text-gray-600 pt-3 border-t border-gray-100">
                      <p className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        {new Date(meet.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        {meet.start_time} - {meet.end_time}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin size={14} className="text-gray-400 shrink-0" />
                        <span className="truncate">{meet.location}</span>
                      </p>
                      {meet.meeting_link && (
                        <p className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-primary uppercase">Link:</span>
                          <a href={meet.meeting_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                            {meet.meeting_link}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Agenda section */}
                  {meet.agenda && (
                    <div className="mt-4 p-3 bg-gray-50/50 border border-gray-100 rounded-xl text-[10px]">
                      <p className="font-bold text-gray-600 uppercase flex items-center gap-1"><ClipboardList size={12} /> Meeting Agenda:</p>
                      <pre className="mt-1 font-mono text-gray-500 whitespace-pre-line leading-tight">
                        {meet.agenda}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Meetings;
