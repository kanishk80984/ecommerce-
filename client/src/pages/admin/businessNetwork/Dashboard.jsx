import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { LayoutDashboard, Users, Award, ShieldCheck, ClipboardCheck, ArrowRight, Calendar, Landmark } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useSelector(state => state.auth);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [stats, setStats] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const endpoint = isSuperAdmin 
        ? '/business-network/dashboard/superadmin' 
        : '/business-network/dashboard/admin';
      
      const res = await api.get(endpoint);
      if (res.data.success) {
        setStats(res.data.stats);
        setChapters(res.data.chapters || []);
      }
    } catch (error) {
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const prefix = isSuperAdmin ? '/superadmin' : '/admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isSuperAdmin ? 'IBC Network Control Center' : 'Chapter Operations Dashboard'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isSuperAdmin 
            ? 'Oversee Chapters, configure networking constraints, audit membership requests, and measure global business generated.'
            : 'Track members, approve applications, organize meeting schedules, and log attendance for your assigned chapters.'
          }
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Members</p>
                <p className="text-2xl font-extrabold text-gray-800">{stats?.totalMembers || 0}</p>
              </div>
              <div className="p-3.5 bg-blue-50 text-primary rounded-2xl">
                <Users size={20} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pending Applications</p>
                <p className="text-2xl font-extrabold text-gray-800">{stats?.pendingRequests || 0}</p>
              </div>
              <div className="p-3.5 bg-yellow-50 text-yellow-600 rounded-2xl">
                <ClipboardCheck size={20} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Exchanged Referrals</p>
                <p className="text-2xl font-extrabold text-gray-800">{stats?.totalReferrals || stats?.referralsCount || 0}</p>
              </div>
              <div className="p-3.5 bg-purple-50 text-purple-600 rounded-2xl">
                <Award size={20} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Business Closed</p>
                <p className="text-2xl font-extrabold text-green-600">
                  ${Number(stats?.businessValue || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3.5 bg-green-50 text-green-600 rounded-2xl">
                <Landmark size={20} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions Panel */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Administrative Actions</h3>
                <p className="text-xs text-gray-400 mb-6">Manage settings and applications quickly</p>
              </div>

              <div className="space-y-3.5">
                <Link
                  to={`${prefix}/business-network/applications`}
                  className="flex items-center justify-between p-3.5 border border-gray-150 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
                      <ClipboardCheck size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">Pending Requests</p>
                      <p className="text-[9px] text-gray-400 mt-0.5">Review vendor chapter applications</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-gray-400" />
                </Link>

                <Link
                  to={`${prefix}/business-network/meetings`}
                  className="flex items-center justify-between p-3.5 border border-gray-150 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-primary rounded-lg">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">Chapter Meetings</p>
                      <p className="text-[9px] text-gray-400 mt-0.5">Schedule meetings & attendance</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-gray-400" />
                </Link>

                {isSuperAdmin && (
                  <Link
                    to={`${prefix}/business-network/chapters`}
                    className="flex items-center justify-between p-3.5 border border-gray-150 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-50 text-secondary rounded-lg">
                        <ShieldCheck size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800">Chapter Setup</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">Create Chapters & assign admins</p>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-gray-400" />
                  </Link>
                )}
              </div>
            </div>

            {/* Assigned Chapters / Chapter Lists */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-1">
                {isSuperAdmin ? 'Active Network Chapters' : 'My Assigned Chapters'}
              </h3>
              <p className="text-xs text-gray-400 mb-6">Overview of current business networking groups</p>

              {isSuperAdmin ? (
                <div className="text-xs text-gray-500 py-6 text-center italic">
                  Manage chapters in the Chapters section to configure properties and assignment parameters.
                </div>
              ) : chapters.length === 0 ? (
                <div className="text-xs text-red-500 py-6 text-center italic">
                  You are not currently assigned to manage any Chapters. Contact the Super Admin.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto scrollbar-thin">
                  {chapters.map(ch => (
                    <div key={ch.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{ch.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{ch.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-gray-600">Capacity Limit: {ch.max_members}</p>
                        <Link to={`${prefix}/business-network/meetings`} className="text-[10px] text-primary font-bold hover:underline">
                          Manage Meetings &gt;
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
