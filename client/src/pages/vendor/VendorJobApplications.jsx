import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Mail, Phone, ExternalLink, Check, X, Calendar, Briefcase, Video } from 'lucide-react';
import api from '../../services/api';
import { getImageUrl } from '../../utils/imageUrl';

const VendorJobApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('APPLIED'); // 'APPLIED', 'REVIEWING', 'INTERVIEWING', 'SELECTED', 'REJECTED'

  // Modal state for scheduling interview
  const [interviewModal, setInterviewModal] = useState({ isOpen: false, appId: null });
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewLink, setInterviewLink] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/jobs/vendor/applications');
      setApplications(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (appId, newStatus, dateVal = null, linkVal = null) => {
    try {
      await api.patch(`/jobs/vendor/applications/${appId}/status`, { 
        status: newStatus,
        interview_date: dateVal,
        interview_link: linkVal
      });
      setInterviewModal({ isOpen: false, appId: null });
      setInterviewDate('');
      setInterviewLink('');
      // Fetch fresh applications list
      fetchApplications();
    } catch (err) {
      console.error(err);
      alert('Failed to update application status');
    }
  };

  const submitInterview = (e) => {
    e.preventDefault();
    if (!interviewDate) {
      alert('Please select a date and time for the interview');
      return;
    }
    handleStatusUpdate(interviewModal.appId, 'INTERVIEWING', interviewDate, interviewLink);
  };

  if (loading) {
    return <div className="p-8 text-center flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div></div>;
  }

  // Define status tabs with counts
  const tabs = [
    { id: 'APPLIED', label: 'Applied', count: applications.filter(a => a.status === 'APPLIED').length },
    { id: 'REVIEWING', label: 'Accepted', count: applications.filter(a => a.status === 'REVIEWING').length },
    { id: 'INTERVIEWING', label: 'Interviewed', count: applications.filter(a => a.status === 'INTERVIEWING').length },
    { id: 'SELECTED', label: 'Selected', count: applications.filter(a => a.status === 'SELECTED' || a.status === 'HIRED').length },
    { id: 'REJECTED', label: 'Rejected', count: applications.filter(a => a.status === 'REJECTED').length }
  ];

  const filteredApps = applications.filter(app => {
    if (activeTab === 'SELECTED') {
      return app.status === 'SELECTED' || app.status === 'HIRED';
    }
    return app.status === activeTab;
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/vendor/jobs" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-red-600" /> Job Applications
          </h1>
          <p className="text-gray-500 text-sm mt-1">Review candidates who applied for your jobs.</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}

      {/* Spacing optimization & Tab Navigation */}
      <div className="border-b border-gray-250 flex overflow-x-auto hide-scrollbar gap-5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 font-bold text-xs md:text-sm whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                isActive ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {filteredApps.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Applications in "{tabs.find(t => t.id === activeTab)?.label}"</h3>
          <p className="text-gray-500 mt-2">There are currently no job applications in this status filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredApps.map(app => (
            <div key={app.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">{app.applicant_name}</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded font-bold border ${
                    app.status === 'SELECTED' || app.status === 'HIRED'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : app.status === 'REJECTED'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : app.status === 'REVIEWING'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : app.status === 'INTERVIEWING'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                    {app.status === 'REVIEWING' ? 'ACCEPTED' : app.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">Applied for: <span className="font-medium text-gray-700">{app.job_title}</span></p>
                <div className="flex flex-wrap gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Mail size={14} className="text-gray-400" />
                    <a href={`mailto:${app.applicant_email}`} className="hover:text-red-600 transition-colors">{app.applicant_email}</a>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Phone size={14} className="text-gray-400" />
                    <a href={`tel:${app.applicant_phone}`} className="hover:text-red-600 transition-colors">{app.applicant_phone}</a>
                  </div>
                </div>

                {/* Candidate custom specifications */}
                {(app.experience_years !== null || app.highest_qualification || app.primary_skills) && (
                  <div className="mt-3 bg-gray-50 border border-gray-150 rounded-xl p-3.5 space-y-2 text-xs text-gray-700 max-w-xl shadow-sm">
                    {app.experience_years !== null && (
                      <p>
                        <span className="font-bold text-gray-500">Experience:</span> {app.experience_years} Years
                      </p>
                    )}
                    {app.highest_qualification && (
                      <p>
                        <span className="font-bold text-gray-500">Highest Qualification:</span> {app.highest_qualification}
                      </p>
                    )}
                    {app.primary_skills && (
                      <p>
                        <span className="font-bold text-gray-500">Primary Skills:</span> {app.primary_skills}
                      </p>
                    )}
                  </div>
                )}

                {/* Interview details inside card */}
                {app.status === 'INTERVIEWING' && app.interview_date && (
                  <div className="mt-3 bg-blue-50/55 border border-blue-200 rounded-xl p-4.5 space-y-2 text-xs text-blue-900 max-w-xl shadow-sm">
                    <p className="flex items-center gap-2">
                      <Calendar size={14} className="text-blue-600 shrink-0" />
                      <span className="font-bold">Interview Schedule:</span> {new Date(app.interview_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {app.interview_link && (
                      <p className="flex items-center gap-2">
                        <Video size={14} className="text-blue-600 shrink-0" />
                        <span className="font-bold">Google Meet Link:</span>{' '}
                        <a 
                          href={app.interview_link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="underline text-blue-700 hover:text-blue-900 font-bold transition-colors flex items-center gap-1"
                        >
                          Join Meeting <ExternalLink size={10} />
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Status Action Buttons (Placed to the left of vertical line) */}
              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                {app.status === 'APPLIED' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusUpdate(app.id, 'REVIEWING')}
                      className="flex items-center gap-1 px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
                    >
                      <Check size={14} /> Accept
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(app.id, 'REJECTED')}
                      className="flex items-center gap-1 px-3.5 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                )}

                {app.status === 'REVIEWING' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setInterviewModal({ isOpen: true, appId: app.id })}
                      className="flex items-center gap-1 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
                    >
                      <Calendar size={14} /> Schedule Interview
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(app.id, 'REJECTED')}
                      className="flex items-center gap-1 px-3.5 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                )}

                {app.status === 'INTERVIEWING' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusUpdate(app.id, 'SELECTED')}
                      className="flex items-center gap-1 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
                    >
                      <Check size={14} /> Select
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(app.id, 'REJECTED')}
                      className="flex items-center gap-1 px-3.5 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>

              {/* Vertical line and View Resume block */}
              <div className="flex items-center gap-3 w-full md:w-auto md:border-l md:pl-6 md:min-w-[160px] justify-end">
                {app.resume_url && (
                  <a 
                    href={getImageUrl(app.resume_url)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-lg transition-colors border border-gray-255 text-xs cursor-pointer shadow-sm"
                  >
                    View Resume <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Interview Modal Dialog */}
      {interviewModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Calendar className="text-blue-600" /> Schedule Interview Details
              </h3>
              <button 
                onClick={() => setInterviewModal({ isOpen: false, appId: null })}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={submitInterview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Date & Time *</label>
                <input 
                  type="datetime-local"
                  required
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Google Meet Link</label>
                <input 
                  type="url"
                  placeholder="https://meet.google.com/abc-defg-hij"
                  value={interviewLink}
                  onChange={(e) => setInterviewLink(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-55">
                <button
                  type="button"
                  onClick={() => setInterviewModal({ isOpen: false, appId: null })}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer shadow-md"
                >
                  Schedule Meet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorJobApplications;
