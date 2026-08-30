import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import { LayoutDashboard, Users, Calendar, ArrowRight, Award, ThumbsUp, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/business-network/dashboard/vendor');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (error) {
      toast.error('Failed to load networking dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700 border-green-200';
      case 'SUSPENDED': return 'bg-yellow-100 text-yellow-700 border-yellow-250';
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">IBC Business Network</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track your referrals pipeline, view upcoming meetings, monitor chapter analytics, and expand your network.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Membership Banner */}
          {!data?.membership ? (
            <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-accent shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">Not in a Networking Chapter</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Apply to join a chapter in your area to start exchanging referrals and growing your business with other vendors.
                  </p>
                </div>
              </div>
              <Link
                to="/vendor/business-network/find-chapters"
                className="bg-accent hover:bg-opacity-95 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shrink-0 flex items-center gap-1.5 w-fit"
              >
                Find Chapters <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="bg-blue-50/20 p-5 rounded-2xl border border-blue-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 font-bold">
                  {data.membership.chapter_name?.[0]}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">{data.membership.chapter_name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Chapter Code: <span className="font-bold text-primary">{data.membership.chapter_code}</span> | Specialty: <span className="font-semibold text-secondary uppercase">{data.membership.specialty_name}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase border ${getStatusBadgeClass(data.membership.status)}`}>
                  {data.membership.status} Member
                </span>
                <Link
                  to="/vendor/business-network/my-chapter"
                  className="bg-white hover:bg-gray-50 border text-gray-700 font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  My Chapter Directory
                </Link>
              </div>
            </div>
          )}

          {/* KPI Analytics Card Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-between">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Referrals Given</p>
                <p className="text-2xl font-extrabold text-gray-800">{data?.stats?.referralsGiven || 0}</p>
                <p className="text-[9px] text-green-600 font-bold flex items-center gap-0.5">
                  Won value: ₹{Number(data?.stats?.businessGiven || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3.5 bg-green-50 text-green-600 rounded-2xl shrink-0">
                <ThumbsUp size={20} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-between">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Referrals Received</p>
                <p className="text-2xl font-extrabold text-gray-800">{data?.stats?.referralsReceived || 0}</p>
                <p className="text-[9px] text-primary font-bold flex items-center gap-0.5">
                  Won value: ₹{Number(data?.stats?.businessReceived || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3.5 bg-blue-50 text-primary rounded-2xl shrink-0">
                <Award size={20} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-between">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Attendance Rating</p>
                <p className="text-2xl font-extrabold text-gray-800">{data?.stats?.attendancePercent || 0}%</p>
                <p className="text-[9px] text-gray-400">
                  {data?.stats?.meetingsAttended || 0} attended / {data?.stats?.meetingsMissed || 0} missed
                </p>
              </div>
              <div className="p-3.5 bg-purple-50 text-purple-600 rounded-2xl shrink-0">
                <Calendar size={20} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-between">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Network Connections</p>
                <p className="text-2xl font-extrabold text-gray-800">
                  {data?.stats?.referralsGivenWon + data?.stats?.referralsReceivedWon || 0}
                </p>
                <p className="text-[9px] text-gray-400">Successful conversions</p>
              </div>
              <div className="p-3.5 bg-orange-50 text-orange-500 rounded-2xl shrink-0">
                <Users size={20} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upcoming Chapter Meeting */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Upcoming Meeting</h3>
                <p className="text-xs text-gray-400 mb-6">Attendance at weekly meetings drives network success</p>
              </div>

              {data?.upcomingMeeting ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 border rounded-2xl space-y-2">
                    <p className="text-sm font-bold text-gray-900">{data.upcomingMeeting.title}</p>
                    <div className="text-xs text-gray-600 space-y-1 mt-2">
                      <p>Date: <span className="font-bold">{new Date(data.upcomingMeeting.date).toLocaleDateString()}</span></p>
                      <p>Time: <span className="font-bold">{data.upcomingMeeting.start_time} - {data.upcomingMeeting.end_time}</span></p>
                      <p className="truncate">Venue: <span className="font-bold">{data.upcomingMeeting.location}</span></p>
                    </div>
                  </div>
                  <Link
                    to="/vendor/business-network/meetings"
                    className="w-full text-center bg-primary hover:bg-opacity-95 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                  >
                    View Schedule Details
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-xs italic">
                  No upcoming meetings scheduled for your chapter.
                </div>
              )}
            </div>

            {/* Quick Actions Panel */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-1">Member Tools</h3>
              <p className="text-xs text-gray-400 mb-6">Quick actions to grow your networking metrics</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  to="/vendor/business-network/give-referral"
                  className="p-4 border border-gray-150 rounded-2xl hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Give Referral</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Send a client requirement to a member</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-400" />
                </Link>

                <Link
                  to="/vendor/business-network/requirements"
                  className="p-4 border border-gray-150 rounded-2xl hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Browse Requirements</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Find active client leads in the network</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-400" />
                </Link>

                <Link
                  to="/vendor/business-network/received-referrals"
                  className="p-4 border border-gray-150 rounded-2xl hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Received Referrals</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Track opportunities passed down to you</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-400" />
                </Link>

                <Link
                  to="/vendor/business-network/performance"
                  className="p-4 border border-gray-150 rounded-2xl hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Performance Card</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Analyze your referral conversions & value</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-400" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
