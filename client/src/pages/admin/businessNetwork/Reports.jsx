import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Award, TrendingUp, TrendingDown, Users, Award as AwardIcon } from 'lucide-react';

const Reports = () => {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/business-network/dashboard/superadmin');
      if (res.data.success) {
        setStats(res.data.stats);
        setCharts(res.data.charts);
      }
    } catch (error) {
      toast.error('Failed to load performance analytics reports');
    } finally {
      setLoading(false);
    }
  };

  // Helper to calculate chapter score card rating
  const calculateChapterScore = (ch) => {
    // ch contains members, referrals_given, value_generated
    const membersFactor = Math.min(ch.members * 2, 20); // max 20 points
    const referralsFactor = Math.min(ch.referrals_given * 3, 40); // max 40 points
    const valueFactor = Math.min((Number(ch.value_generated || 0) / 100000) * 10, 40); // max 40 points
    return Math.round(membersFactor + referralsFactor + valueFactor);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 50) return 'text-orange-500 bg-orange-50 border-orange-200';
    return 'text-red-500 bg-red-50 border-red-150';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Network Reports & Performance Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor networking progress, transaction conversion rates, and computed chapter performance scores.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Core Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-400 uppercase">Total Business Generated</p>
                <div className="p-2 bg-green-50 rounded-xl text-green-600 font-bold text-base leading-none w-8 h-8 flex items-center justify-center">
                  ₹
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-800 mt-4">
                ₹{Number(stats?.businessValue || 0).toLocaleString()}
              </p>
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1.5 font-bold">
                <TrendingUp size={14} /> Total referral value won
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-400 uppercase">Referral Volume</p>
                <div className="p-2 bg-blue-50 rounded-xl text-primary font-bold">
                  <AwardIcon size={16} />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-800 mt-4">
                {stats?.totalReferrals || 0}
              </p>
              <p className="text-xs text-gray-400 mt-1.5 font-medium">
                {stats?.wonReferrals || 0} successful leads
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-400 uppercase">Lead Conversion Rate</p>
                <div className="p-2 bg-purple-50 rounded-xl text-purple-600 font-bold">
                  <TrendingUp size={16} />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-800 mt-4">
                {stats?.totalReferrals ? Math.round((stats.wonReferrals / stats.totalReferrals) * 100) : 0}%
              </p>
              <p className="text-xs text-gray-400 mt-1.5 font-medium">
                Won leads / total referrals
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-400 uppercase">Network Members</p>
                <div className="p-2 bg-orange-50 rounded-xl text-orange-500 font-bold">
                  <Users size={16} />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-800 mt-4">
                {stats?.totalMembers || 0}
              </p>
              <p className="text-xs text-gray-400 mt-1.5 font-medium">
                Active networking members
              </p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Trend Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Monthly Business Value Generated</h3>
                <p className="text-xs text-gray-400 mt-0.5">Value of WON referrals over the last 12 months</p>
              </div>

              <div className="h-64 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts?.referralsMonthly || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0c2340" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#0c2340" stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }} />
                    <Area type="monotone" dataKey="value" stroke="#0c2340" strokeWidth={2.5} fillOpacity={1} fill="url(#colorValue)" name="Value (₹)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Members by District */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Members by District</h3>
                <p className="text-xs text-gray-400 mt-0.5">Member concentration by location districts</p>
              </div>

              <div className="h-64 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts?.districtChart || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="district" tickLine={false} axisLine={false} style={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }} />
                    <Bar dataKey="value" fill="#e60000" radius={[6, 6, 0, 0]} name="Members" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Chapter Performance Score Rankings */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-gray-900">IBC Chapter Performance Scoreboard</h3>
              <p className="text-sm text-gray-400 mt-0.5">
                Computed using membership size weight (20%), referral volume (40%), and transactional business value generated (40%).
              </p>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <th className="px-6 py-4">Chapter Name</th>
                    <th className="px-6 py-4">Chapter Code</th>
                    <th className="px-6 py-4">Members count</th>
                    <th className="px-6 py-4">Referrals Exchanged</th>
                    <th className="px-6 py-4">Business Value Generated</th>
                    <th className="px-6 py-4 text-center">Chapter Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {charts?.chapterRankings?.map((ch) => {
                    const score = calculateChapterScore(ch);
                    return (
                      <tr key={ch.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-bold text-gray-800">{ch.name}</td>
                        <td className="px-6 py-4 text-xs font-mono font-bold text-gray-400">{ch.code}</td>
                        <td className="px-6 py-4 font-semibold text-gray-600">{ch.members}</td>
                        <td className="px-6 py-4 font-semibold text-gray-600">{ch.referrals_given}</td>
                        <td className="px-6 py-4 text-green-600 font-extrabold flex items-center gap-0.5">
                          <span className="font-semibold">₹</span>{Number(ch.value_generated || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-extrabold px-3 py-1.5 rounded-xl border ${getScoreColor(score)}`}>
                            <Award size={14} /> {score} / 100
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
